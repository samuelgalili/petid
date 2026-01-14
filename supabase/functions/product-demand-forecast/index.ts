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

    // Get sales history for last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: salesData } = await supabase
      .from('order_items')
      .select('quantity, created_at')
      .eq('product_id', productId)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (!salesData || salesData.length === 0) {
      return new Response(
        JSON.stringify({
          productId,
          forecast: {
            predictedDemand: 0,
            confidence: 0,
            trend: 'unknown',
            seasonality: 'none'
          },
          message: 'אין מספיק נתונים לתחזית'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by week
    const weeklyData: number[] = [];
    let weekStart = new Date(ninetyDaysAgo);
    
    for (let i = 0; i < 13; i++) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekSales = salesData
        .filter(s => {
          const date = new Date(s.created_at);
          return date >= weekStart && date < weekEnd;
        })
        .reduce((sum, s) => sum + s.quantity, 0);
      
      weeklyData.push(weekSales);
      weekStart = weekEnd;
    }

    // Calculate trend (simple linear regression)
    const n = weeklyData.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = weeklyData.reduce((a, b) => a + b, 0);
    const sumXY = weeklyData.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Trend direction
    let trend: 'rising' | 'falling' | 'stable';
    if (slope > 0.5) trend = 'rising';
    else if (slope < -0.5) trend = 'falling';
    else trend = 'stable';

    // Calculate weekly average
    const avgWeekly = sumY / n;

    // Predict future demand
    const weeksAhead = Math.ceil(daysAhead / 7);
    let predictedDemand = 0;
    
    for (let i = 0; i < weeksAhead; i++) {
      predictedDemand += Math.max(0, intercept + slope * (n + i));
    }

    // Calculate confidence based on data consistency
    const variance = weeklyData.reduce((sum, val) => sum + Math.pow(val - avgWeekly, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgWeekly > 0 ? stdDev / avgWeekly : 1;
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation * 50));

    // Seasonality detection (compare recent vs historical)
    const recentAvg = weeklyData.slice(-4).reduce((a, b) => a + b, 0) / 4;
    const historicalAvg = weeklyData.slice(0, -4).reduce((a, b) => a + b, 0) / Math.max(1, weeklyData.length - 4);
    
    let seasonality: 'high' | 'low' | 'none' = 'none';
    if (recentAvg > historicalAvg * 1.3) seasonality = 'high';
    else if (recentAvg < historicalAvg * 0.7) seasonality = 'low';

    // Recommendations
    const recommendations: string[] = [];
    
    if (trend === 'rising') {
      recommendations.push('📈 ביקוש עולה - שקול להגדיל מלאי');
    } else if (trend === 'falling') {
      recommendations.push('📉 ביקוש יורד - שקול לקדם את המוצר');
    }
    
    if (seasonality === 'high') {
      recommendations.push('🔥 עונת שיא - הזמן מלאי נוסף');
    } else if (seasonality === 'low') {
      recommendations.push('❄️ תקופה חלשה - שקול מבצע');
    }

    if (avgWeekly < 1) {
      recommendations.push('⚠️ מכירות נמוכות - בדוק מחיר ותיאור');
    }

    return new Response(
      JSON.stringify({
        productId,
        forecast: {
          predictedDemand: Math.round(predictedDemand),
          avgWeekly: Math.round(avgWeekly * 10) / 10,
          trend,
          trendSlope: Math.round(slope * 100) / 100,
          seasonality,
          confidence: Math.round(confidence),
          daysAhead
        },
        historicalData: weeklyData,
        recommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in product-demand-forecast:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
