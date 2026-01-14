import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product } = await req.json();
    
    const { name, description, category, pet_type } = product;
    
    // Generate SEO-optimized content
    const petTypeHe = pet_type === 'dog' ? 'כלבים' : 
                      pet_type === 'cat' ? 'חתולים' : 
                      pet_type === 'both' ? 'כלבים וחתולים' : 'חיות מחמד';

    const categoryMap: Record<string, string> = {
      'dry-food': 'מזון יבש',
      'wet-food': 'מזון רטוב',
      'treats': 'חטיפים',
      'toys': 'צעצועים',
      'accessories': 'אביזרים',
      'health': 'מוצרי בריאות',
      'grooming': 'מוצרי טיפוח',
    };
    const categoryHe = categoryMap[category as string] || category || '';

    // Generate meta title (max 60 chars)
    let metaTitle = name;
    if (metaTitle.length < 40) {
      metaTitle += ` | ${categoryHe} ל${petTypeHe}`;
    }
    if (metaTitle.length < 55) {
      metaTitle += ' | PetID';
    }
    metaTitle = metaTitle.substring(0, 60);

    // Generate meta description (max 160 chars)
    let metaDescription = description?.substring(0, 100) || name;
    metaDescription += `. ${categoryHe} איכותי ל${petTypeHe}. משלוח מהיר, מחירים משתלמים.`;
    metaDescription = metaDescription.substring(0, 160);

    // Generate keywords
    const keywords = [
      name.split(' ')[0],
      categoryHe,
      petTypeHe,
      'חיות מחמד',
      'מזון לחיות',
      'PetID',
    ].filter(Boolean);

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^\w\s-א-ת]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    // Generate alt text for images
    const imageAltText = `${name} - ${categoryHe} ל${petTypeHe} | PetID`;

    // Schema.org structured data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": description || metaDescription,
      "category": categoryHe,
      "brand": {
        "@type": "Brand",
        "name": "PetID"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": petTypeHe
      }
    };

    // SEO score and recommendations
    const seoIssues: string[] = [];
    const seoTips: string[] = [];
    let seoScore = 100;

    // Check title length
    if (name.length < 20) {
      seoIssues.push('שם מוצר קצר - שקול להוסיף מילות מפתח');
      seoScore -= 10;
    }
    if (name.length > 70) {
      seoIssues.push('שם מוצר ארוך מדי לתוצאות חיפוש');
      seoScore -= 10;
    }

    // Check description
    if (!description) {
      seoIssues.push('חסר תיאור מוצר - קריטי ל-SEO');
      seoScore -= 25;
    } else if (description.length < 100) {
      seoIssues.push('תיאור קצר - מומלץ לפחות 150 תווים');
      seoScore -= 10;
    }

    // Check category
    if (!category) {
      seoIssues.push('חסרה קטגוריה');
      seoScore -= 15;
    }

    // Tips
    if (seoScore >= 80) {
      seoTips.push('✅ המוצר מותאם היטב לחיפוש');
    }
    seoTips.push('💡 הוסף מילות מפתח רלוונטיות לתיאור');
    seoTips.push('📸 ודא שלתמונות יש טקסט חלופי');

    return new Response(
      JSON.stringify({
        seo: {
          metaTitle,
          metaDescription,
          keywords,
          slug,
          imageAltText,
          schemaData
        },
        score: Math.max(0, seoScore),
        issues: seoIssues,
        tips: seoTips
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in product-auto-seo:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
