import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Sparkles, Share2 } from "lucide-react";

interface AIResponseModalProps {
  mood: string;
  response: string;
  date: string;
  isOpen: boolean;
  onClose: () => void;
  onViewInCalendar: () => void;
  onShare?: () => void;
  hasShareOption?: boolean;
}

const getMoodEmoji = (mood: string) => {
  const moods: Record<string, string> = {
    'happy': '😊',
    'sad': '😢',
    'exciting': '🎉',
    'nervous': '😰',
    'neutral': '😐'
  };
  return moods[mood] || '😐';
};

export const AIResponseModal = ({
  mood,
  response,
  date,
  isOpen,
  onClose,
  onViewInCalendar,
  onShare,
  hasShareOption = false
}: AIResponseModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="text-5xl sm:text-6xl animate-scale-in">{getMoodEmoji(mood)}</div>
              <Sparkles className="absolute -top-2 -right-2 h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl sm:text-2xl capitalize">Mood: {mood}</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {format(new Date(date), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-secondary/20 rounded-lg p-3 sm:p-4 border border-border max-h-[50vh] overflow-y-auto">
            <p className="text-foreground text-sm sm:text-base leading-relaxed">{response}</p>
          </div>

          <div className="space-y-2">
            {hasShareOption && onShare && (
              <Button 
                onClick={onShare} 
                className="w-full min-h-[44px] text-sm sm:text-base font-semibold"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share with Friend
              </Button>
            )}
            <div className="flex gap-2">
              <Button onClick={onViewInCalendar} variant="outline" className="flex-1 min-h-[44px] text-sm sm:text-base">
                View in Calendar
              </Button>
              <Button onClick={onClose} variant={hasShareOption ? "outline" : "default"} className="flex-1 min-h-[44px] text-sm sm:text-base font-semibold">
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
