"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/lib/hooks";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";

export default function NewChatPage() {
  const { isLoading } = useChatStore();
  const { sendMessage } = useChat();
  const reset = useChatStore((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <>
      <ChatMessages onSuggestion={sendMessage} />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </>
  );
}
