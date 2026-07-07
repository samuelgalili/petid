import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { createClientId } from "@/lib/randomId";

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

export const useAiOsChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AiOsMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;

    const id = createClientId("conversation");
    await (supabase as any)
      .from("ai_os_conversations")
      .insert({ id, user_id: user?.id, title: "שיחה חדשה", status: "active" });

    setConversationId(id);
    return id;
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !content.trim()) return;

    const userMsg: AiOsMessage = {
      id: createClientId("message"),
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

      const { data, error } = await supabase.functions.invoke<{ content?: string; response?: string }>(
        "ai-os-gateway",
        { body: { action: "chat", messages: chatMessages, conversation_id: convId } },
      );
      if (error) throw new Error(error.message);

      const assistantContent = data?.content || data?.response || "AI OS עדיין עובר לסביבת AWS.";
      const assistantId = createClientId("message");
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: assistantContent, createdAt: new Date().toISOString() }]);

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
          id: createClientId("message"),
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
