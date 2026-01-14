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
    const { productId, productData } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let product = productData;
    
    if (productId && !productData) {
      const { data } = await supabase
        .from('business_products')
        .select('*')
        .eq('id', productId)
        .single();
      product = data;
    }

    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let score = 0;
    const issues: { type: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    const improvements: string[] = [];

    // Image Quality (20 points)
    if (product.image_url && product.image_url !== '/placeholder.svg') {
      score += 10;
      if (product.images && product.images.length > 0) {
        score += Math.min(10, product.images.length * 2);
      } else {
        improvements.push('הוסף תמונות נוספות למוצר');
      }
    } else {
      issues.push({ type: 'image', message: 'חסרה תמונת מוצר', severity: 'high' });
    }

    // Description Quality (20 points)
    if (product.description) {
      const descLength = product.description.length;
      if (descLength > 200) {
        score += 20;
      } else if (descLength > 100) {
        score += 15;
        improvements.push('הרחב את תיאור המוצר');
      } else if (descLength > 50) {
        score += 10;
        improvements.push('תיאור קצר מדי - הוסף פרטים');
      } else {
        score += 5;
        issues.push({ type: 'description', message: 'תיאור קצר מאוד', severity: 'medium' });
      }
    } else {
      issues.push({ type: 'description', message: 'חסר תיאור מוצר', severity: 'high' });
    }

    // Pricing (15 points)
    if (product.price > 0) {
      score += 10;
      if (product.original_price && product.original_price > product.price) {
        score += 5; // Has discount
      }
    } else {
      issues.push({ type: 'price', message: 'מחיר לא תקין', severity: 'high' });
    }

    // Category (10 points)
    if (product.category) {
      score += 10;
    } else {
      issues.push({ type: 'category', message: 'חסרה קטגוריה', severity: 'medium' });
      improvements.push('הגדר קטגוריה למוצר');
    }

    // SKU (5 points)
    if (product.sku) {
      score += 5;
    } else {
      improvements.push('הוסף מק"ט למוצר');
    }

    // Pet Type (5 points)
    if (product.pet_type) {
      score += 5;
    } else {
      improvements.push('הגדר סוג חיית מחמד');
    }

    // Variants/Flavors (10 points)
    if (product.flavors && product.flavors.length > 0) {
      score += Math.min(10, product.flavors.length * 2);
    } else {
      improvements.push('הוסף וריאנטים (גדלים/טעמים)');
    }

    // Stock status (5 points)
    if (product.in_stock !== null) {
      score += 5;
    }

    // Featured/Promoted (5 points)
    if (product.is_featured) {
      score += 5;
    }

    // SEO Check (5 points)
    const name = product.name || '';
    if (name.length >= 10 && name.length <= 100) {
      score += 5;
    } else if (name.length < 10) {
      issues.push({ type: 'seo', message: 'שם מוצר קצר מדי ל-SEO', severity: 'low' });
    } else if (name.length > 100) {
      issues.push({ type: 'seo', message: 'שם מוצר ארוך מדי', severity: 'low' });
    }

    // Calculate grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    return new Response(
      JSON.stringify({
        score,
        grade,
        issues,
        improvements,
        breakdown: {
          images: product.image_url ? (product.images?.length || 0) + 1 : 0,
          descriptionLength: product.description?.length || 0,
          hasCategory: !!product.category,
          hasSku: !!product.sku,
          hasPetType: !!product.pet_type,
          variantsCount: product.flavors?.length || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in product-quality-score:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
