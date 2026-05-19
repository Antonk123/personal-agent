"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Brain, Briefcase, User } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/chat", label: "Chatt", icon: MessageSquare },
  { href: "/memory", label: "Minne", icon: Brain },
  { href: "/assignments", label: "Uppdrag", icon: Briefcase },
  { href: "/account", label: "Konto", icon: User },
];

export function SideRail() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Huvudnavigation"
      className="hidden md:flex md:flex-col md:items-center md:w-16 shrink-0 border-r border-border bg-surface py-3 gap-1"
    >
      <Link
        href="/chat"
        aria-label="Cortex"
        className="mb-2 inline-flex h-9 w-9 items-center justify-center"
      >
        <Logo size="sm" showWordmark={false} />
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={label}
            className={cn(
              "group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-accent-soft text-accent-soft-fg"
                : "text-fg-subtle hover:bg-surface-2 hover:text-fg",
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 -ml-2 rounded-r bg-accent"
              />
            )}
            <Icon size={18} strokeWidth={active ? 2.25 : 2} />
            <span className="sr-only">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
