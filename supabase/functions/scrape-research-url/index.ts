import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScrapeRequest {
  url: string;
  dataType: string;
  sourceId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { url, dataType, sourceId }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraping URL: ${url} for data type: ${dataType}`);

    // Step 1: Scrape the URL with Firecrawl
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("Firecrawl error:", scrapeData);
      await supabase
        .from("admin_data_sources")
        .update({
          is_processed: false,
          extracted_data: { error: "Failed to scrape URL", details: scrapeData.error },
          updated_at: new Date().toISOString(),
        })
        .eq("id", sourceId);

      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || "Failed to scrape URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scrapedContent = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log(`Scraped ${scrapedContent.length} chars from ${url}. Title: ${metadata.title}`);

    // Step 2: Extract structured data with AI using Lovable AI Gateway
    const extractionPrompts: Record<string, string> = {
      articles: `You are extracting a full article/research paper. Return JSON:
{
  "title": "article title", "title_he": "כותרת בעברית",
  "authors": ["author1"], "publication_date": "date",
  "source_name": "journal name", "summary": "3-5 sentence summary",
  "summary_he": "סיכום בעברית", "full_content": "THE COMPLETE article text - do NOT truncate",
  "key_findings": ["finding1"], "key_findings_he": ["ממצא1"],
  "topics": ["topic1"], "relevance_to_pets": "relevance", "category": "articles"
}
IMPORTANT: Include the FULL article content in "full_content".`,
      breeds: `Extract breed information. Return JSON:
{
  "breeds": [{"name": "breed name", "name_he": "שם הגזע", "type": "dog/cat",
    "origin": "country", "size": "small/medium/large", "temperament": ["trait1"],
    "temperament_he": ["תכונה1"], "lifespan": "10-12 years",
    "health_issues": ["issue1"], "health_issues_he": ["בעיה1"],
    "description": "full description", "description_he": "תיאור מלא",
    "care_notes": "care info", "care_notes_he": "הנחיות טיפול"}],
  "category": "breeds"
}`,
      insurance: `Extract pet insurance information. Return JSON:
{
  "providers": [{"name": "company", "name_he": "שם חברה",
    "plans": [{"name": "plan", "monthly_cost": "price", "coverage": ["item1"]}],
    "contact": "phone/website", "summary_he": "סיכום בעברית"}],
  "full_content": "complete page text", "category": "insurance"
}`,
      dog_parks: `Extract dog park information. Return JSON:
{
  "parks": [{"name": "park name", "name_he": "שם הגינה",
    "city": "city", "address": "address",
    "amenities": ["amenity1"], "hours": "hours", "description_he": "תיאור בעברית"}],
  "full_content": "complete page text", "category": "dog_parks"
}`,
      research: `Extract research/study information. Return JSON:
{
  "title": "study title", "title_he": "כותרת בעברית",
  "authors": ["author1"], "year": "year", "source_name": "journal",
  "summary": "3-5 sentence summary", "summary_he": "סיכום בעברית",
  "full_content": "THE COMPLETE text", "key_findings": ["finding1"],
  "key_findings_he": ["ממצא1"], "relevance_to_pets": "relevance", "category": "research"
}
IMPORTANT: Include the FULL content.`,
    };

    const extractionPrompt = extractionPrompts[dataType] || extractionPrompts.articles;

    let extractedData: Record<string, unknown> = {};
    let isProcessed = false;

    try {
      console.log("Calling Lovable AI Gateway for extraction...");
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: extractionPrompt,
            },
            {
              role: "user",
              content: `Extract the full article from this web page:\n\nURL: ${formattedUrl}\nPage Title: ${metadata.title || "Unknown"}\n\nContent:\n${scrapedContent.substring(0, 30000)}`,
            },
          ],
        }),
      });

      console.log(`AI response status: ${aiResponse.status}`);

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content || "";
        console.log(`AI response content length: ${content.length}`);

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          extractedData.source_url = formattedUrl;
          extractedData.scraped_at = new Date().toISOString();
          extractedData.page_metadata = metadata;
          extractedData.raw_content_length = scrapedContent.length;
          isProcessed = true;
          console.log("AI extraction successful, keys:", Object.keys(extractedData).join(", "));
        } else {
          console.error("No JSON found in AI response. Content preview:", content.substring(0, 200));
          extractedData = {
            raw_content: scrapedContent,
            source_url: formattedUrl,
            page_metadata: metadata,
            ai_error: "Could not parse structured data from AI response",
          };
        }
      } else {
        const errorText = await aiResponse.text();
        console.error(`AI Gateway error (${aiResponse.status}):`, errorText);
        extractedData = {
          raw_content: scrapedContent,
          source_url: formattedUrl,
          page_metadata: metadata,
          ai_error: `AI Gateway returned ${aiResponse.status}`,
        };
      }
    } catch (aiError) {
      console.error("AI extraction error:", aiError);
      extractedData = {
        raw_content: scrapedContent,
        source_url: formattedUrl,
        page_metadata: metadata,
        ai_error: "Failed to extract structured data",
      };
    }

    // Step 3: Update the data source record
    const { error: updateError } = await supabase
      .from("admin_data_sources")
      .update({
        extracted_data: extractedData,
        is_processed: isProcessed,
        title: (extractedData.title as string) || metadata.title || url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    if (updateError) {
      console.error("Error updating data source:", updateError);
      throw updateError;
    }

    // Step 4: Auto-trigger sync to knowledge base
    if (isProcessed) {
      console.log("Auto-triggering sync for source:", sourceId);
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/sync-data-sources`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sourceId }),
        }).catch((err) => console.error("Auto-sync trigger failed:", err))
      );
    }

    console.log(`Source ${sourceId} processed successfully. isProcessed: ${isProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        isProcessed,
        pageTitle: (extractedData.title as string) || metadata.title,
        extractedKeys: Object.keys(extractedData),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scraping research URL:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
