import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { chatCompletion } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchRequest {
  query: string;
  matchCount?: number;
  matchThreshold?: number;
  sourceIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, matchCount = 5, matchThreshold = 0.6, sourceIds }: SearchRequest = await req.json();

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Search] Query: "${query.substring(0, 100)}"`);

    // Generate embedding for the query
    const embResult = await chatCompletion({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: "You are an embedding generator. Given text, output a JSON array of 768 floating point numbers representing the semantic embedding vector. Output ONLY the JSON array, nothing else.",
        },
        {
          role: "user",
          content: `Generate a 768-dimensional embedding vector for this search query. Output ONLY a JSON array of 768 numbers:\n\n${query}`,
        },
      ],
    }) as any;
    const embContent = embResult.choices?.[0]?.message?.content || "";
    const arrMatch = embContent.match(/\[[\s\S]*\]/);

    if (!arrMatch) {
      throw new Error("Failed to generate query embedding");
    }

    let queryEmbedding: number[];
    try {
      queryEmbedding = JSON.parse(arrMatch[0]);
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 768) {
        throw new Error("Invalid embedding dimensions");
      }
    } catch {
      throw new Error("Failed to parse query embedding");
    }

    // Search using the match_documents function
    const { data: results, error: searchErr } = await supabase.rpc("match_documents", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_source_ids: sourceIds || null,
    });

    if (searchErr) {
      console.error("[Search] RPC error:", searchErr);
      
      // Fallback: text search if vector search fails
      const { data: fallbackResults } = await supabase
        .from("document_chunks")
        .select("id, source_id, document_title, section_title, content, summary, keywords, metadata")
        .textSearch("content", query.split(" ").join(" & "))
        .limit(matchCount);

      return new Response(
        JSON.stringify({
          results: (fallbackResults || []).map((r: any) => ({ ...r, similarity: 0.5 })),
          search_type: "text_fallback",
          query,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Search] Found ${results?.length || 0} results`);

    return new Response(
      JSON.stringify({
        results: results || [],
        search_type: "semantic",
        query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Search] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
