export function composeDraft(
  name: string, 
  intent: "share" | "apologize" | "none", 
  mood: string | null, 
  entrySnippet: string
): string {
  if (intent === "apologize" || (mood && ["Sad", "Nervous"].includes(mood))) {
    return `Hey ${name}, sorry about earlier today. I didn't mean for it to turn into a fight 💭`;
  }
  
  // Default celebrate/share tone
  return `Hey ${name}! Had such a fun time with you today 💚`;
}
