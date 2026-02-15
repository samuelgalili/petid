import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * scan-vet-document - AI-powered OCR for vet reports/invoices
 * Uses Gemini to extract: clinic name, date, vaccines, diagnoses, weight, deworming
 */

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { petId, userId, imageBase64, fileName } = await req.json();

    if (!petId || !userId || !imageBase64) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use Gemini via Lovable AI to analyze the document
    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a veterinary document analyzer. Extract structured data from vet reports, invoices, and receipts. 
Return ONLY valid JSON with this exact structure:
{
  "clinicName": "string or null",
  "visitDate": "YYYY-MM-DD or null",
  "vaccines": ["list of vaccine names found"],
  "diagnoses": ["list of diagnoses"],
  "medications": ["list of medications"],
  "weight": number_or_null,
  "deworming": true/false,
  "cost": number_or_null
}
Look for Hebrew and English text. Common vaccine names: DHPP, DHLPP, כלבת (Rabies), לפטוספירוזיס (Lepto), לישמניה (Leishmania), משושה, מחומש, מרובע.
Deworming keywords: תילוע, milbemax, drontal, deworm.
Weight keywords: משקל, kg, ק"ג.`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract all veterinary data from this document image. Return JSON only.",
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse AI response — strip markdown code fences if present
    let scanResult;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      scanResult = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      scanResult = {
        clinicName: null, visitDate: null, vaccines: [],
        diagnoses: [], medications: [], weight: null, deworming: false, cost: null,
      };
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If vaccines/diagnoses found, create a vet visit record
    if (scanResult.vaccines?.length > 0 || scanResult.diagnoses?.length > 0) {
      const visitDate = scanResult.visitDate || new Date().toISOString().split('T')[0];
      
      let visitType = 'checkup';
      if (scanResult.vaccines?.length > 0) visitType = 'vaccination';
      if (scanResult.diagnoses?.length > 0 && visitType === 'checkup') visitType = 'treatment';

      // Calculate next visit for vaccines (1 year)
      let nextVisitDate = null;
      if (scanResult.vaccines?.length > 0) {
        const next = new Date(visitDate);
        next.setFullYear(next.getFullYear() + 1);
        nextVisitDate = next.toISOString().split('T')[0];
      }

      await supabase.from("pet_vet_visits").insert({
        pet_id: petId,
        user_id: userId,
        visit_date: visitDate,
        visit_type: visitType,
        clinic_name: scanResult.clinicName,
        diagnosis: scanResult.diagnoses?.join('; ') || null,
        treatment: scanResult.medications?.join('; ') || null,
        notes: `סרוק מתמונה: ${fileName}`,
        vaccines: scanResult.vaccines || [],
        medications: scanResult.medications || [],
        diagnoses: scanResult.diagnoses || [],
        next_visit_date: nextVisitDate,
        ai_extracted: true,
        raw_summary: `OCR scan from ${fileName}`,
      });

      // Update pet's last vet visit
      const petUpdate: Record<string, unknown> = {
        last_vet_visit: visitDate,
      };
      if (nextVisitDate) petUpdate.next_vet_visit = nextVisitDate;
      if (scanResult.weight) petUpdate.weight = scanResult.weight;

      await supabase.from("pets").update(petUpdate).eq("id", petId);
    } else if (scanResult.weight) {
      // Just update weight
      await supabase.from("pets").update({ weight: scanResult.weight }).eq("id", petId);
    }

    // If deworming detected, set a 6-month reminder via next_visit_date
    if (scanResult.deworming) {
      const dewormDate = scanResult.visitDate || new Date().toISOString().split('T')[0];
      const reminder = new Date(dewormDate);
      reminder.setMonth(reminder.getMonth() + 6);

      await supabase.from("pet_vet_visits").insert({
        pet_id: petId,
        user_id: userId,
        visit_date: dewormDate,
        visit_type: 'treatment',
        notes: 'תילוע בוצע',
        next_visit_date: reminder.toISOString().split('T')[0],
        ai_extracted: true,
        raw_summary: 'Deworming detected via OCR',
      });
    }

    return new Response(JSON.stringify({ scanResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("scan-vet-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
