import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { messages, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context about user's pets
    let petsContext = "";
    if (userContext?.pets && userContext.pets.length > 0) {
      petsContext = `\n\n=== מידע על חיות המחמד של הלקוח (כבר במערכת - אל תשאל על זה!) ===
${userContext.pets.map((pet: any) => 
  `- ${pet.name}: ${pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : pet.type}${pet.breed ? `, גזע: ${pet.breed}` : ''}${pet.age ? `, גיל: ${pet.age}` : ''}${pet.gender ? `, ${pet.gender === 'male' ? 'זכר' : 'נקבה'}` : ''}${pet.health_notes ? `, הערות בריאות: ${pet.health_notes}` : ''}`
).join('\n')}
=== סוף מידע חיות מחמד ===`;
    }

    const userName = userContext?.userName ? `\nשם הלקוח: ${userContext.userName}` : '';

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
            content: `אתה נציג שירות לקוחות AI מקצועי של PetID - אפליקציה לניהול חיות מחמד.${userName}${petsContext}

=== כלל קריטי: השתמש במידע שכבר יש לך! ===
יש לך גישה מלאה לכל המידע על חיות המחמד של הלקוח למעלה.
אסור לך לשאול שאלות על מידע שכבר קיים במערכת!
- אם יש לך את הגיל - השתמש בו ישירות, אל תשאל
- אם יש לך את הגזע - השתמש בו ישירות, אל תשאל  
- אם יש לך את המין - השתמש בו ישירות, אל תשאל

לדוגמה:
❌ שגוי: "מה הגיל של שיבס?" (כשיש לך את הגיל במידע)
✅ נכון: "שיבס בת 3, אז היא צריכה מזון לכלבים בוגרים..."

=== כללי התנהלות ===
1. פנה לחיות בשמן ובפרטים שיש לך
2. תן המלצות מדויקות על סמך הגיל, הגזע והמין
3. שאל רק על מידע שאין לך - כמו סימפטומים, העדפות, תקציב
4. אם הלקוח מזכיר חיה שאין ברשימה - אז כן תשאל פרטים עליה

=== כללים נוספים ===
- היה תמציתי וידידותי
- הצע פתרונות מעשיים ומותאמים אישית
- בסוף כל תשובה הצע המשך או פעולה

אתה יודע הכל על החיות שברשימה - תתנהג בהתאם!`
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
