import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Send, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getTodayLocal, getLocalDateString, parseLocalDate } from "@/utils/dateHelpers";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface JournalInputProps {
  onSubmit: (text: string, selectedDate: string, manualMood?: string) => void;
  isAnalyzing: boolean;
}

const JournalInput = ({ onSubmit, isAnalyzing }: JournalInputProps) => {
  const [journalText, setJournalText] = useState("");
  const [manualMood, setManualMood] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        
        setJournalText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Recording Error",
          description: "Couldn't record audio. Please type instead.",
          variant: "destructive",
        });
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognition.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Not Supported",
        description: "Speech recognition isn't available in your browser. Please type instead.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const handleSubmit = () => {
    if (!journalText.trim()) {
      toast({
        title: "Empty Entry",
        description: "Please write or record something first.",
        variant: "destructive",
      });
      return;
    }

    const dateString = getLocalDateString(selectedDate);
    onSubmit(journalText, dateString, manualMood || undefined);
    setJournalText("");
    setManualMood("");
    setSelectedDate(new Date()); // Reset to today
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Label htmlFor="date" className="text-sm font-medium text-foreground mb-2 block">
          Entry date
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal border-2",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="journal" className="text-lg font-medium text-foreground mb-3 block">
          How was your day?
        </Label>
        <Textarea
          id="journal"
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          placeholder="Share your thoughts, feelings, and experiences..."
          className="min-h-[200px] text-base resize-none border-2 focus:border-primary transition-all duration-300"
          disabled={isAnalyzing}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant={isRecording ? "destructive" : "outline"}
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className="flex-1 transition-all duration-300 hover:scale-105"
        >
          {isRecording ? (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              Voice Note
            </>
          )}
        </Button>
      </div>

      <div>
        <Label htmlFor="mood" className="text-sm font-medium text-muted-foreground mb-2 block">
          Manual Mood Override (Optional)
        </Label>
        <Select value={manualMood} onValueChange={setManualMood} disabled={isAnalyzing}>
          <SelectTrigger className="w-full border-2 transition-all duration-300">
            <SelectValue placeholder="Let AI detect mood..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Happy">😊 Happy</SelectItem>
            <SelectItem value="Sad">😔 Sad</SelectItem>
            <SelectItem value="Excited">🤩 Excited</SelectItem>
            <SelectItem value="Nervous">😬 Nervous</SelectItem>
            <SelectItem value="Neutral">😐 Neutral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isAnalyzing || !journalText.trim()}
        size="lg"
        className="w-full transition-all duration-300 hover:scale-105"
      >
        {isAnalyzing ? (
          <>
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            Analyzing...
          </>
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            Analyze Mood & Save Entry
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        🔒 Journal entries are private and stored locally on your device.
      </p>
    </div>
  );
};

export default JournalInput;
