import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { chatCompletion } from "../_shared/ai.ts";

/**
 * scan-vet-document - V25 AI-powered OCR with Smart Sync
 * Supports selective field updates and care plan triggers
 */

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
    const {
      petId, userId, imageBase64, fileName,
      saveToDb, cachedResult, imageBase64ForSave,
      selectedFields, triggerCarePlans,
    } = await req.json();

    if (!petId || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shouldSave = saveToDb === true;
    const imageBase64ForStorage = imageBase64ForSave || imageBase64 || null;

    let scanResult;

    if (cachedResult && shouldSave) {
      scanResult = cachedResult;
    } else if (imageBase64) {
      const aiData = await chatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a veterinary document analyzer. Extract ALL structured data from vet reports, invoices, receipts, license documents, and pet-related contracts.
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
  "petAge": number_or_null,
  "petBirthDate": "YYYY-MM-DD or null",
  "microchipNumber": "string or null",
  "isNeutered": true/false/null,
  "isDangerousDog": true/false/null,
  "licenseNumber": "string or null",
  "licenseExpiryDate": "YYYY-MM-DD or null",
  "licenseRenewalDate": "YYYY-MM-DD or null",
  "licenseConditions": "string or null",
  "documentCategory": "one of: medical_record, vaccination, insurance, legal_contract, prescription, lab_results, vet_report, license, other",
  "nextTreatmentDate": "YYYY-MM-DD or null - any future appointment or treatment date mentioned",
  "nextTreatmentDescription": "string or null - description of the future treatment"
}
Document category rules:
- vaccination: contains vaccine records or immunization certificates
- medical_record: general medical records, checkup reports, visit summaries
- insurance: insurance policies, claims, coverage documents
- legal_contract: contracts, agreements, adoption papers
- license: pet license, dog license, registration documents
- prescription: medication prescriptions
- lab_results: blood tests, urine tests, lab work
- vet_report: vet examination reports, surgery reports
- other: anything that doesn't fit the above
Look for Hebrew and English text.
Vaccine keywords: DHPP, DHLPP, כלבת (Rabies), לפטוספירוזיס (Lepto), לישמניה (Leishmania), משושה, מחומש, מרובע.
Deworming keywords: תילוע, milbemax, drontal, deworm.
Weight keywords: משקל, kg, ק"ג.
Owner keywords: בעלים, שם, כתובת, טלפון, ת.ז., תעודת זהות, ת"ז, ID.
Clinic keywords: מרפאה, טלפון מרפאה, כתובת מרפאה, clinic, וטרינר, vet.
Pet identity keywords: שם חיה, גזע, צבע, מין, תאריך לידה, שבב, מספר שבב, chip, microchip, גיל, age.
Neutered keywords: מעוקר, מסורס, neutered, spayed, עיקור, סירוס.
License keywords: תנאי רישיון, רישיון, license, מספר רישיון, תוקף, חידוש, renewal, expiry.
Dangerous dog keywords: כלב מסוכן, dangerous dog, כלב אגרסיבי.
Age keywords: גיל, age, שנים, years, חודשים, months.`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
              { type: "text", text: "Extract ALL veterinary and pet identity data from this document image. Return JSON only." },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      });

      const content = (aiData as any).choices?.[0]?.message?.content || "{}";

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
          petName: null, petBreed: null, petColor: null, petGender: null, petAge: null,
          petBirthDate: null, microchipNumber: null, isNeutered: null, isDangerousDog: null,
          licenseNumber: null, licenseExpiryDate: null, licenseRenewalDate: null, licenseConditions: null,
          documentCategory: 'other', nextTreatmentDate: null, nextTreatmentDescription: null,
        };
      }

      scanResult.isDangerousBreed = isDangerousBreed(scanResult.petBreed);
      // If AI detected "dangerous dog" status or breed-based detection
      if (scanResult.isDangerousDog === true) scanResult.isDangerousBreed = true;
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

      const isSmartSync = Array.isArray(selectedFields) && selectedFields.length >= 0;

      if (isSmartSync) {
        // === SMART SYNC MODE: Only update selected fields ===
        const profileUpdate: Record<string, unknown> = {};
        const petUpdate: Record<string, unknown> = {};

        for (const field of selectedFields) {
          if (!field.detectedValue) continue;

          if (field.table === "profiles") {
            if (field.key === "ownerName") {
              const parts = (field.detectedValue as string).split(' ');
              profileUpdate.first_name = parts[0] || null;
              profileUpdate.last_name = parts.slice(1).join(' ') || null;
            } else if (field.key === "ownerPhone") {
              profileUpdate.phone = field.detectedValue;
            } else if (field.key === "ownerAddress") {
              // Split "street, city"
              const addrParts = (field.detectedValue as string).split(',').map((s: string) => s.trim());
              if (addrParts[0]) profileUpdate.street = addrParts[0];
              if (addrParts[1]) profileUpdate.city = addrParts[1];
            }
          } else if (field.table === "pets") {
            if (field.key === "petWeight") {
              petUpdate.weight = parseFloat(field.detectedValue) || null;
            } else if (field.key === "petGender") {
              petUpdate.gender = field.detectedValue === "זכר" ? "male" : field.detectedValue === "נקבה" ? "female" : field.detectedValue;
            } else if (field.key === "petAge") {
              petUpdate.age = parseInt(field.detectedValue) || null;
            } else if (field.key === "isNeutered") {
              petUpdate.is_neutered = field.detectedValue === "כן" || field.detectedValue === "true";
            } else if (field.key === "isDangerousDog") {
              petUpdate.is_dangerous_breed = field.detectedValue === "כן" || field.detectedValue === "true";
            } else {
              // Direct mapping for all other fields (dbField matches column name)
              petUpdate[field.dbField] = field.detectedValue;
            }
          } else if (field.table === "profiles") {
            if (field.key === "ownerName") {
              const parts = (field.detectedValue as string).split(' ');
              profileUpdate.first_name = parts[0] || null;
              profileUpdate.last_name = parts.slice(1).join(' ') || null;
            } else if (field.key === "ownerPhone") {
              profileUpdate.phone = field.detectedValue;
            } else if (field.key === "ownerAddress") {
              const addrParts = (field.detectedValue as string).split(',').map((s: string) => s.trim());
              if (addrParts[0]) profileUpdate.street = addrParts[0];
              if (addrParts[1]) profileUpdate.city = addrParts[1];
            } else if (field.key === "ownerIdNumber") {
              profileUpdate.id_number_last4 = field.detectedValue;
            } else {
              profileUpdate[field.dbField] = field.detectedValue;
            }
          }
        }

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from("profiles").update(profileUpdate).eq("id", userId);
        }
        if (Object.keys(petUpdate).length > 0) {
          // Also add clinic info and dangerous breed detection
          if (scanResult.clinicName) petUpdate.vet_clinic_name = scanResult.clinicName;
          if (scanResult.clinicPhone) petUpdate.vet_clinic_phone = scanResult.clinicPhone;
          if (scanResult.clinicAddress) petUpdate.vet_clinic_address = scanResult.clinicAddress;
          if (scanResult.isDangerousBreed) petUpdate.is_dangerous_breed = true;
          if (scanResult.licenseConditions) petUpdate.license_conditions = scanResult.licenseConditions;

          await supabase.from("pets").update(petUpdate).eq("id", petId);
        }
      } else {
        // === LEGACY MODE: Update all fields (backward compatible) ===
        const petUpdate: Record<string, unknown> = {};
        if (scanResult.petName) petUpdate.name = scanResult.petName;
        if (scanResult.petBreed) petUpdate.breed = scanResult.petBreed;
        if (scanResult.petColor) petUpdate.color = scanResult.petColor;
        if (scanResult.petGender) petUpdate.gender = scanResult.petGender;
        if (scanResult.petBirthDate) petUpdate.birth_date = scanResult.petBirthDate;
        if (scanResult.petAge) petUpdate.age = scanResult.petAge;
        if (scanResult.microchipNumber) petUpdate.microchip_number = scanResult.microchipNumber;
        if (scanResult.isNeutered !== null && scanResult.isNeutered !== undefined) petUpdate.is_neutered = scanResult.isNeutered;
        if (scanResult.weight) petUpdate.weight = scanResult.weight;
        if (scanResult.clinicName) petUpdate.vet_clinic_name = scanResult.clinicName;
        if (scanResult.clinicPhone) petUpdate.vet_clinic_phone = scanResult.clinicPhone;
        if (scanResult.clinicAddress) petUpdate.vet_clinic_address = scanResult.clinicAddress;
        if (scanResult.isDangerousBreed || scanResult.isDangerousDog) petUpdate.is_dangerous_breed = true;
        if (scanResult.licenseConditions) petUpdate.license_conditions = scanResult.licenseConditions;
        if (scanResult.licenseNumber) petUpdate.license_number = scanResult.licenseNumber;
        if (scanResult.licenseExpiryDate) petUpdate.license_expiry_date = scanResult.licenseExpiryDate;
        if (scanResult.licenseRenewalDate) petUpdate.license_renewal_date = scanResult.licenseRenewalDate;

        if (Object.keys(petUpdate).length > 0) {
          await supabase.from("pets").update(petUpdate).eq("id", petId);
        }

        const ownerUpdate: Record<string, unknown> = {};
        if (scanResult.ownerName) {
          const parts = scanResult.ownerName.split(' ');
          ownerUpdate.first_name = parts[0] || null;
          ownerUpdate.last_name = parts.slice(1).join(' ') || null;
        }
        if (scanResult.ownerPhone) ownerUpdate.phone = scanResult.ownerPhone;
        if (scanResult.ownerAddress) ownerUpdate.street = scanResult.ownerAddress;
        if (scanResult.ownerCity) ownerUpdate.city = scanResult.ownerCity;
        if (scanResult.ownerIdNumber) ownerUpdate.id_number_last4 = scanResult.ownerIdNumber;

        if (Object.keys(ownerUpdate).length > 0) {
          await supabase.from("profiles").update(ownerUpdate).eq("id", userId);
        }
      }

      // === Common: Save vet visit, vaccines, document (both modes) ===
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

        // Update pet's last/next vet visit
        const visitUpdate: Record<string, unknown> = { last_vet_visit: visitDate };
        if (nextVisitDate) visitUpdate.next_vet_visit = nextVisitDate;
        await supabase.from("pets").update(visitUpdate).eq("id", petId);
      }

      // Save individual vaccines to pet_vaccinations
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

      // Save scanned image as pet_document with smart naming & auto-categorization
      let savedDocumentId: string | null = null;
      if (imageBase64ForStorage) {
        try {
          // Fetch pet name for smart naming
          const { data: petData } = await supabase.from("pets").select("name").eq("id", petId).single();
          const safePetName = (petData?.name || 'pet').replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '_');
          
          // Auto-categorize based on OCR results
          const docCategory = scanResult.documentCategory || (
            scanResult.vaccines?.length > 0 ? 'vaccination' :
            scanResult.diagnoses?.length > 0 ? 'medical_record' :
            scanResult.medications?.length > 0 ? 'prescription' :
            'vet_report'
          );
          
          const categoryLabels: Record<string, string> = {
            medical_record: 'רשומה_רפואית',
            vaccination: 'חיסון',
            insurance: 'ביטוח',
            legal_contract: 'חוזה',
            prescription: 'מרשם',
            lab_results: 'בדיקות_מעבדה',
            vet_report: 'דוח_וטרינר',
            other: 'מסמך',
          };
          const categoryLabel = categoryLabels[docCategory] || 'מסמך';
          
          // Smart naming: [Date]_[Category]_[PetName].jpg
          const smartFileName = `${visitDate}_${categoryLabel}_${safePetName}.jpg`;
          const storagePath = `${petId}/${Date.now()}-${smartFileName}`;
          
          const binaryData = Uint8Array.from(atob(imageBase64ForStorage), c => c.charCodeAt(0));
          const { data: uploadData } = await supabase.storage
            .from('pet-documents')
            .upload(storagePath, binaryData, { contentType: 'image/jpeg', upsert: false });

          if (uploadData?.path) {
            const { data: urlData } = supabase.storage
              .from('pet-documents')
              .getPublicUrl(uploadData.path);

            const { data: insertedDoc } = await supabase.from("pet_documents").insert({
              pet_id: petId,
              user_id: userId,
              document_type: docCategory,
              title: `${categoryLabel} - ${safePetName} - ${visitDate}`,
              description: scanResult.clinicName ? `מרפאה: ${scanResult.clinicName}` : `סריקת ${categoryLabel}`,
              file_url: urlData.publicUrl,
              file_name: smartFileName,
              file_size: binaryData.length,
            }).select('id').single();
            
            savedDocumentId = insertedDoc?.id || null;
          }
        } catch (docErr) {
          console.error("Failed to save document:", docErr);
        }
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

      // === CARE PLAN TRIGGERS ===
      if (triggerCarePlans) {
        // Create care reminders for each vaccine (annual renewal)
        if (scanResult.vaccines?.length > 0) {
          for (const vaccine of scanResult.vaccines) {
            const nextDate = new Date(visitDate);
            nextDate.setFullYear(nextDate.getFullYear() + 1);

            // Insert into pet_reminders if table exists, otherwise use notifications
            try {
              await supabase.from("notifications").insert({
                user_id: userId,
                title: `💉 תזכורת חיסון: ${vaccine}`,
                body: `מועד חידוש חיסון ${vaccine} מתקרב. יש לתאם ביקור וטרינר.`,
                type: 'vaccination_reminder',
                scheduled_for: new Date(nextDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                metadata: {
                  pet_id: petId,
                  vaccine_name: vaccine,
                  due_date: nextDate.toISOString().split('T')[0],
                  source: 'ocr_smart_sync',
                  document_id: savedDocumentId,
                  deep_link: savedDocumentId ? `/documents?highlight=${savedDocumentId}` : null,
                },
              });
            } catch (notifErr) {
              console.error("Failed to create vaccine reminder notification:", notifErr);
            }
          }
        }

        // Create deworming reminder
        if (scanResult.deworming) {
          const dewormDate = scanResult.visitDate || new Date().toISOString().split('T')[0];
          const nextDeworming = new Date(dewormDate);
          nextDeworming.setMonth(nextDeworming.getMonth() + 6);

          try {
            await supabase.from("notifications").insert({
              user_id: userId,
              title: '🐛 תזכורת תילוע',
              body: `הגיע זמן לתילוע חוזר. התילוע האחרון בוצע ב-${dewormDate}.`,
              type: 'deworming_reminder',
              scheduled_for: new Date(nextDeworming.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              metadata: {
                pet_id: petId,
                due_date: nextDeworming.toISOString().split('T')[0],
                source: 'ocr_smart_sync',
                document_id: savedDocumentId,
                deep_link: savedDocumentId ? `/documents?highlight=${savedDocumentId}` : null,
              },
            });
          } catch (notifErr) {
            console.error("Failed to create deworming reminder:", notifErr);
          }
        }

        // Create reminder for detected future treatment date
        if (scanResult.nextTreatmentDate) {
          try {
            const treatmentDate = new Date(scanResult.nextTreatmentDate);
            const reminderDate = new Date(treatmentDate.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days before
            
            await supabase.from("notifications").insert({
              user_id: userId,
              title: `📋 טיפול קרוב: ${scanResult.nextTreatmentDescription || 'ביקור וטרינר'}`,
              body: `תזכורת לטיפול שזוהה מהמסמך הסרוק ב-${scanResult.nextTreatmentDate}.`,
              type: 'treatment_reminder',
              scheduled_for: reminderDate.toISOString(),
              metadata: {
                pet_id: petId,
                due_date: scanResult.nextTreatmentDate,
                treatment_description: scanResult.nextTreatmentDescription,
                source: 'ocr_smart_sync',
                document_id: savedDocumentId,
                deep_link: savedDocumentId ? `/documents?highlight=${savedDocumentId}` : null,
              },
            });
          } catch (treatErr) {
            console.error("Failed to create treatment reminder:", treatErr);
          }
        }

        // Create license expiry reminder
        if (scanResult.licenseExpiryDate) {
          try {
            const expiryDate = new Date(scanResult.licenseExpiryDate);
            const reminderDate = new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before

            await supabase.from("notifications").insert({
              user_id: userId,
              title: '📄 תזכורת חידוש רישיון',
              body: `רישיון חיית המחמד פג תוקף ב-${scanResult.licenseExpiryDate}. יש לחדש בהקדם.`,
              type: 'license_reminder',
              scheduled_for: reminderDate.toISOString(),
              metadata: {
                pet_id: petId,
                due_date: scanResult.licenseExpiryDate,
                license_number: scanResult.licenseNumber,
                source: 'ocr_smart_sync',
                document_id: savedDocumentId,
                deep_link: savedDocumentId ? `/documents?highlight=${savedDocumentId}` : null,
              },
            });
          } catch (licErr) {
            console.error("Failed to create license expiry reminder:", licErr);
          }
        }

        // Create license renewal reminder
        if (scanResult.licenseRenewalDate) {
          try {
            const renewalDate = new Date(scanResult.licenseRenewalDate);
            const reminderDate = new Date(renewalDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before

            await supabase.from("notifications").insert({
              user_id: userId,
              title: '🔄 תזכורת חידוש רישיון',
              body: `מועד חידוש רישיון חיית המחמד ב-${scanResult.licenseRenewalDate}.`,
              type: 'license_renewal_reminder',
              scheduled_for: reminderDate.toISOString(),
              metadata: {
                pet_id: petId,
                due_date: scanResult.licenseRenewalDate,
                license_number: scanResult.licenseNumber,
                source: 'ocr_smart_sync',
                document_id: savedDocumentId,
                deep_link: savedDocumentId ? `/documents?highlight=${savedDocumentId}` : null,
              },
            });
          } catch (renErr) {
            console.error("Failed to create license renewal reminder:", renErr);
          }
        }
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
