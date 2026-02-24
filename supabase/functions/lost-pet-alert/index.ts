import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Lost Pet Alert Protocol
 * 1. Mark pet as lost
 * 2. Auto-generate rich post with pet photos & details
 * 3. Find nearby users by city
 * 4. Send push notifications to all nearby users
 * 5. Pin the post in feed for nearby users
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
    const { data: pet, error: petErr } = await supabase
      .from('pets')
      .select('id, name, type, breed, avatar_url, color, weight, microchip_number, medical_conditions, owner_id')
      .eq('id', pet_id)
      .maybeSingle();

    if (petErr || !pet) {
      return new Response(JSON.stringify({ error: 'Pet not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify ownership
    if (pet.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not pet owner' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Mark pet as lost
    await supabase.from('pets').update({
      is_lost: true,
      lost_since: new Date().toISOString(),
    }).eq('id', pet_id);

    // 3. Get owner profile for location
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, city, address')
      .eq('id', user.id)
      .maybeSingle();

    const city = ownerProfile?.city || null;
    const ownerName = ownerProfile?.full_name || 'בעלים';
    const petTypeHe = pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : 'חיית מחמד';
    const breedText = pet.breed || petTypeHe;

    // 4. Build rich post content
    const lines = [
      `🚨 אבד/ה! ${pet.name} (${breedText})`,
      '',
    ];
    if (pet.color) lines.push(`🎨 צבע: ${pet.color}`);
    if (pet.weight) lines.push(`⚖️ משקל: ${pet.weight} ק"ג`);
    if (pet.microchip_number) lines.push(`📟 שבב: ${pet.microchip_number}`);
    if (pet.medical_conditions?.length) {
      lines.push(`⚠️ מצב רפואי: ${pet.medical_conditions.join(', ')}`);
    }
    if (city) lines.push(`📍 אזור: ${city}${ownerProfile?.address ? `, ${ownerProfile.address}` : ''}`);
    lines.push('', 'אם ראיתם — אנא צרו קשר! 🙏');
    lines.push('#אבד #PetID');

    const postContent = lines.join('\n');

    // 5. Create pinned lost pet post
    const { data: newPost, error: postErr } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        caption: postContent,
        image_url: pet.avatar_url || '',
        pet_id: pet.id,
        post_type: 'lost_pet',
        is_pinned: true,
      })
      .select('id')
      .single();

    if (postErr) {
      console.error('Post creation error:', postErr);
    }

    // 6. Find nearby users (same city)
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

    // 7. Create notifications for nearby users
    const notifBatch = nearbyUserIds.map(uid => ({
      user_id: uid,
      title: `🚨 ${pet.name} אבד/ה באזורך!`,
      message: `${breedText} בשם ${pet.name} נעלמ/ה באזור ${city}. אם ראית — עזור/י!`,
      type: 'alert',
      category: 'lost_pet',
      data: { pet_id: pet.id, post_id: newPost?.id, pet_name: pet.name, city },
    }));

    if (notifBatch.length > 0) {
      // Insert in chunks of 50
      for (let i = 0; i < notifBatch.length; i += 50) {
        const chunk = notifBatch.slice(i, i + 50);
        await supabase.from('notifications').insert(chunk);
      }
    }

    // 8. Send push notifications to nearby users
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
              title: `🚨 ${pet.name} אבד/ה באזורך!`,
              body: `${breedText} בשם ${pet.name} נעלמ/ה ב${city}. עזור/י למצוא!`,
              icon: pet.avatar_url || '/pwa-192x192.png',
              url: '/home',
            },
          }),
        });
        if (resp.ok) pushSent++;
        await resp.text(); // consume body
      } catch (e) {
        console.error(`Push failed for ${uid}:`, e);
      }
    }

    // 9. Log agent action (Alona = post, Guy = notifications)
    await supabase.from('agent_action_logs').insert([
      {
        action_type: 'lost_pet_post',
        description: `Alona published lost pet post for ${pet.name}`,
        bot_id: null,
        reason: 'Emergency lost pet protocol triggered',
        expected_outcome: 'Community awareness',
        actual_outcome: `Post created${newPost?.id ? ` (${newPost.id})` : ''}`,
      },
      {
        action_type: 'lost_pet_notifications',
        description: `Guy sent ${pushSent}/${nearbyUserIds.length} push notifications for ${pet.name}`,
        bot_id: null,
        reason: 'Geofenced alert protocol',
        expected_outcome: `Notify ${nearbyUserIds.length} nearby users`,
        actual_outcome: `${pushSent} push sent, ${notifBatch.length} in-app notifications`,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        post_id: newPost?.id,
        nearby_users: nearbyUserIds.length,
        push_sent: pushSent,
        notifications_created: notifBatch.length,
        city,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Lost pet alert error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
