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
  } = useChatStore();

  const sendMessage = useCallback(
    async (content: string) => {
      const tempId = `temp-${Date.now()}`;
      addMessage({ id: tempId, role: "user", content, created_at: new Date().toISOString() });
      setLoading(true);
      setError(null);

      try {
        const result = await api.sendMessage(content, currentConversationId || undefined);

        if (!currentConversationId) {
          setCurrentConversation(result.conversation_id);
          window.history.replaceState(null, "", `/chat/${result.conversation_id}`);
        }

        addMessage({
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: result.response,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        setError("Kunde inte skicka meddelandet. Försök igen.");
      } finally {
        setLoading(false);
      }
    },
    [currentConversationId, addMessage, setLoading, setError, setCurrentConversation]
  );

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setCurrentConversation(conversationId);
      try {
        const messages = await api.getMessages(conversationId);
        setMessages(
          messages.map((m) => ({
            ...m,
            role: m.role as "user" | "assistant",
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

  return { sendMessage, loadConversation, loadConversations };
}
