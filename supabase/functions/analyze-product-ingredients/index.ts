import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Scientifically documented forbidden/risky ingredients for pets
const FORBIDDEN_INGREDIENTS: Record<string, { he: string; risk: string; severity: "critical" | "warning" | "info" }> = {
  "bha": { he: "BHA (בוטילהידרוקסיאניזול)", risk: "חשד לסרטן – אסור באירופה למזון אנושי", severity: "critical" },
  "bht": { he: "BHT (בוטילהידרוקסיטולואן)", risk: "חשד לסרטן – משמר כימי מסוכן", severity: "critical" },
  "ethoxyquin": { he: "אתוקסיקווין", risk: "משמר כימי אסור במזון אנושי, עלול לפגוע בכבד ובכליות", severity: "critical" },
  "propylene glycol": { he: "פרופילן גליקול", risk: "רעיל לחתולים – עלול לגרום לאנמיה", severity: "critical" },
  "xylitol": { he: "קסיליטול", risk: "רעיל מאוד לכלבים – סכנת חיים", severity: "critical" },
  "sodium nitrite": { he: "נתרן ניטריט", risk: "משמר – חשד לסרטן בשימוש כרוני", severity: "critical" },
  "menadione": { he: "מנדיון (ויטמין K3 סינטטי)", risk: "רעילות כבדית ודם – אסור בחלק ממדינות אירופה", severity: "warning" },
  "corn syrup": { he: "סירופ תירס", risk: "סוכר מיותר – סיכון לסוכרת והשמנה", severity: "warning" },
  "artificial color": { he: "צבע מלאכותי", risk: "ללא ערך תזונתי – חשד לרגישויות", severity: "warning" },
  "red 40": { he: "אדום 40", risk: "צבע מלאכותי – חשד להיפראקטיביות ורגישות", severity: "warning" },
  "yellow 5": { he: "צהוב 5", risk: "צבע מלאכותי – חשד לרגישויות", severity: "warning" },
  "yellow 6": { he: "צהוב 6", risk: "צבע מלאכותי – חשד לרגישויות", severity: "warning" },
  "blue 2": { he: "כחול 2", risk: "צבע מלאכותי – ללא ערך תזונתי", severity: "warning" },
  "titanium dioxide": { he: "טיטניום דיאוקסיד", risk: "צבע – נאסר במזון אנושי באירופה 2022", severity: "warning" },
  "carrageenan": { he: "קרגינן", risk: "עלול לגרום לדלקת במערכת העיכול", severity: "info" },
  "msg": { he: "MSG (מונוסודיום גלוטמט)", risk: "מגביר טעם באופן מלאכותי – עלול להסתיר איכות ירודה", severity: "info" },
  "sodium selenite": { he: "נתרן סלניט", risk: "צורה פחות בטוחה של סלניום – עדיף סלניום אורגני", severity: "info" },
  "by-product": { he: "תוצרי לוואי (By-products)", risk: "איכות משתנה – חלקים לא ידועים של בע\"ח", severity: "info" },
  "meat meal": { he: "קמח בשר כללי", risk: "מקור חלבון לא מוגדר – עדיף מקור מפורט", severity: "info" },
  "animal fat": { he: "שומן מן החי (כללי)", risk: "מקור לא מוגדר – עדיף שומן ממקור ידוע", severity: "info" },
  "cellulose": { he: "תאית (סלולוז)", risk: "סיב מילוי זול – ערך תזונתי מינימלי", severity: "info" },
  "sugar": { he: "סוכר", risk: "מיותר במזון לחיות – סיכון לסוכרת", severity: "warning" },
  "salt": { he: "מלח (עודף)", risk: "עודף נתרן – סיכון ללב ולכליות", severity: "info" },
  "garlic": { he: "שום", risk: "רעיל לכלבים וחתולים בכמויות גדולות", severity: "warning" },
  "onion": { he: "בצל", risk: "רעיל לכלבים וחתולים – גורם לאנמיה", severity: "critical" },
};

// Positive ingredients to highlight
const POSITIVE_INGREDIENTS: Record<string, { he: string; benefit: string }> = {
  "salmon oil": { he: "שמן סלמון", benefit: "אומגה 3 – לפרווה ועור בריאים" },
  "glucosamine": { he: "גלוקוזמין", benefit: "תמיכה במפרקים" },
  "chondroitin": { he: "כונדרויטין", benefit: "תמיכה בסחוס מפרקי" },
  "probiotics": { he: "פרוביוטיקה", benefit: "בריאות מערכת העיכול" },
  "prebiotics": { he: "פרהביוטיקה", benefit: "תמיכה בפלורת המעי" },
  "taurine": { he: "טאורין", benefit: "חיוני ללב ולעיניים (במיוחד לחתולים)" },
  "l-carnitine": { he: "L-קרניטין", benefit: "חילוף חומרים ושריפת שומן" },
  "omega 3": { he: "אומגה 3", benefit: "נוגד דלקת – לפרווה, עור ומפרקים" },
  "omega 6": { he: "אומגה 6", benefit: "בריאות העור" },
  "dha": { he: "DHA", benefit: "פיתוח מוח ועיניים (חשוב לגורים)" },
  "vitamin e": { he: "ויטמין E", benefit: "נוגד חמצון טבעי" },
  "vitamin c": { he: "ויטמין C", benefit: "חיזוק חיסוני" },
  "blueberry": { he: "אוכמניות", benefit: "נוגד חמצון עשיר" },
  "sweet potato": { he: "בטטה", benefit: "סיבים ופחמימות מורכבות" },
  "chicken": { he: "עוף", benefit: "חלבון איכותי" },
  "lamb": { he: "כבש", benefit: "חלבון היפואלרגני" },
  "venison": { he: "בשר צבי", benefit: "חלבון נדיר – מתאים לרגישויות" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, petType, productName, category } = await req.json();

    if (!ingredients) {
      return new Response(
        JSON.stringify({ success: false, error: "Ingredients text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ingredientsLower = ingredients.toLowerCase();

    // ── Local Red Flag Scan ──
    const redFlags: Array<{ name: string; he: string; risk: string; severity: string }> = [];
    const positives: Array<{ name: string; he: string; benefit: string }> = [];

    for (const [key, info] of Object.entries(FORBIDDEN_INGREDIENTS)) {
      if (ingredientsLower.includes(key) || ingredientsLower.includes(info.he.toLowerCase())) {
        redFlags.push({ name: key, ...info });
      }
    }

    for (const [key, info] of Object.entries(POSITIVE_INGREDIENTS)) {
      if (ingredientsLower.includes(key) || ingredientsLower.includes(info.he.toLowerCase())) {
        positives.push({ name: key, ...info });
      }
    }

    // ── AI Deep Analysis ──
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiAnalysis = null;

    if (LOVABLE_API_KEY) {
      try {
        const prompt = `You are a veterinary nutrition scientist. Analyze these pet food ingredients for a ${petType || "pet"} product named "${productName || "Unknown"}".

INGREDIENTS:
${ingredients}

CATEGORY: ${category || "unknown"}

Respond in VALID JSON only:
{
  "overall_quality_score": <number 1-10>,
  "confidence": <number 0-1, how confident you are in the data>,
  "protein_sources": ["list primary protein sources"],
  "filler_ingredients": ["list any fillers or low-value ingredients"],
  "additional_red_flags": [
    {"name": "ingredient name", "he": "שם בעברית", "risk": "הסבר הסיכון", "severity": "critical|warning|info"}
  ],
  "additional_positives": [
    {"name": "ingredient name", "he": "שם בעברית", "benefit": "הסבר היתרון"}
  ],
  "summary_he": "סיכום קצר בעברית (2-3 משפטים) על איכות המוצר",
  "first_five_analysis_he": "ניתוח 5 הרכיבים הראשונים – מה הם אומרים על איכות המוצר",
  "estimated_kcal_per_kg": <number or null if cannot estimate>,
  "kcal_estimation_method": "formula used or null"
}

RULES:
- Score 1-4: Poor quality, many fillers/harmful ingredients
- Score 5-6: Average, some concerns
- Score 7-8: Good quality
- Score 9-10: Premium/excellent
- confidence: 1.0 if full ingredients list, 0.5 if partial, 0.3 if very incomplete
- For treats/snacks with few ingredients, adjust expectations accordingly
- If ingredients appear to be in Hebrew, analyze them in Hebrew context
- Only flag ingredients with SCIENTIFIC EVIDENCE of harm – no speculation`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          }
        } else {
          console.error("AI analysis failed:", aiRes.status);
        }
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr);
      }
    }

    // ── Merge results ──
    const allRedFlags = [
      ...redFlags,
      ...(aiAnalysis?.additional_red_flags || []),
    ];
    const allPositives = [
      ...positives,
      ...(aiAnalysis?.additional_positives || []),
    ];

    // Deduplicate
    const uniqueFlags = allRedFlags.filter((f, i, arr) => arr.findIndex(x => x.name === f.name) === i);
    const uniquePositives = allPositives.filter((p, i, arr) => arr.findIndex(x => x.name === p.name) === i);

    const criticalCount = uniqueFlags.filter(f => f.severity === "critical").length;
    const warningCount = uniqueFlags.filter(f => f.severity === "warning").length;

    // Overall safety verdict
    let verdict: "safe" | "caution" | "danger" = "safe";
    if (criticalCount > 0) verdict = "danger";
    else if (warningCount >= 2) verdict = "caution";

    return new Response(
      JSON.stringify({
        success: true,
        verdict,
        qualityScore: aiAnalysis?.overall_quality_score || null,
        confidence: aiAnalysis?.confidence || (ingredients.length > 50 ? 0.8 : 0.4),
        redFlags: uniqueFlags,
        positives: uniquePositives,
        proteinSources: aiAnalysis?.protein_sources || [],
        fillerIngredients: aiAnalysis?.filler_ingredients || [],
        summaryHe: aiAnalysis?.summary_he || null,
        firstFiveAnalysis: aiAnalysis?.first_five_analysis_he || null,
        estimatedKcalPerKg: aiAnalysis?.estimated_kcal_per_kg || null,
        kcalEstimationMethod: aiAnalysis?.kcal_estimation_method || null,
        stats: {
          totalRedFlags: uniqueFlags.length,
          criticalCount,
          warningCount,
          infoCount: uniqueFlags.filter(f => f.severity === "info").length,
          positiveCount: uniquePositives.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-product-ingredients:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
