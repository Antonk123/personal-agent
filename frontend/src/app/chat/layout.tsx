"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { ConversationList } from "@/components/chat/ConversationList";
import { BottomNav } from "@/components/ui/BottomNav";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = isAuthenticated();
    if (!ok) router.push("/auth/login");
    setAuthed(ok);
  }, [router]);

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
        <header className="md:hidden flex items-center gap-2 h-14 px-3 border-b border-border bg-surface">
          <IconButton aria-label="Konversationer" onClick={() => setDrawerOpen(true)}>
            <Menu size={18} />
          </IconButton>
          <Logo size="sm" />
        </header>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
