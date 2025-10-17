import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end my life', 'want to die', 
  'self harm', 'hurt myself', 'no reason to live'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalText } = await req.json();
    
    if (!journalText) {
      return new Response(
        JSON.stringify({ error: 'journalText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for crisis keywords
    const lowerText = journalText.toLowerCase();
    const hasCrisisKeywords = CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
    
    if (hasCrisisKeywords) {
      return new Response(
        JSON.stringify({ 
          people: [], 
          intent: "none",
          isCrisis: true 
        }),
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
      console.error('AI API error:', response.status, await response.text());
      // Fallback to heuristic
      return Response.json(fallbackExtraction(journalText), { headers: corsHeaders });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      return Response.json(fallbackExtraction(journalText), { headers: corsHeaders });
    }

    try {
      const parsed = JSON.parse(content);
      
      // Validate structure
      if (!parsed.people || !Array.isArray(parsed.people)) {
        parsed.people = [];
      }
      if (!['share', 'apologize', 'none'].includes(parsed.intent)) {
        parsed.intent = 'none';
      }
      
      // Limit to 3 names
      parsed.people = parsed.people.slice(0, 3);
      parsed.isCrisis = false;
      
      return Response.json(parsed, { headers: corsHeaders });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return Response.json(fallbackExtraction(journalText), { headers: corsHeaders });
    }

  } catch (error) {
    console.error('extract-names-intent error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function fallbackExtraction(text: string) {
  // Simple heuristic: find capitalized words that aren't at sentence start
  const words = text.split(/\s+/);
  const names: string[] = [];
  
  for (let i = 1; i < words.length && names.length < 3; i++) {
    const word = words[i].replace(/[.,!?;:]$/, '');
    if (/^[A-Z][a-z]+$/.test(word) && word.length > 2) {
      if (!names.includes(word)) {
        names.push(word);
      }
    }
  }
  
  return { 
    people: names, 
    intent: "none" as const,
    isCrisis: false 
  };
}
