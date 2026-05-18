"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { Spinner } from "@/components/ui/Spinner";
import { useChatStore } from "@/stores/chat-store";

export function ChatMessages() {
  const { messages, isLoading } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-3">👋</p>
          <p className="text-lg font-medium mb-1">Hej!</p>
          <p className="text-surface-800/60 text-sm">
            Vad kan jag hjälpa dig med idag?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
      ))}
      {isLoading && (
        <div className="flex justify-start mb-3">
          <div className="bg-surface-100 rounded-2xl rounded-bl-md px-4 py-3">
            <Spinner size="sm" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
