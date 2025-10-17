import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end it all', 'self-harm', 'hurt myself', 'want to die'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalText } = await req.json();
    
    if (!journalText) {
      return new Response(
        JSON.stringify({ error: 'Journal text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for crisis keywords - return early without sharing modal
    const lowerText = journalText.toLowerCase();
    const hasCrisisKeyword = CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
    
    if (hasCrisisKeyword) {
      console.log('Crisis keywords detected, suppressing share modal');
      return new Response(
        JSON.stringify({ people: [], intent: 'none', crisis: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Extract PERSON NAMES and intent from a short diary entry.
Return STRICT JSON ONLY:
{ "people": string[], "intent": "share" | "apologize" | "none" }

Rules:
- "people": first names or name-like tokens you are confident are persons (e.g., "Shreya", "Alex").
- "share": entry celebrates/spent time/positive moment worth sharing.
- "apologize": entry indicates the user upset/hurt someone or wants to repair.
- "none": no clear outreach intent.
- Max 3 names. No extra text outside JSON.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `ENTRY:\n"""${journalText}"""` }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      // Fallback: simple heuristic
      return fallbackExtraction(journalText);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);
    
    // Try to parse JSON from response
    let result;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response, using fallback:', parseError);
      return fallbackExtraction(journalText);
    }

    // Validate result structure
    if (!result.people || !Array.isArray(result.people) || !result.intent) {
      console.error('Invalid AI response structure, using fallback');
      return fallbackExtraction(journalText);
    }

    // Limit to 3 names
    result.people = result.people.slice(0, 3);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-names-intent:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function fallbackExtraction(text: string): Response {
  console.log('Using fallback name extraction');
  
  // Simple heuristic: find capitalized words that are not at sentence start
  const words = text.split(/\s+/);
  const names: string[] = [];
  
  for (let i = 1; i < words.length && names.length < 3; i++) {
    const word = words[i].replace(/[.,!?;:]$/, ''); // Remove punctuation
    // Check if capitalized and likely a name (2+ chars, not common words)
    if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) {
      const commonWords = ['The', 'This', 'That', 'Today', 'Yesterday', 'Tomorrow'];
      if (!commonWords.includes(word) && !names.includes(word)) {
        names.push(word);
      }
    }
  }
  
  // Detect intent from keywords
  const lowerText = text.toLowerCase();
  let intent: "share" | "apologize" | "none" = "none";
  
  const apologizeKeywords = ['sorry', 'apologize', 'upset', 'hurt', 'mad', 'angry', 'fight', 'argument'];
  const shareKeywords = ['great', 'amazing', 'wonderful', 'fun', 'enjoyed', 'happy', 'love', 'nice'];
  
  if (apologizeKeywords.some(kw => lowerText.includes(kw))) {
    intent = "apologize";
  } else if (shareKeywords.some(kw => lowerText.includes(kw)) && names.length > 0) {
    intent = "share";
  }
  
  return new Response(
    JSON.stringify({ people: names, intent }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
