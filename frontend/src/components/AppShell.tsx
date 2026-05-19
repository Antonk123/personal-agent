"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { IconButton } from "@/components/ui/IconButton";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, action }: AppShellProps) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      <aside className="hidden md:flex md:w-[260px] shrink-0 border-r border-border">
        <Sidebar />
      </aside>

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
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 h-14 px-3 md:px-6 border-b border-border bg-surface">
          <IconButton
            aria-label="Meny"
            onClick={() => setDrawerOpen(true)}
            className="md:hidden"
          >
            <Menu size={18} />
          </IconButton>
          {title && (
            <h1 className="text-[14px] md:text-[15px] font-medium tracking-tight truncate flex-1">
              {title}
            </h1>
          )}
          {action}
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
