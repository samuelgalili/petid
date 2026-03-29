/**
 * Shared AI client — translates OpenAI-style requests to Anthropic Messages API.
 * Returns OpenAI-compatible responses so existing parsing code keeps working.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const MODEL_MAP: Record<string, string> = {
  "google/gemini-2.5-flash": "claude-sonnet-4-6",
  "google/gemini-2.5-flash-lite": "claude-haiku-4-5-20251001",
  "google/gemini-3-flash-preview": "claude-sonnet-4-6",
  "google/gemini-3-pro-image-preview": "claude-sonnet-4-6",
  "gpt-4o": "claude-sonnet-4-6",
  "gpt-4o-mini": "claude-haiku-4-5-20251001",
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
  return MODEL_MAP[model] || "claude-sonnet-4-6";
}

/** Split system messages out (Anthropic uses a top-level system param). */
function convertMessages(messages: OpenAIMessage[]): {
  system: string | undefined;
  messages: Array<{ role: string; content: unknown }>;
} {
  let system: string | undefined;
  const out: Array<{ role: string; content: unknown }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .map((c) => c.text || "")
              .join("\n");
      system = system ? `${system}\n\n${text}` : text;
      continue;
    }

    if (typeof msg.content === "string") {
      out.push({ role: msg.role, content: msg.content });
    } else if (Array.isArray(msg.content)) {
      const parts = msg.content.map((part) => {
        if (part.type === "text") {
          return { type: "text" as const, text: part.text || "" };
        }
        if (part.type === "image_url") {
          const url = part.image_url?.url || "";
          const b64Match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (b64Match) {
            return {
              type: "image" as const,
              source: { type: "base64" as const, media_type: b64Match[1], data: b64Match[2] },
            };
          }
          return { type: "image" as const, source: { type: "url" as const, url } };
        }
        return part;
      });
      out.push({ role: msg.role, content: parts });
    }
  }

  return { system, messages: out };
}

function convertTools(
  tools: ChatCompletionRequest["tools"],
): Array<{ name: string; description: string; input_schema: Record<string, unknown> }> | undefined {
  if (!tools?.length) return undefined;
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

/** Convert Anthropic response → OpenAI-shaped response. */
function toOpenAIResponse(res: Record<string, unknown>): Record<string, unknown> {
  let content = "";
  let toolCalls: Array<Record<string, unknown>> | undefined;

  const blocks = (res.content || []) as Array<Record<string, unknown>>;
  for (const block of blocks) {
    if (block.type === "text") content += block.text;
    if (block.type === "tool_use") {
      toolCalls = toolCalls || [];
      toolCalls.push({
        id: block.id,
        type: "function",
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      });
    }
  }

  const usage = (res.usage || {}) as Record<string, number>;
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: content || null,
          ...(toolCalls && { tool_calls: toolCalls }),
        },
        finish_reason:
          res.stop_reason === "end_turn"
            ? "stop"
            : res.stop_reason === "tool_use"
              ? "tool_calls"
              : "stop",
      },
    ],
    usage: {
      prompt_tokens: usage.input_tokens || 0,
      completion_tokens: usage.output_tokens || 0,
      total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    },
    model: res.model,
  };
}

/**
 * Non-streaming chat completion.
 * Accepts OpenAI-style params, returns OpenAI-shaped JSON.
 */
export async function chatCompletion(request: ChatCompletionRequest) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const { system: rawSystem, messages } = convertMessages(request.messages);
  let system = rawSystem;

  // Approximate JSON mode via system instruction
  if (request.response_format?.type === "json_object") {
    system = (system || "") + "\n\nIMPORTANT: You must respond with valid JSON only. No markdown fences, no commentary.";
  }

  const body: Record<string, unknown> = {
    model: mapModel(request.model),
    messages,
    max_tokens: request.max_tokens || 4096,
  };
  if (system) body.system = system;
  if (request.temperature !== undefined) body.temperature = request.temperature;
  const tools = convertTools(request.tools);
  if (tools) body.tools = tools;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  return toOpenAIResponse(await response.json());
}

/**
 * Streaming chat completion.
 * Returns a ReadableStream of OpenAI-compatible SSE chunks.
 */
export async function chatCompletionStream(request: ChatCompletionRequest): Promise<ReadableStream<Uint8Array>> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const { system, messages } = convertMessages(request.messages);

  const body: Record<string, unknown> = {
    model: mapModel(request.model),
    messages,
    max_tokens: request.max_tokens || 4096,
    stream: true,
  };
  if (system) body.system = system;
  if (request.temperature !== undefined) body.temperature = request.temperature;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
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
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            const chunk = { choices: [{ delta: { content: event.delta.text }, finish_reason: null }] };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          } else if (event.type === "message_stop") {
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
