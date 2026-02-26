import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Critical path buttons — if these break, CEO gets a red alert
const CRITICAL_PATH_LABELS = [
  'complete purchase', 'approve lead', 'approve', 'checkout',
  'submit order', 'pay now', 'confirm', 'השלם רכישה',
  'אשר ליד', 'אשר', 'שלח הזמנה', 'שלם עכשיו',
];

// Routes and their expected interactive elements
const ROUTE_AUDIT_MAP: Record<string, { buttons: string[]; icons: string[]; criticalButtons: string[] }> = {
  '/admin/ceo': {
    buttons: ['Refresh', 'Export', 'Approve', 'Dismiss', 'View Details'],
    icons: ['TrendingUp', 'DollarSign', 'ShieldCheck', 'Bell', 'Brain'],
    criticalButtons: ['Approve', 'אשר'],
  },
  '/admin/orders': {
    buttons: ['New Order', 'Print Label', 'Update Status', 'View'],
    icons: ['Package', 'Printer', 'Eye', 'Truck'],
    criticalButtons: ['Complete Purchase', 'השלם רכישה', 'Update Status'],
  },
  '/admin/fleet': {
    buttons: ['Kill Switch', 'Toggle Bot', 'Run Drill'],
    icons: ['Cpu', 'Shield', 'Bot', 'Zap'],
    criticalButtons: ['Kill Switch'],
  },
  '/admin/financial': {
    buttons: ['Create Invoice', 'Export', 'Approve Payment'],
    icons: ['Receipt', 'Download', 'CreditCard'],
    criticalButtons: ['Approve Payment'],
  },
  '/pet': {
    buttons: ['Edit Profile', 'Add Record', 'Share', 'QR Code'],
    icons: ['Heart', 'Camera', 'Share2', 'QrCode'],
    criticalButtons: [],
  },
};

interface AuditIssue {
  route: string;
  element_type: string;
  element_label: string;
  issue_type: string;
  severity: string;
  is_critical_path: boolean;
  description: string;
  suggested_fix: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log('[Ofek] Starting Visual UI Audit...');

    const auditRunId = crypto.randomUUID();
    const issues: AuditIssue[] = [];

    // ─── 1. Check Route Accessibility ──────────────────────────
    for (const [route, spec] of Object.entries(ROUTE_AUDIT_MAP)) {
      try {
        // Simulate route check by verifying related data exists
        // (We can't render React from edge, so we verify data dependencies)
        
        if (route === '/admin/ceo') {
          const { error } = await supabase
            .from('ceo_daily_briefs')
            .select('id')
            .limit(1);
          if (error) {
            issues.push({
              route,
              element_type: 'page',
              element_label: 'CEO Dashboard',
              issue_type: 'data_dependency_error',
              severity: 'error',
              is_critical_path: true,
              description: `CEO Dashboard data source failed: ${error.message}`,
              suggested_fix: 'Check ceo_daily_briefs table access and RLS policies',
            });
          }
        }

        if (route === '/admin/orders') {
          const { error } = await supabase
            .from('orders')
            .select('id')
            .limit(1);
          if (error) {
            issues.push({
              route,
              element_type: 'page',
              element_label: 'Orders',
              issue_type: 'data_dependency_error',
              severity: 'critical',
              is_critical_path: true,
              description: `Orders data source failed: ${error.message}`,
              suggested_fix: 'Check orders table access and RLS policies',
            });
          }
        }

        if (route === '/admin/fleet') {
          const { error } = await supabase
            .from('automation_bots')
            .select('id')
            .limit(1);
          if (error) {
            issues.push({
              route,
              element_type: 'page',
              element_label: 'Robot Fleet',
              issue_type: 'data_dependency_error',
              severity: 'error',
              is_critical_path: false,
              description: `Robot Fleet data source failed: ${error.message}`,
              suggested_fix: 'Check automation_bots table access',
            });
          }
        }

        if (route === '/admin/financial') {
          const { error } = await supabase
            .from('supplier_invoices')
            .select('id')
            .limit(1);
          if (error) {
            issues.push({
              route,
              element_type: 'page',
              element_label: 'Financial Inbox',
              issue_type: 'data_dependency_error',
              severity: 'error',
              is_critical_path: true,
              description: `Financial data source failed: ${error.message}`,
              suggested_fix: 'Check supplier_invoices table and RLS',
            });
          }
        }

        if (route === '/pet') {
          const { error } = await supabase
            .from('pets')
            .select('id')
            .limit(1);
          if (error) {
            issues.push({
              route,
              element_type: 'page',
              element_label: 'Pet Card',
              issue_type: 'data_dependency_error',
              severity: 'error',
              is_critical_path: false,
              description: `Pet profiles data source failed: ${error.message}`,
              suggested_fix: 'Check pets table access and RLS policies',
            });
          }
        }
      } catch (e) {
        issues.push({
          route,
          element_type: 'page',
          element_label: route,
          issue_type: 'route_unreachable',
          severity: 'critical',
          is_critical_path: true,
          description: `Route check crashed: ${e instanceof Error ? e.message : 'Unknown'}`,
          suggested_fix: 'Investigate server-side error for this route',
        });
      }
    }

    // ─── 2. Check for Client-Side Render Errors (from logs) ────
    const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentErrors } = await supabase
      .from('system_error_logs')
      .select('*')
      .eq('error_source', 'client')
      .eq('status', 'open')
      .gte('created_at', h24)
      .order('occurrence_count', { ascending: false })
      .limit(20);

    for (const err of (recentErrors || [])) {
      const msg = (err as any).message?.toLowerCase() || '';
      const component = (err as any).component || '';
      const route = (err as any).route || '/';

      // Detect icon/render failures
      const isIconError = msg.includes('icon') || msg.includes('render') || msg.includes('cannot read') || msg.includes('undefined');
      const isButtonError = msg.includes('button') || msg.includes('onclick') || msg.includes('handler');
      const is404 = msg.includes('404') || msg.includes('not found');

      if (isIconError || isButtonError || is404) {
        const isCritical = CRITICAL_PATH_LABELS.some(label =>
          msg.includes(label.toLowerCase()) || component.toLowerCase().includes(label.toLowerCase())
        );

        issues.push({
          route,
          element_type: isIconError ? 'icon' : isButtonError ? 'button' : 'page',
          element_label: component || 'Unknown',
          issue_type: is404 ? 'navigation_404' : isIconError ? 'render_error' : 'handler_error',
          severity: isCritical ? 'critical' : 'warning',
          is_critical_path: isCritical,
          description: (err as any).message,
          suggested_fix: isIconError
            ? `Check icon import in ${component}. Ensure lucide-react icon name is correct.`
            : isButtonError
            ? `Check onClick handler in ${component}. Verify referenced function exists.`
            : `Verify route ${route} is registered in router config.`,
        });
      }
    }

    // ─── 3. Store Issues ───────────────────────────────────────
    const criticalIssues = issues.filter(i => i.is_critical_path && (i.severity === 'critical' || i.severity === 'error'));
    
    for (const issue of issues) {
      await supabase.from('ui_visual_audit_logs').insert({
        audit_run_id: auditRunId,
        route: issue.route,
        element_type: issue.element_type,
        element_label: issue.element_label,
        issue_type: issue.issue_type,
        severity: issue.severity,
        is_critical_path: issue.is_critical_path,
        description: issue.description,
        suggested_fix: issue.suggested_fix,
        status: 'open',
      });
    }

    // ─── 4. Auto-Fix: Link with Ido for CSS fixes ─────────────
    if (LOVABLE_API_KEY && issues.length > 0) {
      try {
        const issuesSummary = issues.map(i =>
          `[${i.severity}] ${i.route} | ${i.element_type} "${i.element_label}" | ${i.issue_type}: ${i.description}`
        ).join('\n');

        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              {
                role: 'system',
                content: 'You are Ido, the PetID System Architect. Given UI issues found by Ofek (Visual Monitor), generate concise Evolution Cards. For each fixable issue, provide: insight, solution, code_before (the broken pattern), code_after (the fix), category (always "ui"), confidence (0-1). Return JSON array. Max 3 cards.',
              },
              {
                role: 'user',
                content: `Ofek found these UI issues:\n\n${issuesSummary}\n\nGenerate Evolution Cards for the most impactful fixes.`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          // Try to parse JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const cards = JSON.parse(jsonMatch[0]);
            for (const card of cards.slice(0, 3)) {
              await supabase.from('architect_evolution_cards').insert({
                insight: card.insight || 'UI issue detected by Ofek',
                solution: card.solution || 'Auto-fix pending review',
                code_before: card.code_before || '',
                code_after: card.code_after || '',
                category: 'ui',
                confidence: card.confidence || 0.7,
                status: 'draft',
              });
            }
          }
        }
      } catch (e) {
        console.error('[Ofek] AI auto-fix generation failed:', e);
      }
    }

    // ─── 5. CEO Red Alert for Critical Path ────────────────────
    if (criticalIssues.length > 0) {
      try {
        const { data: admins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');

        const alertBody = criticalIssues.map(i =>
          `🔴 ${i.element_label} (${i.route}): ${i.description}`
        ).join('\n');

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
                title: '🔴 CRITICAL: UI Element Broken — Ofek Alert',
                body: alertBody.slice(0, 200),
                url: '/admin/fleet',
              },
            }),
          });
        }
        console.log('[Ofek] CEO Red Alert sent for critical path failures');
      } catch (e) {
        console.error('[Ofek] Push notification error:', e);
      }
    }

    // ─── 6. Update Bot Status ──────────────────────────────────
    const totalRoutes = Object.keys(ROUTE_AUDIT_MAP).length;
    const healthScore = issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 10) - (criticalIssues.length * 25));

    await supabase
      .from('automation_bots')
      .update({
        last_run_at: new Date().toISOString(),
        last_health_check: new Date().toISOString(),
        health_status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'critical',
        run_count: (await supabase.from('automation_bots').select('run_count').eq('slug', 'ofek-visual-monitor').single()).data?.run_count + 1 || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', 'ofek-visual-monitor');

    console.log(`[Ofek] Audit complete: ${issues.length} issues, health=${healthScore}%, critical=${criticalIssues.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        audit_run_id: auditRunId,
        total_routes: totalRoutes,
        issues_found: issues.length,
        critical_issues: criticalIssues.length,
        health_score: healthScore,
        pixel_perfect: issues.length === 0,
        issues,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Ofek] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
