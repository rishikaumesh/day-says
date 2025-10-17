import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mail, Send, Copy, RefreshCw, Loader2 } from "lucide-react";

interface ConflictResolutionModalProps {
  personName: string;
  isOpen: boolean;
  onClose: () => void;
  interactionType: "conflict" | "positive";
  journalText: string;
  mood: string;
}

const CONFLICT_ACTIONS = [
  { id: "apologize", label: "Apologize and mend things", icon: "💙" },
  { id: "space", label: "Give space and reflect", icon: "🌙" },
  { id: "talk", label: "Ask to talk", icon: "💬" },
];

const POSITIVE_ACTIONS = [
  { id: "share-joy", label: "Share the good vibes", icon: "✨" },
  { id: "plan-hangout", label: "Plan another hangout", icon: "🎉" },
  { id: "thank", label: "Express gratitude", icon: "💛" },
];

export const ConflictResolutionModal = ({
  personName,
  isOpen,
  onClose,
  interactionType,
  journalText,
  mood,
}: ConflictResolutionModalProps) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>("");
  const [editedMessage, setEditedMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateMessage = async (actionId: string) => {
    setIsGenerating(true);
    setSelectedAction(actionId);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-mood", {
        body: {
          type: "message-generation",
          personName,
          actionType: actionId,
          interactionType,
          journalText,
          mood,
        },
      });

      if (error) throw error;
      
      if (data?.isCrisis) {
        toast({
          title: "We're Here For You",
          description: "It looks like you might be going through a tough time. Please reach out to a trusted friend or professional for support.",
          variant: "default",
        });
        onClose();
        return;
      }

      if (!data?.message) throw new Error("Failed to generate message");

      setGeneratedMessage(data.message);
      setEditedMessage(data.message);
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Couldn't generate message. Please try again.",
        variant: "destructive",
      });
      // Set a safe fallback
      const fallback = interactionType === "conflict" 
        ? `Hey ${personName}, sorry about earlier 💭`
        : `Hey ${personName}! Had such a great time today 💚`;
      setGeneratedMessage(fallback);
      setEditedMessage(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(editedMessage);
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Couldn't copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const shareViaWhatsApp = () => {
    const encoded = encodeURIComponent(editedMessage);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const shareViaSMS = () => {
    const encoded = encodeURIComponent(editedMessage);
    window.location.href = `sms:?&body=${encoded}`;
  };

  const shareViaEmail = () => {
    const encoded = encodeURIComponent(editedMessage);
    window.location.href = `mailto:?body=${encoded}`;
  };

  const shareViaTelegram = () => {
    const encoded = encodeURIComponent(editedMessage);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, "_blank");
  };

  const resetModal = () => {
    setSelectedAction(null);
    setGeneratedMessage("");
    setEditedMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {selectedAction
              ? "Your Message"
              : interactionType === "conflict"
              ? `Looks like you had a conflict with ${personName} 💔`
              : `You had a great time with ${personName} ✨`}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {selectedAction
              ? "Share this message with them"
              : "Would you like to reach out?"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedAction ? (
            <div className="grid gap-3">
              {(interactionType === "conflict" ? CONFLICT_ACTIONS : POSITIVE_ACTIONS).map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 sm:py-4 min-h-[48px] text-sm sm:text-base"
                  onClick={() => generateMessage(action.id)}
                  disabled={isGenerating}
                >
                  <span className="text-xl sm:text-2xl mr-3">{action.icon}</span>
                  {action.label}
                </Button>
              ))}
            </div>
          ) : (
            <>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Crafting your message...
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Edit your message:
                    </label>
                    <Textarea
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="min-h-[100px] text-sm sm:text-base resize-none"
                      placeholder="Your message..."
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      Share via:
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <Button
                        variant="outline"
                        className="min-h-[44px] text-sm sm:text-base"
                        onClick={shareViaWhatsApp}
                      >
                        <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-600" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-[44px] text-sm sm:text-base"
                        onClick={shareViaSMS}
                      >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
                        iMessage
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-[44px] text-sm sm:text-base"
                        onClick={shareViaEmail}
                      >
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-red-600" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-[44px] text-sm sm:text-base"
                        onClick={shareViaTelegram}
                      >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-sky-600" />
                        Telegram
                      </Button>
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full min-h-[44px] text-sm sm:text-base"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 min-h-[44px] text-sm sm:text-base"
                      onClick={resetModal}
                    >
                      <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      Try Different Action
                    </Button>
                    <Button
                      className="flex-1 min-h-[44px] text-sm sm:text-base font-semibold"
                      onClick={onClose}
                    >
                      Done
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {!selectedAction && !isGenerating && (
            <Button
              variant="ghost"
              className="w-full min-h-[44px] text-sm sm:text-base"
              onClick={onClose}
            >
              Not now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
