"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { Spinner } from "@/components/ui/Spinner";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: "Hej! Jag är din nya arbetsassistent. Innan vi sätter igång vill jag lära känna dig och ditt arbete lite bättre.\n\nVad heter ditt företag och vad gör ni?",
    },
  ]);
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
      setMessages((prev) => [...prev, { role: "assistant", content: "Något gick fel. Försök igen." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    api.updateProfile({ onboarding_completed: true } as any).catch(() => {});
    router.push("/chat");
  }

  const showFinish = messages.length >= 8;

  return (
    <div className="h-screen flex flex-col">
      <div className="p-3 border-b border-surface-100">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= Math.ceil(messages.length / 3) ? "bg-primary-600" : "bg-surface-200"}`} />
          ))}
        </div>
        <p className="text-xs text-surface-800/50 mt-1">Onboarding — Lär känna dig</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-surface-100 rounded-2xl rounded-bl-md px-4 py-3"><Spinner size="sm" /></div>
          </div>
        )}
      </div>
      {showFinish ? (
        <div className="p-3 border-t border-surface-100 space-y-2">
          <ChatInput onSend={handleSend} disabled={loading} />
          <button onClick={handleFinish} className="btn-primary w-full">Klar — börja använda agenten</button>
        </div>
      ) : (
        <ChatInput onSend={handleSend} disabled={loading} />
      )}
    </div>
  );
}
