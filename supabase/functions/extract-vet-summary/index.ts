import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

/**
 * Extract Vet Summary - AI-powered extraction of vet visit data
 * Extracts: diagnoses, medications, vaccines from free-text summary
 * Triggers Recovery Mode for surgeries/infections (14 days)
 * Sets vaccine reminders (next year)
 */

// === CANINE VACCINES ===
const DOG_VACCINES = [
  'rabies', 'כלבת', 'dhpp', 'dhlpp', 'parvo', 'פרבו',
  'distemper', 'bordetella', 'leptospirosis', 'לפטוספירוזיס',
  'meshusheshet', 'משושה', 'מחומש',
  'leishmania', 'לישמניה', 'leishmaniasis', 'לישמניוזיס',
  'kennel cough', 'שעלת מלונות', 'canine influenza', 'שפעת',
];

// === FELINE VACCINES ===
const CAT_VACCINES = [
  'rabies', 'כלבת', // shared
  'fvrcp', 'מרובעת', 'panleukopenia', 'פנלאוקופניה',
  'calicivirus', 'קליצי', 'rhinotracheitis', 'רינוטרכאיטיס',
  'felv', 'feline leukemia', 'לוקמיה של חתולים', 'לוקמיה',
  'fiv', 'feline immunodeficiency', 'איידס של חתולים',
  'chlamydia', 'כלמידיה',
];

// Combined for backwards compatibility
const KNOWN_VACCINES = [...new Set([...DOG_VACCINES, ...CAT_VACCINES])];

// === CAT-SPECIFIC CONDITIONS ===
const CAT_CONDITIONS = [
  'flutd', 'feline lower urinary', 'דרכי שתן', 'struvite', 'סטרוביט',
  'ckd', 'chronic kidney', 'כליות כרונית', 'renal', 'כשל כלייתי',
  'hairball', 'כדורי שיער', 'trichobezoar',
  'hyperthyroid', 'היפרתירואיד', 'תירואיד',
  'diabetes', 'סוכרת',
  'forl', 'feline resorptive', 'ספיגת שיניים',
];

// === DOG-TOXIC MEDICATIONS — MUST NEVER be recommended for cats ===
const DOG_ONLY_MEDICATIONS = [
  'permethrin', 'פרמתרין',
  'advantix', 'אדוונטיקס',
  'certifect', 'סרטיפקט',
  'ibuprofen', 'איבופרופן',
  'acetaminophen', 'tylenol', 'אקמול', 'paracetamol', 'פרצטמול',
  'naproxen', 'נפרוקסן',
  'phenylpropanolamine',
  '5-fluorouracil',
  'enrofloxacin', 'baytril', 'ביטריל', // high dose toxic to cats
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
  'shih tzu': {
    'eye': '👁️ מדריך טיפול בעיניים לשיצו:\n• נקו כתמי דמעות מדי יום עם מגבונים ייעודיים\n• בדקו אודם או הפרשות חריגות\n• הימנעו ממגע ישיר עם הפנים\n• פנו לוטרינר אם יש עכירות בקרנית\n• תוסף לוטאין יומי לתמיכה בבריאות העיניים',
    'respiratory': '🫁 מדריך בטיחות נשימתית לשיצו:\n• שיצו הוא גזע ברכיצפלי — רגיש לחום ולמאמץ\n• טיולים קצרים בלבד בימים חמים\n• השתמשו ברתמה ולא בקולר\n• הימנעו ממצבי לחץ\n• שימו לב לנחירות חזקות או קוצר נשימה',
    'skin': '🧴 מדריך טיפול בעור ופרווה לשיצו:\n• הקפידו על ברישינג יומי למניעת סבכים\n• רחצו בשמפו היפואלרגני פעם בשבועיים\n• בדקו קפלי פנים יומית — נקו וייבשו\n• תוסף אומגה-3 לפרווה בריאה ומבריקה\n• סירוק לאחר כל טיול',
    'dental': '🦷 מדריך שיניים לשיצו:\n• צחצוח שיניים יומי עם משחה לכלבים\n• חטיפי דנטל מותאמים לגודל קטן\n• בדיקת שיניים אצל הווטרינר כל 6 חודשים',
  },
  'שיצו': {
    'eye': '👁️ מדריך טיפול בעיניים לשיצו:\n• נקו כתמי דמעות מדי יום\n• בדקו אודם או הפרשות חריגות\n• תוסף לוטאין יומי',
    'respiratory': '🫁 שיצו הוא גזע ברכיצפלי — טיולים קצרים, רתמה ולא קולר, הימנעות מחום.',
    'skin': '🧴 ברישינג יומי, שמפו היפואלרגני, ותוסף אומגה-3 לפרווה.',
  },
  'שי טסו': {
    'eye': '👁️ מדריך טיפול בעיניים לשיצו:\n• נקו כתמי דמעות מדי יום\n• בדקו אודם או הפרשות חריגות\n• תוסף לוטאין יומי',
    'respiratory': '🫁 שיצו הוא גזע ברכיצפלי — טיולים קצרים, רתמה ולא קולר, הימנעות מחום.',
    'skin': '🧴 ברישינג יומי, שמפו היפואלרגני, ותוסף אומגה-3 לפרווה.',
  },
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
  // === CAT BREEDS ===
  'persian': {
    'kidney': '🫘 מדריך כליות לפרסי:\n• PKD שכיח בפרסיים — אולטרסאונד שנתי חובה\n• תזונה דלת-זרחן ועשירה בלחות\n• מזון רטוב בלבד מועדף\n• מעקב קריאטינין כל 6 חודשים\n• מים זמינים תמיד + מזרקת מים',
    'eye': '👁️ מדריך עיניים לפרסי:\n• עיניים בולטות — ניקוי דמעות יומי\n• בדקו חסימת צינור הדמעות\n• מגבונים עדינים סביב העיניים\n• פנו לוטרינר בכל שינוי',
    'respiratory': '🫁 פרסיים — מבנה פנים שטוח מגביל נשימה. הימנעו מלחץ ומחום.',
  },
  'פרסי': {
    'kidney': '🫘 PKD שכיח — אולטרסאונד שנתי, תזונה דלת-זרחן, מזון רטוב.',
    'eye': '👁️ ניקוי דמעות יומי — עיניים בולטות דורשות תשומת לב מיוחדת.',
  },
  'siamese': {
    'dental': '🦷 מדריך שיניים לסיאמי:\n• FORL (ספיגת שיניים) שכיחה מאוד\n• בדיקת שיניים אצל וטרינר כל 6 חודשים\n• סימנים: ריור מוגבר, קושי באכילה\n• צילומי שיניים תקופתיים מומלצים',
    'respiratory': '🫁 סיאמיים נוטים לאסתמה — הימנעו מעשן, אבק ובשמים.',
  },
  'סיאמי': {
    'dental': '🦷 FORL שכיח — בדיקת שיניים כל 6 חודשים, צילומי שיניים תקופתיים.',
  },
  'british shorthair': {
    'heart': '❤️ מדריך לב לבריטי:\n• HCM (קרדיומיופתיה היפרטרופית) שכיחה\n• אקו-לב שנתי מחובה\n• סימנים: קוצר נשימה, חולשה פתאומית\n• תזונה דלת-נתרן\n• טאורין בתזונה חיוני',
    'weight': '⚖️ בריטיים נוטים להשמנה — מנות מדודות, הגבלת חטיפים, משחק פעיל.',
  },
  'בריטי קצר שיער': {
    'heart': '❤️ HCM שכיחה — אקו-לב שנתי, תזונה דלת-נתרן, טאורין.',
  },
  'maine coon': {
    'heart': '❤️ מיין קון — HCM בדיקה גנטית מומלצת. אקו-לב שנתי.',
    'joint': '🦴 גודל גדול = עומס על מפרקים. תוסף גלוקוזאמין ומשטחים רכים.',
  },
  'מיין קון': {
    'heart': '❤️ HCM + דיספלזיה — בדיקות תקופתיות ותמיכת מפרקים.',
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
    [['eye', 'עיניים', 'ear', 'אוזניים', 'dental', 'שיניים', 'forl'], 'health'],
    // Cat-specific circles
    [['urinary', 'שתן', 'flutd', 'struvite', 'crystals', 'גבישים', 'blockage', 'חסימה'], 'urinary'],
    [['kidney', 'כליות', 'renal', 'ckd', 'creatinine', 'קריאטינין', 'phosphorus', 'זרחן'], 'renal'],
    [['hairball', 'כדורי שיער', 'trichobezoar', 'vomit fur', 'הקאת שיער'], 'hairball'],
    [['thyroid', 'תירואיד', 'hyperthyroid', 'היפרתירואיד', 't4'], 'thyroid'],
  ];
  
  for (const [keywords, circle] of mappings) {
    if (keywords.some(kw => lower.includes(kw)) && !circles.includes(circle)) {
      circles.push(circle);
    }
  }
  
  return circles;
}

// === SAFETY: Check for dog-toxic medications in cat records ===
interface SafetyWarning {
  type: 'critical' | 'warning';
  message: string;
  medication: string;
}

function checkCrossSpeciesSafety(medications: string[], petType: string): SafetyWarning[] {
  if (petType !== 'cat') return [];
  
  const warnings: SafetyWarning[] = [];
  const medsLower = medications.map(m => m.toLowerCase()).join(' ');
  
  for (const toxic of DOG_ONLY_MEDICATIONS) {
    if (medsLower.includes(toxic.toLowerCase())) {
      warnings.push({
        type: 'critical',
        message: `⚠️ אזהרה קריטית: ${toxic} רעיל לחתולים! יש לפנות לווטרינר מיד.`,
        medication: toxic,
      });
    }
  }
  
  return warnings;
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

  // Extract diagnoses - lines containing medical keywords (dogs + cats)
  const diagnosisKeywords = [
    'ear infection', 'דלקת אוזניים', 'urinary', 'שתן', 'crystals', 'גבישים',
    'allergy', 'אלרגיה', 'skin', 'עור', 'dental', 'שיניים', 'eye', 'עיניים',
    'tumor', 'גידול', 'fracture', 'שבר', 'heart', 'לב', 'kidney', 'כליות',
    'liver', 'כבד', 'diabetes', 'סוכרת', 'arthritis', 'דלקת מפרקים',
    'hip dysplasia', 'דיספלזיה', 'luxating patella', 'פטלה',
    // Cat-specific conditions
    'flutd', 'struvite', 'סטרוביט', 'ckd', 'renal failure', 'כשל כלייתי',
    'hyperthyroid', 'היפרתירואיד', 'forl', 'feline resorptive',
    'hairball', 'כדורי שיער', 'feline asthma', 'אסתמה',
    'fip', 'peritonitis', 'פריטוניטיס',
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
    const { petId, userId, summary, visitDate, clinicName, vetName, petType } = await req.json();

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

    // === SAFETY CHECK: Cross-species medication warnings ===
    const resolvedPetType = petType || (petInfo as any)?.type || 'dog';
    // If petType not passed, try fetching it
    let actualPetType = resolvedPetType;
    if (!petType) {
      const { data: petTypeData } = await supabase
        .from("pets")
        .select("type")
        .eq("id", petId)
        .maybeSingle();
      if (petTypeData?.type) actualPetType = petTypeData.type;
    }
    
    const safetyWarnings = checkCrossSpeciesSafety(extracted.medications, actualPetType);

    return new Response(JSON.stringify({
      visit,
      extracted,
      recoveryUntil,
      safetyWarnings,
      petType: actualPetType,
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
