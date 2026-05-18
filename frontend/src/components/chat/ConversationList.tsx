"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/lib/hooks";

export function ConversationList() {
  const { conversations, currentConversationId } = useChatStore();
  const { loadConversation, loadConversations } = useChat();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-surface-100">
        <a href="/chat" className="btn-primary w-full text-center block text-sm">
          + Ny konversation
        </a>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => loadConversation(conv.id)}
            className={`w-full text-left px-3 py-2.5 text-sm border-b border-surface-50
              hover:bg-surface-50 transition-colors
              ${conv.id === currentConversationId ? "bg-primary-50 border-l-2 border-l-primary-600" : ""}`}
          >
            <p className="truncate font-medium">{conv.title || "Ny konversation"}</p>
            <p className="text-xs text-surface-800/50 mt-0.5">
              {new Date(conv.updated_at).toLocaleDateString("sv-SE")}
            </p>
          </button>
        ))}
        {conversations.length === 0 && (
          <p className="text-xs text-surface-800/50 p-3">Inga konversationer ännu</p>
        )}
      </div>
    </div>
  );
}
