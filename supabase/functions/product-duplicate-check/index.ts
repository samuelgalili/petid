import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple string similarity using Levenshtein-like approach
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  // Check if shorter is contained in longer
  if (longer.toLowerCase().includes(shorter.toLowerCase())) {
    return shorter.length / longer.length + 0.3;
  }
  
  // Word overlap
  const words1 = s1.toLowerCase().split(/\s+/);
  const words2 = s2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(w => words2.includes(w));
  const totalWords = new Set([...words1, ...words2]).size;
  
  return commonWords.length / totalWords;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, productId, sku, threshold = 0.7 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all products
    const { data: products } = await supabase
      .from('business_products')
      .select('id, name, sku, image_url, price, category')
      .neq('id', productId || '00000000-0000-0000-0000-000000000000');

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ duplicates: [], possibleDuplicates: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duplicates: any[] = [];
    const possibleDuplicates: any[] = [];

    for (const product of products) {
      // Check SKU match (exact duplicate)
      if (sku && product.sku && sku.toLowerCase() === product.sku.toLowerCase()) {
        duplicates.push({
          ...product,
          matchType: 'sku',
          matchScore: 1.0,
          reason: 'מק"ט זהה'
        });
        continue;
      }

      // Check name similarity
      const nameSimilarity = similarity(productName, product.name);
      
      if (nameSimilarity >= 0.9) {
        duplicates.push({
          ...product,
          matchType: 'name',
          matchScore: nameSimilarity,
          reason: 'שם כמעט זהה'
        });
      } else if (nameSimilarity >= threshold) {
        possibleDuplicates.push({
          ...product,
          matchType: 'similar',
          matchScore: nameSimilarity,
          reason: 'שם דומה'
        });
      }
    }

    // Sort by match score
    duplicates.sort((a, b) => b.matchScore - a.matchScore);
    possibleDuplicates.sort((a, b) => b.matchScore - a.matchScore);

    return new Response(
      JSON.stringify({
        duplicates: duplicates.slice(0, 5),
        possibleDuplicates: possibleDuplicates.slice(0, 10),
        totalChecked: products.length,
        hasDuplicates: duplicates.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in product-duplicate-check:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
