import { useState } from "react";
import { JournalEntry } from "@/utils/localStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Calendar } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface MoodCalendarProps {
  entries: JournalEntry[];
  onDeleteEntry: (date: string) => void;
}

const moodEmojis: Record<string, string> = {
  Happy: "😊",
  Sad: "😔",
  Excited: "🤩",
  Nervous: "😬",
  Neutral: "😐",
};

const MoodCalendar = ({ entries, onDeleteEntry }: MoodCalendarProps) => {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [currentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEntryForDate = (date: Date) => {
    return entries.find(entry => isSameDay(parseISO(entry.date), date));
  };

  const averageMood = () => {
    if (entries.length === 0) return "No entries yet";
    
    const moodCounts: Record<string, number> = {};
    entries.forEach(entry => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    
    const mostCommon = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? `${moodEmojis[mostCommon[0]]} ${mostCommon[0]}` : "Neutral";
  };

  const currentStreak = () => {
    if (entries.length === 0) return 0;
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = parseISO(sortedEntries[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      if (isSameDay(entryDate, expectedDate)) {
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
              <p className="text-3xl font-bold text-primary">{currentStreak()} days</p>
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
          <CardTitle className="text-foreground">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            
            {daysInMonth.map(date => {
              const entry = getEntryForDate(date);
              const isToday = isSameDay(date, new Date());
              
              return (
                <Dialog key={date.toISOString()} onOpenChange={(open) => !open && setSelectedEntry(null)}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => entry && setSelectedEntry(entry)}
                      className={`
                        aspect-square rounded-lg p-2 text-sm transition-all duration-300
                        ${entry ? 'bg-primary/10 hover:bg-primary/20 cursor-pointer hover:scale-110' : 'bg-muted/30'}
                        ${isToday ? 'ring-2 ring-primary' : ''}
                      `}
                      disabled={!entry}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {format(date, 'd')}
                      </div>
                      {entry && (
                        <div className="text-2xl">
                          {moodEmojis[entry.mood]}
                        </div>
                      )}
                    </button>
                  </DialogTrigger>
                  
                  {selectedEntry && (
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                          <span>{format(parseISO(selectedEntry.date), 'MMMM d, yyyy')}</span>
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
                            onDeleteEntry(selectedEntry.date);
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
