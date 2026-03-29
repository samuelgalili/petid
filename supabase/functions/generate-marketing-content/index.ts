import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/ai.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { type, context, brandVoice, targetAudience, language, generateImage } = await req.json();

    let systemPrompt = `אתה מומחה שיווק דיגיטלי ויוצר תוכן מקצועי. אתה יוצר תוכן שיווקי בעברית ברמה גבוהה.

טון המותג: ${brandVoice || "מקצועי וידידותי"}
קהל יעד: ${targetAudience || "בעלי חיות מחמד"}
שפה: ${language || "עברית"}

הנחיות חשובות:
- צור תוכן מעורר השראה ומניע לפעולה
- השתמש בשפה פשוטה וברורה
- הוסף קריאה לפעולה (CTA) ברורה
- התאם את הטון לפלטפורמה`;

    let userPrompt = "";
    
    switch (type) {
      case "ad":
        userPrompt = `צור 3 וריאציות של מודעה לפרסום בפייסבוק/אינסטגרם.
נושא: ${context}

לכל וריאציה כלול:
- כותרת קצרה (עד 5 מילים)
- טקסט ראשי (50-100 מילים)
- קריאה לפעולה
- המלצה לסוג תמונה

פורמט JSON:
{
  "ads": [
    {
      "headline": "כותרת",
      "body": "טקסט ראשי",
      "cta": "קריאה לפעולה",
      "imageIdea": "רעיון לתמונה"
    }
  ]
}`;
        break;
        
      case "social":
        userPrompt = `צור 5 פוסטים לרשתות חברתיות.
נושא: ${context}

לכל פוסט כלול:
- טקסט הפוסט (עד 280 תווים)
- האשטגים מומלצים
- פלטפורמה מומלצת (פייסבוק/אינסטגרם/טיקטוק)

פורמט JSON:
{
  "posts": [
    {
      "content": "טקסט הפוסט",
      "hashtags": ["#האשטג1", "#האשטג2"],
      "platform": "instagram",
      "emoji": "😊"
    }
  ]
}`;
        break;
        
      case "email":
        userPrompt = `צור רצף של 3 מיילים שיווקיים.
נושא/מטרה: ${context}

לכל מייל כלול:
- נושא המייל (subject line)
- כותרת פתיחה
- גוף המייל (150-200 מילים)
- קריאה לפעולה
- P.S. (אופציונלי)

פורמט JSON:
{
  "emails": [
    {
      "subject": "נושא המייל",
      "preheader": "תצוגה מקדימה",
      "greeting": "ברכת פתיחה",
      "body": "גוף המייל",
      "cta": "קריאה לפעולה",
      "ps": "P.S."
    }
  ]
}`;
        break;
        
      case "sms":
        userPrompt = `צור 3 הודעות SMS שיווקיות.
נושא: ${context}

לכל הודעה:
- טקסט ההודעה (עד 160 תווים)
- קישור מקוצר (placeholder)

פורמט JSON:
{
  "messages": [
    {
      "text": "טקסט ההודעה",
      "hasLink": true
    }
  ]
}`;
        break;
        
      default:
        userPrompt = `צור תוכן שיווקי כללי על הנושא: ${context}`;
    }

    // Generate text content
    const data = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = data.choices?.[0]?.message?.content;
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    // Generate image if requested
    let imageUrl: string | null = null;
    if (generateImage !== false) {
      try {
        const imagePrompt = `Create a clean, professional marketing image for a pet care brand called PetID.
Topic: ${context}
Style: Modern, minimalist, warm colors, professional photography style.
The image should be suitable for social media marketing (Instagram/Facebook).
Include cute pets (dogs or cats) in a natural, appealing setting.
No text overlay. Clean composition. High quality.`;

        const imgData = await chatCompletion({
          model: "google/gemini-2.5-flash-image",
          messages: [
            { role: "user", content: imagePrompt }
          ],
        });

        {
          const generatedImage = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (generatedImage) {
            // Upload base64 image to Supabase Storage
            const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
            const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

            const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const fileName = `marketing/ai-generated-${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
              .from("media")
              .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
            } else {
              console.error("Image upload error:", uploadError);
              // Still return base64 as fallback
              imageUrl = generatedImage;
            }
          }
        }
      } catch (imgErr) {
        console.error("Image generation error:", imgErr);
        // Continue without image - don't fail the whole request
      }
    }

    return new Response(JSON.stringify({ success: true, content: parsed, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-marketing-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
