import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user1_id, user2_id } = await req.json();
    if (!user1_id || !user2_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing user IDs" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch both users' pets to understand their interests
    const [pets1Result, pets2Result] = await Promise.all([
      supabase.from("pets").select("type, breed, personality_tags, favorite_activities").eq("user_id", user1_id).eq("archived", false),
      supabase.from("pets").select("type, breed, personality_tags, favorite_activities").eq("user_id", user2_id).eq("archived", false),
    ]);

    const pets1 = pets1Result.data || [];
    const pets2 = pets2Result.data || [];

    // Collect pet types and breeds for matching
    const types1 = new Set(pets1.map(p => p.type));
    const types2 = new Set(pets2.map(p => p.type));
    const breeds1 = new Set(pets1.map(p => p.breed).filter(Boolean));
    const breeds2 = new Set(pets2.map(p => p.breed).filter(Boolean));
    
    // Merge all pet types for broader content
    const allTypes = [...new Set([...types1, ...types2])];
    const sharedBreeds = [...breeds1].filter(b => breeds2.has(b));

    // Strategy: Find posts that are relevant to both users' pet types
    // Priority 1: Posts about shared breeds
    // Priority 2: Posts liked by both users' network
    // Priority 3: Popular posts about their pet types
    // Priority 4: General popular posts

    let postIds: string[] = [];

    // Priority 1: Posts from users who have the same pet types
    if (allTypes.length > 0) {
      const { data: relevantPetOwners } = await supabase
        .from("pets")
        .select("user_id")
        .in("type", allTypes)
        .eq("archived", false)
        .neq("user_id", user1_id)
        .neq("user_id", user2_id)
        .limit(50);

      if (relevantPetOwners && relevantPetOwners.length > 0) {
        const ownerIds = relevantPetOwners.map(p => p.user_id);
        const { data: posts } = await supabase
          .from("posts")
          .select("id")
          .in("user_id", ownerIds)
          .is("removed_at", null)
          .order("created_at", { ascending: false })
          .limit(15);

        if (posts) {
          postIds = posts.map(p => p.id);
        }
      }
    }

    // If not enough, fill with popular recent posts
    if (postIds.length < 10) {
      const { data: popularPosts } = await supabase
        .from("posts")
        .select("id")
        .is("removed_at", null)
        .not("id", "in", `(${postIds.length > 0 ? postIds.join(",") : "00000000-0000-0000-0000-000000000000"})`)
        .order("views_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(15 - postIds.length);

      if (popularPosts) {
        postIds = [...postIds, ...popularPosts.map(p => p.id)];
      }
    }

    // Use AI to rank/curate if we have enough data
    if (postIds.length > 5) {
      // Fetch post details for AI ranking
      const { data: postDetails } = await supabase
        .from("posts")
        .select("id, caption, media_type")
        .in("id", postIds);

      if (postDetails && postDetails.length > 0) {
        const prompt = `Given two pet owners:
User 1 pets: ${JSON.stringify(pets1.map(p => ({ type: p.type, breed: p.breed })))}
User 2 pets: ${JSON.stringify(pets2.map(p => ({ type: p.type, breed: p.breed })))}

Rank these posts by relevance for a shared viewing experience. Return ONLY a JSON array of post IDs in order of relevance (most relevant first). Maximum 15 posts.

Posts:
${postDetails.map(p => `ID: ${p.id} | Caption: ${(p.caption || "").substring(0, 100)} | Type: ${p.media_type}`).join("\n")}`;

        try {
          const aiData = await chatCompletion({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You rank content for pet owners. Return ONLY a valid JSON array of UUIDs, no other text." },
              { role: "user", content: prompt },
            ],
          });

          const aiContent = aiData.choices?.[0]?.message?.content || "";
          const match = aiContent.match(/\[[\s\S]*?\]/);
          if (match) {
            try {
              const rankedIds = JSON.parse(match[0]);
              if (Array.isArray(rankedIds) && rankedIds.length > 0) {
                postIds = rankedIds.filter((id: string) => postIds.includes(id));
              }
            } catch { /* keep original order */ }
          }
        } catch (e) {
          console.error("AI ranking failed, using default order:", e);
        }
      }
    }

    // Ensure uniqueness and limit to 15
    postIds = [...new Set(postIds)].slice(0, 15);

    // Upsert shared feed
    const sortedIds = [user1_id, user2_id].sort();
    const { data: feed, error } = await supabase
      .from("shared_feeds")
      .upsert({
        user1_id: sortedIds[0],
        user2_id: sortedIds[1],
        post_ids: postIds,
        current_index_user1: 0,
        current_index_user2: 0,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user1_id,user2_id" })
      .select()
      .single();

    if (error) {
      console.error("Error upserting shared feed:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, feed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error in generate-shared-feed:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
