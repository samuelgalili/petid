import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Feeding calculation (mirrors TopRecommendation.tsx logic) ──
function calculateDailyGrams(weightKg: number, birthDate: string | null): number {
  let ageYears = 3;
  if (birthDate) {
    const born = new Date(birthDate);
    const now = new Date();
    ageYears = (now.getTime() - born.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  }

  let pct = 0.025; // adult default
  if (ageYears < 1) pct = 0.04;
  else if (ageYears < 2) pct = 0.03;
  else if (ageYears > 7) pct = 0.02;

  return Math.round(weightKg * pct * 1000);
}

// ── Parse bag weight from order item variant/size string ──
function parseBagWeightKg(variant: string | null, size: string | null): number | null {
  const raw = variant || size || '';
  const match = raw.match(/([\d.]+)\s*ק"?ג/i) || raw.match(/([\d.]+)\s*kg/i);
  if (match) return parseFloat(match[1]);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const notifications: any[] = [];

    // ============================================
    // 1. MEDICAL TRIGGERS - Vaccine Countdown
    // ============================================
    const { data: pets } = await supabase
      .from('pets')
      .select('id, name, user_id, has_insurance, insurance_company, microchip_number, birth_date, current_food, weight, weight_unit, size, breed');

    if (pets) {
      for (const pet of pets) {
        // Get latest vaccines from vet visits
        const { data: visits } = await supabase
          .from('pet_vet_visits')
          .select('vaccines, visit_date, medications, next_visit_date')
          .eq('pet_id', pet.id)
          .order('visit_date', { ascending: false })
          .limit(5);

        // Vaccine countdown (30, 14, 7 days before next_visit_date)
        if (visits) {
          for (const visit of visits) {
            if (visit.next_visit_date) {
              const nextVisit = new Date(visit.next_visit_date);
              const daysUntil = Math.ceil((nextVisit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

              if ([30, 14, 7, 3, 1].includes(daysUntil)) {
                const timeText = daysUntil === 1 ? 'מחר' : daysUntil === 3 ? '3 ימים' : daysUntil === 7 ? 'שבוע' : daysUntil === 14 ? 'שבועיים' : 'חודש';
                const urgency = daysUntil <= 3 ? 'urgent' : 'normal';
                notifications.push({
                  user_id: pet.user_id,
                  title: daysUntil <= 3 ? '⚠️ חיסון בקרוב!' : 'תזכורת חיסון 💉',
                  message: daysUntil <= 3 
                    ? `שרה מ-PetID: ${pet.name} חייב/ת חיסון בעוד ${timeText}! חשוב לקבוע תור עכשיו`
                    : `שרה מ-PetID: ל${pet.name} יש חיסון בעוד ${timeText}. נקבע תור?`,
                  type: 'medical',
                  category: 'medical',
                  data: { pet_id: pet.id, pet_name: pet.name, days_until: daysUntil, trigger: 'vaccine_countdown', urgency, agent: 'sarah' },
                });
              }
            }

            // Medication reminders - daily for active medications
            if (visit.medications && visit.medications.length > 0) {
              const visitDate = new Date(visit.visit_date);
              const daysSinceVisit = Math.ceil((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceVisit >= 0 && daysSinceVisit <= 14) {
                notifications.push({
                  user_id: pet.user_id,
                  title: 'תזכורת תרופה 💊',
                  message: `זמן לתרופה של ${pet.name} 💊`,
                  type: 'medical',
                  category: 'medical',
                  data: { pet_id: pet.id, pet_name: pet.name, medications: visit.medications, trigger: 'medication_reminder' },
                });
              }
            }
          }
        }

        // ============================================
        // 2. FINANCIAL TRIGGERS - Missing Insurance Data
        // ============================================
        if (pet.has_insurance && !pet.microchip_number) {
          notifications.push({
            user_id: pet.user_id,
            title: 'מידע חסר לביטוח 🛡️',
            message: `${pet.name} כמעט מוגנ/ת, אבל חסר לנו מספר השבב כדי להפעיל את הביטוח`,
            type: 'insurance',
            category: 'insurance',
            data: { pet_id: pet.id, pet_name: pet.name, trigger: 'missing_microchip' },
          });
        }

        // ============================================
        // 3. PERSONALIZED - Growth Milestones (puppies)
        // ============================================
        if (pet.birth_date) {
          const birthDate = new Date(pet.birth_date);
          const ageMonths = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

          // Life-stage personalized messages
          const getLifeStage = (months: number) => {
            if (months < 6) return 'גור';
            if (months < 12) return 'גור צעיר';
            if (months < 24) return 'צעיר/ה';
            return 'בוגר/ת';
          };
          const lifeStage = getLifeStage(ageMonths);

          const milestones: Record<number, string> = {
            2: `${pet.name} (${lifeStage}) חוגג/ת חודשיים! 🎂 זה הזמן לביקור וטרינר ראשון וחיסונים`,
            3: `${pet.name} (${lifeStage}) חוגג/ת 3 חודשים! 🐾 זה הזמן להתחיל אילוף בסיסי וסוציאליזציה`,
            4: `${pet.name} (${lifeStage}) חוגג/ת 4 חודשים! זה הזמן לבדוק אם שיני החלב מתחילות להתחלף`,
            6: `${pet.name} (${lifeStage}) חוגג/ת חצי שנה! זה הזמן לשקול עיקור/סירוס`,
            12: `${pet.name} חוגג/ת שנה! 🎂 מזל טוב! זמן לעדכן את תכנית הבריאות`,
          };

          if (milestones[ageMonths]) {
            const milestoneDate = new Date(birthDate);
            milestoneDate.setMonth(milestoneDate.getMonth() + ageMonths);
            const daysDiff = Math.abs((now.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 1) {
              notifications.push({
                user_id: pet.user_id,
                title: 'אבן דרך! 🎉',
                message: milestones[ageMonths],
                type: 'care',
                category: 'care',
                data: { pet_id: pet.id, pet_name: pet.name, age_months: ageMonths, life_stage: lifeStage, trigger: 'growth_milestone' },
              });
            }
          }
        }

        // ============================================
        // 4. SMART RESTOCK - Data-Driven Food Prediction
        // ============================================
        if (pet.current_food) {
          // Get last food purchase with item details
          const { data: lastOrder } = await supabase
            .from('orders')
            .select('id, created_at')
            .eq('user_id', pet.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastOrder) {
            // Get order items to find bag weight
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('variant, size, quantity, product_name')
              .eq('order_id', lastOrder.id);

            // Try to get bag weight from order items
            let bagWeightKg: number | null = null;
            if (orderItems) {
              for (const item of orderItems) {
                const w = parseBagWeightKg(item.variant, item.size);
                if (w) { bagWeightKg = w * (item.quantity || 1); break; }
              }
            }

            // Calculate daily consumption
            let weightKg = pet.weight ? parseFloat(pet.weight) : null;
            
            // Fallback: estimate weight from breed info
            if (!weightKg && pet.breed) {
              const { data: breedInfo } = await supabase
                .from('breed_information')
                .select('weight_range_kg')
                .eq('breed_name', pet.breed)
                .maybeSingle();
              if (breedInfo?.weight_range_kg) {
                const match = breedInfo.weight_range_kg.match(/(\d+)-(\d+)/);
                if (match) weightKg = (parseInt(match[1]) + parseInt(match[2])) / 2;
              }
            }

            const dailyGrams = weightKg ? calculateDailyGrams(weightKg, pet.birth_date) : null;
            const orderDate = new Date(lastOrder.created_at);
            const daysSinceOrder = Math.ceil((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

            // Smart prediction: if we have bag weight & daily grams, calculate exact depletion
            let daysUntilEmpty: number | null = null;
            if (bagWeightKg && dailyGrams) {
              const totalGrams = bagWeightKg * 1000;
              const totalDays = Math.floor(totalGrams / dailyGrams);
              daysUntilEmpty = totalDays - daysSinceOrder;
            }

            // Notify 7 days before depletion (smart) OR fallback to 25-day heuristic
            const shouldNotify = daysUntilEmpty !== null
              ? (daysUntilEmpty >= 5 && daysUntilEmpty <= 8)
              : (daysSinceOrder >= 25 && daysSinceOrder <= 27);

            if (shouldNotify) {
              const daysLeftText = daysUntilEmpty !== null
                ? `בעוד כ-${daysUntilEmpty} ימים`
                : 'בעוד כמה ימים';
              notifications.push({
                user_id: pet.user_id,
                title: 'השק עומד להיגמר 🍖',
                message: `שרה מ-PetID: האוכל של ${pet.name} (${pet.current_food}) צפוי להיגמר ${daysLeftText}. רוצה שאזמין חדש?`,
                type: 'shop',
                category: 'shop',
                data: {
                  pet_id: pet.id,
                  pet_name: pet.name,
                  food: pet.current_food,
                  daily_grams: dailyGrams,
                  bag_weight_kg: bagWeightKg,
                  days_until_empty: daysUntilEmpty,
                  trigger: 'restock_alert',
                  agent: 'sarah',
                },
              });
            }
          }
        }
      }
    }

    // ============================================
    // 5. FINANCIAL TRIGGERS - Claim Status Updates
    // ============================================
    const { data: approvedClaims } = await supabase
      .from('insurance_claims')
      .select('id, user_id, total_amount, pet_id, status, status_note')
      .in('status', ['approved', 'paid'])
      .gte('updated_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    if (approvedClaims) {
      for (const claim of approvedClaims) {
        const { data: claimPet } = await supabase
          .from('pets')
          .select('name')
          .eq('id', claim.pet_id)
          .maybeSingle();

        const petName = claimPet?.name || 'חיית המחמד';

        if (claim.status === 'approved') {
          notifications.push({
            user_id: claim.user_id,
            title: 'תביעה אושרה! ✅',
            message: `חדשות טובות! ההחזר על סך ${claim.total_amount} ש"ח עבור ${petName} אושר והועבר לחשבונך`,
            type: 'insurance',
            category: 'insurance',
            data: { claim_id: claim.id, pet_name: petName, amount: claim.total_amount, trigger: 'claim_approved' },
          });
        }
      }
    }

    // ============================================
    // De-duplicate & Insert + Push Dispatch
    // ============================================
    let inserted = 0;
    const pushTargets: { user_id: string; title: string; body: string }[] = [];

    for (const notif of notifications) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', notif.user_id)
        .eq('type', notif.type)
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { error } = await supabase.from('notifications').insert(notif);
      if (!error) {
        inserted++;
        pushTargets.push({
          user_id: notif.user_id,
          title: notif.title,
          body: notif.message,
        });
      }
    }

    // ── Dispatch push notifications for each inserted notification ──
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let pushSent = 0;

    for (const target of pushTargets) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: target.user_id,
            payload: { title: target.title, body: target.body, url: '/notifications' },
          }),
        });
        if (resp.ok) pushSent++;
        // Consume body to avoid leaks
        await resp.text();
      } catch (e) {
        console.error(`Push dispatch failed for ${target.user_id}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: notifications.length, inserted, pushSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Smart notifications error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
