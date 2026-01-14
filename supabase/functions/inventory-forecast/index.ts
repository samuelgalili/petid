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
    const { productId, daysAhead = 30 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current inventory
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .single();

    // Get historical sales data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: salesData } = await supabase
      .from('order_items')
      .select('quantity, created_at')
      .eq('product_id', productId)
      .gte('created_at', ninetyDaysAgo.toISOString());

    // Calculate daily sales rate
    const totalSold = salesData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const dailySalesRate = totalSold / 90;

    // Weekly pattern analysis
    const weekdaySales: number[] = [0, 0, 0, 0, 0, 0, 0];
    salesData?.forEach(item => {
      const day = new Date(item.created_at).getDay();
      weekdaySales[day] += item.quantity;
    });
    const avgWeekdaySales = weekdaySales.map(s => s / 13); // 90 days ≈ 13 weeks

    // Trend analysis (comparing recent vs older sales)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSales = salesData?.filter(s => new Date(s.created_at) >= thirtyDaysAgo) || [];
    const olderSales = salesData?.filter(s => new Date(s.created_at) < thirtyDaysAgo) || [];
    
    const recentTotal = recentSales.reduce((sum, item) => sum + item.quantity, 0);
    const olderTotal = olderSales.reduce((sum, item) => sum + item.quantity, 0);
    
    const trend = olderTotal > 0 ? ((recentTotal - olderTotal / 2) / (olderTotal / 2)) * 100 : 0;

    // Forecast calculation
    const currentStock = inventory?.quantity || 0;
    const forecastedDemand = Math.round(dailySalesRate * daysAhead * (1 + trend / 100));
    const daysUntilStockout = dailySalesRate > 0 ? Math.floor(currentStock / dailySalesRate) : 999;
    
    // Reorder recommendation
    const safetyStock = Math.round(dailySalesRate * 14); // 2 weeks safety stock
    const reorderPoint = Math.round(dailySalesRate * 21); // 3 weeks lead time
    const recommendedOrderQty = Math.max(0, forecastedDemand + safetyStock - currentStock);

    // Risk assessment
    let stockRisk: 'low' | 'medium' | 'high' | 'critical';
    if (daysUntilStockout <= 7) stockRisk = 'critical';
    else if (daysUntilStockout <= 14) stockRisk = 'high';
    else if (daysUntilStockout <= 30) stockRisk = 'medium';
    else stockRisk = 'low';

    // Alerts
    const alerts: string[] = [];
    if (daysUntilStockout <= 7) {
      alerts.push('⚠️ מלאי קריטי - צפוי להיגמר תוך שבוע');
    }
    if (currentStock < reorderPoint) {
      alerts.push('📦 הגיע זמן להזמין מלאי חדש');
    }
    if (trend > 30) {
      alerts.push('📈 עלייה משמעותית בביקוש - שקול להגדיל הזמנה');
    }
    if (trend < -30) {
      alerts.push('📉 ירידה בביקוש - שקול להקטין הזמנה');
    }

    return new Response(
      JSON.stringify({
        productId,
        currentStock,
        forecast: {
          dailySalesRate: Math.round(dailySalesRate * 100) / 100,
          forecastedDemand,
          daysUntilStockout,
          trend: Math.round(trend),
          trendDirection: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable'
        },
        recommendations: {
          reorderPoint,
          safetyStock,
          recommendedOrderQty,
          stockRisk
        },
        weeklyPattern: {
          sunday: Math.round(avgWeekdaySales[0] * 10) / 10,
          monday: Math.round(avgWeekdaySales[1] * 10) / 10,
          tuesday: Math.round(avgWeekdaySales[2] * 10) / 10,
          wednesday: Math.round(avgWeekdaySales[3] * 10) / 10,
          thursday: Math.round(avgWeekdaySales[4] * 10) / 10,
          friday: Math.round(avgWeekdaySales[5] * 10) / 10,
          saturday: Math.round(avgWeekdaySales[6] * 10) / 10
        },
        alerts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in inventory-forecast:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
