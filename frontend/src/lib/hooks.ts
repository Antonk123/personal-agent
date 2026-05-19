"use client";

import { useCallback } from "react";
import { api } from "./api";
import { useChatStore } from "@/stores/chat-store";

export function useChat() {
  const {
    currentConversationId,
    setCurrentConversation,
    addMessage,
    setLoading,
    setError,
    setMessages,
    setConversations,
    popLastAssistantMessage,
    appendToLastMessage,
    updateLastMessageMeta,
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string) => {
      addMessage({ id: `temp-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() });
      addMessage({ id: `stream-${Date.now()}`, role: "assistant", content: "", created_at: new Date().toISOString() });
      setLoading(true);
      setError(null);

      try {
        const response = await api.sendMessageStream(content, currentConversationId || undefined);
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const boundary = buffer.indexOf("\n\n");
            if (boundary === -1) break;

            const block = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            let eventType = "";
            let eventData = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              else if (line.startsWith("data: ")) eventData = line.slice(6);
            }

            if (!eventType || !eventData) continue;

            const parsed = JSON.parse(eventData);

            if (eventType === "meta") {
              if (!currentConversationId) {
                setCurrentConversation(parsed.conversation_id);
                window.history.replaceState(null, "", `/chat/${parsed.conversation_id}`);
              }
            } else if (eventType === "chunk") {
              appendToLastMessage(parsed.text);
            } else if (eventType === "done") {
              updateLastMessageMeta({ id: parsed.message_id, refs: parsed.refs });
            } else if (eventType === "error") {
              setError(parsed.detail || "Streaming-fel.");
            }
          }
        }
      } catch (err) {
        setError("Kunde inte skicka meddelandet. Försök igen.");
      } finally {
        setLoading(false);
      }
    },
    [currentConversationId, addMessage, setLoading, setError, setCurrentConversation, appendToLastMessage, updateLastMessageMeta]
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setCurrentConversation(conversationId);
      try {
        const messages = await api.getMessages(conversationId);
        setMessages(
          messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            created_at: m.created_at,
            refs: m.refs,
          }))
        );
      } catch (err) {
        setError("Kunde inte ladda konversationen.");
      }
    },
    [setCurrentConversation, setMessages, setError]
  );

  const loadConversations = useCallback(async () => {
    try {
      const conversations = await api.getConversations();
      setConversations(conversations);
    } catch (err) {
      // Silent fail
    }
  }, [setConversations]);

  const regenerate = useCallback(async () => {
    if (!currentConversationId) return;
    const conversationId = currentConversationId;

    popLastAssistantMessage();
    setLoading(true);
    setError(null);

    try {
      const result = await api.regenerateResponse(conversationId);
      addMessage({
        id: result.message_id || `msg-${Date.now()}`,
        role: "assistant",
        content: result.response,
        created_at: new Date().toISOString(),
        refs: result.refs,
      });
    } catch (err) {
      setError("Kunde inte regenerera svaret. Försök igen.");
      // Refetch truth from server so the UI doesn't drift.
      try {
        const messages = await api.getMessages(conversationId);
        setMessages(
          messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            created_at: m.created_at,
            refs: m.refs,
          })),
        );
      } catch {
        // Swallow — error message already surfaced.
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentConversationId,
    popLastAssistantMessage,
    addMessage,
    setLoading,
    setError,
    setMessages,
  ]);

  return { sendMessage, loadConversation, loadConversations, regenerate };
}
