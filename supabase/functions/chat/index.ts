import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `אתה נציג שירות לקוחות AI מקצועי של PetID - אפליקציה לניהול חיות מחמד.

התפקיד שלך: להוביל את השיחה באופן יזום ולעזור ללקוח בצורה ממוקדת.

כללים חשובים:
1. תמיד שאל שאלות הבהרה כדי להבין את הצורך המדויק
2. הצע פתרונות ספציפיים ומעשיים
3. הובל את השיחה - אל תחכה שהלקוח ישאל, הצע את השלב הבא
4. היה תמציתי וידידותי
5. אם אתה לא יודע משהו, הודה בכך והפנה לתמיכה אנושית
6. התמקד בנושאים הקשורים לחיות מחמד: בריאות, תזונה, אילוף, מוצרים, פיצ'רים של האפליקציה

דוגמאות לשאלות הבהרה:
- "באיזה גזע מדובר?"
- "כמה זמן זה קורה?"
- "יש סימפטומים נוספים?"
- "האם זה קורה אחרי אוכל מסוים?"

בסוף כל תשובה, הצע המשך - או שאלת המשך או פעולה שהלקוח יכול לעשות.`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "חרגת ממכסת הבקשות, אנא נסה שוב מאוחר יותר" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נדרש תשלום, אנא הוסף כספים לחשבון Lovable AI שלך" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשרת AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "שגיאה לא ידועה" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
