"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/lib/hooks";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { isLoading } = useChatStore();
  const { sendMessage, loadConversation } = useChat();

  useEffect(() => {
    if (id) loadConversation(id);
  }, [id, loadConversation]);

  return (
    <>
      <ChatMessages />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </>
  );
}
