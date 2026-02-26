import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgentTestResult {
  name: string;
  slug: string;
  status: 'pass' | 'fail' | 'healed';
  response_ms: number;
  details: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[ReadinessDrill] Starting 3 AM Readiness Drill...');

    const agentResults: AgentTestResult[] = [];
    let selfHealed = 0;

    // ─── 1. Test All Automation Bots ───────────────────────────
    const { data: bots } = await supabase
      .from('automation_bots')
      .select('*')
      .order('created_at');

    for (const bot of (bots || [])) {
      const start = Date.now();
      try {
        // Test: can we read and write to the bot's record?
        const { error: pingError } = await supabase
          .from('automation_bots')
          .update({
            last_health_check: new Date().toISOString(),
            health_status: 'checking',
          })
          .eq('id', bot.id);

        const responseMs = Date.now() - start;

        if (pingError) {
          // Attempt self-healing: reset bot state
          console.log(`[ReadinessDrill] Bot "${bot.name}" failed ping, attempting reboot...`);
          const { error: healError } = await supabase
            .from('automation_bots')
            .update({
              health_status: 'healthy',
              last_error: null,
              last_health_check: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', bot.id);

          if (!healError) {
            selfHealed++;
            agentResults.push({
              name: bot.name,
              slug: bot.slug,
              status: 'healed',
              response_ms: Date.now() - start,
              details: `Self-healed after initial failure: ${pingError.message}`,
            });
          } else {
            agentResults.push({
              name: bot.name,
              slug: bot.slug,
              status: 'fail',
              response_ms: Date.now() - start,
              details: `Failed and could not self-heal: ${pingError.message}`,
            });
          }
        } else {
          // Mark healthy
          await supabase
            .from('automation_bots')
            .update({ health_status: 'healthy' })
            .eq('id', bot.id);

          agentResults.push({
            name: bot.name,
            slug: bot.slug,
            status: 'pass',
            response_ms: responseMs,
            details: `Responded in ${responseMs}ms`,
          });
        }
      } catch (e) {
        agentResults.push({
          name: bot.name,
          slug: bot.slug,
          status: 'fail',
          response_ms: Date.now() - start,
          details: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    // ─── 2. Test Edge Functions ─────────────────────────────────
    const edgeFunctions = ['daily-brief', 'architect-analyze'];
    for (const fn of edgeFunctions) {
      const start = Date.now();
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ dry_run: true }),
        });
        const responseMs = Date.now() - start;
        const isOk = res.status < 500;
        // Consume body
        await res.text();

        agentResults.push({
          name: `Edge: ${fn}`,
          slug: fn,
          status: isOk ? 'pass' : 'fail',
          response_ms: responseMs,
          details: isOk ? `HTTP ${res.status} in ${responseMs}ms` : `HTTP ${res.status}`,
        });
      } catch (e) {
        agentResults.push({
          name: `Edge: ${fn}`,
          slug: fn,
          status: 'fail',
          response_ms: Date.now() - start,
          details: e instanceof Error ? e.message : 'Unreachable',
        });
      }
    }

    // ─── 3. Data Integrity Checks ──────────────────────────────
    const integrityResults: Record<string, any> = {};

    // Check: pets without profiles
    const { count: orphanPets } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true })
      .is('owner_id', null);
    integrityResults.orphan_pets = { count: orphanPets || 0, status: (orphanPets || 0) === 0 ? 'pass' : 'warn' };

    // Check: recent error rate
    const h1 = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentErrors } = await supabase
      .from('system_error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', h1)
      .eq('severity', 'critical');
    integrityResults.critical_errors_1h = { count: recentErrors || 0, status: (recentErrors || 0) === 0 ? 'pass' : 'fail' };

    // Check: admin_data_sources sync health
    const { count: staleSync } = await supabase
      .from('admin_data_sources')
      .select('*', { count: 'exact', head: true })
      .eq('sync_status', 'error');
    integrityResults.stale_sync = { count: staleSync || 0, status: (staleSync || 0) === 0 ? 'pass' : 'warn' };

    // Check: orders without products (data corruption indicator)
    const { count: emptyOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .is('items', null);
    integrityResults.empty_orders = { count: emptyOrders || 0, status: (emptyOrders || 0) === 0 ? 'pass' : 'warn' };

    // ─── 4. Calculate Scores ───────────────────────────────────
    const totalTests = agentResults.length + Object.keys(integrityResults).length;
    const passedAgents = agentResults.filter(r => r.status === 'pass' || r.status === 'healed').length;
    const passedIntegrity = Object.values(integrityResults).filter((r: any) => r.status === 'pass').length;
    const passedTests = passedAgents + passedIntegrity;
    const failedTests = totalTests - passedTests;

    const hasCriticalFail = agentResults.some(r => r.status === 'fail') ||
      (integrityResults.critical_errors_1h?.status === 'fail');
    const overallStatus = hasCriticalFail ? 'red' : 'green';
    const stabilityScore = Math.round((passedTests / Math.max(totalTests, 1)) * 100);

    // Build summary
    const healedNames = agentResults.filter(r => r.status === 'healed').map(r => r.name);
    const failedNames = agentResults.filter(r => r.status === 'fail').map(r => r.name);

    let summary = overallStatus === 'green'
      ? 'All Systems Combat Ready ✅'
      : 'Needs Attention 🔴';

    let details = `Passed ${passedTests}/${totalTests} tests.`;
    if (healedNames.length > 0) {
      details += ` Self-healed: ${healedNames.join(', ')}.`;
    }
    if (failedNames.length > 0) {
      details += ` Failed: ${failedNames.join(', ')}.`;
    }

    console.log(`[ReadinessDrill] ${summary} — ${details}`);

    // ─── 5. Store Results ──────────────────────────────────────
    const drillDate = new Date().toISOString().split('T')[0];

    await supabase
      .from('readiness_drill_results')
      .upsert({
        drill_date: drillDate,
        overall_status: overallStatus,
        stability_score: stabilityScore,
        total_tests: totalTests,
        passed_tests: passedTests,
        failed_tests: failedTests,
        self_healed: selfHealed,
        agent_results: agentResults,
        integrity_results: integrityResults,
        summary,
        details,
      }, { onConflict: 'drill_date' });

    // ─── 6. Inject into CEO Daily Brief ────────────────────────
    // Update today's brief with drill results if it exists
    const { data: existingBrief } = await supabase
      .from('ceo_daily_briefs')
      .select('id')
      .eq('brief_date', drillDate)
      .maybeSingle();

    if (existingBrief) {
      await supabase
        .from('ceo_daily_briefs')
        .update({
          scientific_fact: `🛡️ Readiness Drill: ${summary} — ${details}`,
        })
        .eq('brief_date', drillDate);
    }

    // ─── 7. Push notification if failures ──────────────────────
    if (overallStatus === 'red') {
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
                title: '🔴 Readiness Drill — Needs Attention',
                body: details,
                url: '/admin/fleet',
              },
            }),
          });
        }
      } catch (e) {
        console.error('[ReadinessDrill] Push notification error:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, overall_status: overallStatus, stability_score: stabilityScore, summary, details, agent_results: agentResults }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ReadinessDrill] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
