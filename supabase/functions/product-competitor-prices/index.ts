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
    const { productName, sku, category } = await req.json();
    
    // Simulate competitor price checking
    // In a real implementation, this would scrape competitor websites or use APIs
    
    const competitors = [
      { name: 'פטשופ', logo: '🐕' },
      { name: 'זופלוס', logo: '🐱' },
      { name: 'פט סיטי', logo: '🦮' },
      { name: 'חיות כיף', logo: '🐾' },
    ];

    // Generate mock competitor prices based on product name patterns
    const basePrice = 50 + Math.random() * 200;
    
    const competitorPrices = competitors.map(comp => {
      const variance = 0.8 + Math.random() * 0.4; // 80% to 120% of base
      const price = Math.round(basePrice * variance);
      const hasDiscount = Math.random() > 0.6;
      
      return {
        competitor: comp.name,
        logo: comp.logo,
        price,
        originalPrice: hasDiscount ? Math.round(price * 1.2) : null,
        inStock: Math.random() > 0.2,
        lastChecked: new Date().toISOString(),
        url: `https://${comp.name.replace(/\s/g, '')}.co.il/search?q=${encodeURIComponent(productName)}`
      };
    });

    // Sort by price
    competitorPrices.sort((a, b) => a.price - b.price);

    // Calculate market position
    const avgPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
    const lowestPrice = competitorPrices[0].price;
    const highestPrice = competitorPrices[competitorPrices.length - 1].price;

    // Recommendations
    const recommendations: string[] = [];
    
    if (avgPrice) {
      recommendations.push(`💡 מחיר ממוצע בשוק: ₪${Math.round(avgPrice)}`);
      recommendations.push(`📊 טווח מחירים: ₪${lowestPrice} - ₪${highestPrice}`);
    }

    return new Response(
      JSON.stringify({
        productName,
        competitors: competitorPrices,
        marketAnalysis: {
          averagePrice: Math.round(avgPrice),
          lowestPrice,
          highestPrice,
          priceSpread: Math.round(((highestPrice - lowestPrice) / avgPrice) * 100)
        },
        recommendations,
        lastUpdated: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in product-competitor-prices:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
