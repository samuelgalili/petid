import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * scan-vet-document - V24 AI-powered OCR for vet reports/invoices
 * Extracts: clinic, date, vaccines, diagnoses, weight, deworming,
 *           owner profile, pet identity (name, breed, color, gender, DOB, chip, neutered, dangerous breed)
 */

// Israeli dangerous breed list (per Israeli law)
const DANGEROUS_BREEDS = [
  'פיטבול', 'pit bull', 'pitbull',
  'סטפורדשייר', 'staffordshire', 'amstaff', 'am staff',
  'רוטוויילר', 'rottweiler',
  'דוגו ארגנטינו', 'dogo argentino',
  'בול טרייר', 'bull terrier',
  'טוסה אינו', 'tosa inu', 'tosa',
  'פילה ברזילאירו', 'fila brasileiro',
  'קאנה קורסו', 'cane corso',
  'פרסה קנריו', 'presa canario',
  'בואל מסטיף', 'boerboel',
];

function isDangerousBreed(breed: string | null): boolean {
  if (!breed) return false;
  const lower = breed.toLowerCase();
  return DANGEROUS_BREEDS.some(d => lower.includes(d.toLowerCase()));
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { petId, userId, imageBase64, fileName, saveToDb, cachedResult, imageBase64ForSave } = await req.json();

    if (!petId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shouldSave = saveToDb === true;

    let scanResult;

    // If cachedResult is provided (confirm-save flow), skip AI call
    if (cachedResult && shouldSave) {
      scanResult = cachedResult;
    } else if (imageBase64) {
      // Run AI analysis
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!lovableApiKey) {
        throw new Error("LOVABLE_API_KEY not configured");
      }

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: `You are a veterinary document analyzer. Extract ALL structured data from vet reports, invoices, and receipts.
Return ONLY valid JSON with this exact structure:
{
  "clinicName": "string or null",
  "clinicPhone": "string or null",
  "clinicAddress": "string or null",
  "visitDate": "YYYY-MM-DD or null",
  "vaccines": ["list of vaccine names found"],
  "diagnoses": ["list of diagnoses"],
  "medications": ["list of medications"],
  "weight": number_or_null,
  "deworming": true/false,
  "cost": number_or_null,
  "ownerName": "string or null",
  "ownerAddress": "string or null",
  "ownerCity": "string or null",
  "ownerPhone": "string or null",
  "ownerIdNumber": "string or null",
  "petName": "string or null",
  "petBreed": "string or null",
  "petColor": "string or null",
  "petGender": "male/female/null",
  "petBirthDate": "YYYY-MM-DD or null",
  "microchipNumber": "string or null",
  "isNeutered": true/false/null,
  "licenseConditions": "string or null"
}
Look for Hebrew and English text.
Vaccine keywords: DHPP, DHLPP, כלבת (Rabies), לפטוספירוזיס (Lepto), לישמניה (Leishmania), משושה, מחומש, מרובע.
Deworming keywords: תילוע, milbemax, drontal, deworm.
Weight keywords: משקל, kg, ק"ג.
Owner keywords: בעלים, שם, כתובת, טלפון, ת.ז., תעודת זהות, ת"ז, ID.
Clinic keywords: מרפאה, טלפון מרפאה, כתובת מרפאה, clinic.
Pet identity keywords: שם חיה, גזע, צבע, מין, תאריך לידה, שבב, מספר שבב, chip, microchip.
Neutered keywords: מעוקר, מסורס, neutered, spayed.
License keywords: תנאי רישיון, רישיון, license.`
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
                {
                  type: "text",
                  text: "Extract ALL veterinary and pet identity data from this document image. Return JSON only.",
                },
              ],
            },
          ],
          max_tokens: 1500,
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

      try {
        const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        scanResult = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI response:", content);
        scanResult = {
          clinicName: null, clinicPhone: null, clinicAddress: null,
          visitDate: null, vaccines: [], diagnoses: [], medications: [],
          weight: null, deworming: false, cost: null,
          ownerName: null, ownerAddress: null, ownerCity: null, ownerPhone: null, ownerIdNumber: null,
          petName: null, petBreed: null, petColor: null, petGender: null,
          petBirthDate: null, microchipNumber: null, isNeutered: null, licenseConditions: null,
        };
      }

      // Determine dangerous breed status
      scanResult.isDangerousBreed = isDangerousBreed(scanResult.petBreed);
    } else {
      return new Response(JSON.stringify({ error: "No image or cached result provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database if confirmed
    if (shouldSave) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Build pet update with all extracted fields
      const petUpdate: Record<string, unknown> = {};

      if (scanResult.petName) petUpdate.name = scanResult.petName;
      if (scanResult.petBreed) petUpdate.breed = scanResult.petBreed;
      if (scanResult.petColor) petUpdate.color = scanResult.petColor;
      if (scanResult.petGender) petUpdate.gender = scanResult.petGender;
      if (scanResult.petBirthDate) petUpdate.birth_date = scanResult.petBirthDate;
      if (scanResult.microchipNumber) petUpdate.microchip_number = scanResult.microchipNumber;
      if (scanResult.isNeutered !== null && scanResult.isNeutered !== undefined) petUpdate.is_neutered = scanResult.isNeutered;
      if (scanResult.weight) petUpdate.weight = scanResult.weight;
      if (scanResult.clinicName) petUpdate.vet_clinic_name = scanResult.clinicName;
      if (scanResult.clinicPhone) petUpdate.vet_clinic_phone = scanResult.clinicPhone;
      if (scanResult.clinicAddress) petUpdate.vet_clinic_address = scanResult.clinicAddress;
      if (scanResult.isDangerousBreed) petUpdate.is_dangerous_breed = true;
      if (scanResult.licenseConditions) petUpdate.license_conditions = scanResult.licenseConditions;

      const visitDate = scanResult.visitDate || new Date().toISOString().split('T')[0];

      if (scanResult.vaccines?.length > 0 || scanResult.diagnoses?.length > 0) {
        let visitType = 'checkup';
        if (scanResult.vaccines?.length > 0) visitType = 'vaccination';
        if (scanResult.diagnoses?.length > 0 && visitType === 'checkup') visitType = 'treatment';

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
          cost: scanResult.cost || null,
        });

        petUpdate.last_vet_visit = visitDate;
        if (nextVisitDate) petUpdate.next_vet_visit = nextVisitDate;
      }

      // Save each vaccine individually to pet_vaccinations for CRM visibility
      if (scanResult.vaccines?.length > 0) {
        const vaccineRows = scanResult.vaccines.map((v: string) => {
          const nextYear = new Date(visitDate);
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          return {
            pet_id: petId,
            user_id: userId,
            vaccine_name: v,
            vaccination_date: visitDate,
            expiry_date: nextYear.toISOString().split('T')[0],
            administered_by: scanResult.clinicName || null,
            notes: 'זוהה אוטומטית מסריקת מסמך',
          };
        });
        await supabase.from("pet_vaccinations").insert(vaccineRows);
      }

      // Save scanned image as pet_document
      if (imageBase64ForStorage) {
        try {
          const docFileName = `${petId}/${Date.now()}-scan.jpg`;
          const binaryData = Uint8Array.from(atob(imageBase64ForStorage), c => c.charCodeAt(0));
          const { data: uploadData } = await supabase.storage
            .from('pet-documents')
            .upload(docFileName, binaryData, { contentType: 'image/jpeg', upsert: false });

          if (uploadData?.path) {
            const { data: urlData } = supabase.storage
              .from('pet-documents')
              .getPublicUrl(uploadData.path);

            await supabase.from("pet_documents").insert({
              pet_id: petId,
              user_id: userId,
              document_type: 'vet_report',
              title: `סריקת מסמך וטרינר - ${visitDate}`,
              description: scanResult.clinicName ? `מרפאה: ${scanResult.clinicName}` : 'סריקת מסמך וטרינר',
              file_url: urlData.publicUrl,
              file_name: docFileName.split('/').pop()!,
              file_size: binaryData.length,
            });
          }
        } catch (docErr) {
          console.error("Failed to save document:", docErr);
        }
      }

      // Apply all pet updates
      if (Object.keys(petUpdate).length > 0) {
        await supabase.from("pets").update(petUpdate).eq("id", petId);
      }

      // Deworming tracking
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

      // Save owner data to profiles table
      const ownerUpdate: Record<string, unknown> = {};
      if (scanResult.ownerName) {
        const parts = scanResult.ownerName.split(' ');
        ownerUpdate.first_name = parts[0] || null;
        ownerUpdate.last_name = parts.slice(1).join(' ') || null;
      }
      if (scanResult.ownerPhone) ownerUpdate.phone = scanResult.ownerPhone;
      if (scanResult.ownerAddress) ownerUpdate.address = scanResult.ownerAddress;
      if (scanResult.ownerCity) ownerUpdate.city = scanResult.ownerCity;
      if (scanResult.ownerIdNumber) ownerUpdate.id_number = scanResult.ownerIdNumber;

      if (Object.keys(ownerUpdate).length > 0) {
        await supabase.from("profiles").update(ownerUpdate).eq("id", userId);
      }
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
