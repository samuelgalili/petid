import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedData {
  chip_number?: string;
  vaccination_type?: string;
  vaccination_date?: string;
  vaccination_expiry?: string;
  vet_name?: string;
  vet_clinic?: string;
  treatment_type?: string;
  treatment_date?: string;
  diagnosis?: string;
  medications?: string[];
  total_cost?: number;
  currency?: string;
  payment_method?: string;
  invoice_number?: string;
  provider_name?: string;
  provider_type?: string;
  provider_phone?: string;
  provider_address?: string;
  extraction_confidence?: number;
  raw_extracted_data?: Record<string, unknown>;
}

async function extractDataFromDocument(
  content: string,
  documentName: string
): Promise<ExtractedData> {
  const extractionPrompt = `אתה עוזר לניתוח מסמכים וטרינריים וביטוח לחיות מחמד. מומחה במיוחד בנתונים רפואיים של חתולים.
  
נתוני מסמך:
שם: ${documentName}
תוכן: ${content}

חלץ את הנתונים הבאים בפורמט JSON (החזר רק את השדות שקיימים במסמך):
{
  "chip_number": "מספר השבב אם קיים",
  "vaccination_type": "סוג החיסון — לחתולים: FVRCP/מרובעת, FeLV/לוקמיה, FIP, Chlamydia/כלמידיה, Rabies/כלבת. לכלבים: DHPP, Rabies, Bordetella וכו'",
  "vaccination_date": "תאריך חיסון (YYYY-MM-DD)",
  "vaccination_expiry": "תאריך תוקף חיסון (YYYY-MM-DD)",
  "vet_name": "שם הווטרינר",
  "vet_clinic": "שם הקליניקה",
  "is_cat_friendly_clinic": "true/false — האם הקליניקה ידידותית לחתולים (Cat Friendly Clinic, ISFM, AAFP)",
  "treatment_type": "סוג הטיפול",
  "treatment_date": "תאריך הטיפול (YYYY-MM-DD)",
  "diagnosis": "אבחנה — לחתולים: שים לב במיוחד ל-FLUTD, Crystals/קריסטלים, Struvite/סטרוויט, CKD, Hyperthyroid, FORL, FIP",
  "medications": ["רשימה של תרופות"],
  "is_sterilized": "true/false — האם מופיע Spayed/מעוקרת/Neutered/מסורס/Sterilized/מעוקר",
  "sterilization_type": "spayed/neutered אם רלוונטי",
  "urinary_symptoms": ["רשימת סימפטומים בדרכי שתן: crystals/קריסטלים, struvite/סטרוויט, inappropriate urination/השתנה מחוץ לארגז, hematuria/דם בשתן, blockage/חסימה"],
  "weight_kg": "משקל בק\"ג אם מופיע (דיוק של 100 גרם לחתולים)",
  "total_cost": "עלות כוללת (מספר)",
  "currency": "מטבע",
  "payment_method": "דרך תשלום",
  "invoice_number": "מספר חשבונית",
  "provider_name": "שם הגוף המספק השירות",
  "provider_type": "סוג הגוף - vet/municipality/groomer/trainer/insurance וכו",
  "provider_phone": "מספר טלפון",
  "provider_address": "כתובת"
}

הנחיות חשובות לחתולים:
- חיסונים חתוליים: FVRCP (מרובעת — מגן מפני Rhinotracheitis, Calicivirus, Panleukopenia), FeLV (לוקמיה — קריטי לחתולים חיצוניים), FIP, Chlamydia
- אם מופיעים: Crystals/קריסטלים, Struvite/סטרוויט, השתנה מחוץ לארגז — חלץ לשדה urinary_symptoms
- חפש ספציפית: Spayed/מעוקרת או Neutered/מסורס לעדכון סטטוס עיקור
- דיוק משקל: בחתולים כל 100 גרם חשובים — חלץ משקל מדויק
- קליניקה ידידותית: חפש Cat Friendly, ISFM, AAFP

החזר רק JSON תקני, ללא טקסט נוסף. השאר null את השדות שלא מופיעים.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": Deno.env.get("GOOGLE_API_KEY") || "",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: extractionPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", await response.text());
      return { extraction_confidence: 0 };
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    const extracted = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : JSON.parse(textContent);

    return {
      ...extracted,
      extraction_confidence: 0.85,
      raw_extracted_data: extracted,
    };
  } catch (error) {
    console.error("Extraction error:", error);
    return { extraction_confidence: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify JWT with Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.slice(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { documentId, documentContent, documentName, petId } = await req.json();

    if (!documentId || !documentContent || !petId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract data from document
    const extractedData = await extractDataFromDocument(
      documentContent,
      documentName
    );

    // Store extracted data in database
    const { error: insertError } = await supabase
      .from("pet_document_extracted_data")
      .insert({
        document_id: documentId,
        pet_id: petId,
        user_id: user.id,
        ...extractedData,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: extractedData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
