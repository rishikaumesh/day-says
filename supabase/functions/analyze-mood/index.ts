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
    const { journalText, userId, type, entries } = await req.json();
    
    if (type === 'weekly-reflection') {
      // Weekly reflection analysis
      if (!entries || entries.length === 0) {
        return new Response(
          JSON.stringify({ suggestions: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      const entriesSummary = entries.map((e: any) => `${e.entry_date}: ${e.entry_text} (Mood: ${e.mood})`).join('\n\n');
      
      const weeklyPrompt = `You are a supportive life coach analyzing someone's journal entries from the past week. Provide a brief, warm reflection on their week in 2-3 sentences that captures the essence of their emotional journey and offers one actionable insight.

Journal entries from the past week:
${entriesSummary}

Keep it concise and uplifting. Return ONLY valid JSON in this exact format:
{
  "summary": "Your week showed a mix of highs and lows, with moments of excitement balanced by some stress. Consider taking more breaks between intense activities to maintain your energy and positivity."
}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: weeklyPrompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const cleanContent = content?.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanContent || '{"suggestions":[]}');

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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

    let systemPrompt = `You are an empathetic journaling companion. Analyze the emotional tone of journal entries and provide a gentle, actionable suggestion.

Your task:
1. Classify the mood into EXACTLY one of: happy, sad, exciting, nervous, neutral
2. Provide a 1-2 sentence actionable suggestion that helps them based on their feelings (NOT a question)

CRITICAL: You MUST respond with ONLY valid JSON in this exact format:
{
  "mood": "happy",
  "response": "Keep embracing these positive moments. Consider writing down what made today special so you can revisit it later 💛."
}

Do not include any text before or after the JSON. The mood must be lowercase and one of the five options listed above. The response should be a SUGGESTION, not a question.`;

    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        console.log('Fetching user personalization data for:', userId);
        
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=name,journaling_goals`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!profileResponse.ok) {
          console.error('Profile fetch error:', await profileResponse.text());
        }
        
        const profiles = await profileResponse.json();
        const profile = profiles?.[0];
        console.log('Profile:', profile);

        const interestsResponse = await fetch(`${supabaseUrl}/rest/v1/user_interests?user_id=eq.${userId}&select=interest`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        const interests = await interestsResponse.json();
        console.log('Interests:', interests);

        const habitsResponse = await fetch(`${supabaseUrl}/rest/v1/user_habits?user_id=eq.${userId}&select=description,time_preference,location_preference`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        const habits = await habitsResponse.json();
        console.log('Habits:', habits);

        if (profile || interests.length > 0 || habits.length > 0) {
          const name = profile?.name || 'there';
          const interestsList = interests.map((i: any) => i.interest).join(', ');
          const habitsList = habits.map((h: any) => h.description).join(', ');

          systemPrompt = `You are an empathetic AI companion for ${name}. 

PERSONALIZATION CONTEXT:
${interestsList ? `Their interests: ${interestsList}` : ''}
${habitsList ? `Things that help them feel better: ${habitsList}` : ''}

IMPORTANT: Provide actionable suggestions (NOT questions) based on their mood. When they're feeling down, sad, stressed, or need comfort, ACTIVELY SUGGEST activities from their interests and habits. Be specific and personal!

Examples of good suggestions:
- If they love bubble tea and are sad: "I'm sorry you're feeling down, ${name}. Treat yourself to that bubble tea you love - it might brighten your day 🧋"
- If they enjoy walks and are stressed: "That sounds stressful, ${name}. Take a long walk to clear your mind and reset 🚶"
- If they like music when upset: "Put on your favorite music and let it soothe you, ${name} 🎵"

Analyze the mood (happy/sad/exciting/nervous/neutral) and provide a warm, personalized suggestion (1-2 sentences) that references their specific interests when appropriate.

Return JSON format:
{
  "mood": "sad",
  "response": "I'm sorry you're having a rough day, ${name}. Grab that bubble tea you love or take a walk - both might help you feel better 🧋"
}`;
          
          console.log('Using personalized prompt for:', name);
        }
      } catch (error) {
        console.error('Error fetching user context:', error);
      }
    }

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
            content: systemPrompt
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
          mood: 'neutral',
          response: 'Thank you for sharing. Your feelings are valid.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the response has required fields
    if (!result.mood || !result.response) {
      throw new Error('Invalid response format from AI');
    }

    // Validate mood is one of the expected values (lowercase to match database enum)
    const validMoods = ['happy', 'sad', 'exciting', 'nervous', 'neutral'];
    if (!validMoods.includes(result.mood.toLowerCase())) {
      result.mood = 'neutral';
    } else {
      result.mood = result.mood.toLowerCase();
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
