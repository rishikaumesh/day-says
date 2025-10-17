import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
interface JournalEntry {
  id: string;
  entry_date: string;
  entry_text: string;
  mood: string;
  reflection: string;
  created_at: string;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Calendar } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { getTodayLocal, parseLocalDate, isConsecutiveDay } from "@/utils/dateHelpers";

interface MoodCalendarProps {
  entries: JournalEntry[];
  onDeleteEntry: (id: string) => void;
  onDateSelect: (date: Date) => void;
}

const moodEmojis: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  exciting: "🎉",
  nervous: "😰",
  neutral: "😐",
};

const MoodCalendar = ({ entries, onDeleteEntry, onDateSelect }: MoodCalendarProps) => {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [currentMonth] = useState(new Date());
  const [weeklySuggestions, setWeeklySuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    const loadWeeklyReflection = async () => {
      if (entries.length === 0) return;
      
      setLoadingSuggestions(true);
      try {
        // Get entries from the past 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = format(weekAgo, "yyyy-MM-dd");
        
        const recentEntries = entries.filter(e => e.entry_date >= weekAgoStr);
        
        if (recentEntries.length === 0) {
          setWeeklySuggestions([]);
          return;
        }

        const { data, error } = await supabase.functions.invoke('analyze-mood', {
          body: {
            type: 'weekly-reflection',
            entries: recentEntries
          }
        });

        if (error) throw error;
        setWeeklySuggestions(data?.suggestions || []);
      } catch (error) {
        console.error('Error loading weekly reflection:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    loadWeeklyReflection();
  }, [entries]);

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return entries.filter((entry) => entry.entry_date === dateStr);
  };

  const getFirstEntryForDate = (date: Date) => {
    const dateEntries = getEntriesForDate(date);
    return dateEntries.length > 0 ? dateEntries[0] : null;
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            Reflect upon..
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingSuggestions ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : weeklySuggestions.length > 0 ? (
            weeklySuggestions.map((suggestion, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                <p className="text-sm text-foreground">{suggestion}</p>
              </div>
            ))
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Start journaling to get personalized reflections</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-foreground">{format(currentMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}

            {daysInMonth.map((date) => {
              const dayEntries = getEntriesForDate(date);
              const firstEntry = dayEntries.length > 0 ? dayEntries[0] : null;
              const isToday = isSameDay(date, new Date());

              return (
                <Dialog key={date.toISOString()} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => firstEntry && setSelectedEntry(firstEntry)}
                      className={`
                        aspect-square rounded-lg p-2 text-sm transition-all duration-300 relative
                        ${firstEntry ? "bg-primary/10 hover:bg-primary/20 cursor-pointer hover:scale-110" : "bg-muted/30"}
                        ${isToday ? "ring-2 ring-primary" : ""}
                      `}
                      disabled={!firstEntry}
                    >
                      <div className="text-xs text-muted-foreground mb-1">{format(date, "d")}</div>
                      {firstEntry && (
                        <>
                          <div className="text-2xl">{moodEmojis[firstEntry.mood]}</div>
                          {dayEntries.length > 1 && (
                            <div className="absolute top-1 right-1 text-xs bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                              {dayEntries.length}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  </DialogTrigger>

                  {selectedEntry && (
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                          <span>{format(parseLocalDate(selectedEntry.entry_date), "MMMM d, yyyy")}</span>
                          <span className="text-3xl">{moodEmojis[selectedEntry.mood]}</span>
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Your Entry</h4>
                          <p className="text-foreground whitespace-pre-wrap">{selectedEntry.entry_text}</p>
                        </div>

                        <div className="p-4 bg-accent/20 rounded-lg">
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Reflection</h4>
                          <p className="text-foreground italic">{selectedEntry.reflection}</p>
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            onDeleteEntry(selectedEntry.id);
                            setSelectedEntry(null);
                          }}
                          className="w-full"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Entry
                        </Button>
                      </div>
                    </DialogContent>
                  )}
                </Dialog>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MoodCalendar;
