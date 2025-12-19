import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch trending data based on type
    let contextData: any = {};
    
    if (type === "posts") {
      // Get posts with most engagement in the last week
      const { data: trendingPosts } = await supabase
        .from("posts")
        .select(`
          id, caption, created_at, user_id,
          profiles!posts_user_id_fkey_profiles (full_name, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      // Get like counts for these posts
      const postIds = trendingPosts?.map(p => p.id) || [];
      const { data: likeCounts } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);

      // Count likes per post
      const likeMap: Record<string, number> = {};
      likeCounts?.forEach(l => {
        likeMap[l.post_id] = (likeMap[l.post_id] || 0) + 1;
      });

      // Add engagement scores
      contextData.posts = trendingPosts?.map(p => ({
        ...p,
        likes: likeMap[p.id] || 0,
        engagement_score: (likeMap[p.id] || 0) * 2
      })).sort((a, b) => b.engagement_score - a.engagement_score).slice(0, 20);

      // Get hashtag trends
      const { data: hashtags } = await supabase
        .from("hashtags")
        .select("name, post_count")
        .order("post_count", { ascending: false })
        .limit(10);

      contextData.trending_hashtags = hashtags;
    }

    if (type === "parks") {
      const { data: parks } = await supabase
        .from("dog_parks")
        .select("id, name, city, rating, total_reviews")
        .eq("status", "approved")
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(20);

      contextData.parks = parks;
    }

    if (type === "deals") {
      const { data: deals } = await supabase
        .from("promotional_offers")
        .select("id, title, subtitle, badge_text")
        .eq("is_active", true)
        .order("display_order")
        .limit(10);

      contextData.deals = deals;
    }

    // Use AI to analyze and provide insights
    const systemPrompt = `אתה מנתח תוכן חכם לאפליקציית חיות מחמד.
תפקידך לנתח את הנתונים ולספק תובנות בעברית.
החזר JSON בלבד עם המבנה הבא:
{
  "insights": [
    {
      "type": "trend" | "recommendation" | "highlight",
      "title": "כותרת קצרה",
      "description": "תיאור קצר",
      "relevance_score": number (1-10)
    }
  ],
  "trending_topics": ["נושא1", "נושא2"],
  "summary": "סיכום קצר של הטרנדים"
}`;

    const userPrompt = `נתח את הנתונים הבאים וספק תובנות חכמות:
${JSON.stringify(contextData, null, 2)}

סוג הבקשה: ${type}
${userId ? `מזהה משתמש: ${userId}` : "משתמש אנונימי"}`;

    console.log("Calling Lovable AI for smart discovery analysis...");

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
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limits exceeded", 
          data: contextData 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Payment required", 
          data: contextData 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      // Return data without AI insights on error
      return new Response(JSON.stringify({ 
        data: contextData,
        ai_insights: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;
    
    let aiInsights = null;
    try {
      aiInsights = JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    console.log("Smart discovery analysis complete");

    return new Response(JSON.stringify({
      data: contextData,
      ai_insights: aiInsights,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Smart discovery error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
