"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
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

export function ConversationList({ onSelect }: ConversationListProps) {
  const { conversations, currentConversationId, renameConversation, removeConversation } =
    useChatStore();
  const { loadConversations } = useChat();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations().finally(() => setLoaded(true));
  }, [loadConversations]);

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, query]);

  const grouped = useMemo(() => groupByDate(filtered as Conversation[]), [filtered]);

  async function handleRename(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    renameConversation(id, trimmed);
    setEditingId(null);
    try {
      await api.renameConversation(id, trimmed);
    } catch {
      // revert on failure — refetch
      loadConversations();
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Ta bort den här konversationen permanent?")) return;
    const wasActive = id === currentConversationId;
    removeConversation(id);
    try {
      await api.deleteConversation(id);
      if (wasActive) router.push("/chat");
    } catch {
      loadConversations();
    }
  }

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
            {items.map((conv) => (
              <ConvRow
                key={conv.id}
                conv={conv}
                active={conv.id === currentConversationId}
                editing={editingId === conv.id}
                menuOpen={openMenuId === conv.id}
                onSelect={onSelect}
                onStartEdit={() => {
                  setEditingId(conv.id);
                  setOpenMenuId(null);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSubmitEdit={(t) => handleRename(conv.id, t)}
                onOpenMenu={() => setOpenMenuId(conv.id)}
                onCloseMenu={() => setOpenMenuId(null)}
                onDelete={() => handleDelete(conv.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ConvRowProps {
  conv: Conversation;
  active: boolean;
  editing: boolean;
  menuOpen: boolean;
  onSelect?: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (title: string) => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onDelete: () => void;
}

function ConvRow({
  conv,
  active,
  editing,
  menuOpen,
  onSelect,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onOpenMenu,
  onCloseMenu,
  onDelete,
}: ConvRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(conv.title || "");

  useEffect(() => {
    if (editing) {
      setDraft(conv.title || "");
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, conv.title]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCloseMenu();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen, onCloseMenu]);

  if (editing) {
    return (
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-md mb-0.5",
          active ? "bg-accent-soft" : "bg-surface-2",
        )}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmitEdit(draft);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          className="flex-1 h-7 px-2 rounded bg-surface border border-border text-[13px] text-fg focus:outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => onSubmitEdit(draft)}
          aria-label="Spara"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-accent hover:bg-surface-3"
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          aria-label="Avbryt"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-fg-muted hover:bg-surface-3"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 rounded-md mb-0.5 transition-colors",
        active ? "bg-accent-soft" : "hover:bg-surface-2",
      )}
    >
      <Link
        href={`/chat/${conv.id}`}
        onClick={onSelect}
        className="flex-1 min-w-0 px-3 py-2"
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
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          menuOpen ? onCloseMenu() : onOpenMenu();
        }}
        aria-label="Åtgärder"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={cn(
          "mr-1 inline-flex h-7 w-7 items-center justify-center rounded text-fg-subtle",
          "hover:bg-surface-3 hover:text-fg",
          "md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity",
          menuOpen && "md:opacity-100 bg-surface-3 text-fg",
        )}
      >
        <MoreHorizontal size={15} />
      </button>
      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-1 top-full z-20 mt-1 min-w-[160px] py-1 rounded-md border border-border bg-surface shadow-lg animate-fade-in"
        >
          <button
            type="button"
            role="menuitem"
            onClick={onStartEdit}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-fg hover:bg-surface-2"
          >
            <Pencil size={13} className="text-fg-muted" />
            Byt titel
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCloseMenu();
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-danger hover:bg-danger-soft/40"
          >
            <Trash2 size={13} />
            Ta bort
          </button>
        </div>
      )}
    </div>
  );
}
