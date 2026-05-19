"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { useChatStore } from "@/stores/chat-store";
import { ConversationList } from "@/components/chat/ConversationList";
import { ConversationHeader } from "@/components/chat/ConversationHeader";
import { ReferencesPanel } from "@/components/chat/ReferencesPanel";
import { Sidebar } from "@/components/Sidebar";
import { IconButton } from "@/components/ui/IconButton";
import { useChat } from "@/lib/hooks";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { loadConversations } = useChat();
  const currentConversationId = useChatStore((s) => s.currentConversationId);

  useEffect(() => {
    const ok = isAuthenticated();
    if (!ok) router.push("/auth/login");
    setAuthed(ok);
  }, [router]);

  useEffect(() => {
    if (authed) loadConversations();
  }, [authed, loadConversations]);

  // Stäng referenspanelen om man navigerar bort till "Ny konversation"
  useEffect(() => {
    if (!currentConversationId) setReferencesOpen(false);
  }, [currentConversationId]);

  if (authed === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-fg-subtle border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[260px] shrink-0 border-r border-border">
        <Sidebar>
          <ConversationList />
        </Sidebar>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-fg/40 animate-fade-in" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-0 bottom-0 w-[88%] max-w-[300px] bg-surface shadow-lg animate-slide-up"
          >
            <Sidebar onNavigate={() => setDrawerOpen(false)}>
              <ConversationList onSelect={() => setDrawerOpen(false)} />
            </Sidebar>
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <ConversationHeader
          leading={
            <IconButton
              aria-label="Konversationer"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden"
            >
              <Menu size={18} />
            </IconButton>
          }
          referencesOpen={referencesOpen}
          onToggleReferences={() => setReferencesOpen((v) => !v)}
        />
        {children}
      </main>

      {/* Desktop references panel */}
      {referencesOpen && (
        <ReferencesPanel
          open
          onClose={() => setReferencesOpen(false)}
          variant="desktop"
        />
      )}

      {/* Mobile references drawer */}
      {referencesOpen && (
        <ReferencesPanel
          open
          onClose={() => setReferencesOpen(false)}
          variant="drawer"
        />
      )}
    </div>
  );
}
