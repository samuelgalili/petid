import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Extract Vet Summary - AI-powered extraction of vet visit data
 * Extracts: diagnoses, medications, vaccines from free-text summary
 * Triggers Recovery Mode for surgeries/infections (14 days)
 * Sets vaccine reminders (next year)
 */

const KNOWN_VACCINES = [
  'rabies', 'כלבת', 'dhpp', 'dhlpp', 'parvo', 'פרבו',
  'distemper', 'bordetella', 'leptospirosis', 'לפטוספירוזיס',
  'fvrcp', 'felv', 'fiv', 'meshusheshet', 'משושה', 'מרובע', 'מחומש',
  'leishmania', 'לישמניה', 'leishmaniasis', 'לישמניוזיס',
  'kennel cough', 'שעלת מלונות', 'canine influenza', 'שפעת',
];

const SURGERY_KEYWORDS = [
  'surgery', 'ניתוח', 'operation', 'אופרציה', 'sterilization', 'עיקור', 'סירוס',
];

const INFECTION_KEYWORDS = [
  'infection', 'זיהום', 'דלקת', 'inflammation', 'abscess', 'מורסה',
];

interface ExtractedData {
  diagnoses: string[];
  medications: string[];
  vaccines: string[];
  isRecoveryMode: boolean;
  recoveryReason: string | null;
  nextVisitDate: string | null;
  breedManagementGuide: string | null;
  affectedDashboardCircles: string[];
}

// Breed-specific condition management guides (Hebrew)
const BREED_CONDITION_GUIDES: Record<string, Record<string, string>> = {
  'french bulldog': {
    'respiratory': '🫁 מדריך ניהול נשימתי לבולדוג צרפתי:\n• הימנעו ממאמץ יתר בחום — טיולים קצרים בלבד\n• שימרו על משקל תקין (השמנה מחמירה)\n• השתמשו ברתמה ולא בקולר\n• שימו לב לנחירות חריגות\n• שקלו ייעוץ עם מומחה BOAS',
    'skin': '🧴 מדריך טיפול בעור לבולדוג צרפתי:\n• נקו קפלי עור יומית עם מגבונים ייעודיים\n• ייבשו היטב בין הקפלים\n• בדקו סימני אודם או ריח\n• שמפו היפואלרגני בלבד\n• תוסף אומגה-3 לחיזוק מחסום העור',
    'eye': '👁️ מדריך טיפול בעיניים לבולדוג צרפתי:\n• בדקו מדי יום דמעות מוגזמות\n• נקו עם תמיסת מלח פיזיולוגי\n• הימנעו מחשיפה לרוח חזקה\n• פנו לוטרינר מיד אם יש אודם או עכירות',
    'joint': '🦴 מדריך ניידות לבולדוג צרפתי:\n• הימנעו מקפיצות מגובה\n• השתמשו ברמפה לספה/מכונית\n• תוסף גלוקוזאמין יומי\n• שחייה — פעילות מומלצת ללא עומס על מפרקים',
  },
  'bulldog': {
    'respiratory': '🫁 בולדוגים בסיכון גבוה לבעיות נשימה — טיולים קצרים, הימנעות מחום, ומעקב וטרינרי קבוע.',
    'skin': '🧴 ניקוי קפלי עור יומי הכרחי. שימוש בשמפו עדין ותוסף שמן דגים.',
  },
  'pug': {
    'respiratory': '🫁 פאגים רגישים לחום — טיולים בשעות קרירות בלבד, שמירה על משקל תקין.',
    'eye': '👁️ עיניים בולטות — בדיקה יומית, ניקוי עדין, הימנעות מחיכוך.',
  },
  'golden retriever': {
    'joint': '🦴 גולדנים נוטים לדיספלזיה — תוסף מפרקים מגיל צעיר, הימנעות מריצה על משטחים קשים.',
    'skin': '🧴 אלרגיות עור שכיחות — מזון היפואלרגני ותוסף אומגה.',
  },
  'labrador': {
    'joint': '🦴 לברדורים נוטים לבעיות מפרקים — שמירה על משקל, תוסף גלוקוזאמין, ושחייה כפעילות מומלצת.',
  },
  'german shepherd': {
    'joint': '🦴 רועים גרמניים — מעקב אחר דיספלזיה מגיל צעיר, תוסף מפרקים ופעילות מבוקרת.',
  },
};

// Map diagnoses to dashboard circles
function getAffectedCircles(diagnoses: string[], summary: string): string[] {
  const lower = summary.toLowerCase();
  const circles: string[] = [];
  
  const mappings: [string[], string][] = [
    [['skin', 'עור', 'coat', 'פרווה', 'derma', 'allergy', 'אלרגיה', 'fold', 'קפל'], 'coat'],
    [['joint', 'מפרק', 'hip', 'patella', 'mobility', 'ניידות', 'arthritis', 'dysplasia'], 'mobility'],
    [['digest', 'עיכול', 'gastro', 'gi', 'intestin', 'vomit', 'הקאה', 'diarrhea', 'שלשול'], 'digestion'],
    [['energy', 'אנרגיה', 'lethargy', 'עייפות', 'fatigue', 'חולשה'], 'energy'],
    [['food', 'מזון', 'diet', 'דיאט', 'weight', 'משקל', 'obesity', 'השמנ'], 'feeding'],
    [['respiratory', 'נשימ', 'boas', 'breathing', 'lung', 'ריאות'], 'health'],
    [['eye', 'עיניים', 'ear', 'אוזניים', 'dental', 'שיניים'], 'health'],
  ];
  
  for (const [keywords, circle] of mappings) {
    if (keywords.some(kw => lower.includes(kw)) && !circles.includes(circle)) {
      circles.push(circle);
    }
  }
  
  return circles;
}

function extractFromText(summary: string): ExtractedData {
  const lower = summary.toLowerCase();
  const lines = summary.split(/[.\n,;]+/).map(l => l.trim()).filter(Boolean);

  const diagnoses: string[] = [];
  const medications: string[] = [];
  const vaccines: string[] = [];
  let isRecoveryMode = false;
  let recoveryReason: string | null = null;

  // Detect vaccines
  for (const v of KNOWN_VACCINES) {
    if (lower.includes(v)) {
      vaccines.push(v);
    }
  }

  // Detect surgery/infection for recovery mode
  for (const kw of SURGERY_KEYWORDS) {
    if (lower.includes(kw)) {
      isRecoveryMode = true;
      recoveryReason = 'surgery';
      break;
    }
  }
  if (!isRecoveryMode) {
    for (const kw of INFECTION_KEYWORDS) {
      if (lower.includes(kw)) {
        isRecoveryMode = true;
        recoveryReason = 'infection';
        break;
      }
    }
  }

  // Extract diagnoses - lines containing medical keywords
  const diagnosisKeywords = [
    'ear infection', 'דלקת אוזניים', 'urinary', 'שתן', 'crystals', 'גבישים',
    'allergy', 'אלרגיה', 'skin', 'עור', 'dental', 'שיניים', 'eye', 'עיניים',
    'tumor', 'גידול', 'fracture', 'שבר', 'heart', 'לב', 'kidney', 'כליות',
    'liver', 'כבד', 'diabetes', 'סוכרת', 'arthritis', 'דלקת מפרקים',
    'hip dysplasia', 'דיספלזיה', 'luxating patella', 'פטלה',
  ];
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    for (const kw of diagnosisKeywords) {
      if (lineLower.includes(kw) && !diagnoses.includes(line)) {
        diagnoses.push(line);
        break;
      }
    }
  }

  // Extract medications
  const medKeywords = [
    'antibiot', 'אנטיביוטיקה', 'steroid', 'סטרואיד', 'pain', 'כאב',
    'anti-inflammatory', 'נוגד דלקת', 'cream', 'משחה', 'drops', 'טיפות',
    'pill', 'כדור', 'tablet', 'טבליה', 'injection', 'זריקה', 'mg', 'מ"ג',
    'medicine', 'תרופה', 'rimadyl', 'metacam', 'clavamox', 'amoxicillin',
  ];
  for (const line of lines) {
    const lineLower = line.toLowerCase();
    for (const kw of medKeywords) {
      if (lineLower.includes(kw) && !medications.includes(line)) {
        medications.push(line);
        break;
      }
    }
  }

  // If vaccine logged, set next visit 1 year from now
  let nextVisitDate: string | null = null;
  if (vaccines.length > 0) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    nextVisitDate = nextYear.toISOString().split('T')[0];
  }

  const affectedDashboardCircles = getAffectedCircles(diagnoses, summary);

  return { diagnoses, medications, vaccines, isRecoveryMode, recoveryReason, nextVisitDate, breedManagementGuide: null, affectedDashboardCircles };
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { petId, userId, summary, visitDate, clinicName, vetName } = await req.json();

    if (!petId || !userId || !summary) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract data from summary
    const extracted = extractFromText(summary);

    // Look up breed for management guide
    const { data: petInfo } = await supabase
      .from("pets")
      .select("breed")
      .eq("id", petId)
      .maybeSingle();

    if (petInfo?.breed && extracted.diagnoses.length > 0) {
      const breedLower = (petInfo.breed as string).toLowerCase();
      // Find matching breed guide
      for (const [breedKey, conditions] of Object.entries(BREED_CONDITION_GUIDES)) {
        if (breedLower.includes(breedKey) || breedKey.includes(breedLower)) {
          // Find matching condition category
          for (const [condKey, guide] of Object.entries(conditions)) {
            const summaryLower = summary.toLowerCase();
            if (summaryLower.includes(condKey) || extracted.affectedDashboardCircles.some(c => 
              (condKey === 'respiratory' && c === 'health') ||
              (condKey === 'skin' && c === 'coat') ||
              (condKey === 'eye' && c === 'health') ||
              (condKey === 'joint' && c === 'mobility')
            )) {
              extracted.breedManagementGuide = guide;
              break;
            }
          }
          break;
        }
      }
    }

    // Calculate recovery end date (14 days from visit)
    const visitDt = new Date(visitDate || new Date());
    const recoveryUntil = extracted.isRecoveryMode
      ? new Date(visitDt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    // Determine visit type
    let visitType = 'checkup';
    if (extracted.vaccines.length > 0) visitType = 'vaccination';
    if (extracted.isRecoveryMode && extracted.recoveryReason === 'surgery') visitType = 'surgery';
    if (extracted.diagnoses.length > 0 && visitType === 'checkup') visitType = 'treatment';

    // Insert vet visit record
    const { data: visit, error: insertError } = await supabase
      .from("pet_vet_visits")
      .insert({
        pet_id: petId,
        user_id: userId,
        visit_date: visitDate || new Date().toISOString().split('T')[0],
        visit_type: visitType,
        clinic_name: clinicName || null,
        vet_name: vetName || null,
        diagnosis: extracted.diagnoses.join('; '),
        treatment: extracted.medications.join('; '),
        notes: summary,
        next_visit_date: extracted.nextVisitDate,
        vaccines: extracted.vaccines,
        medications: extracted.medications,
        diagnoses: extracted.diagnoses,
        is_recovery_mode: extracted.isRecoveryMode,
        recovery_until: recoveryUntil,
        ai_extracted: true,
        raw_summary: summary,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update pet record with latest vet visit and next visit
    const petUpdate: Record<string, unknown> = {
      last_vet_visit: visitDate || new Date().toISOString().split('T')[0],
    };
    if (extracted.nextVisitDate) {
      petUpdate.next_vet_visit = extracted.nextVisitDate;
    }
    // Add diagnoses to medical conditions
    if (extracted.diagnoses.length > 0) {
      const { data: petData } = await supabase
        .from("pets")
        .select("medical_conditions")
        .eq("id", petId)
        .maybeSingle();

      const existing = (petData?.medical_conditions as string[]) || [];
      const merged = [...new Set([...existing, ...extracted.diagnoses])];
      petUpdate.medical_conditions = merged;
    }

    await supabase.from("pets").update(petUpdate).eq("id", petId);

    return new Response(JSON.stringify({
      visit,
      extracted,
      recoveryUntil,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("extract-vet-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
