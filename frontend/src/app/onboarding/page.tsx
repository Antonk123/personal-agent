"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const FIRST_MSG: Msg = {
  role: "assistant",
  content:
    "Hej, välkommen. Jag är din arbetsassistent och kommer ihåg det vi pratar om över tid.\n\nInnan vi sätter igång — vad heter ditt företag och vad gör ni?",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([FIRST_MSG]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function handleSend(content: string) {
    setMessages((prev) => [...prev, { role: "user", content }]);
    setLoading(true);
    try {
      const result = await api.sendMessage(content, conversationId || undefined);
      if (!conversationId) setConversationId(result.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: result.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Något gick fel. Försök igen." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    api.updateProfile({ onboarding_completed: true } as any).catch(() => {});
    router.push("/chat");
  }

  const totalSteps = 4;
  const progress = Math.min(Math.ceil(messages.length / 3), totalSteps);
  const showFinish = messages.length >= 8;

  return (
    <div className="flex flex-col h-dvh bg-bg">
      <header className="px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-2.5">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-fg-subtle font-mono tabular-nums">
              Steg {progress}/{totalSteps}
            </span>
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-fg transition-colors"
              aria-label="Hoppa över onboarding"
            >
              Hoppa över
              <X size={12} />
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                i < progress ? "bg-accent" : "bg-surface-3"
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-[12px] text-fg-subtle">
          Lär känna dig · agenten anpassar sig efter dina svar
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6">
        <div className="mx-auto max-w-[680px] space-y-3">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-white text-[10px] font-semibold mt-0.5">
                A
              </div>
              <div className="rounded-[12px] bg-surface border border-border px-3.5 py-3 inline-flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse [animation-delay:200ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-fg-subtle animate-pulse [animation-delay:400ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={loading} />

      {showFinish && (
        <div className="px-3 pb-3 md:px-6 -mt-2">
          <Button
            block
            leftIcon={<Check size={15} />}
            onClick={handleFinish}
            className="mx-auto max-w-[680px]"
          >
            Klar — börja använda agenten
          </Button>
        </div>
      )}
    </div>
  );
}
