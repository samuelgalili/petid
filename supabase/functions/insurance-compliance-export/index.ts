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
    const { lead_id, pet_id } = await req.json();

    // Fetch user consent data
    const { data: profile } = await supabase
      .from('profiles')
      .select('ai_consent_given, ai_consent_date, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.ai_consent_given) {
      return new Response(
        JSON.stringify({ error: 'User has not provided AI consent' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch pet health data
    const { data: pet } = await supabase
      .from('pets')
      .select('*')
      .eq('id', pet_id)
      .eq('owner_id', userId)
      .single();

    // Calculate health score (simplified NRC-based)
    const healthFields = [
      'breed', 'birth_date', 'weight', 'microchip_number',
      'vet_name', 'current_food', 'is_neutered', 'gender',
    ];
    const filled = healthFields.filter(f => pet?.[f] !== null && pet?.[f] !== '' && pet?.[f] !== false).length;
    const healthScore = Math.round((filled / healthFields.length) * 100);

    // Fetch insurance lead if provided
    let leadData = null;
    if (lead_id) {
      const { data } = await supabase
        .from('insurance_leads')
        .select('*')
        .eq('id', lead_id)
        .eq('user_id', userId)
        .single();
      leadData = data;
    }

    // Build compliance export
    const complianceExport = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      user_consent: {
        given: profile.ai_consent_given,
        date: profile.ai_consent_date,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      },
      pet_health: {
        pet_id: pet?.id,
        pet_name: pet?.name,
        breed: pet?.breed,
        health_score: healthScore,
        health_score_basis: 'NRC 2006 profile completeness',
        verified_fields: healthFields.filter(f => pet?.[f] !== null && pet?.[f] !== ''),
      },
      medical_summary_link: pet_id
        ? `${supabaseUrl}/storage/v1/object/public/pet-documents/${userId}/${pet_id}/medical-summary.pdf`
        : null,
      lead_data: leadData ? {
        id: leadData.id,
        pet_name: leadData.pet_name,
        breed: leadData.breed,
        age_years: leadData.age_years,
        selected_plan: leadData.selected_plan,
        status: leadData.status,
      } : null,
    };

    // Log the export for audit
    await supabase.from('agent_data_access_log').insert({
      agent_slug: 'insurance-compliance',
      agent_name: 'Insurance Compliance Export',
      action_type: 'read',
      entity_type: 'pet',
      entity_id: pet_id,
      user_id: userId,
      data_fields: ['consent', 'health_score', 'medical_summary', 'lead_data'],
      reason: 'Compliance export for insurance partner',
    });

    return new Response(
      JSON.stringify(complianceExport),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Compliance Export] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
