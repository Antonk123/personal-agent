"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, MessageSquare } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

function groupByDate(items: Conversation[]) {
  const groups: Record<string, Conversation[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const item of items) {
    const d = new Date(item.updated_at);
    let bucket: string;
    if (d >= today) bucket = "Idag";
    else if (d >= yesterday) bucket = "Igår";
    else if (d >= weekAgo) bucket = "Den här veckan";
    else bucket = "Tidigare";
    (groups[bucket] ||= []).push(item);
  }

  const order = ["Idag", "Igår", "Den här veckan", "Tidigare"];
  return order.filter((k) => groups[k]?.length).map((k) => [k, groups[k]] as const);
}

interface ConversationListProps {
  onSelect?: () => void;
  variant?: "sidebar" | "drawer";
}

export function ConversationList({ onSelect, variant = "sidebar" }: ConversationListProps) {
  const { conversations, currentConversationId } = useChatStore();
  const { loadConversations } = useChat();
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadConversations().finally(() => setLoaded(true));
  }, [loadConversations]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, query]);

  const grouped = useMemo(() => groupByDate(filtered as Conversation[]), [filtered]);

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-3 border-b border-border space-y-2">
        <Link
          href="/chat"
          onClick={onSelect}
          className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={15} />
          Ny konversation
        </Link>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            placeholder="Sök i konversationer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-2.5 rounded-md bg-surface-2 border border-transparent text-[13px] text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:bg-surface"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {!loaded && (
          <div className="space-y-2 p-2">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {loaded && conversations.length === 0 && (
          <div className="px-3 py-8 text-center">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-fg-subtle mb-3">
              <MessageSquare size={16} />
            </div>
            <p className="text-[13px] text-fg-muted">Inga konversationer ännu.</p>
            <p className="text-[12px] text-fg-subtle mt-0.5">Börja chatta så samlas de här.</p>
          </div>
        )}
        {loaded && filtered.length === 0 && conversations.length > 0 && (
          <p className="px-3 py-6 text-[13px] text-fg-subtle text-center">
            Inga träffar för &ldquo;{query}&rdquo;
          </p>
        )}
        {grouped.map(([label, items]) => (
          <div key={label} className="mb-2">
            <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.08em] text-fg-subtle font-mono">
              {label}
            </div>
            {items.map((conv) => {
              const active = conv.id === currentConversationId;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  onClick={onSelect}
                  className={cn(
                    "block px-3 py-2 rounded-md transition-colors mb-0.5",
                    active
                      ? "bg-accent-soft"
                      : "hover:bg-surface-2",
                  )}
                >
                  <p
                    className={cn(
                      "text-[13px] font-medium truncate leading-snug",
                      active ? "text-accent-soft-fg" : "text-fg",
                    )}
                  >
                    {conv.title || "Ny konversation"}
                  </p>
                  <p className="text-[11px] text-fg-subtle font-mono mt-0.5 tabular-nums">
                    {new Date(conv.updated_at).toLocaleString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
