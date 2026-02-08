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
      // Update source as failed
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

    // Step 2: Extract structured data with AI
    const extractionPrompts: Record<string, string> = {
      research: `Extract research and study information from this web page content. Return a JSON object with:
        {
          "studies": [
            {
              "title": "study title",
              "authors": ["author1", "author2"],
              "year": "publication year",
              "topic": "main topic",
              "summary": "brief summary of findings (2-3 sentences)",
              "key_findings": ["finding1", "finding2", "finding3"],
              "relevance": "how this applies to pet care",
              "source": "journal or publication name",
              "source_url": "original URL"
            }
          ],
          "page_title": "title of the scraped page",
          "page_summary": "brief summary of the entire page"
        }`,
      breeds: `Extract breed information from this web page. Return a JSON object with:
        {
          "breeds": [
            {
              "name": "breed name in English",
              "name_he": "שם הגזע בעברית",
              "type": "dog or cat",
              "origin": "country of origin",
              "size": "small/medium/large",
              "temperament": ["trait1", "trait2"],
              "lifespan": "10-12 years",
              "health_issues": ["issue1", "issue2"],
              "care_notes": "care instructions"
            }
          ]
        }`,
      insurance: `Extract pet insurance information from this web page. Return a JSON object with:
        {
          "providers": [
            {
              "name": "company name",
              "plans": [{ "name": "plan name", "monthly_cost": "price", "coverage": ["coverage1"] }],
              "contact": "phone or website"
            }
          ]
        }`,
      dog_parks: `Extract dog park information from this web page. Return a JSON object with:
        {
          "parks": [
            {
              "name": "park name",
              "city": "city",
              "address": "address",
              "amenities": ["amenity1"],
              "hours": "operating hours"
            }
          ]
        }`,
    };

    const prompt = extractionPrompts[dataType] || extractionPrompts.research;

    let extractedData: Record<string, unknown> = {};
    let isProcessed = false;

    try {
      const aiResponse = await fetch(
        `${supabaseUrl}/functions/v1/lovable-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a data extraction assistant specializing in pet-related research and veterinary studies. Extract structured information and return valid JSON only. Always include Hebrew translations where possible. ${prompt}`,
              },
              {
                role: "user",
                content: `Extract relevant information from this web page:\n\nURL: ${formattedUrl}\nPage Title: ${metadata.title || "Unknown"}\n\nContent:\n${scrapedContent.substring(0, 15000)}`,
              },
            ],
          }),
        }
      );

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content || "";

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          extractedData.source_url = formattedUrl;
          extractedData.scraped_at = new Date().toISOString();
          extractedData.page_metadata = metadata;
          isProcessed = true;
        }
      }
    } catch (aiError) {
      console.error("AI extraction error:", aiError);
      extractedData = {
        raw_content: scrapedContent.substring(0, 5000),
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    if (updateError) {
      console.error("Error updating data source:", updateError);
      throw updateError;
    }

    console.log(`Source ${sourceId} processed. Extracted keys: ${Object.keys(extractedData).join(", ")}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId,
        isProcessed,
        pageTitle: metadata.title,
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
