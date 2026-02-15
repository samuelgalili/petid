import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      .select('id, name, user_id, has_insurance, insurance_company, microchip_number, birth_date, current_food');

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

              if ([30, 14, 7].includes(daysUntil)) {
                const timeText = daysUntil === 7 ? 'שבוע' : daysUntil === 14 ? 'שבועיים' : 'חודש';
                notifications.push({
                  user_id: pet.user_id,
                  title: 'תזכורת חיסון 💉',
                  message: `${pet.name}, נשארו רק ${timeText} לחיסון הבא שלך! בואי נקבע תור`,
                  type: 'medical',
                  category: 'medical',
                  data: { pet_id: pet.id, pet_name: pet.name, days_until: daysUntil, trigger: 'vaccine_countdown' },
                });
              }
            }

            // Medication reminders - daily for active medications
            if (visit.medications && visit.medications.length > 0) {
              const visitDate = new Date(visit.visit_date);
              const daysSinceVisit = Math.ceil((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
              // Assume medications last ~14 days unless specified
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
          
          const milestones: Record<number, string> = {
            2: `${pet.name} חוגג/ת חודשיים! זה הזמן לביקור וטרינר ראשון וחיסונים`,
            4: `${pet.name} חוגג/ת 4 חודשים! זה הזמן לבדוק אם שיני החלב מתחילות להתחלף`,
            6: `${pet.name} חוגג/ת חצי שנה! זה הזמן לשקול עיקור/סירוס`,
            12: `${pet.name} חוגג/ת שנה! 🎂 מזל טוב! זמן לעדכן את תכנית הבריאות`,
          };

          if (milestones[ageMonths]) {
            // Check if today is the actual milestone day (within 1 day tolerance)
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
                data: { pet_id: pet.id, pet_name: pet.name, age_months: ageMonths, trigger: 'growth_milestone' },
              });
            }
          }
        }

        // ============================================
        // 4. PERSONALIZED - Restock Alert (food)
        // ============================================
        // If pet has current_food and last purchase was ~25 days ago
        if (pet.current_food) {
          const { data: lastOrder } = await supabase
            .from('orders')
            .select('created_at')
            .eq('user_id', pet.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastOrder) {
            const daysSinceOrder = Math.ceil((now.getTime() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceOrder >= 25 && daysSinceOrder <= 27) {
              notifications.push({
                user_id: pet.user_id,
                title: 'הזמנת אוכל 🍖',
                message: `השק של ${pet.current_food} עומד להיגמר בעוד כמה ימים. להזמין חדש?`,
                type: 'shop',
                category: 'shop',
                data: { pet_id: pet.id, pet_name: pet.name, food: pet.current_food, trigger: 'restock_alert' },
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
        // Get pet name
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
            message: `חדשות טובות! ההחזר מ-Libra על סך ${claim.total_amount} ש"ח אושר והועבר לחשבונך`,
            type: 'insurance',
            category: 'insurance',
            data: { claim_id: claim.id, pet_name: petName, amount: claim.total_amount, trigger: 'claim_approved' },
          });
        }
      }
    }

    // ============================================
    // De-duplicate: Don't re-send notifications
    // ============================================
    let inserted = 0;
    for (const notif of notifications) {
      // Check if similar notification was already sent today
      const triggerKey = notif.data?.trigger || '';
      const petId = notif.data?.pet_id || '';
      
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', notif.user_id)
        .eq('type', notif.type)
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      // Simple dedup: skip if same type notification exists today
      if (existing && existing.length > 0) continue;

      const { error } = await supabase.from('notifications').insert(notif);
      if (!error) inserted++;
    }

    return new Response(
      JSON.stringify({ success: true, generated: notifications.length, inserted }),
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
