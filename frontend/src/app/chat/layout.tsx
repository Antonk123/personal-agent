"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { ConversationList } from "@/components/chat/ConversationList";
import { BottomNav } from "@/components/ui/BottomNav";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen">
      <aside className="hidden md:flex md:w-64 border-r border-surface-100 flex-col">
        <ConversationList />
      </aside>
      <main className="flex-1 flex flex-col pb-14 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}
