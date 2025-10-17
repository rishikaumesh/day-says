import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Mic, MicOff } from "lucide-react";
import MoodCalendar from "@/components/MoodCalendar";
import { AIResponseModal } from "@/components/AIResponseModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [journalText, setJournalText] = useState("");
  const [manualMood, setManualMood] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [lastAIResponse, setLastAIResponse] = useState<{
    mood: string;
    response: string;
    date: string;
  } | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user]);

  const loadEntries = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });
    
    if (!error && data) {
      setEntries(data);
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toast({
        title: "Error",
        description: "Speech recognition error occurred",
        variant: "destructive",
      });
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setJournalText(prev => prev + finalTranscript);
      }
    };

    recognition.start();
  };

  const handleSubmit = async () => {
    if (!journalText.trim() || !user) return;

    setIsAnalyzing(true);
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');

    try {
      let mood: string;
      let response: string;

      if (manualMood) {
        mood = manualMood;
        response = "Thank you for sharing. Your feelings are important.";
      } else {
        const { data, error } = await supabase.functions.invoke('analyze-mood', {
          body: { journalText, userId: user.id }
        });

        if (error) throw error;
        if (!data || !data.mood || !data.response) {
          throw new Error("Invalid response from mood analysis");
        }

        mood = data.mood;
        response = data.response;
      }

      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          entry_text: journalText,
          mood: mood.toLowerCase() as 'happy' | 'sad' | 'exciting' | 'nervous' | 'neutral',
          reflection: response,
          entry_date: formattedDate
        });

      if (insertError) throw insertError;

      setLastAIResponse({
        mood,
        response,
        date: formattedDate
      });
      setShowResponseModal(true);

      setJournalText("");
      setManualMood(undefined);
      loadEntries();

    } catch (error: any) {
      let errorMessage = "Couldn't analyze that. Please try again.";
      
      if (error.message?.includes('Rate limit')) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes('credits')) {
        errorMessage = "AI usage limit reached. Please try manual mood selection.";
      }
      
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (!error) {
      loadEntries();
      toast({
        title: "Entry Deleted",
        description: "Your journal entry has been removed.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex justify-between items-center mb-12 animate-fade-in">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
              Mind Mirror 🪞
            </h1>
            <p className="text-lg text-muted-foreground">
              Welcome back, {user?.user_metadata?.name || 'there'}!
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/profile')}>
              Profile
            </Button>
            <Button variant="outline" onClick={() => navigate('/insights')}>
              Insights
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">New Entry</h2>
            
            <div className="space-y-4">
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>How are you feeling today?</Label>
                <Textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="Write about your day..."
                  className="min-h-[150px] resize-none"
                />
              </div>

              <Button
                onClick={startRecording}
                variant="outline"
                className="w-full"
                disabled={isRecording}
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-4 w-4 animate-pulse" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Voice Note
                  </>
                )}
              </Button>

              <div>
                <Label>Manual Mood (Optional)</Label>
                <Select value={manualMood} onValueChange={setManualMood}>
                  <SelectTrigger>
                    <SelectValue placeholder="Let AI detect..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Happy">😊 Happy</SelectItem>
                    <SelectItem value="Sad">😢 Sad</SelectItem>
                    <SelectItem value="Excited">🎉 Excited</SelectItem>
                    <SelectItem value="Nervous">😰 Nervous</SelectItem>
                    <SelectItem value="Neutral">😐 Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!journalText.trim() || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? "Analyzing..." : "Save Entry"}
              </Button>
            </div>
          </div>

          <div>
            <MoodCalendar 
              entries={entries} 
              onDeleteEntry={handleDeleteEntry}
              onDateSelect={setSelectedDate}
            />
          </div>
        </div>
      </div>

      {lastAIResponse && (
        <AIResponseModal
          mood={lastAIResponse.mood}
          response={lastAIResponse.response}
          date={lastAIResponse.date}
          isOpen={showResponseModal}
          onClose={() => setShowResponseModal(false)}
          onViewInCalendar={() => {
            setShowResponseModal(false);
            setSelectedDate(new Date(lastAIResponse.date));
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
