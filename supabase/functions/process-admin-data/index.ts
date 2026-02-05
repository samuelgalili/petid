 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface ProcessRequest {
   sourceId: string;
   dataType: string;
   fileName: string;
   fileUrl: string;
 }
 
 Deno.serve(async (req) => {
   // Handle CORS
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { sourceId, dataType, fileName, fileUrl }: ProcessRequest = await req.json();
 
     console.log(`Processing data source: ${sourceId}, type: ${dataType}, file: ${fileName}`);
 
     // Download file content
     let fileContent = "";
     try {
       const response = await fetch(fileUrl);
       if (response.ok) {
         fileContent = await response.text();
       }
     } catch (downloadError) {
       console.error("Error downloading file:", downloadError);
     }
 
     // Prepare extraction prompt based on data type
     const extractionPrompts: Record<string, string> = {
       breeds: `Extract breed information from this document. Return a JSON object with the following structure:
         {
           "breeds": [
             {
               "name": "breed name",
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
       insurance: `Extract pet insurance information from this document. Return a JSON object with:
         {
           "providers": [
             {
               "name": "company name",
               "plans": [
                 {
                   "name": "plan name",
                   "monthly_cost": "price range",
                   "coverage": ["coverage1", "coverage2"],
                   "deductible": "amount",
                   "max_annual": "maximum annual coverage"
                 }
               ],
               "contact": "phone or website",
               "notes": "additional notes"
             }
           ]
         }`,
       dog_parks: `Extract dog park information from this document. Return a JSON object with:
         {
           "parks": [
             {
               "name": "park name",
               "city": "city name",
               "address": "full address",
               "amenities": ["water fountain", "shaded area", etc.],
               "size": "small/medium/large",
               "hours": "operating hours",
               "rules": ["rule1", "rule2"],
               "coordinates": { "lat": number, "lng": number }
             }
           ]
         }`,
       research: `Extract research and study information from this document. Return a JSON object with:
         {
           "studies": [
             {
               "title": "study title",
               "authors": ["author1", "author2"],
               "year": "publication year",
               "topic": "main topic",
               "summary": "brief summary of findings",
               "key_findings": ["finding1", "finding2"],
               "relevance": "how this applies to pet care",
               "source": "journal or publication name"
             }
           ]
         }`,
     };
 
     const prompt = extractionPrompts[dataType] || extractionPrompts.research;
 
     // Use Lovable AI to extract structured data
     let extractedData = {};
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
                 content: `You are a data extraction assistant. Extract structured information from documents and return valid JSON only. ${prompt}`,
               },
               {
                 role: "user",
                 content: `Please extract relevant information from this document:\n\nFile name: ${fileName}\n\nContent:\n${fileContent.substring(0, 10000)}`,
               },
             ],
           }),
         }
       );
 
       if (aiResponse.ok) {
         const aiResult = await aiResponse.json();
         const content = aiResult.choices?.[0]?.message?.content || "";
         
         // Try to parse JSON from response
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
           extractedData = JSON.parse(jsonMatch[0]);
           isProcessed = true;
         }
       }
     } catch (aiError) {
       console.error("AI extraction error:", aiError);
     }
 
     // Update the data source with extracted data
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
 
     console.log(`Data source ${sourceId} processed successfully. Extracted: ${Object.keys(extractedData).length} keys`);
 
     return new Response(
       JSON.stringify({
         success: true,
         sourceId,
         isProcessed,
         extractedKeys: Object.keys(extractedData),
       }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   } catch (error) {
     console.error("Error processing admin data:", error);
     return new Response(
       JSON.stringify({
         success: false,
         error: error.message,
       }),
       {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });