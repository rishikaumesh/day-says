import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";

interface AIResponseModalProps {
  mood: string;
  response: string;
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onViewInCalendar: () => void;
}

const getMoodEmoji = (mood: string) => {
  const moods: Record<string, string> = {
    'Happy': '😊',
    'Sad': '😢',
    'Excited': '🎉',
    'Nervous': '😰',
    'Neutral': '😐'
  };
  return moods[mood] || '😐';
};

export const AIResponseModal = ({
  mood,
  response,
  date,
  isOpen,
  onClose,
  onViewInCalendar
}: AIResponseModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="text-6xl animate-scale-in">{getMoodEmoji(mood)}</div>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Mood: {mood}</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {format(new Date(date), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-secondary/20 rounded-lg p-4 border border-border">
            <p className="text-foreground leading-relaxed">{response}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onViewInCalendar} variant="outline" className="flex-1">
              View in Calendar
            </Button>
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
