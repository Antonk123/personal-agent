"use client";

import { useEffect, useRef } from "react";
import { MessageSquarePlus, ChevronRight } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/lib/hooks";

const SUGGESTIONS = [
  "Sammanfatta vad jag jobbat med den här veckan",
  "Vilka beslut väntar på återkoppling?",
  "Skapa ett nytt uppdrag",
];

interface ChatMessagesProps {
  onSuggestion?: (text: string) => void;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatMessages({ onSuggestion }: ChatMessagesProps) {
  const { messages, isLoading } = useChatStore();
  const { regenerate } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastAssistantIdx = messages.findLastIndex((m) => m.role === "assistant");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-6">
        <div className="mx-auto max-w-[600px]">
          <div className="text-center mb-8 animate-slide-up">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-soft text-accent-soft-fg mb-4">
              <MessageSquarePlus size={22} strokeWidth={2} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight mb-1.5">
              Vad jobbar du med idag?
            </h2>
            <p className="text-sm text-fg-muted">
              Jag kommer ihåg dina uppdrag, kontakter och beslut.
            </p>
          </div>

          {onSuggestion && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle font-mono pl-1 mb-1.5">
                Förslag
              </div>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSuggestion(s)}
                  className="group w-full flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 text-left text-[14px] text-fg transition-colors hover:border-border-strong"
                >
                  <span>{s}</span>
                  <ChevronRight
                    size={15}
                    className="text-fg-subtle group-hover:text-fg transition-colors shrink-0"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 md:px-8">
      <div className="mx-auto max-w-[760px] space-y-6">
        {messages.map((msg, idx) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={formatTime(msg.created_at)}
            isLastAssistant={idx === lastAssistantIdx && !isLoading}
            onRegenerate={regenerate}
            refs={msg.refs}
          />
        ))}
        {isLoading && (!messages.length || messages[messages.length - 1].role === "user" || messages[messages.length - 1].content === "") && (
          <div className="inline-flex gap-1.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse [animation-delay:200ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse [animation-delay:400ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
