import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Mail, Send, Copy, RefreshCw, Loader2 } from "lucide-react";

interface ConflictResolutionModalProps {
  personName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ACTIONS = [
  { id: "apologize", label: "Apologize and mend things", icon: "💙" },
  { id: "space", label: "Give space and reflect", icon: "🌙" },
  { id: "talk", label: "Ask to talk", icon: "💬" },
];

export const ConflictResolutionModal = ({
  personName,
  isOpen,
  onClose,
}: ConflictResolutionModalProps) => {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateMessage = async (actionId: string) => {
    setIsGenerating(true);
    setSelectedAction(actionId);

    try {
      const prompts: Record<string, string> = {
        apologize: `Generate a sincere, heartfelt apology message to ${personName} after a conflict. Make it personal, genuine, and brief (2-3 sentences). Focus on taking responsibility and wanting to make things right.`,
        space: `Generate a thoughtful message to ${personName} suggesting some space to reflect after a conflict. Make it respectful, caring, and brief (2-3 sentences). Express that you value the relationship and need time to process.`,
        talk: `Generate a gentle message to ${personName} asking to talk about a recent conflict. Make it open, non-confrontational, and brief (2-3 sentences). Express willingness to listen and work things out.`,
      };

      const { data, error } = await supabase.functions.invoke("analyze-mood", {
        body: {
          type: "conflict-resolution",
          personName,
          actionType: actionId,
          prompt: prompts[actionId],
        },
      });

      if (error) throw error;
      if (!data?.message) throw new Error("Failed to generate message");

      setGeneratedMessage(data.message);
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Couldn't generate message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
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
    const encoded = encodeURIComponent(generatedMessage);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const shareViaSMS = () => {
    const encoded = encodeURIComponent(generatedMessage);
    window.location.href = `sms:?&body=${encoded}`;
  };

  const shareViaEmail = () => {
    const encoded = encodeURIComponent(generatedMessage);
    window.location.href = `mailto:?body=${encoded}`;
  };

  const shareViaTelegram = () => {
    const encoded = encodeURIComponent(generatedMessage);
    window.open(`https://t.me/share/url?url=&text=${encoded}`, "_blank");
  };

  const resetModal = () => {
    setSelectedAction(null);
    setGeneratedMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {selectedAction
              ? "Your Message"
              : `Looks like you had a conflict with ${personName} 💔`}
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
              {ACTIONS.map((action) => (
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
                  <div className="bg-secondary/20 rounded-lg p-3 sm:p-4 border border-border max-h-[40vh] overflow-y-auto">
                    <p className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                      {generatedMessage}
                    </p>
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
