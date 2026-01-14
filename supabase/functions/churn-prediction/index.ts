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
    const { customerId, analyzeAll } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const analyzeCustomer = async (userId: string) => {
      // Get customer profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, last_active_at, loyalty_points')
        .eq('id', userId)
        .single();

      // Get order history
      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_amount, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Calculate churn indicators
      let churnScore = 0;
      const reasons: string[] = [];

      // Days since last activity
      const lastActive = profile?.last_active_at ? new Date(profile.last_active_at) : new Date(profile?.created_at || Date.now());
      const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActive > 90) {
        churnScore += 40;
        reasons.push('לא פעיל יותר מ-90 יום');
      } else if (daysSinceActive > 60) {
        churnScore += 25;
        reasons.push('לא פעיל יותר מ-60 יום');
      } else if (daysSinceActive > 30) {
        churnScore += 10;
        reasons.push('לא פעיל יותר מ-30 יום');
      }

      // Order frequency decline
      if (orders && orders.length >= 2) {
        const recentOrders = orders.slice(0, 5);
        const olderOrders = orders.slice(5, 10);
        
        if (olderOrders.length > 0) {
          const recentFreq = recentOrders.length;
          const olderFreq = olderOrders.length;
          
          if (recentFreq < olderFreq * 0.5) {
            churnScore += 20;
            reasons.push('ירידה בתדירות הזמנות');
          }
        }
      }

      // No orders in last 60 days
      const lastOrderDate = orders?.[0]?.created_at ? new Date(orders[0].created_at) : null;
      if (lastOrderDate) {
        const daysSinceOrder = Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceOrder > 60) {
          churnScore += 20;
          reasons.push('אין הזמנות ב-60 הימים האחרונים');
        }
      } else if (!orders?.length) {
        churnScore += 15;
        reasons.push('אין היסטוריית הזמנות');
      }

      // Low loyalty points
      if ((profile?.loyalty_points || 0) < 100) {
        churnScore += 10;
        reasons.push('נקודות נאמנות נמוכות');
      }

      // Cancelled orders
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled') || [];
      if (cancelledOrders.length > 2) {
        churnScore += 15;
        reasons.push('מספר ביטולים גבוה');
      }

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (churnScore >= 70) riskLevel = 'critical';
      else if (churnScore >= 50) riskLevel = 'high';
      else if (churnScore >= 30) riskLevel = 'medium';
      else riskLevel = 'low';

      // Suggested actions
      const suggestedActions: string[] = [];
      if (riskLevel === 'critical' || riskLevel === 'high') {
        suggestedActions.push('שליחת קופון הנחה אישי');
        suggestedActions.push('יצירת קשר טלפוני');
      }
      if (daysSinceActive > 30) {
        suggestedActions.push('שליחת מייל "מתגעגעים אליך"');
      }
      if ((profile?.loyalty_points || 0) > 0) {
        suggestedActions.push('תזכורת על נקודות נאמנות שטרם נוצלו');
      }

      return {
        customerId: userId,
        churnScore: Math.min(100, churnScore),
        riskLevel,
        reasons,
        suggestedActions,
        lastActive: profile?.last_active_at || profile?.created_at,
        totalOrders: orders?.length || 0,
        loyaltyPoints: profile?.loyalty_points || 0
      };
    };

    if (analyzeAll) {
      // Get all customers with recent activity or orders
      const { data: customers } = await supabase
        .from('profiles')
        .select('id')
        .limit(100);

      const results = await Promise.all(
        (customers || []).map(c => analyzeCustomer(c.id))
      );

      // Sort by churn score
      results.sort((a, b) => b.churnScore - a.churnScore);

      return new Response(
        JSON.stringify({
          atRiskCustomers: results.filter(r => r.riskLevel !== 'low'),
          summary: {
            total: results.length,
            critical: results.filter(r => r.riskLevel === 'critical').length,
            high: results.filter(r => r.riskLevel === 'high').length,
            medium: results.filter(r => r.riskLevel === 'medium').length,
            low: results.filter(r => r.riskLevel === 'low').length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const result = await analyzeCustomer(customerId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in churn-prediction:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
