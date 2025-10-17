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
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";
import { SendMessageModal } from "@/components/SendMessageModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [journalText, setJournalText] = useState("");
  const [manualMood, setManualMood] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [profileName, setProfileName] = useState<string>('');
  const [lastAIResponse, setLastAIResponse] = useState<{
    mood: string;
    response: string;
    date: string;
  } | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [conflictData, setConflictData] = useState<{
    personName: string;
    interactionType: "conflict" | "positive";
    journalText: string;
    mood: string;
  } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [sendMessageData, setSendMessageData] = useState<{
    people: string[];
    intent: "share" | "apologize" | "none";
    mood: string | null;
    entrySnippet: string;
  } | null>(null);
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadEntries();
      loadProfileName();
    }
  }, [user]);

  const loadProfileName = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    
    if (profile?.name) {
      setProfileName(profile.name);
    }
  };

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

  const toggleRecording = () => {
    if (isRecording && recognition) {
      // Stop recording
      recognition.stop();
      setIsRecording(false);
      return;
    }

    // Start recording
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser.",
        variant: "destructive",
      });
      return;
    }

    const newRecognition = new (window as any).webkitSpeechRecognition();
    newRecognition.continuous = true;
    newRecognition.interimResults = true;

    newRecognition.onstart = () => setIsRecording(true);
    newRecognition.onend = () => setIsRecording(false);
    newRecognition.onerror = () => {
      setIsRecording(false);
      toast({
        title: "Error",
        description: "Speech recognition error occurred",
        variant: "destructive",
      });
    };

    newRecognition.onresult = (event: any) => {
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

    setRecognition(newRecognition);
    newRecognition.start();
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

      // Check for conflicts (run in parallel, don't block success)
      detectConflict(journalText, mood);

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

  const detectConflict = async (text: string, detectedMood: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-mood', {
        body: { 
          type: 'conflict-detection',
          journalText: text 
        }
      });

      if (error) {
        console.error("Conflict detection error:", error);
        return;
      }

      // Store conflict data for later sharing (don't auto-show modal)
      if ((data?.hasConflict || data?.hasPositive) && data?.personName) {
        setConflictData({ 
          personName: data.personName,
          interactionType: data.hasConflict ? "conflict" : "positive",
          journalText: text,
          mood: detectedMood
        });
      }
    } catch (error) {
      console.error("Failed to detect conflict:", error);
      // Silently fail - don't block the user experience
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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <header className="mb-6 sm:mb-12 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-1 sm:mb-2">
                Mind Mirror 🪞
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Welcome back, {profileName || user?.user_metadata?.name || 'there'}!
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile')}
                className="min-h-[44px] whitespace-nowrap"
              >
                Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/insights')}
                className="min-h-[44px] whitespace-nowrap"
              >
                Insights
              </Button>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="min-h-[44px] whitespace-nowrap"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
          <div className="bg-card border-2 border-border rounded-2xl p-4 sm:p-6 shadow-xl">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">New Entry</h2>
            
            <div className="space-y-4">
              <div>
                <Label className="text-base">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left min-h-[44px] text-base"
                    >
                      <CalendarIcon className="mr-2 h-5 w-5" />
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
                <Label className="text-base">How are you feeling today?</Label>
                <Textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="Write about your day..."
                  className="min-h-[150px] sm:min-h-[180px] resize-none text-base"
                />
              </div>

              <Button
                onClick={toggleRecording}
                variant={isRecording ? "destructive" : "outline"}
                className="w-full min-h-[44px] text-base"
              >
                {isRecording ? (
                  <>
                    <MicOff className="mr-2 h-5 w-5 animate-pulse" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Voice Note
                  </>
                )}
              </Button>

              <div>
                <Label className="text-base">Manual Mood (Optional)</Label>
                <Select value={manualMood} onValueChange={setManualMood}>
                  <SelectTrigger className="min-h-[44px] text-base">
                    <SelectValue placeholder="Let AI detect..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Happy" className="text-base py-3">😊 Happy</SelectItem>
                    <SelectItem value="Sad" className="text-base py-3">😢 Sad</SelectItem>
                    <SelectItem value="Excited" className="text-base py-3">🎉 Excited</SelectItem>
                    <SelectItem value="Nervous" className="text-base py-3">😰 Nervous</SelectItem>
                    <SelectItem value="Neutral" className="text-base py-3">😐 Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!journalText.trim() || isAnalyzing}
                variant="cta"
                className="w-full min-h-[48px] text-base font-semibold"
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
          hasShareOption={!!conflictData}
          onShare={() => {
            setShowResponseModal(false);
            setShowConflictModal(true);
          }}
        />
      )}

      {conflictData && (
        <ConflictResolutionModal
          personName={conflictData.personName}
          interactionType={conflictData.interactionType}
          journalText={conflictData.journalText}
          mood={conflictData.mood}
          isOpen={showConflictModal}
          onClose={() => {
            setShowConflictModal(false);
            setConflictData(null);
          }}
        />
      )}

      {sendMessageData && (
        <SendMessageModal
          isOpen={showSendMessageModal}
          onClose={() => {
            setShowSendMessageModal(false);
            setSendMessageData(null);
          }}
          people={sendMessageData.people}
          intent={sendMessageData.intent}
          mood={sendMessageData.mood}
          entrySnippet={sendMessageData.entrySnippet}
        />
      )}
    </div>
  );
};

export default Dashboard;
