import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Found Pet Resolution Protocol
 * 1. Mark pet as found (is_lost = false)
 * 2. Update the lost post with "Safe & Sound" banner, unpin it
 * 3. Send "found" push notification to same local user group
 * 4. Sara sends a private follow-up message to the owner
 * 5. Log agent actions (Alona = post update, Guy = notifications, Sara = follow-up)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { pet_id } = await req.json();
    if (!pet_id) {
      return new Response(JSON.stringify({ error: 'pet_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch pet details
    const { data: pet } = await supabase
      .from('pets')
      .select('id, name, type, breed, avatar_url, owner_id')
      .eq('id', pet_id)
      .maybeSingle();

    if (!pet) {
      return new Response(JSON.stringify({ error: 'Pet not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (pet.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not pet owner' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const petTypeHe = pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : 'חיית מחמד';
    const breedText = pet.breed || petTypeHe;

    // 2. Mark pet as found
    await supabase.from('pets').update({
      is_lost: false,
      lost_since: null,
    }).eq('id', pet_id);

    // 3. Get owner profile for city
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, city')
      .eq('id', user.id)
      .maybeSingle();

    const city = ownerProfile?.city || null;
    const ownerName = ownerProfile?.full_name || 'הבעלים';

    // 4. Update the lost pet post — add "Safe & Sound" banner, unpin
    const { data: lostPosts } = await supabase
      .from('posts')
      .select('id, caption')
      .eq('pet_id', pet_id)
      .eq('post_type', 'lost_pet')
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(1);

    let updatedPostId: string | null = null;
    if (lostPosts && lostPosts.length > 0) {
      const originalPost = lostPosts[0];
      updatedPostId = originalPost.id;

      const updatedCaption = `✅ נמצא/ה! ${pet.name} חזר/ה הביתה בשלום! 🎉\n\n` +
        `תודה רבה לכל הקהילה שעזרה בחיפוש! ❤️\n\n` +
        `---\n${originalPost.caption}`;

      await supabase.from('posts').update({
        caption: updatedCaption,
        is_pinned: false,
        post_type: 'regular',
      }).eq('id', originalPost.id);
    }

    // 5. Find nearby users (same city) to send "found" broadcast
    let nearbyUserIds: string[] = [];
    if (city) {
      const { data: nearbyProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('city', city)
        .neq('id', user.id)
        .limit(500);

      nearbyUserIds = nearbyProfiles?.map(p => p.id) || [];
    }

    // 6. Send "found" notifications to nearby users
    const notifBatch = nearbyUserIds.map(uid => ({
      user_id: uid,
      title: `✅ ${pet.name} נמצא/ה!`,
      message: `חדשות משמחות! ${breedText} בשם ${pet.name} חזר/ה הביתה בשלום${city ? ` ב${city}` : ''}. תודה לכולם! 🎉`,
      type: 'alert',
      category: 'found_pet',
      data: { pet_id: pet.id, pet_name: pet.name, city },
    }));

    if (notifBatch.length > 0) {
      for (let i = 0; i < notifBatch.length; i += 50) {
        await supabase.from('notifications').insert(notifBatch.slice(i, i + 50));
      }
    }

    // 7. Push notifications to nearby users (Guy)
    let pushSent = 0;
    for (const uid of nearbyUserIds) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: uid,
            payload: {
              title: `✅ ${pet.name} נמצא/ה!`,
              body: `${breedText} ${pet.name} חזר/ה בשלום${city ? ` ב${city}` : ''}! תודה לקהילה 🎉`,
              icon: pet.avatar_url || '/pwa-192x192.png',
              url: '/home',
            },
          }),
        });
        if (resp.ok) pushSent++;
        await resp.text();
      } catch (e) {
        console.error(`Push failed for ${uid}:`, e);
      }
    }

    // 8. Sara sends a private follow-up message to the owner
    // Create or find conversation for Sara
    let conversationId: string | null = null;
    const { data: existingConv } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (existingConv && existingConv.length > 0) {
      conversationId = existingConv[0].id;
    } else {
      const { data: newConv } = await supabase
        .from('agent_conversations')
        .insert({
          user_id: user.id,
          title: `${pet.name} חזר/ה הביתה`,
          is_active: true,
          context: { trigger: 'found_pet', pet_id: pet.id },
        })
        .select('id')
        .single();
      conversationId = newConv?.id || null;
    }

    if (conversationId) {
      await supabase.from('agent_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: `[שרה] מ-PetID: שמחה מאוד ש${pet.name} חזר/ה הביתה! 🎉❤️ צריך/ה עזרה בקביעת תור לווטרינר לבדיקת מעקב?`,
        metadata: { bot_name: 'sara', trigger: 'found_pet_followup', pet_id: pet.id },
      });
    }

    // 9. Also send an in-app notification from Sara
    await supabase.from('notifications').insert({
      user_id: user.id,
      title: `❤️ ${pet.name} בבית!`,
      message: `שרה מ-PetID: שמחה ש${pet.name} חזר/ה! צריך/ה עזרה בקביעת תור לווטרינר?`,
      type: 'care',
      category: 'found_pet_followup',
      data: { pet_id: pet.id, pet_name: pet.name, bot: 'sara' },
    });

    // 10. Log agent actions
    await supabase.from('agent_action_logs').insert([
      {
        action_type: 'found_pet_post_update',
        description: `Alona updated lost pet post for ${pet.name} with 'Safe & Sound' banner and unpinned`,
        reason: 'Found pet resolution protocol',
        expected_outcome: 'Post moved from emergency to regular',
        actual_outcome: updatedPostId ? `Post ${updatedPostId} updated` : 'No lost post found to update',
      },
      {
        action_type: 'found_pet_notifications',
        description: `Guy sent ${pushSent}/${nearbyUserIds.length} "found" push notifications for ${pet.name}`,
        reason: 'Found pet broadcast to local users',
        expected_outcome: `Notify ${nearbyUserIds.length} nearby users of safe return`,
        actual_outcome: `${pushSent} push sent, ${notifBatch.length} in-app notifications`,
      },
      {
        action_type: 'found_pet_followup',
        description: `Sara sent follow-up message to owner about ${pet.name}'s safe return`,
        reason: 'Post-resolution care follow-up',
        expected_outcome: 'Owner offered vet check-up assistance',
        actual_outcome: conversationId ? 'Message sent' : 'Failed to create conversation',
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        post_updated: !!updatedPostId,
        nearby_users: nearbyUserIds.length,
        push_sent: pushSent,
        sara_followup: !!conversationId,
        city,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Found pet resolve error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
