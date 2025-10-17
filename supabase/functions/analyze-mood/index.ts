import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { journalText, userId, type, entries, personName, actionType, prompt } = await req.json();

    // Handle conflict resolution message generation
    if (type === "conflict-resolution") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content?.trim();

      return new Response(JSON.stringify({ message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle conflict detection
    if (type === "conflict-detection") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const detectionPrompt = `Analyze this journal entry for interpersonal conflicts and person names.

Journal entry: "${journalText}"

Your job:
1) Detect if the journal entry involves:
   - a conflict (fight, argument, tension, breakup, disagreement, hurt feelings, upset with someone, etc.)
   - a positive/happy moment (hanging out with someone, doing something fun, having a good time)
2) Extract the name of the person mentioned (a proper noun that’s likely a name — pick the most relevant if multiple).
3) Generate a short, informal message in the user’s voice that fits the tone of the entry. The message should:
   - sound casual and friendly
   - not be robotic
   - reflect the vibe of the situation (warm/light if happy, soft/apologetic if conflict)
   - not include any questions (but can sound open-ended)
   - start with the person’s name in a friendly way (e.g., "Hey", "Heyy", "Hey Rishika")

CRITICAL JSON SHAPES (return ONLY one of these):

If conflict:
{
  "hasConflict": true,
  "hasPositive": false,
  "personName": "Chirag",
  "conflictType": "argument",
  "message": "Hey Chirag. I'm sorry about what happened today and I think we should talk about it.."
}

If positive:
{
  "hasConflict": false,
  "hasPositive": true,
  "personName": "Rishika",
  "message": "Heyy Rishika, Today was fun! Although my bank balance doesn't think so lol, let's hang out again soon!"
}

If neither:
{
  "hasConflict": false,
  "hasPositive": false
}

Guidelines:
- The "personName" should be a single, capitalized proper noun (e.g., "Rishika").
- "conflictType" should be a short label like "fight", "argument", "tension", "disagreement", "breakup".
- The message must match the mood: friendly and casual, never formal.
- Keep the tone light and natural — contractions and small jokes are fine.
- Do not include any text before or after the JSON.

Examples:
Entry: "I had a fight with Chirag."
→
{
  "hasConflict": true,
  "hasPositive": false,
  "personName": "Chirag",
  "conflictType": "fight",
  "message": "Hey Chirag. I'm sorry about what happened today and I think we should talk about it.."
}

Entry: "Had an argument with Neha earlier."
→
{
  "hasConflict": true,
  "hasPositive": false,
  "personName": "Neha",
  "conflictType": "argument",
  "message": "Hey Neha. I'm really sorry about earlier, I didn’t mean for it to turn out like that."
}

Entry: "I went shopping with Rishika and it was a great time!"
→
{
  "hasConflict": false,
  "hasPositive": true,
  "personName": "Rishika",
  "message": "Heyy Rishika, Today was fun! Although my bank balance doesn't think so lol, let's hang out again soon!"
}

Entry: "Had the best boba date with Aman today."
→
{
  "hasConflict": false,
  "hasPositive": true,
  "personName": "Aman",
  "message": "Hey Aman, today was so good fr. My boba cravings are happy now 😎"
}

Entry: "I'm feeling low today. Didn't really talk to anyone."
→
{
  "hasConflict": false,
  "hasPositive": false
}

Entry: "Me and Shreya fought again."
→
{
  "hasConflict": true,
  "hasPositive": false,
  "personName": "Shreya",
  "conflictType": "fight",
  "message": "Hey Shreya. I'm sorry things got tense again today, I really don't like us fighting like this."
}

Entry: "Hung out with Aarav and the boys today, had the best laugh in a while."
→
{
  "hasConflict": false,
  "hasPositive": true,
  "personName": "Aarav",
  "message": "Hey Aarav, today was such a vibe 😂 good laughs fr."
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: detectionPrompt }],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const cleanContent = content
        ?.replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const result = JSON.parse(cleanContent || '{"hasConflict":false}');

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (type === "weekly-reflection") {
      // Weekly reflection analysis
      if (!entries || entries.length === 0) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const entriesSummary = entries.map((e: any) => `${e.entry_date}: ${e.entry_text} (Mood: ${e.mood})`).join("\n\n");

      const weeklyPrompt = `You are a supportive life coach analyzing someone's journal entries from the past week. Provide a brief, warm reflection on their week in 2-3 sentences that captures the essence of their emotional journey and offers one actionable insight.

Journal entries from the past week:
${entriesSummary}

Keep it concise and uplifting. Return ONLY valid JSON in this exact format:
{
  "summary": "Your week showed a mix of highs and lows, with moments of excitement balanced by some stress. Consider taking more breaks between intense activities to maintain your energy and positivity."
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: weeklyPrompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const cleanContent = content
        ?.replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const result = JSON.parse(cleanContent || '{"suggestions":[]}');

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!journalText || journalText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Journal text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing mood for journal entry...");

    let systemPrompt = `You are an empathetic journaling companion. Your role is to understand the emotional tone of a user’s journal entry and offer a thoughtful, warm, and **actionable suggestion**. 
You must not ask questions or break out of JSON format.

Your task:
1. Classify the mood into EXACTLY one of the following:
   - "happy": joy, gratitude, peace, contentment, lightness
   - "sad": loneliness, disappointment, grief, feeling low
   - "exciting": anticipation, thrill, motivation, energy
   - "nervous": anxiety, overthinking, stress, pressure, tension, fear of outcome, feeling overwhelmed
   - "neutral": factual tone, no strong emotional weight

2. Provide a **1–2 sentence actionable suggestion** that:
   - Acknowledges their feeling gently
   - Encourages a healthy or uplifting action (e.g., self-care, grounding activity, reflection, connecting with someone)
   - Is written like a supportive friend, not a therapist
   - NEVER ends with a question
   - Avoids repeating the exact words from the user entry
   - Can be creative and tailored — use imaginative, relatable actions (e.g., “step outside for a quick stretch,” “put on your comfort playlist,” “treat yourself to something warm and cozy”)

Example triggers for each mood:
- happy: “I loved spending time with friends.” → suggestion: “Hold on to that warm feeling. Maybe jot down a few highlights or play your favorite song to keep the joy going 🌞.”
- sad: “I feel left out.” → suggestion: “That sounds heavy. Wrap yourself in something soft, give yourself grace, and do something gentle like reading or listening to calming music.”
- exciting: “I can’t wait for tomorrow’s trip!” → suggestion: “That spark of excitement is gold — channel it into something fun, like packing your favorite outfit or making a small plan to celebrate 🎉.”
- nervous: “I have a big presentation tomorrow.” / “Everything feels overwhelming.” / “I’m worried I’ll mess up.” → suggestion: “Take a few deep breaths, remind yourself how far you’ve come, and ground yourself with a comforting activity like a walk, journaling, or your favorite warm drink ☕.”
- neutral: “I did laundry today.” → suggestion: “Even the quiet, simple moments matter. Give yourself credit for showing up today.”

CRITICAL:
- You MUST respond with ONLY valid JSON in this exact format:
{
  "mood": "happy",
  "response": "Keep embracing these positive moments. Consider writing down what made today special so you can revisit it later 💛."
}

- "mood" must be lowercase and one of the five options listed above.
- Do not include any text before or after the JSON.
- The "response" must be a **SUGGESTION**, not a question.
`;

    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        console.log("Fetching user personalization data for:", userId);

        const profileResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=name,journaling_goals`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!profileResponse.ok) {
          console.error("Profile fetch error:", await profileResponse.text());
        }

        const profiles = await profileResponse.json();
        const profile = profiles?.[0];
        console.log("Profile:", profile);

        const interestsResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_interests?user_id=eq.${userId}&select=interest`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
          },
        );
        const interests = await interestsResponse.json();
        console.log("Interests:", interests);

        const habitsResponse = await fetch(
          `${supabaseUrl}/rest/v1/user_habits?user_id=eq.${userId}&select=description,time_preference,location_preference`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
          },
        );
        const habits = await habitsResponse.json();
        console.log("Habits:", habits);

        // Fetch mood signatures (learned patterns)
        const signaturesResponse = await fetch(
          `${supabaseUrl}/rest/v1/mood_signatures?user_id=eq.${userId}&select=phrase,associated_mood,confidence_score&order=confidence_score.desc&limit=20`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
            },
          },
        );
        const signatures = await signaturesResponse.json();
        console.log("Mood signatures:", signatures);

        if (profile || interests.length > 0 || habits.length > 0 || signatures.length > 0) {
          const name = profile?.name || "there";
          const interestsList = interests.map((i: any) => i.interest).join(", ");
          const habitsList = habits.map((h: any) => h.description).join(", ");

          // Build mood signature context
          let signatureContext = "";
          if (signatures.length > 0) {
            const signatureLines = signatures
              .map((s: any) => `- "${s.phrase}" → ${s.associated_mood} (confidence: ${s.confidence_score})`)
              .join("\n");
            signatureContext = `\n\nLEARNED MOOD PATTERNS FOR ${name.toUpperCase()}:
Based on their past entries, here are phrases/activities and their typical associated moods:
${signatureLines}

Use these patterns to better understand their emotional tone. For example, if they mention an activity you've seen before, reference the learned pattern.`;
          }

          systemPrompt = `You are an empathetic AI companion for ${name}. 

PERSONALIZATION CONTEXT:
${interestsList ? `Their interests: ${interestsList}` : ""}
${habitsList ? `Things that help them feel better: ${habitsList}` : ""}${signatureContext}

IMPORTANT: Provide actionable suggestions (NOT questions) based on their mood. When they're feeling down, sad, stressed, or need comfort, ACTIVELY SUGGEST activities from their interests and habits. Be specific and personal!

Examples of good suggestions:
- If they love bubble tea and are sad: "I'm sorry you're feeling down, ${name}. Treat yourself to that bubble tea you love - it might brighten your day 🧋"
- If they enjoy walks and are stressed: "That sounds stressful, ${name}. Take a long walk to clear your mind and reset 🚶"
- If they like gaming and mention "valorant": "Playing Valorant sounds exciting, ${name}! Hope you had some great matches 🎮"

Analyze the mood (happy/sad/exciting/nervous/neutral) and provide a warm, personalized suggestion (1-2 sentences) that references their specific interests when appropriate.

Return JSON format:
{
  "mood": "happy",
  "response": "Playing Valorant sounds exciting, ${name}! Hope you had some great matches 🎮"
}`;

          console.log("Using personalized prompt for:", name);
        }
      } catch (error) {
        console.error("Error fetching user context:", error);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: journalText,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("Raw AI response:", content);

    // Try to parse the JSON response
    let result;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a fallback response
      return new Response(
        JSON.stringify({
          mood: "neutral",
          response: "Thank you for sharing. Your feelings are valid.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate the response has required fields
    if (!result.mood || !result.response) {
      throw new Error("Invalid response format from AI");
    }

    // Validate mood is one of the expected values (lowercase to match database enum)
    const validMoods = ["happy", "sad", "exciting", "nervous", "neutral"];
    if (!validMoods.includes(result.mood.toLowerCase())) {
      result.mood = "neutral";
    } else {
      result.mood = result.mood.toLowerCase();
    }

    console.log("Successfully analyzed mood:", result);

    // Update mood signatures (learn from this entry)
    if (userId && journalText) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Extract key phrases (simple approach: split by common delimiters and take meaningful words)
        const phrases = journalText
          .toLowerCase()
          .split(/[.,!?;:\n]/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 3 && p.length < 50)
          .slice(0, 5); // Limit to 5 phrases per entry

        console.log("Extracting phrases for mood learning:", phrases);

        // Update or insert mood signatures
        for (const phrase of phrases) {
          // Try to update existing signature
          const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/mood_signatures?user_id=eq.${userId}&phrase=eq.${encodeURIComponent(phrase)}`,
            {
              method: "PATCH",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                associated_mood: result.mood,
                confidence_score: 1, // Will be incremented via SQL
                last_seen_at: new Date().toISOString(),
              }),
            },
          );

          // If no rows updated, insert new signature
          if (updateResponse.status === 200) {
            // Increment confidence
            await fetch(`${supabaseUrl}/rest/v1/rpc/increment_confidence`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                p_user_id: userId,
                p_phrase: phrase,
              }),
            });
          } else {
            // Insert new signature
            await fetch(`${supabaseUrl}/rest/v1/mood_signatures`, {
              method: "POST",
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
                Prefer: "return=minimal",
              },
              body: JSON.stringify({
                user_id: userId,
                phrase: phrase,
                associated_mood: result.mood,
                confidence_score: 1,
              }),
            });
          }
        }

        console.log("Updated mood signatures for learning");
      } catch (signatureError) {
        console.error("Error updating mood signatures:", signatureError);
        // Don't fail the request if signature update fails
      }
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error in analyze-mood function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
