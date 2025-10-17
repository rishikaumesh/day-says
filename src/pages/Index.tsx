import { useState, useEffect } from "react";
import JournalInput from "@/components/JournalInput";
import MoodCalendar from "@/components/MoodCalendar";
import { saveEntry, getEntries, deleteEntry, JournalEntry } from "@/utils/localStorage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const handleSubmit = async (journalText: string, selectedDate: string, manualMood?: string) => {
    setIsAnalyzing(true);

    try {
      let mood: string;
      let response: string;

      if (manualMood) {
        // Use manual mood override
        mood = manualMood;
        response = "Thank you for sharing. Your feelings are important.";
      } else {
        // Call AI to analyze mood
        const { data, error } = await supabase.functions.invoke('analyze-mood', {
          body: { journalText }
        });

        if (error) {
          throw error;
        }

        if (!data || !data.mood || !data.response) {
          throw new Error("Invalid response from mood analysis");
        }

        mood = data.mood;
        response = data.response;
      }

      const newEntry: JournalEntry = {
        id: crypto.randomUUID(),
        date: selectedDate, // Use the selected local date
        journalText,
        mood,
        response,
        timestamp: new Date().toISOString(),
      };

      saveEntry(newEntry);
      setEntries(getEntries());

      toast({
        title: "Entry Saved! ✨",
        description: `Mood detected: ${mood}`,
      });

    } catch (error: any) {
      console.error('Error analyzing mood:', error);
      
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

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
    setEntries(getEntries());
    toast({
      title: "Entry Deleted",
      description: "Your journal entry has been removed.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
            Mind Mirror 🪞
          </h1>
          <p className="text-lg text-muted-foreground">
            Reflect on Your Day
          </p>
        </header>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Journal Input */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
            <JournalInput 
              onSubmit={handleSubmit} 
              isAnalyzing={isAnalyzing}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          </div>

          {/* Right Panel - Mood Summary */}
          <div>
            <MoodCalendar 
              entries={entries} 
              onDeleteEntry={handleDeleteEntry}
              onDateSelect={setSelectedDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
