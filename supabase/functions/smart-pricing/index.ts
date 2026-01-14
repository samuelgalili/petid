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
    const { productId, currentPrice, category, competitorPrices } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get sales data for this product
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('quantity, price_at_time, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate average sales velocity
    const totalSold = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const avgPrice = orderItems?.length 
      ? orderItems.reduce((sum, item) => sum + item.price_at_time, 0) / orderItems.length 
      : currentPrice;

    // Get similar products in category
    const { data: similarProducts } = await supabase
      .from('business_products')
      .select('price, sale_price')
      .eq('category', category)
      .neq('id', productId)
      .limit(20);

    const categoryAvgPrice = similarProducts?.length
      ? similarProducts.reduce((sum, p) => sum + (p.sale_price || p.price), 0) / similarProducts.length
      : currentPrice;

    // AI pricing recommendations
    let suggestedPrice = currentPrice;
    let reason = '';
    let confidence = 0;

    // High demand - can increase price
    if (totalSold > 50 && currentPrice < categoryAvgPrice * 1.1) {
      suggestedPrice = Math.round(currentPrice * 1.15);
      reason = 'מוצר עם ביקוש גבוה - ניתן להעלות מחיר';
      confidence = 85;
    }
    // Low sales - consider discount
    else if (totalSold < 5 && currentPrice > categoryAvgPrice) {
      suggestedPrice = Math.round(categoryAvgPrice * 0.95);
      reason = 'מכירות נמוכות - מומלץ להוריד מחיר לרמת השוק';
      confidence = 75;
    }
    // Price is too low compared to market
    else if (currentPrice < categoryAvgPrice * 0.7) {
      suggestedPrice = Math.round(categoryAvgPrice * 0.85);
      reason = 'המחיר נמוך מהשוק - ניתן להעלות בלי לפגוע במכירות';
      confidence = 80;
    }
    // Optimal pricing
    else {
      suggestedPrice = currentPrice;
      reason = 'המחיר אופטימלי לשוק הנוכחי';
      confidence = 90;
    }

    // Consider competitor prices if provided
    if (competitorPrices?.length) {
      const competitorAvg = competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length;
      if (suggestedPrice > competitorAvg * 1.2) {
        suggestedPrice = Math.round(competitorAvg * 1.1);
        reason += ' (מותאם למתחרים)';
        confidence -= 10;
      }
    }

    return new Response(
      JSON.stringify({
        currentPrice,
        suggestedPrice,
        priceDiff: suggestedPrice - currentPrice,
        priceDiffPercent: Math.round(((suggestedPrice - currentPrice) / currentPrice) * 100),
        reason,
        confidence,
        marketData: {
          categoryAvgPrice: Math.round(categoryAvgPrice),
          totalSold,
          avgSellingPrice: Math.round(avgPrice)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in smart-pricing:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
