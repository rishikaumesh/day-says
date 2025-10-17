import { useState } from "react";
import { JournalEntry } from "@/utils/localStorage";
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
  Happy: "😊",
  Sad: "😔",
  Excited: "🤩",
  Nervous: "😬",
  Neutral: "😐",
};

const MoodCalendar = ({ entries, onDeleteEntry, onDateSelect }: MoodCalendarProps) => {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [currentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEntriesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return entries.filter((entry) => entry.date === dateStr);
  };

  const getFirstEntryForDate = (date: Date) => {
    const dateEntries = getEntriesForDate(date);
    return dateEntries.length > 0 ? dateEntries[0] : null;
  };

  const averageMood = () => {
    if (entries.length === 0) return "No entries yet";

    const moodCounts: Record<string, number> = {};
    entries.forEach((entry) => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });

    const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? `${moodEmojis[mostCommon[0]]} ${mostCommon[0]}` : "Neutral";
  };

  const currentStreak = () => {
    if (entries.length === 0) return 0;

    // Get unique dates that have at least one entry
    const uniqueDates = Array.from(new Set(entries.map((e) => e.date))).sort(
      (a, b) => parseLocalDate(b).getTime() - parseLocalDate(a).getTime(),
    );

    const todayLocal = getTodayLocal();

    // If there's no entry for today, start from yesterday
    let currentDate = uniqueDates.includes(todayLocal) ? todayLocal : null;

    if (!currentDate) {
      // Check if the most recent entry is yesterday
      if (uniqueDates.length === 0) return 0;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = format(yesterday, "yyyy-MM-dd");

      if (uniqueDates[0] !== yesterdayStr) return 0;
      currentDate = yesterdayStr;
    }

    let streak = 1;

    // Count consecutive days backwards
    for (let i = uniqueDates.indexOf(currentDate) + 1; i < uniqueDates.length; i++) {
      const prevDate = uniqueDates[i];
      const expectedDate = uniqueDates[i - 1];

      if (isConsecutiveDay(prevDate, expectedDate)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            Your Journey
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/30 rounded-lg text-center transition-all duration-300 hover:scale-105">
              <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
              <p className="text-3xl font-bold text-primary"> {currentStreak()} days</p>
            </div>
            <div className="p-4 bg-accent/30 rounded-lg text-center transition-all duration-300 hover:scale-105">
              <p className="text-sm text-muted-foreground mb-1">Most Common</p>
              <p className="text-2xl font-bold">{averageMood()}</p>
            </div>
          </div>
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
                          <span>{format(parseLocalDate(selectedEntry.date), "MMMM d, yyyy")}</span>
                          <span className="text-3xl">{moodEmojis[selectedEntry.mood]}</span>
                        </DialogTitle>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Your Entry</h4>
                          <p className="text-foreground whitespace-pre-wrap">{selectedEntry.journalText}</p>
                        </div>

                        <div className="p-4 bg-accent/20 rounded-lg">
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Reflection</h4>
                          <p className="text-foreground italic">{selectedEntry.response}</p>
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
