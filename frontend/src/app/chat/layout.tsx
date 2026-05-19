"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { ConversationList } from "@/components/chat/ConversationList";
import { ConversationHeader } from "@/components/chat/ConversationHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { IconButton } from "@/components/ui/IconButton";
import { useChat } from "@/lib/hooks";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const { loadConversations } = useChat();

  useEffect(() => {
    const ok = isAuthenticated();
    if (!ok) router.push("/auth/login");
    setAuthed(ok);
  }, [router]);

  useEffect(() => {
    if (authed) loadConversations();
  }, [authed, loadConversations]);

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
      <aside className="hidden md:flex md:w-[280px] shrink-0 border-r border-border">
        <ConversationList />
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
            className="absolute top-0 left-0 bottom-0 w-[88%] max-w-[320px] bg-surface shadow-lg animate-slide-up"
          >
            <ConversationList variant="drawer" onSelect={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
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
        />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
