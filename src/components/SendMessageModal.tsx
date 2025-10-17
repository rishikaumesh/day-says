import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCircle, Copy, X } from "lucide-react";
import { shareOrOpen } from "@/utils/whatsappShare";
import { composeDraft } from "@/utils/composeDraft";
import { useToast } from "@/hooks/use-toast";

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: string[];
  intent: "share" | "apologize" | "none";
  mood: string | null;
  entrySnippet: string;
}

export const SendMessageModal = ({
  isOpen,
  onClose,
  people,
  intent,
  mood,
  entrySnippet,
}: SendMessageModalProps) => {
  const [selectedName, setSelectedName] = useState<string>(people[0] || "");
  const [draft, setDraft] = useState<string>("");
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const { toast } = useToast();

  // Initialize draft when modal opens or name changes (unless user has edited)
  useEffect(() => {
    if (selectedName && !hasUserEdited) {
      const initialDraft = composeDraft(selectedName, intent, mood, entrySnippet);
      setDraft(initialDraft);
    }
  }, [selectedName, intent, mood, entrySnippet, hasUserEdited]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedName(people[0] || "");
      setHasUserEdited(false);
    }
  }, [isOpen, people]);

  const handleNameChange = (name: string) => {
    setSelectedName(name);
    setHasUserEdited(false); // Reset to regenerate draft
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    setHasUserEdited(true);
  };

  const handleResetDraft = () => {
    const resetDraft = composeDraft(selectedName, intent, mood, entrySnippet);
    setDraft(resetDraft);
    setHasUserEdited(false);
    toast({
      title: "Draft Reset",
      description: "Message reset to suggested draft.",
    });
  };

  const handleShare = async () => {
    if (!draft.trim()) {
      toast({
        title: "Empty Message",
        description: "Please write a message before sharing.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { method } = await shareOrOpen(draft);
      toast({
        title: method === 'web-share' ? "Shared!" : "Opening WhatsApp...",
        description: method === 'web-share' 
          ? "Message shared successfully." 
          : "Opening WhatsApp with your message.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Could not open sharing options.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Send a quick note?</DialogTitle>
          <DialogDescription className="text-sm">
            We detected a name in your entry. Want to share a short message?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {people.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="name-select">Send to</Label>
              <Select value={selectedName} onValueChange={handleNameChange}>
                <SelectTrigger id="name-select" className="min-h-[44px]">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((name) => (
                    <SelectItem key={name} value={name} className="py-3">
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="draft">Message draft</Label>
              {hasUserEdited && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDraft}
                  className="text-xs"
                >
                  Reset draft
                </Button>
              )}
            </div>
            <Textarea
              id="draft"
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              placeholder="Edit your message..."
              className="min-h-[120px] text-base"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {draft.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Skip
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Draft
          </Button>
          <Button
            type="button"
            onClick={handleShare}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Share on WhatsApp
          </Button>
        </DialogFooter>

        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          We don't send anything automatically — you choose and can edit before sharing.
        </p>
      </DialogContent>
    </Dialog>
  );
};
