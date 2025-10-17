import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalText } = await req.json();
    
    if (!journalText || journalText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Journal text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing mood for journal entry...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an empathetic journaling companion. Analyze the emotional tone of journal entries and provide gentle, encouraging responses.

Your task:
1. Classify the mood into EXACTLY one of: Happy, Sad, Excited, Nervous, Neutral
2. Provide a 1-2 sentence gentle, encouraging response that acknowledges their feelings

CRITICAL: You MUST respond with ONLY valid JSON in this exact format:
{
  "mood": "Happy",
  "response": "That sounds like a wonderful moment. Try to hold on to that feeling 💛."
}

Do not include any text before or after the JSON. The mood must be one of the five options listed above.`
          },
          {
            role: 'user',
            content: journalText
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Raw AI response:', content);

    // Try to parse the JSON response
    let result;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return a fallback response
      return new Response(
        JSON.stringify({
          mood: 'Neutral',
          response: 'Thank you for sharing. Your feelings are valid.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the response has required fields
    if (!result.mood || !result.response) {
      throw new Error('Invalid response format from AI');
    }

    // Validate mood is one of the expected values
    const validMoods = ['Happy', 'Sad', 'Excited', 'Nervous', 'Neutral'];
    if (!validMoods.includes(result.mood)) {
      result.mood = 'Neutral';
    }

    console.log('Successfully analyzed mood:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-mood function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
