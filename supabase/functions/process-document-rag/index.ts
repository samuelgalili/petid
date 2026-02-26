import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessRequest {
  sourceId: string;
  fileUrl?: string;
  textContent?: string;
  documentTitle?: string;
}

// Estimate token count (rough: 1 token ≈ 4 chars for Hebrew, 4 chars for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// Semantic chunking: split by sections/paragraphs, respecting sentence boundaries
function semanticChunk(text: string, minTokens = 400, maxTokens = 1000): { content: string; sectionTitle: string }[] {
  const chunks: { content: string; sectionTitle: string }[] = [];
  
  // Split by double newlines (paragraphs) or section headers
  const sections = text.split(/\n{2,}/);
  let currentChunk = "";
  let currentSection = "";
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    
    // Detect section headers (short lines, possibly with numbers/bullets)
    const isHeader = trimmed.length < 100 && (
      /^#{1,3}\s/.test(trimmed) || 
      /^\d+[\.\)]\s/.test(trimmed) ||
      /^[א-ת][\.\)]\s/.test(trimmed) ||
      (trimmed.length < 60 && !trimmed.endsWith('.'))
    );
    
    if (isHeader) {
      // Flush current chunk if big enough
      if (currentChunk && estimateTokens(currentChunk) >= minTokens) {
        chunks.push({ content: currentChunk.trim(), sectionTitle: currentSection });
        currentChunk = "";
      }
      currentSection = trimmed.replace(/^#{1,3}\s/, '').trim();
      currentChunk += trimmed + "\n";
      continue;
    }
    
    const combined = currentChunk + "\n" + trimmed;
    if (estimateTokens(combined) > maxTokens && currentChunk) {
      // Current chunk is full, push it
      chunks.push({ content: currentChunk.trim(), sectionTitle: currentSection });
      currentChunk = trimmed;
    } else {
      currentChunk = combined;
    }
  }
  
  // Push remaining
  if (currentChunk.trim()) {
    chunks.push({ content: currentChunk.trim(), sectionTitle: currentSection });
  }
  
  // Handle chunks that are still too large: split by sentences
  const finalChunks: { content: string; sectionTitle: string }[] = [];
  for (const chunk of chunks) {
    if (estimateTokens(chunk.content) <= maxTokens) {
      finalChunks.push(chunk);
      continue;
    }
    // Split by sentence endings
    const sentences = chunk.content.split(/(?<=[.!?。]\s)/);
    let subChunk = "";
    for (const sentence of sentences) {
      if (estimateTokens(subChunk + sentence) > maxTokens && subChunk) {
        finalChunks.push({ content: subChunk.trim(), sectionTitle: chunk.sectionTitle });
        subChunk = sentence;
      } else {
        subChunk += sentence;
      }
    }
    if (subChunk.trim()) {
      finalChunks.push({ content: subChunk.trim(), sectionTitle: chunk.sectionTitle });
    }
  }
  
  return finalChunks;
}

// Detect language
function detectLanguage(text: string): string {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (hebrewChars > englishChars && hebrewChars > arabicChars) return "he";
  if (arabicChars > englishChars) return "ar";
  return "en";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sourceId, fileUrl, textContent, documentTitle }: ProcessRequest = await req.json();

    console.log(`[RAG] Starting processing for source: ${sourceId}`);

    // Create processing report
    const { data: report, error: reportErr } = await supabase
      .from("document_processing_reports")
      .insert({
        source_id: sourceId,
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (reportErr) console.error("Report creation error:", reportErr);
    const reportId = report?.id;

    // STEP 1 & 2: Extract text content
    let fullText = textContent || "";
    let ocrApplied = false;
    let totalPages = 1;

    if (!fullText && fileUrl) {
      try {
        // Try to fetch content directly
        if (fileUrl.startsWith("data:")) {
          // Base64 content - extract text portion
          const base64Content = fileUrl.split(",")[1];
          if (base64Content) {
            const decoded = atob(base64Content);
            // Simple text extraction from base64
            fullText = decoded;
          }
        } else {
          const response = await fetch(fileUrl);
          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("pdf")) {
              // For PDFs, use AI to extract text (OCR-capable)
              const pdfBytes = await response.arrayBuffer();
              const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes.slice(0, 500000))));
              
              ocrApplied = true;
              const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${lovableApiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content: "You are a document text extraction agent. Extract ALL text content from the provided document, preserving structure (headings, paragraphs, lists, tables). Return the raw extracted text only, no commentary.",
                    },
                    {
                      role: "user",
                      content: [
                        { type: "text", text: "Extract all text from this PDF document. Preserve the structure." },
                        {
                          type: "image_url",
                          image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
                        },
                      ],
                    },
                  ],
                }),
              });

              if (ocrResponse.ok) {
                const ocrResult = await ocrResponse.json();
                fullText = ocrResult.choices?.[0]?.message?.content || "";
              }
            } else {
              fullText = await response.text();
            }
          }
        }
      } catch (fetchErr) {
        console.error("[RAG] Content fetch error:", fetchErr);
      }
    }

    // Also try extracted_data from the source record
    if (!fullText) {
      const { data: source } = await supabase
        .from("admin_data_sources")
        .select("extracted_data, title, description")
        .eq("id", sourceId)
        .single();

      if (source?.extracted_data) {
        const ed = source.extracted_data as Record<string, any>;
        // Flatten extracted data into text
        fullText = JSON.stringify(ed, null, 2);
        if (ed.full_content) fullText = ed.full_content;
        if (ed.summary_he) fullText = ed.summary_he + "\n\n" + (ed.full_content || JSON.stringify(ed));
      }
    }

    if (!fullText || fullText.trim().length < 50) {
      // Update report as failed
      if (reportId) {
        await supabase
          .from("document_processing_reports")
          .update({
            status: "failed",
            processing_errors: [{ step: "extraction", error: "No text content found or too short" }],
            completed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime,
          })
          .eq("id", reportId);
      }

      return new Response(
        JSON.stringify({ success: false, error: "No extractable text content found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 3: Clean & Normalize
    fullText = fullText
      .replace(/(\r\n|\r)/g, "\n") // Normalize line endings
      .replace(/\n{4,}/g, "\n\n\n") // Reduce excessive newlines
      .replace(/[ \t]+$/gm, "") // Remove trailing whitespace
      .replace(/^\s+$/gm, "") // Remove whitespace-only lines
      .trim();

    const detectedLanguage = detectLanguage(fullText);
    console.log(`[RAG] Extracted ${fullText.length} chars, language: ${detectedLanguage}`);

    // STEP 4: Intelligent Chunking
    const rawChunks = semanticChunk(fullText);
    console.log(`[RAG] Created ${rawChunks.length} semantic chunks`);

    // STEP 5: Metadata + Summary generation via AI
    const title = documentTitle || "Unknown Document";
    const processingErrors: any[] = [];
    const processedChunks: any[] = [];

    // Process chunks in batches of 5
    for (let batchStart = 0; batchStart < rawChunks.length; batchStart += 5) {
      const batch = rawChunks.slice(batchStart, batchStart + 5);
      
      const batchPromises = batch.map(async (chunk, idx) => {
        const chunkIndex = batchStart + idx;
        try {
          // Generate keywords + summary via AI
          const metaResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: "You extract metadata from text chunks. Return ONLY valid JSON.",
                },
                {
                  role: "user",
                  content: `Extract keywords and a 2-sentence summary from this text chunk. Return JSON: {"keywords": ["word1", "word2", ...], "summary": "..."}

Text:
${chunk.content.substring(0, 2000)}`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "extract_metadata",
                    description: "Extract keywords and summary from a text chunk",
                    parameters: {
                      type: "object",
                      properties: {
                        keywords: { type: "array", items: { type: "string" }, description: "5-10 relevant keywords" },
                        summary: { type: "string", description: "2-3 sentence summary" },
                      },
                      required: ["keywords", "summary"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "extract_metadata" } },
            }),
          });

          let keywords: string[] = [];
          let summary = "";

          if (metaResponse.ok) {
            const metaResult = await metaResponse.json();
            const toolCall = metaResult.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              try {
                const parsed = JSON.parse(toolCall.function.arguments);
                keywords = parsed.keywords || [];
                summary = parsed.summary || "";
              } catch { /* ignore parse errors */ }
            }
            // Fallback: try content
            if (!keywords.length) {
              const content = metaResult.choices?.[0]?.message?.content || "";
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  keywords = parsed.keywords || [];
                  summary = parsed.summary || "";
                } catch { /* ignore */ }
              }
            }
          }

          // STEP 6: Generate Embedding
          const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: "You are an embedding generator. Given text, output a JSON array of 768 floating point numbers representing the semantic embedding vector. Output ONLY the JSON array, nothing else.",
                },
                {
                  role: "user",
                  content: `Generate a 768-dimensional embedding vector for this text. Output ONLY a JSON array of 768 numbers:\n\n${chunk.content.substring(0, 1000)}`,
                },
              ],
            }),
          });

          let embedding: number[] | null = null;

          if (embeddingResponse.ok) {
            const embResult = await embeddingResponse.json();
            const embContent = embResult.choices?.[0]?.message?.content || "";
            const arrMatch = embContent.match(/\[[\s\S]*\]/);
            if (arrMatch) {
              try {
                const arr = JSON.parse(arrMatch[0]);
                if (Array.isArray(arr) && arr.length === 768) {
                  embedding = arr;
                }
              } catch { /* ignore */ }
            }
          }

          return {
            source_id: sourceId,
            document_title: title,
            section_title: chunk.sectionTitle || null,
            chunk_index: chunkIndex,
            content: chunk.content,
            token_count: estimateTokens(chunk.content),
            keywords,
            summary,
            detected_language: detectedLanguage,
            embedding: embedding ? `[${embedding.join(",")}]` : null,
            metadata: { page_number: null, batch: Math.floor(chunkIndex / 5) },
          };
        } catch (chunkErr: any) {
          console.error(`[RAG] Error processing chunk ${chunkIndex}:`, chunkErr);
          processingErrors.push({ step: "chunk_processing", chunk: chunkIndex, error: chunkErr.message });
          return {
            source_id: sourceId,
            document_title: title,
            section_title: chunk.sectionTitle || null,
            chunk_index: chunkIndex,
            content: chunk.content,
            token_count: estimateTokens(chunk.content),
            keywords: [],
            summary: "",
            detected_language: detectedLanguage,
            embedding: null,
            metadata: { page_number: null, error: chunkErr.message },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (batchStart + 5 < rawChunks.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // STEP 7: Store in database
    // Delete existing chunks for this source (re-processing)
    await supabase.from("document_chunks").delete().eq("source_id", sourceId);

    // Insert new chunks
    const { error: insertErr } = await supabase
      .from("document_chunks")
      .insert(processedChunks);

    if (insertErr) {
      console.error("[RAG] Chunk insert error:", insertErr);
      processingErrors.push({ step: "storage", error: insertErr.message });
    }

    // Update source as processed
    await supabase
      .from("admin_data_sources")
      .update({
        is_processed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    const chunksWithEmbeddings = processedChunks.filter(c => c.embedding !== null).length;

    // STEP 8: Update processing report
    const reportData = {
      total_pages: totalPages,
      total_chunks: processedChunks.length,
      detected_language: detectedLanguage,
      ocr_applied: ocrApplied,
      processing_errors: processingErrors,
      processing_duration_ms: Date.now() - startTime,
      status: processingErrors.length > 0 && chunksWithEmbeddings === 0 ? "failed" : "completed",
      completed_at: new Date().toISOString(),
    };

    if (reportId) {
      await supabase
        .from("document_processing_reports")
        .update(reportData)
        .eq("id", reportId);
    }

    console.log(`[RAG] Complete: ${processedChunks.length} chunks, ${chunksWithEmbeddings} with embeddings, ${processingErrors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          ...reportData,
          source_id: sourceId,
          chunks_with_embeddings: chunksWithEmbeddings,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[RAG] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
