"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Brain, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/chat", label: "Chatt", icon: MessageSquare },
  { href: "/memory", label: "Minne", icon: Brain },
  { href: "/assignments", label: "Uppdrag", icon: Briefcase },
  { href: "/account", label: "Konto", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Huvudnavigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
                "transition-colors duration-150",
                active ? "text-accent" : "text-fg-subtle hover:text-fg",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-accent rounded-b-full"
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.25 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
