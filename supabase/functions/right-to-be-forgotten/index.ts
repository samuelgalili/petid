import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    const { export_data } = await req.json();

    // Step 1: Collect all user data for export
    let exportPayload: Record<string, any> = {};

    if (export_data) {
      const [profileRes, petsRes, feedbackRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('pets').select('*').eq('owner_id', userId),
        supabase.from('user_feedback').select('*').eq('user_id', userId),
        supabase.from('posts').select('*').eq('user_id', userId),
      ]);

      exportPayload = {
        profile: profileRes.data,
        pets: petsRes.data || [],
        feedback: feedbackRes.data || [],
        posts: postsRes.data || [],
        exported_at: new Date().toISOString(),
      };
    }

    // Step 2: Delete all user data across tables
    const tablesToClean = [
      { table: 'user_feedback', column: 'user_id' },
      { table: 'rage_click_events', column: 'user_id' },
      { table: 'agent_data_access_log', column: 'user_id' },
      { table: 'posts', column: 'user_id' },
      { table: 'comments', column: 'user_id' },
      { table: 'likes', column: 'user_id' },
      { table: 'pet_care_plans', column: 'user_id' },
      { table: 'pet_documents', column: 'user_id' },
      { table: 'stories', column: 'user_id' },
      { table: 'notifications', column: 'user_id' },
      { table: 'achievements', column: 'user_id' },
      { table: 'orders', column: 'user_id' },
      { table: 'followers', column: 'follower_id' },
      { table: 'followers', column: 'following_id' },
    ];

    const deletionLog: string[] = [];

    for (const { table, column } of tablesToClean) {
      try {
        const { count } = await supabase
          .from(table)
          .delete({ count: 'exact' })
          .eq(column, userId);
        if (count && count > 0) {
          deletionLog.push(`${table}: ${count} records deleted`);
        }
      } catch {
        // Table might not exist, skip
      }
    }

    // Delete pets
    try {
      const { count } = await supabase
        .from('pets')
        .delete({ count: 'exact' })
        .eq('owner_id', userId);
      if (count && count > 0) {
        deletionLog.push(`pets: ${count} records deleted`);
      }
    } catch {}

    // Delete profile last
    try {
      await supabase.from('profiles').delete().eq('id', userId);
      deletionLog.push('profile: deleted');
    } catch {}

    // Log the deletion in audit
    await supabase.from('admin_audit_log').insert({
      admin_id: userId,
      action_type: 'right_to_be_forgotten',
      entity_type: 'user',
      entity_id: userId,
      metadata: { deletion_log: deletionLog },
    });

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    return new Response(
      JSON.stringify({
        success: true,
        export: export_data ? exportPayload : undefined,
        deletion_log: deletionLog,
        auth_deleted: !deleteError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[RTBF] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
