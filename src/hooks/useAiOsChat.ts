import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AiOsMessage {
  id: string;
  role: "user" | "assistant" | "system" | "agent" | "tool";
  content: string;
  agentSlug?: string;
  contentType?: string;
  structuredData?: Record<string, unknown>;
  toolCalls?: unknown[];
  createdAt: string;
}

const AI_OS_GATEWAY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-os-gateway`;

export const useAiOsChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AiOsMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    
    const { data, error } = await (supabase as any)
      .from("ai_os_conversations")
      .insert({ user_id: user?.id, title: "שיחה חדשה", status: "active" })
      .select()
      .single();
    
    if (error) throw error;
    setConversationId(data.id);
    return data.id;
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    const userMsg: AiOsMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    try {
      const convId = await createConversation();

      // Save user message
      await (supabase as any).from("ai_os_messages").insert({
        conversation_id: convId,
        role: "user",
        content: content.trim(),
      });

      // Build chat history
      const chatMessages = [...messages, userMsg].map(m => ({
        role: m.role === "agent" ? "assistant" : m.role,
        content: m.content,
      }));

      // Stream response
      abortControllerRef.current = new AbortController();
      
      const resp = await fetch(AI_OS_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "chat", messages: chatMessages, conversation_id: convId, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${resp.status}`);
      }

      let assistantContent = "";
      const assistantId = crypto.randomUUID();
      
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: assistantId, role: "assistant", content: assistantContent, createdAt: new Date().toISOString() }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save assistant message
      if (assistantContent) {
        await (supabase as any).from("ai_os_messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: assistantContent,
        });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("AI OS chat error:", err);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "system",
          content: `שגיאה: ${err.message}`,
          createdAt: new Date().toISOString(),
        }]);
      }
    } finally {
      setIsStreaming(false);
    }
  }, [user, messages, createConversation]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming, clearChat, conversationId };
};
