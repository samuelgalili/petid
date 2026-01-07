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
      petsContext = `\n\nמידע על חיות המחמד של הלקוח:
${userContext.pets.map((pet: any) => 
  `- ${pet.name}: ${pet.type === 'dog' ? 'כלב' : pet.type === 'cat' ? 'חתול' : pet.type}${pet.breed ? `, גזע: ${pet.breed}` : ''}${pet.age ? `, גיל: ${pet.age}` : ''}${pet.gender ? `, ${pet.gender === 'male' ? 'זכר' : 'נקבה'}` : ''}${pet.health_notes ? `, הערות בריאות: ${pet.health_notes}` : ''}`
).join('\n')}

השתמש במידע הזה כדי לתת מענה מותאם אישית. פנה לחיות בשמם.`;
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

התפקיד שלך: להוביל את השיחה באופן יזום ולעזור ללקוח בצורה ממוקדת ואישית.

כללים חשובים לגבי חיות מחמד:
1. אם הלקוח מציין שם של חיית מחמד ספציפית - התייחס רק אליה
2. אם הלקוח לא מציין שם - התאם את התשובה לחיה הרלוונטית לפי ההקשר (למשל: שאלה על כלבים = התייחס לכלב שברשימה)
3. אם יש כמה חיות מאותו סוג ולא ברור על מי מדובר - שאל על איזו חיה מדובר
4. התאם את ההמלצות לגזע ולגיל של החיה הרלוונטית

כללים כלליים:
1. שאל שאלות הבהרה כדי להבין את הצורך המדויק
2. הצע פתרונות ספציפיים ומעשיים
3. הובל את השיחה - אל תחכה שהלקוח ישאל, הצע את השלב הבא
4. היה תמציתי וידידותי
5. אם אתה לא יודע משהו, הודה בכך והפנה לתמיכה אנושית
6. אם הלקוח מספר על חיה אחרת (לא ברשימה שלו), התייחס אליה בהתאם

דוגמאות:
- אם הלקוח שואל "הכלב שלי לא אוכל" ויש לו רק כלב אחד - התייחס אליו
- אם הלקוח שואל "בלה לא מרגישה טוב" - התייחס לבלה ספציפית
- אם יש 2 כלבים ושאלה כללית על כלב - שאל "על מי מדובר, [שם1] או [שם2]?"

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
