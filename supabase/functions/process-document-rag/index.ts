import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ProcessRequest {
  sourceId: string;
  fileUrl?: string;
  textContent?: string;
  documentTitle?: string;
}

interface PipelineError {
  stage: string;
  message: string;
  fatal: boolean;
  timestamp: string;
}

interface ProcessedChunk {
  source_id: string;
  document_title: string;
  section_title: string | null;
  chunk_index: number;
  content: string;
  token_count: number;
  keywords: string[];
  summary: string;
  detected_language: string;
  embedding: string | null;
  metadata: Record<string, any>;
}

// ─── ACADEMIC SECTION PATTERNS ───────────────────────────────────────────────

const ACADEMIC_SECTIONS_EN = [
  "abstract", "introduction", "background", "literature review",
  "methodology", "methods", "materials and methods", "experimental",
  "results", "findings", "analysis", "discussion",
  "conclusion", "conclusions", "summary", "limitations",
  "future work", "recommendations", "references", "bibliography",
  "acknowledgements", "appendix", "supplementary",
];

const ACADEMIC_SECTIONS_HE = [
  "תקציר", "מבוא", "רקע", "סקירת ספרות",
  "מתודולוגיה", "שיטות", "שיטות מחקר", "ניסוי",
  "ממצאים", "תוצאות", "ניתוח", "דיון",
  "מסקנות", "סיכום", "מגבלות",
  "עבודה עתידית", "המלצות", "מקורות", "ביבליוגרפיה",
  "תודות", "נספח", "נספחים",
];

// ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────

function estimateTokens(text: string): number {
  // Hebrew/Arabic ≈ 2.5 chars/token, English ≈ 4 chars/token
  const hebrewRatio = (text.match(/[\u0590-\u05FF\u0600-\u06FF]/g) || []).length / Math.max(text.length, 1);
  const avgCharsPerToken = hebrewRatio > 0.3 ? 2.8 : 3.8;
  return Math.ceil(text.length / avgCharsPerToken);
}

function detectLanguage(text: string): string {
  const sample = text.substring(0, 5000);
  const he = (sample.match(/[\u0590-\u05FF]/g) || []).length;
  const en = (sample.match(/[a-zA-Z]/g) || []).length;
  const ar = (sample.match(/[\u0600-\u06FF]/g) || []).length;
  if (he > en && he > ar) return "he";
  if (ar > en) return "ar";
  return "en";
}

function createError(stage: string, message: string, fatal = false): PipelineError {
  return { stage, message, fatal, timestamp: new Date().toISOString() };
}

// ─── TEXT NORMALIZATION (STAGE 3) ────────────────────────────────────────────

function normalizeText(raw: string): string {
  let text = raw;

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove repeated headers/footers (lines that appear 3+ times identically)
  const lines = text.split("\n");
  const lineCounts = new Map<string, number>();
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.length > 5 && trimmed.length < 120) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }
  const repeatedLines = new Set<string>();
  for (const [line, count] of lineCounts) {
    if (count >= 3) repeatedLines.add(line);
  }
  if (repeatedLines.size > 0) {
    text = lines.filter(l => !repeatedLines.has(l.trim())).join("\n");
  }

  // Fix broken line wraps (line ending with a letter followed by line starting with lowercase)
  text = text.replace(/([a-zא-ת,;])\n([a-zא-ת])/g, "$1 $2");

  // Collapse excessive whitespace
  text = text.replace(/\n{4,}/g, "\n\n\n");
  text = text.replace(/[ \t]+$/gm, "");
  text = text.replace(/^\s+$/gm, "");

  // Normalize unicode quotes and dashes
  text = text.replace(/[\u201C\u201D]/g, '"');
  text = text.replace(/[\u2018\u2019]/g, "'");
  text = text.replace(/[\u2013\u2014]/g, "—");

  return text.trim();
}

// ─── ACADEMIC SECTION DETECTION (STAGE 4) ────────────────────────────────────

interface DetectedSection {
  title: string;
  normalizedTitle: string;
  content: string;
  startLine: number;
}

function detectAcademicSections(text: string): DetectedSection[] {
  const allSections = [...ACADEMIC_SECTIONS_EN, ...ACADEMIC_SECTIONS_HE];
  const lines = text.split("\n");
  const sectionBreaks: { lineIdx: number; title: string; normalized: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length > 150) continue;

    // Remove numbering, bullets, markdown headers
    const cleaned = line
      .replace(/^#{1,4}\s*/, "")
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^[א-ת][\.\)]\s*/, "")
      .replace(/[:\-–—]+$/, "")
      .trim()
      .toLowerCase();

    for (const section of allSections) {
      if (cleaned === section || cleaned.startsWith(section + " ") || cleaned.startsWith(section + ":")) {
        sectionBreaks.push({ lineIdx: i, title: line, normalized: section });
        break;
      }
    }
  }

  if (sectionBreaks.length === 0) return [];

  const sections: DetectedSection[] = [];
  for (let i = 0; i < sectionBreaks.length; i++) {
    const start = sectionBreaks[i].lineIdx;
    const end = i + 1 < sectionBreaks.length ? sectionBreaks[i + 1].lineIdx : lines.length;
    const content = lines.slice(start + 1, end).join("\n").trim();
    if (content.length > 0) {
      sections.push({
        title: sectionBreaks[i].title,
        normalizedTitle: sectionBreaks[i].normalized,
        content,
        startLine: start,
      });
    }
  }

  return sections;
}

// ─── SEMANTIC CHUNKING (STAGE 5) ─────────────────────────────────────────────

interface SemanticChunk {
  content: string;
  sectionTitle: string;
  pageEstimate: number;
}

function semanticChunk(
  text: string,
  sections: DetectedSection[],
  minTokens = 400,
  maxTokens = 1000
): SemanticChunk[] {
  const chunks: SemanticChunk[] = [];

  // If we have academic sections, chunk within each section
  const segmentsToChunk: { title: string; content: string }[] = [];

  if (sections.length > 0) {
    // Add any text before the first section
    const firstSectionLine = sections[0].startLine;
    const preContent = text.split("\n").slice(0, firstSectionLine).join("\n").trim();
    if (preContent.length > 50) {
      segmentsToChunk.push({ title: "Introduction", content: preContent });
    }
    for (const sec of sections) {
      segmentsToChunk.push({ title: sec.title, content: sec.content });
    }
  } else {
    // No academic structure detected — chunk the whole text
    segmentsToChunk.push({ title: "", content: text });
  }

  let globalCharOffset = 0;

  for (const segment of segmentsToChunk) {
    const paragraphs = segment.content.split(/\n{2,}/);
    let currentChunk = "";
    let currentSection = segment.title;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Detect sub-headers
      const isSubHeader = trimmed.length < 100 && (
        /^#{1,3}\s/.test(trimmed) ||
        /^\d+\.\d+[\.\)]\s/.test(trimmed) ||
        (trimmed.length < 60 && !trimmed.endsWith(".") && !trimmed.endsWith("?"))
      );

      if (isSubHeader && currentChunk && estimateTokens(currentChunk) >= minTokens) {
        const pageEst = Math.floor(globalCharOffset / 3000) + 1;
        chunks.push({ content: currentChunk.trim(), sectionTitle: currentSection, pageEstimate: pageEst });
        globalCharOffset += currentChunk.length;
        currentChunk = "";
        currentSection = segment.title + " > " + trimmed.replace(/^#{1,3}\s/, "").trim();
      }

      const combined = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
      if (estimateTokens(combined) > maxTokens && currentChunk) {
        const pageEst = Math.floor(globalCharOffset / 3000) + 1;
        chunks.push({ content: currentChunk.trim(), sectionTitle: currentSection, pageEstimate: pageEst });
        globalCharOffset += currentChunk.length;
        currentChunk = trimmed;
      } else {
        currentChunk = combined;
      }
    }

    if (currentChunk.trim()) {
      const pageEst = Math.floor(globalCharOffset / 3000) + 1;
      chunks.push({ content: currentChunk.trim(), sectionTitle: currentSection, pageEstimate: pageEst });
      globalCharOffset += currentChunk.length;
    }
  }

  // Post-process: split any chunk still over maxTokens by sentence boundaries
  const finalChunks: SemanticChunk[] = [];
  for (const chunk of chunks) {
    if (estimateTokens(chunk.content) <= maxTokens) {
      finalChunks.push(chunk);
      continue;
    }
    // Split by sentence endings (Hebrew period ׃ and standard punctuation)
    const sentences = chunk.content.split(/(?<=[.!?。׃]\s)/);
    let sub = "";
    for (const sentence of sentences) {
      if (estimateTokens(sub + sentence) > maxTokens && sub) {
        finalChunks.push({ content: sub.trim(), sectionTitle: chunk.sectionTitle, pageEstimate: chunk.pageEstimate });
        sub = sentence;
      } else {
        sub += sentence;
      }
    }
    if (sub.trim()) {
      finalChunks.push({ content: sub.trim(), sectionTitle: chunk.sectionTitle, pageEstimate: chunk.pageEstimate });
    }
  }

  // Merge any tiny trailing chunks into the previous one
  const mergedChunks: SemanticChunk[] = [];
  for (const chunk of finalChunks) {
    if (mergedChunks.length > 0 && estimateTokens(chunk.content) < 100) {
      const prev = mergedChunks[mergedChunks.length - 1];
      prev.content += "\n\n" + chunk.content;
    } else {
      mergedChunks.push({ ...chunk });
    }
  }

  return mergedChunks;
}

// ─── AI HELPER ───────────────────────────────────────────────────────────────

async function callAI(
  apiKey: string,
  model: string,
  messages: any[],
  tools?: any[],
  toolChoice?: any
): Promise<any> {
  const body: any = { model, messages };
  if (tools) body.tools = tools;
  if (toolChoice) body.tool_choice = toolChoice;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const status = resp.status;
    const text = await resp.text();
    throw new Error(`AI Gateway ${status}: ${text.substring(0, 200)}`);
  }

  return await resp.json();
}

// ─── MAIN PIPELINE ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const errors: PipelineError[] = [];

  // Helper to abort pipeline
  const fail = async (
    supabase: any,
    reportId: string | null,
    error: PipelineError
  ) => {
    errors.push(error);
    console.error(`[RAG FATAL] ${error.stage}: ${error.message}`);
    if (reportId) {
      await supabase
        .from("document_processing_reports")
        .update({
          status: "failed",
          processing_errors: errors,
          completed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime,
        })
        .eq("id", reportId);
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message, errors, processing_time_ms: Date.now() - startTime }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sourceId, fileUrl, textContent, documentTitle }: ProcessRequest = await req.json();

    if (!sourceId) {
      return fail(supabase, null, createError("validation", "sourceId is required", true));
    }

    console.log(`[RAG] ═══ Pipeline START for source: ${sourceId} ═══`);

    // ─── CREATE PROCESSING REPORT ────────────────────────────────────────────
    const { data: report } = await supabase
      .from("document_processing_reports")
      .insert({ source_id: sourceId, status: "processing", started_at: new Date().toISOString() })
      .select()
      .single();
    const reportId = report?.id || null;

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 1: FILE INGESTION — Validate & detect type
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("[RAG] Stage 1: File Ingestion");

    let fullText = textContent || "";
    let ocrApplied = false;
    let totalPages = 1;
    let fileType = "text";

    if (!fullText && fileUrl) {
      try {
        if (fileUrl.startsWith("data:")) {
          // Detect MIME from data URL
          const mimeMatch = fileUrl.match(/^data:([^;]+);/);
          const mime = mimeMatch?.[1] || "text/plain";
          fileType = mime;

          if (mime.includes("pdf")) {
            // PDF via base64 → needs AI/OCR extraction
            const base64Content = fileUrl.split(",")[1];
            if (!base64Content) {
              return await fail(supabase, reportId, createError("ingestion", "Empty base64 PDF content", true));
            }
            ocrApplied = true;
            console.log("[RAG] Stage 1: PDF detected (base64), will use AI extraction");

            const ocrResult = await callAI(lovableApiKey, "google/gemini-2.5-flash", [
              {
                role: "system",
                content: `You are a precision document extraction agent. Extract ALL text from this PDF.
Rules:
- Preserve the EXACT structure: titles, subtitles, section headers, paragraphs, lists, tables.
- For tables: convert to readable text format with clear column separation.
- Include footnotes and references.
- Do NOT add commentary, summaries, or interpretations.
- Output the raw extracted text only.`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract all text from this document. Preserve structure completely." },
                  { type: "image_url", image_url: { url: fileUrl.substring(0, 8_000_000) } }, // Cap at ~6MB base64
                ],
              },
            ]);
            fullText = ocrResult.choices?.[0]?.message?.content || "";

            // Estimate pages from content length
            totalPages = Math.max(1, Math.ceil(fullText.length / 3000));
          } else {
            // Text-based data URL
            const base64Content = fileUrl.split(",")[1];
            if (base64Content) {
              try {
                fullText = atob(base64Content);
              } catch {
                fullText = base64Content;
              }
            }
          }
        } else {
          // External URL
          const response = await fetch(fileUrl);
          if (!response.ok) {
            return await fail(supabase, reportId, createError("ingestion", `Failed to fetch file: HTTP ${response.status}`, true));
          }
          const contentType = response.headers.get("content-type") || "";
          fileType = contentType;

          if (contentType.includes("pdf")) {
            const pdfBytes = await response.arrayBuffer();
            // Limit to ~5MB for AI processing
            const limitedBytes = pdfBytes.slice(0, 5_000_000);
            const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(limitedBytes)));
            ocrApplied = true;

            const ocrResult = await callAI(lovableApiKey, "google/gemini-2.5-flash", [
              {
                role: "system",
                content: `You are a precision document extraction agent. Extract ALL text from this PDF.
Rules:
- Preserve the EXACT structure: titles, subtitles, section headers, paragraphs, lists, tables.
- For tables: convert to readable text format with clear column separation.
- Include footnotes and references.
- Do NOT add commentary.
- Output the raw extracted text only.`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract all text from this document. Preserve structure completely." },
                  { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
                ],
              },
            ]);
            fullText = ocrResult.choices?.[0]?.message?.content || "";
            totalPages = Math.max(1, Math.ceil(pdfBytes.byteLength / 50000)); // rough estimate
          } else {
            fullText = await response.text();
          }
        }
      } catch (fetchErr: any) {
        return await fail(supabase, reportId, createError("ingestion", `File fetch failed: ${fetchErr.message}`, true));
      }
    }

    // Fallback: try extracted_data from source record
    if (!fullText || fullText.trim().length < 50) {
      const { data: source } = await supabase
        .from("admin_data_sources")
        .select("extracted_data, title, description")
        .eq("id", sourceId)
        .single();

      if (source?.extracted_data) {
        const ed = source.extracted_data as Record<string, any>;
        if (ed.full_content) {
          fullText = ed.full_content;
        } else if (ed.summary_he || ed.content) {
          fullText = [ed.title_he, ed.summary_he, ed.content].filter(Boolean).join("\n\n");
        } else {
          fullText = JSON.stringify(ed, null, 2);
        }
      }
    }

    if (!fullText || fullText.trim().length < 50) {
      return await fail(supabase, reportId, createError("ingestion", "No extractable text content found (minimum 50 chars required)", true));
    }

    console.log(`[RAG] Stage 1 ✓ — ${fullText.length} raw chars, OCR: ${ocrApplied}, type: ${fileType}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 2 & 3: TEXT NORMALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("[RAG] Stage 2-3: Normalization");
    fullText = normalizeText(fullText);
    const detectedLanguage = detectLanguage(fullText);
    console.log(`[RAG] Stage 3 ✓ — ${fullText.length} normalized chars, language: ${detectedLanguage}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 4: SEMANTIC STRUCTURE DETECTION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("[RAG] Stage 4: Academic Section Detection");
    const detectedSections = detectAcademicSections(fullText);
    const extractedSectionNames = detectedSections.map(s => s.normalizedTitle);
    console.log(`[RAG] Stage 4 ✓ — Detected ${detectedSections.length} sections: [${extractedSectionNames.join(", ")}]`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 5: INTELLIGENT CHUNKING
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("[RAG] Stage 5: Semantic Chunking");
    const rawChunks = semanticChunk(fullText, detectedSections);
    if (rawChunks.length === 0) {
      return await fail(supabase, reportId, createError("chunking", "Chunking produced 0 segments", true));
    }
    const tokenStats = rawChunks.map(c => estimateTokens(c.content));
    console.log(`[RAG] Stage 5 ✓ — ${rawChunks.length} chunks, tokens: min=${Math.min(...tokenStats)} max=${Math.max(...tokenStats)} avg=${Math.round(tokenStats.reduce((a, b) => a + b, 0) / tokenStats.length)}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 6: ENRICHMENT + EMBEDDING (batched)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("[RAG] Stage 6: Enrichment & Embedding");
    const title = documentTitle || "Unknown Document";
    const processedChunks: ProcessedChunk[] = [];
    const BATCH_SIZE = 3; // smaller batches for reliability

    for (let batchStart = 0; batchStart < rawChunks.length; batchStart += BATCH_SIZE) {
      const batch = rawChunks.slice(batchStart, batchStart + BATCH_SIZE);

      const batchPromises = batch.map(async (chunk, idx) => {
        const chunkIndex = batchStart + idx;
        try {
          // ─── ENRICHMENT: keywords, summary, entities, research_type ────────
          const enrichResult = await callAI(
            lovableApiKey,
            "google/gemini-2.5-flash-lite",
            [
              {
                role: "system",
                content: "You are a research document metadata extraction agent. Analyze text chunks and extract structured metadata. Always respond via the tool call.",
              },
              {
                role: "user",
                content: `Analyze this text chunk and extract metadata:\n\n${chunk.content.substring(0, 2500)}`,
              },
            ],
            [
              {
                type: "function",
                function: {
                  name: "extract_chunk_metadata",
                  description: "Extract structured metadata from a document chunk",
                  parameters: {
                    type: "object",
                    properties: {
                      keywords: {
                        type: "array",
                        items: { type: "string" },
                        description: "5-10 domain-specific keywords in the document's language",
                      },
                      summary: {
                        type: "string",
                        description: "2-3 sentence summary of this chunk's content",
                      },
                      research_type: {
                        type: "string",
                        enum: [
                          "clinical_trial", "meta_analysis", "case_study",
                          "review", "guideline", "opinion", "data_report", "other",
                        ],
                        description: "Type of research content if applicable",
                      },
                      detected_entities: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            type: { type: "string", enum: ["person", "organization", "concept", "breed", "medication", "condition"] },
                          },
                          required: ["name", "type"],
                          additionalProperties: false,
                        },
                        description: "Named entities found in this chunk",
                      },
                    },
                    required: ["keywords", "summary", "research_type", "detected_entities"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            { type: "function", function: { name: "extract_chunk_metadata" } }
          );

          let keywords: string[] = [];
          let summary = "";
          let researchType = "other";
          let detectedEntities: any[] = [];

          const toolCall = enrichResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            try {
              const parsed = JSON.parse(toolCall.function.arguments);
              keywords = parsed.keywords || [];
              summary = parsed.summary || "";
              researchType = parsed.research_type || "other";
              detectedEntities = parsed.detected_entities || [];
            } catch { /* parse error — non-fatal */ }
          }

          // Fallback: try content as JSON
          if (!keywords.length) {
            const content = enrichResult.choices?.[0]?.message?.content || "";
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                keywords = parsed.keywords || [];
                summary = parsed.summary || "";
              } catch { /* ignore */ }
            }
          }

          // ─── EMBEDDING GENERATION ────────────────────────────────────────────
          let embedding: number[] | null = null;
          try {
            const embResult = await callAI(
              lovableApiKey,
              "google/gemini-2.5-flash-lite",
              [
                {
                  role: "system",
                  content: "You are an embedding generator. Output ONLY a JSON array of exactly 768 floating point numbers representing the semantic embedding vector. No text before or after the array.",
                },
                {
                  role: "user",
                  content: `Generate a 768-dimensional embedding vector for:\n\n${chunk.content.substring(0, 1200)}`,
                },
              ]
            );

            const embContent = embResult.choices?.[0]?.message?.content || "";
            const arrMatch = embContent.match(/\[[\s\S]*\]/);
            if (arrMatch) {
              const arr = JSON.parse(arrMatch[0]);
              if (Array.isArray(arr) && arr.length === 768) {
                embedding = arr;
              }
            }
          } catch (embErr: any) {
            errors.push(createError("embedding", `Chunk ${chunkIndex}: ${embErr.message}`, false));
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
            metadata: {
              page_number: chunk.pageEstimate,
              research_type: researchType,
              detected_entities: detectedEntities,
            },
          } satisfies ProcessedChunk;
        } catch (chunkErr: any) {
          const err = createError("enrichment", `Chunk ${chunkIndex}: ${chunkErr.message}`, false);
          errors.push(err);
          console.error(`[RAG] ${err.stage}: ${err.message}`);

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
            metadata: { page_number: chunk.pageEstimate, error: chunkErr.message },
          } satisfies ProcessedChunk;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);

      // Rate limit protection
      if (batchStart + BATCH_SIZE < rawChunks.length) {
        await new Promise(r => setTimeout(r, 800));
      }
    }

    const chunksWithEmbeddings = processedChunks.filter(c => c.embedding !== null).length;
    console.log(`[RAG] Stage 6 ✓ — ${processedChunks.length} enriched, ${chunksWithEmbeddings} with embeddings`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 7: VECTOR STORAGE
    // ═══════════════════════════════════════════════════════════════════════════
    console.log("[RAG] Stage 7: Vector Storage");

    // Delete existing chunks for this source (re-processing)
    await supabase.from("document_chunks").delete().eq("source_id", sourceId);

    // Insert in batches of 20 to avoid payload limits
    for (let i = 0; i < processedChunks.length; i += 20) {
      const batch = processedChunks.slice(i, i + 20);
      const { error: insertErr } = await supabase.from("document_chunks").insert(batch);
      if (insertErr) {
        errors.push(createError("storage", `Batch ${Math.floor(i / 20)}: ${insertErr.message}`, false));
        console.error("[RAG] Storage insert error:", insertErr);
      }
    }

    // Update source as processed
    await supabase
      .from("admin_data_sources")
      .update({ is_processed: true, updated_at: new Date().toISOString() })
      .eq("id", sourceId);

    console.log("[RAG] Stage 7 ✓ — Stored in database");

    // ═══════════════════════════════════════════════════════════════════════════
    // STAGE 8: PROCESSING REPORT
    // ═══════════════════════════════════════════════════════════════════════════
    const processingTimeMs = Date.now() - startTime;
    const hasFatalErrors = errors.some(e => e.fatal);
    const status = hasFatalErrors ? "failed" : chunksWithEmbeddings === 0 ? "partial" : "completed";

    const reportData = {
      total_pages: totalPages,
      total_chunks: processedChunks.length,
      detected_language: detectedLanguage,
      ocr_applied: ocrApplied,
      processing_errors: errors,
      processing_duration_ms: processingTimeMs,
      status,
      completed_at: new Date().toISOString(),
    };

    if (reportId) {
      await supabase
        .from("document_processing_reports")
        .update(reportData)
        .eq("id", reportId);
    }

    const report_summary = {
      ...reportData,
      source_id: sourceId,
      chunks_with_embeddings: chunksWithEmbeddings,
      extracted_sections: extractedSectionNames,
      processing_time: `${(processingTimeMs / 1000).toFixed(1)}s`,
      error_count: errors.length,
    };

    console.log(`[RAG] ═══ Pipeline COMPLETE ═══`);
    console.log(`[RAG] Status: ${status}`);
    console.log(`[RAG] Pages: ${totalPages}, Chunks: ${processedChunks.length}, Embeddings: ${chunksWithEmbeddings}`);
    console.log(`[RAG] Sections: [${extractedSectionNames.join(", ")}]`);
    console.log(`[RAG] Language: ${detectedLanguage}, OCR: ${ocrApplied}`);
    console.log(`[RAG] Time: ${(processingTimeMs / 1000).toFixed(1)}s, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, report: report_summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[RAG] UNHANDLED FATAL ERROR:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        errors: [...errors, createError("fatal", error.message, true)],
        processing_time_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
