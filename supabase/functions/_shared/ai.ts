/**
 * Shared AI client — routes OpenAI-style requests through the
 * Lovable AI Gateway (OpenAI-compatible). Uses LOVABLE_API_KEY.
 * Returns OpenAI-shaped responses so existing parsing code keeps working.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MODEL_MAP: Record<string, string> = {
  "gpt-4o": "google/gemini-2.5-flash",
  "gpt-4o-mini": "google/gemini-2.5-flash-lite",
};

function mapModel(model: string): string {
  return MODEL_MAP[model] || model;
}

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

function buildBody(request: ChatCompletionRequest, stream: boolean) {
  const body: Record<string, unknown> = {
    model: mapModel(request.model),
    messages: request.messages,
    stream,
  };
  if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
  if (request.temperature !== undefined) body.temperature = request.temperature;
  if (request.response_format) body.response_format = request.response_format;
  if (request.tools?.length) body.tools = request.tools;
  return body;
}

/** Non-streaming chat completion via Lovable AI Gateway. */
export async function chatCompletion(request: ChatCompletionRequest) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(request, false)),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lovable AI Gateway error (${response.status}): ${err}`);
  }

  return await response.json();
}

/** Streaming chat completion via Lovable AI Gateway (OpenAI SSE pass-through). */
export async function chatCompletionStream(
  request: ChatCompletionRequest,
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(request, true)),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Lovable AI Gateway error (${response.status}): ${err}`);
  }

  return response.body!;
}
