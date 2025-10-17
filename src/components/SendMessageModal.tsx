import { useState } from "react";
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
import { MessageCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { shareOrOpen } from "@/utils/whatsappShare";
import { composeDraft } from "@/utils/composeDraft";

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
  const [selectedPerson, setSelectedPerson] = useState(people[0] || "");
  // Use entrySnippet as the draft message directly (it's the AI-generated message)
  const [draft, setDraft] = useState(entrySnippet);
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handlePersonChange = (person: string) => {
    setSelectedPerson(person);
    // Keep the same message when switching persons
    setDraft(entrySnippet);
  };

  const handleResetDraft = () => {
    setDraft(entrySnippet);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const result = await shareOrOpen(draft);
      toast({
        title: result.method === 'web-share' ? "Shared!" : "Opening WhatsApp...",
        description: result.method === 'web-share' 
          ? "Message shared successfully" 
          : "WhatsApp opening with your message",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share message",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    toast({
      title: "Copied!",
      description: "Message copied to clipboard",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Send a quick note?</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            We detected a name in your entry. Want to share a short message?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {people.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="person-select" className="text-base">Send to</Label>
              <Select value={selectedPerson} onValueChange={handlePersonChange}>
                <SelectTrigger id="person-select" className="min-h-[44px] text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem key={person} value={person} className="text-base py-3">
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="message-draft" className="text-base">Message</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetDraft}
                className="text-xs"
              >
                Reset draft
              </Button>
            </div>
            <Textarea
              id="message-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-[120px] text-base"
              maxLength={240}
            />
            <p className="text-xs text-muted-foreground">
              {draft.length}/240 characters
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            We don't send anything automatically — you choose and can edit before sharing.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Draft
          </Button>
          <Button
            onClick={handleShare}
            disabled={isSharing || !draft.trim()}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Share on WhatsApp
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto"
          >
            Skip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
