import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedback_id, rating, message } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Quick heuristic first
    let sentiment: 'happy' | 'neutral' | 'angry' = 'neutral';
    if (rating >= 4) sentiment = 'happy';
    if (rating <= 2) sentiment = 'angry';

    // AI analysis for messages with text
    if (message && message.trim().length > 0) {
      try {
        const aiData = await chatCompletion({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'You are a sentiment classifier. Classify the user feedback into exactly one of: happy, neutral, angry. Respond with ONLY the single word.',
            },
            {
              role: 'user',
              content: `Rating: ${rating}/5\nFeedback: "${message}"`,
            },
          ],
        });

        const result = (aiData.choices?.[0]?.message?.content || '').trim().toLowerCase();
        if (['happy', 'neutral', 'angry'].includes(result)) {
          sentiment = result as typeof sentiment;
        }
      } catch (e) {
        console.error('[Sentiment] AI analysis failed, using heuristic:', e);
      }
    }

    const isAngry = sentiment === 'angry';

    // Update feedback with sentiment
    if (feedback_id) {
      await supabase
        .from('user_feedback')
        .update({ sentiment, is_angry_alert: isAngry })
        .eq('id', feedback_id);
    }

    // If angry → trigger CEO alert
    if (isAngry) {
      // Insert into admin_data_alerts for the notification system
      await supabase.from('admin_data_alerts').insert({
        alert_type: 'angry_feedback',
        category: 'ux',
        severity: 'high',
        title: `😡 Angry User Feedback (${rating}/5)`,
        description: message?.slice(0, 300) || 'User rated experience poorly',
        metadata: { feedback_id, rating, sentiment },
        is_read: false,
        is_resolved: false,
      });

      // Push notification to admins
      try {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        for (const admin of (admins || [])) {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              user_id: admin.user_id,
              payload: {
                title: '😡 Angry Feedback Alert',
                body: `Rating: ${rating}/5 — "${(message || '').slice(0, 100)}"`,
                url: '/admin/ceo',
              },
            }),
          });
        }
      } catch (e) {
        console.error('[Sentiment] Push notification error:', e);
      }
    }

    return new Response(
      JSON.stringify({ sentiment, is_angry_alert: isAngry }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Sentiment] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
