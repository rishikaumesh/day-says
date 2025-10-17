import { useState, useEffect, useMemo } from "react";
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<JournalEntry[]>([]);
  const [currentEntryIndex, setCurrentEntryIndex] = useState(0);
  const [currentMonth] = useState(new Date());
  const [weeklySummary, setWeeklySummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Memoize recent entries key to prevent unnecessary reloads
  const recentEntriesKey = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = format(weekAgo, "yyyy-MM-dd");
    const recentEntries = entries.filter(e => e.entry_date >= weekAgoStr);
    
    // Create a stable key from recent entry IDs
    return recentEntries.map(e => e.id).sort().join(',');
  }, [entries]);

  useEffect(() => {
    const loadWeeklyReflection = async () => {
      if (entries.length === 0) {
        setWeeklySummary("");
        return;
      }
      
      setLoadingSummary(true);
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = format(weekAgo, "yyyy-MM-dd");
        
        const recentEntries = entries.filter(e => e.entry_date >= weekAgoStr);
        
        if (recentEntries.length === 0) {
          setWeeklySummary("");
          setLoadingSummary(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('analyze-mood', {
          body: {
            type: 'weekly-reflection',
            entries: recentEntries
          }
        });

        if (error) throw error;
        setWeeklySummary(data?.summary || "");
      } catch (error) {
        console.error('Error loading weekly reflection:', error);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadWeeklyReflection();
  }, [recentEntriesKey]);

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return entries.filter((entry) => entry.entry_date === dateStr);
  };

  const getFirstEntryForDate = (date: Date) => {
    const dateEntries = getEntriesForDate(date);
    return dateEntries.length > 0 ? dateEntries[0] : null;
  };

  const getGreenShade = (count: number) => {
    if (count === 0) return '';
    if (count === 1) return 'bg-green-100 dark:bg-green-950';
    if (count === 2) return 'bg-green-200 dark:bg-green-900';
    if (count === 3) return 'bg-green-300 dark:bg-green-800';
    if (count === 4) return 'bg-green-400 dark:bg-green-700';
    return 'bg-green-500 dark:bg-green-600'; // 5 or more
  };


  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <Card className="border-2 shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
            <Calendar className="h-5 w-5" />
            Reflect upon..
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 sm:p-6">
          {loadingSummary ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : weeklySummary ? (
            <div className="p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
              <p className="text-sm sm:text-base text-foreground leading-relaxed">{weeklySummary}</p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 bg-muted/30 rounded-lg text-center">
              <p className="text-sm sm:text-base text-muted-foreground">Start journaling to get personalized reflections</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-foreground text-lg sm:text-xl">{format(currentMonth, "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-center text-xs sm:text-sm font-medium text-muted-foreground p-1 sm:p-2">
                <span className="hidden sm:inline">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}</span>
                <span className="sm:hidden">{day}</span>
              </div>
            ))}

            {daysInMonth.map((date) => {
              const dayEntries = getEntriesForDate(date);
              const firstEntry = dayEntries.length > 0 ? dayEntries[0] : null;
              const isToday = isSameDay(date, new Date());

              return (
                <Dialog 
                  key={date.toISOString()} 
                  onOpenChange={(open) => {
                    if (!open) {
                      setSelectedDate(null);
                      setSelectedEntries([]);
                      setCurrentEntryIndex(0);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      onClick={() => {
                        if (dayEntries.length > 0) {
                          setSelectedDate(date);
                          setSelectedEntries(dayEntries);
                          setCurrentEntryIndex(0);
                        }
                      }}
                      className={`
                        aspect-square rounded-lg p-1 sm:p-2 text-sm transition-all duration-300 relative min-h-[48px] sm:min-h-0
                        ${dayEntries.length > 0 ? `${getGreenShade(dayEntries.length)} hover:opacity-80 cursor-pointer hover:scale-110` : "bg-muted/30"}
                        ${isToday ? "ring-2 ring-primary" : ""}
                      `}
                      disabled={!firstEntry}
                    >
                      <div className={`text-xs mb-0 sm:mb-1 ${dayEntries.length > 2 ? 'text-green-900 dark:text-green-100' : 'text-muted-foreground'}`}>
                        {format(date, "d")}
                      </div>
                      {firstEntry && (
                        <div className="text-xl sm:text-2xl">{moodEmojis[firstEntry.mood]}</div>
                      )}
                    </button>
                  </DialogTrigger>

                  {selectedEntries.length > 0 && selectedDate && (
                    <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                      <DialogHeader className="pb-4">
                        <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="text-base sm:text-lg">{format(selectedDate, "MMMM d, yyyy")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{moodEmojis[selectedEntries[currentEntryIndex].mood]}</span>
                            {selectedEntries.length > 1 && (
                              <span className="text-sm text-muted-foreground">
                                {currentEntryIndex + 1}/{selectedEntries.length}
                              </span>
                            )}
                          </div>
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        {selectedEntries.length > 1 && (
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentEntryIndex(Math.max(0, currentEntryIndex - 1))}
                              disabled={currentEntryIndex === 0}
                              className="min-h-[44px]"
                            >
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentEntryIndex(Math.min(selectedEntries.length - 1, currentEntryIndex + 1))}
                              disabled={currentEntryIndex === selectedEntries.length - 1}
                              className="min-h-[44px]"
                            >
                              Next
                            </Button>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Your Entry</h4>
                          <p className="text-foreground whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                            {selectedEntries[currentEntryIndex].entry_text}
                          </p>
                        </div>

                        <div className="p-3 sm:p-4 bg-accent/20 rounded-lg">
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Reflection</h4>
                          <p className="text-foreground italic text-sm sm:text-base leading-relaxed">
                            {selectedEntries[currentEntryIndex].reflection}
                          </p>
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const entryToDelete = selectedEntries[currentEntryIndex];
                            onDeleteEntry(entryToDelete.id);
                            const newEntries = selectedEntries.filter((_, idx) => idx !== currentEntryIndex);
                            if (newEntries.length > 0) {
                              setSelectedEntries(newEntries);
                              setCurrentEntryIndex(Math.min(currentEntryIndex, newEntries.length - 1));
                            } else {
                              setSelectedDate(null);
                              setSelectedEntries([]);
                              setCurrentEntryIndex(0);
                            }
                          }}
                          className="w-full min-h-[44px] text-base"
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
