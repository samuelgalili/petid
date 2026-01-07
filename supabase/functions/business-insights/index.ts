import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessMetrics {
  revenue: {
    today: number;
    yesterday: number;
    week: number;
    month: number;
    lastMonth: number;
  };
  orders: {
    today: number;
    week: number;
    month: number;
    pending: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    returningPercent: number;
  };
  inventory: {
    lowStock: number;
    outOfStock: number;
    fastMovers: string[];
    slowMovers: string[];
  };
  topProducts: Array<{ name: string; revenue: number; quantity: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json() as { metrics: BusinessMetrics };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `אתה מנתח עסקי מומחה שמספק תובנות לבעלי עסקים.
עליך לנתח נתונים עסקיים ולספק תובנות קצרות, ברורות וניתנות לפעולה.

כללי חשובים:
- כתוב בעברית תקנית
- התמקד בתובנות שחשובות להחלטות עסקיות
- השווה תקופות ואותר חריגות
- הצע פעולות קונקרטיות כשרלוונטי
- שמור על טון מקצועי אך ידידותי
- כל תובנה צריכה להיות קצרה (משפט-שניים)

פורמט התגובה (JSON array):
[
  {
    "type": "trend" | "alert" | "opportunity" | "insight",
    "icon": "📈" | "📉" | "⚠️" | "💡" | "🎯" | "🔥" | "❄️" | "👥" | "📦" | "💰",
    "title": "כותרת קצרה",
    "description": "תיאור התובנה",
    "priority": "high" | "medium" | "low",
    "action": "הצעה לפעולה (אופציונלי)"
  }
]

ספק 4-6 תובנות מגוונות על בסיס הנתונים.`;

    const userPrompt = `נתוני העסק:

**הכנסות:**
- היום: ₪${metrics.revenue.today.toLocaleString()}
- אתמול: ₪${metrics.revenue.yesterday.toLocaleString()}
- השבוע: ₪${metrics.revenue.week.toLocaleString()}
- החודש: ₪${metrics.revenue.month.toLocaleString()}
- חודש קודם: ₪${metrics.revenue.lastMonth.toLocaleString()}

**הזמנות:**
- היום: ${metrics.orders.today}
- השבוע: ${metrics.orders.week}
- החודש: ${metrics.orders.month}
- ממתינות לטיפול: ${metrics.orders.pending}

**לקוחות:**
- סה"כ: ${metrics.customers.total}
- חדשים החודש: ${metrics.customers.new}
- חוזרים: ${metrics.customers.returning}
- אחוז לקוחות חוזרים: ${metrics.customers.returningPercent}%

**מלאי:**
- מוצרים במלאי נמוך: ${metrics.inventory.lowStock}
- מוצרים אזלו: ${metrics.inventory.outOfStock}
- נמכרים מהר: ${metrics.inventory.fastMovers.join(", ") || "אין נתונים"}
- נמכרים לאט: ${metrics.inventory.slowMovers.join(", ") || "אין נתונים"}

**מוצרים מובילים (לפי הכנסה):**
${metrics.topProducts.map((p, i) => `${i + 1}. ${p.name} - ₪${p.revenue.toLocaleString()} (${p.quantity} יח')`).join("\n")}

נתח את הנתונים וספק תובנות עסקיות.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON array from the response
    let insights = [];
    try {
      // Find JSON array in the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse insights JSON:", parseError);
      // Fallback to a simple insight
      insights = [
        {
          type: "insight",
          icon: "💡",
          title: "ניתוח בסיסי",
          description: content.slice(0, 200),
          priority: "medium",
        },
      ];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Business insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
