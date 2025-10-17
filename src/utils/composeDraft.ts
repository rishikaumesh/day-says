export function composeDraft(
  name: string, 
  intent: "share" | "apologize" | "none", 
  mood: string | null, 
  entrySnippet: string
): string {
  const snippet = entrySnippet.length > 80 ? entrySnippet.slice(0, 80) + "…" : entrySnippet;
  
  if (intent === "apologize" || (mood && ["Sad", "Nervous"].includes(mood))) {
    return `Hey ${name} — I realized I might've come off a bit off earlier. I'm sorry. You matter to me. Could we chat when you're free?`;
  }
  
  // Default celebrate/share tone
  return `Hey ${name} — I had a really nice time today! Thanks for making my day 😊 Want to do this again soon?`;
}
