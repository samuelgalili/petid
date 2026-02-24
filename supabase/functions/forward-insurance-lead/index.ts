import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, forwardToEmail, adminNotes } = await req.json();

    if (!leadId || !forwardToEmail) {
      return new Response(JSON.stringify({ error: "Missing leadId or forwardToEmail" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the lead data
    const { data: lead, error: leadError } = await supabase
      .from("insurance_leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for more context
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", lead.user_id)
      .maybeSingle();

    const planLabels: Record<string, string> = {
      basic: "בסיסי",
      premium: "פרימיום",
      gold: "זהב",
    };

    const resend = new Resend(RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from: "PetID Insurance <noreply@petid.co.il>",
      to: [forwardToEmail],
      subject: `פנייה חדשה לביטוח חיית מחמד - ${lead.pet_name}`,
      html: `
        <div dir="rtl" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 20px;">🛡️ פנייה חדשה לביטוח חיית מחמד</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">באמצעות PetID</p>
          </div>
          
          <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #1e3a5f; font-size: 16px; margin-top: 0;">פרטי בעל החיה</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #6b7280;">שם:</td><td style="padding: 8px 0; font-weight: 600;">${profile?.full_name || "לא ידוע"}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">טלפון:</td><td style="padding: 8px 0; font-weight: 600; direction: ltr; text-align: right;">${lead.phone}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">אימייל:</td><td style="padding: 8px 0;">${profile?.email || "לא זמין"}</td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

            <h2 style="color: #1e3a5f; font-size: 16px;">פרטי חיית המחמד</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #6b7280;">שם:</td><td style="padding: 8px 0; font-weight: 600;">${lead.pet_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">סוג:</td><td style="padding: 8px 0;">${lead.pet_type === "dog" ? "כלב 🐕" : lead.pet_type === "cat" ? "חתול 🐈" : lead.pet_type}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">גזע:</td><td style="padding: 8px 0;">${lead.breed || "לא צוין"}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">גיל:</td><td style="padding: 8px 0;">${lead.age_years ? `${lead.age_years} שנים` : "לא צוין"}</td></tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

            <h2 style="color: #1e3a5f; font-size: 16px;">פרטי הביטוח המבוקש</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #6b7280;">תוכנית:</td><td style="padding: 8px 0; font-weight: 600;">${planLabels[lead.selected_plan] || lead.selected_plan || "לא נבחרה"}</td></tr>
              ${lead.health_answer_1 ? `<tr><td style="padding: 8px 0; color: #6b7280;">מצב בריאותי:</td><td style="padding: 8px 0;">${lead.health_answer_1}</td></tr>` : ""}
              ${lead.health_answer_2 ? `<tr><td style="padding: 8px 0; color: #6b7280;">פירוט נוסף:</td><td style="padding: 8px 0;">${lead.health_answer_2}</td></tr>` : ""}
            </table>

            ${adminNotes ? `
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <h2 style="color: #1e3a5f; font-size: 16px;">הערות האדמין</h2>
            <p style="font-size: 14px; color: #374151;">${adminNotes}</p>
            ` : ""}
          </div>

          <div style="background: #f9fafb; padding: 16px 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
              הודעה זו נשלחה אוטומטית ממערכת PetID • ${new Date().toLocaleDateString("he-IL")}
            </p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      throw new Error(`Failed to send email: ${JSON.stringify(emailError)}`);
    }

    // Update lead status
    const authHeader = req.headers.get("authorization");
    let adminId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const token = authHeader.slice(7);
      if (token !== anonKey) {
        const { data: { user } } = await supabase.auth.getUser(token);
        adminId = user?.id || null;
      }
    }

    await supabase
      .from("insurance_leads")
      .update({
        status: "forwarded",
        admin_approved_at: new Date().toISOString(),
        admin_approved_by: adminId,
        forwarded_to_email: forwardToEmail,
        forwarded_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq("id", leadId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("forward-insurance-lead error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
