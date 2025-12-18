import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { imageBase64, lessonTitle, expectedBehavior, petName, petBreed } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing training submission for lesson: ${lessonTitle}, pet: ${petName}`);

    const systemPrompt = `You are a professional dog trainer AI assistant for the PetID app. Your job is to analyze photos/videos of dogs performing training exercises and provide constructive feedback.

You must:
1. Determine if the dog is correctly performing the expected behavior
2. Provide encouraging, constructive feedback in Hebrew
3. If the exercise is done correctly, approve it
4. If not done correctly, explain what needs improvement without being harsh

Expected exercise: ${lessonTitle}
Expected behavior: ${expectedBehavior}
Dog name: ${petName || 'הכלב'}
Dog breed: ${petBreed || 'לא ידוע'}

Respond in JSON format:
{
  "approved": true/false,
  "confidence": 0-100,
  "feedback": "Hebrew feedback message",
  "tips": ["tip1", "tip2"] // only if not approved
}`;

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
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please analyze this image and determine if the dog is correctly performing the "${lessonTitle}" exercise. The expected behavior is: ${expectedBehavior}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI Response:', content);

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        analysis = {
          approved: false,
          confidence: 50,
          feedback: content || 'לא הצלחנו לנתח את התמונה. נסה שוב עם תמונה ברורה יותר.',
          tips: ['וודא שהכלב נראה בבירור בתמונה', 'צלם במקום מואר']
        };
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      analysis = {
        approved: false,
        confidence: 50,
        feedback: 'לא הצלחנו לנתח את התמונה. נסה שוב עם תמונה ברורה יותר.',
        tips: ['וודא שהכלב נראה בבירור בתמונה', 'צלם במקום מואר']
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-training-submission:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        approved: false,
        feedback: 'אירעה שגיאה בניתוח התמונה. נסה שוב.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
