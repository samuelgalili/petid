import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, scanAllRecent } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get baseline statistics
    const { data: allOrders } = await supabase
      .from('orders')
      .select('total_amount, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(1000);

    const amounts = (allOrders || []).map(o => o.total_amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / (amounts.length || 1);
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) / (amounts.length || 1)
    );

    const detectAnomalies = async (order: any) => {
      const anomalies: { type: string; severity: 'low' | 'medium' | 'high'; description: string }[] = [];

      // Unusual amount
      const zScore = (order.total_amount - avgAmount) / (stdDev || 1);
      if (Math.abs(zScore) > 3) {
        anomalies.push({
          type: 'unusual_amount',
          severity: 'high',
          description: `סכום חריג: ₪${order.total_amount} (ממוצע: ₪${Math.round(avgAmount)})`
        });
      } else if (Math.abs(zScore) > 2) {
        anomalies.push({
          type: 'unusual_amount',
          severity: 'medium',
          description: `סכום גבוה מהרגיל: ₪${order.total_amount}`
        });
      }

      // Check customer history
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('user_id', order.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      // New customer with large order
      if ((customerOrders?.length || 0) <= 1 && order.total_amount > avgAmount * 2) {
        anomalies.push({
          type: 'new_customer_large_order',
          severity: 'medium',
          description: 'לקוח חדש עם הזמנה גדולה'
        });
      }

      // Multiple orders in short time
      const recentCustomerOrders = customerOrders?.filter(o => {
        const orderTime = new Date(o.created_at).getTime();
        const currentTime = new Date(order.created_at).getTime();
        return Math.abs(currentTime - orderTime) < 3600000; // 1 hour
      });
      
      if ((recentCustomerOrders?.length || 0) > 3) {
        anomalies.push({
          type: 'rapid_ordering',
          severity: 'high',
          description: `${recentCustomerOrders?.length} הזמנות בשעה האחרונה`
        });
      }

      // Time anomaly (unusual hour)
      const orderHour = new Date(order.created_at).getHours();
      if (orderHour >= 2 && orderHour <= 5) {
        anomalies.push({
          type: 'unusual_time',
          severity: 'low',
          description: `הזמנה בשעה לא שגרתית (${orderHour}:00)`
        });
      }

      return {
        orderId: order.id,
        totalAmount: order.total_amount,
        createdAt: order.created_at,
        userId: order.user_id,
        anomalies,
        riskScore: anomalies.reduce((score, a) => {
          if (a.severity === 'high') return score + 40;
          if (a.severity === 'medium') return score + 20;
          return score + 10;
        }, 0),
        requiresReview: anomalies.some(a => a.severity === 'high')
      };
    };

    if (scanAllRecent) {
      // Scan recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(50);

      const results = await Promise.all(
        (recentOrders || []).map(order => detectAnomalies(order))
      );

      const flaggedOrders = results.filter(r => r.anomalies.length > 0);

      return new Response(
        JSON.stringify({
          scannedCount: recentOrders?.length || 0,
          flaggedCount: flaggedOrders.length,
          highRiskCount: flaggedOrders.filter(o => o.requiresReview).length,
          flaggedOrders: flaggedOrders.sort((a, b) => b.riskScore - a.riskScore),
          baseline: {
            avgOrderAmount: Math.round(avgAmount),
            stdDeviation: Math.round(stdDev)
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (orderId) {
      const { data: order } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, user_id')
        .eq('id', orderId)
        .single();

      if (!order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await detectAnomalies(order);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Please provide orderId or set scanAllRecent: true' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in order-anomaly-detection:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
