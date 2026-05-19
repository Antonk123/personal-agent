"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/lib/hooks";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

interface ConversationHeaderProps {
  leading?: React.ReactNode;
}

export function ConversationHeader({ leading }: ConversationHeaderProps) {
  const { currentConversationId, conversations, renameConversation, removeConversation } =
    useChatStore();
  const { loadConversations } = useChat();
  const router = useRouter();

  const conv = conversations.find((c) => c.id === currentConversationId);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditing(false);
    setMenuOpen(false);
  }, [currentConversationId]);

  useEffect(() => {
    if (editing && conv) {
      setDraft(conv.title || "");
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing, conv]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  if (!currentConversationId || !conv) {
    if (!leading) return null;
    return (
      <header className="md:hidden flex items-center gap-2 h-14 px-3 border-b border-border bg-surface">
        {leading}
        <Logo size="sm" />
      </header>
    );
  }

  async function handleSubmitRename() {
    if (!conv) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    renameConversation(conv.id, trimmed);
    setEditing(false);
    try {
      await api.renameConversation(conv.id, trimmed);
    } catch {
      loadConversations();
    }
  }

  async function handleDelete() {
    if (!conv) return;
    if (!window.confirm("Ta bort den här konversationen permanent?")) return;
    const id = conv.id;
    setMenuOpen(false);
    removeConversation(id);
    router.push("/chat");
    try {
      await api.deleteConversation(id);
    } catch {
      loadConversations();
    }
  }

  return (
    <header className="flex items-center gap-2 h-14 px-3 md:px-6 border-b border-border bg-surface">
      {leading}
      {editing ? (
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 h-8 px-2 rounded bg-surface-2 border border-border text-[14px] text-fg focus:outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleSubmitRename}
            aria-label="Spara"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-accent hover:bg-surface-2"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Avbryt"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-fg-muted hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <h1 className="flex-1 min-w-0 truncate text-[14px] md:text-[15px] font-medium text-fg">
            {conv.title || "Ny konversation"}
          </h1>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Åtgärder"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors",
                menuOpen && "bg-surface-2 text-fg",
              )}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[160px] py-1 rounded-md border border-border bg-surface shadow-lg animate-fade-in"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-fg hover:bg-surface-2"
                >
                  <Pencil size={13} className="text-fg-muted" />
                  Byt titel
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-danger hover:bg-danger-soft/40"
                >
                  <Trash2 size={13} />
                  Ta bort
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
}
