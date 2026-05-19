"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquarePlus,
  Brain,
  Briefcase,
  LogOut,
  Moon,
  Sun,
  Settings,
  Download,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/memory", label: "Minne", icon: Brain, match: (p: string) => p.startsWith("/memory") },
  {
    href: "/assignments",
    label: "Uppdrag",
    icon: Briefcase,
    match: (p: string) => p.startsWith("/assignments"),
  },
];

interface SidebarProps {
  /** Slot för chat-specifikt innehåll (konversationslista) */
  children?: ReactNode;
  /** Callback för mobil-drawer som vill stängas vid navigation */
  onNavigate?: () => void;
}

export function Sidebar({ children, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <Link
          href="/chat"
          onClick={onNavigate}
          className="inline-flex items-center"
          aria-label="Cortex"
        >
          <Logo size="sm" />
        </Link>
      </div>

      <div className="px-2 pb-2">
        <Link
          href="/chat"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 h-9 px-2.5 rounded-md text-[13px] font-medium",
            "transition-colors",
            pathname === "/chat" || pathname.startsWith("/chat/")
              ? "bg-surface-2 text-fg"
              : "text-fg-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <MessageSquarePlus size={15} className="text-fg-subtle" />
          Ny konversation
        </Link>
        <div className="mt-0.5 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 h-9 px-2.5 rounded-md text-[13px] font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon size={15} className={active ? "text-fg" : "text-fg-subtle"} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>

      <AccountChip onNavigate={onNavigate} />
    </div>
  );
}

interface Profile {
  name?: string;
  company_name?: string;
  email?: string;
  role?: string;
}

function AccountChip({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getProfile().then((p) => setProfile(p as Profile)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const name = profile?.name || profile?.company_name || "Användare";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const subline = profile?.role || profile?.email || "Cortex · v0.1";

  function logout() {
    clearSession();
    router.push("/auth/login");
  }

  async function exportData() {
    setOpen(false);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cortex-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative border-t border-border p-2" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors",
          "hover:bg-surface-2",
          open && "bg-surface-2",
        )}
      >
        <Avatar initials={initials} size="sm" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-medium text-fg truncate">{name}</div>
          <div className="text-[11px] text-fg-subtle truncate font-mono">{subline}</div>
        </div>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-2 right-2 mb-2 py-1 rounded-md border border-border bg-surface shadow-lg animate-fade-in"
        >
          <MenuItem
            icon={mounted && theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            label={mounted && theme === "dark" ? "Ljust läge" : "Mörkt läge"}
            onClick={toggle}
          />
          <Link
            href="/account"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-fg hover:bg-surface-2"
          >
            <Settings size={14} className="text-fg-subtle" />
            Inställningar
          </Link>
          <Link
            href="/onboarding"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-fg hover:bg-surface-2"
          >
            <Sparkles size={14} className="text-fg-subtle" />
            Kör introduktionen
          </Link>
          <MenuItem
            icon={<Download size={14} />}
            label="Exportera data"
            onClick={exportData}
          />
          <div className="my-1 border-t border-border" />
          <MenuItem
            icon={<LogOut size={14} />}
            label="Logga ut"
            onClick={logout}
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-surface-2",
        danger ? "text-danger" : "text-fg",
      )}
    >
      <span className={cn(danger ? "text-danger" : "text-fg-subtle")}>{icon}</span>
      {label}
    </button>
  );
}
