/**
 * Shared AI client — translates OpenAI-style requests to Google Gemini API.
 * Returns OpenAI-compatible responses so existing parsing code keeps working.
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_MAP: Record<string, string> = {
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.0-flash-lite",
  "google/gemini-3-flash-preview": "gemini-2.5-flash",
  "google/gemini-3-pro-image-preview": "gemini-2.5-flash",
  "gpt-4o": "gemini-2.5-flash",
  "gpt-4o-mini": "gemini-2.0-flash-lite",
};

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  response_format?: { type: string };
  tools?: Array<{
    type: string;
    function: { name: string; description: string; parameters: Record<string, unknown> };
  }>;
}

function mapModel(model: string): string {
  return MODEL_MAP[model] || "gemini-2.5-flash";
}

/** Convert OpenAI messages to Gemini contents + systemInstruction. */
function convertMessages(messages: OpenAIMessage[]): {
  systemInstruction: { parts: Array<{ text: string }> } | undefined;
  contents: Array<{ role: string; parts: unknown[] }>;
} {
  let systemText: string | undefined;
  const contents: Array<{ role: string; parts: unknown[] }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content.map((c) => c.text || "").join("\n");
      systemText = systemText ? `${systemText}\n\n${text}` : text;
      continue;
    }

    const role = msg.role === "assistant" ? "model" : "user";

    if (typeof msg.content === "string") {
      contents.push({ role, parts: [{ text: msg.content }] });
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content.map((part) => {
        if (part.type === "text") {
          return { text: part.text || "" };
        }
        if (part.type === "image_url") {
          const url = part.image_url?.url || "";
          const b64Match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (b64Match) {
            return { inlineData: { mimeType: b64Match[1], data: b64Match[2] } };
          }
          return { text: `[Image: ${url}]` };
        }
        return { text: JSON.stringify(part) };
      });
      contents.push({ role, parts });
    }
  }

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents,
  };
}

function convertTools(
  tools: ChatCompletionRequest["tools"],
): Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: Record<string, unknown> }> }> | undefined {
  if (!tools?.length) return undefined;
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    },
  ];
}

/** Convert Gemini response → OpenAI-shaped response. */
function toOpenAIResponse(res: Record<string, unknown>): Record<string, unknown> {
  const candidates = res.candidates as Array<Record<string, unknown>> | undefined;
  const candidate = candidates?.[0];

  if (!candidate) {
    return {
      choices: [{ message: { role: "assistant", content: null }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  let content = "";
  let toolCalls: Array<Record<string, unknown>> | undefined;

  const contentObj = candidate.content as { parts?: Array<Record<string, unknown>> } | undefined;
  for (const part of contentObj?.parts || []) {
    if (part.text) content += part.text;
    if (part.functionCall) {
      const fc = part.functionCall as { name: string; args: unknown };
      toolCalls = toolCalls || [];
      toolCalls.push({
        id: `call_${Math.random().toString(36).slice(2, 11)}`,
        type: "function",
        function: { name: fc.name, arguments: JSON.stringify(fc.args) },
      });
    }
  }

  const usage = res.usageMetadata as Record<string, number> | undefined;
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: content || null,
          ...(toolCalls && { tool_calls: toolCalls }),
        },
        finish_reason:
          candidate.finishReason === "STOP"
            ? "stop"
            : candidate.finishReason === "FUNCTION_CALL"
              ? "tool_calls"
              : "stop",
      },
    ],
    usage: {
      prompt_tokens: usage?.promptTokenCount || 0,
      completion_tokens: usage?.candidatesTokenCount || 0,
      total_tokens: usage?.totalTokenCount || 0,
    },
    model: res.modelVersion,
  };
}

/**
 * Non-streaming chat completion.
 * Accepts OpenAI-style params, returns OpenAI-shaped JSON.
 */
export async function chatCompletion(request: ChatCompletionRequest) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = mapModel(request.model);
  const { systemInstruction, contents } = convertMessages(request.messages);

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const generationConfig: Record<string, unknown> = {};
  if (request.max_tokens) generationConfig.maxOutputTokens = request.max_tokens;
  if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
  if (request.response_format?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

  const tools = convertTools(request.tools);
  if (tools) body.tools = tools;

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  return toOpenAIResponse(await response.json());
}

/**
 * Streaming chat completion.
 * Returns a ReadableStream of OpenAI-compatible SSE chunks.
 */
export async function chatCompletionStream(request: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = mapModel(request.model);
  const { systemInstruction, contents } = convertMessages(request.messages);

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const generationConfig: Record<string, unknown> = {};
  if (request.max_tokens) generationConfig.maxOutputTokens = request.max_tokens;
  if (request.temperature !== undefined) generationConfig.temperature = request.temperature;
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

  const url = `${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload) continue;

        try {
          const event = JSON.parse(payload);
          const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const chunk = { choices: [{ delta: { content: text }, finish_reason: null }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
          if (event.candidates?.[0]?.finishReason === "STOP") {
            const chunk = { choices: [{ delta: {}, finish_reason: "stop" }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
        } catch {
          // skip non-JSON lines
        }
      }
    },
  });
}
