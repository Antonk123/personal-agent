"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { BottomNav } from "@/components/ui/BottomNav";
import { Logo } from "@/components/ui/Logo";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  action?: ReactNode;
}

export function AppShell({ children, title, action }: AppShellProps) {
  const router = useRouter();
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
    <div className="flex flex-col min-h-dvh bg-bg pb-16 md:pb-0">
      <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-border bg-surface/85 backdrop-blur-md">
        {title ? (
          <h1 className="text-[15px] font-semibold tracking-tight truncate flex-1">{title}</h1>
        ) : (
          <Logo size="sm" className="flex-1" />
        )}
        {action}
      </header>
      <main className="flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
