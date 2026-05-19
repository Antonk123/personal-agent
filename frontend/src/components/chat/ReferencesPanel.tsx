"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Briefcase, User as UserIcon, FileText, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

interface Profile {
  company_name?: string;
  role?: string;
  services?: string[];
}

interface Assignment {
  id: string;
  name: string;
  role?: string;
  client?: string;
  phase?: string;
  status: string;
}

interface MemoryStats {
  assignments: number;
  contacts: number;
  decisions: number;
}

interface ReferencesPanelProps {
  open: boolean;
  onClose: () => void;
  variant?: "desktop" | "drawer";
}

export function ReferencesPanel({ open, onClose, variant = "desktop" }: ReferencesPanelProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      api.getProfile().catch(() => null),
      api.getAssignments().catch(() => []),
      api.getMemoryStats().catch(() => null),
    ])
      .then(([p, a, s]) => {
        setProfile(p as Profile | null);
        setAssignments((a as Assignment[]) || []);
        setStats(s as MemoryStats | null);
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const body = (
    <div className="flex flex-col h-full bg-surface">
      <div className="flex items-center justify-between h-12 px-3 md:px-4">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-fg-subtle" />
          <h2 className="text-[13px] font-medium text-fg">Kontext</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="inline-flex h-8 w-8 items-center justify-center rounded text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 md:px-4 pb-4 space-y-4">
        <p className="text-[12px] text-fg-subtle leading-relaxed">
          Vad agenten kan referera till i konversationen.
        </p>

        {loading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-3 gap-1.5">
                <StatPill icon={<Briefcase size={11} />} value={stats.assignments} label="Uppdrag" />
                <StatPill icon={<UserIcon size={11} />} value={stats.contacts} label="Kontakter" />
                <StatPill icon={<FileText size={11} />} value={stats.decisions} label="Beslut" />
              </div>
            )}

            {profile && (profile.company_name || profile.role) && (
              <Section title="Profil">
                <div className="rounded-md border border-border bg-surface-2 p-2.5">
                  {profile.company_name && (
                    <div className="text-[13px] font-medium text-fg">{profile.company_name}</div>
                  )}
                  {profile.role && (
                    <div className="text-[12px] text-fg-muted mt-0.5">{profile.role}</div>
                  )}
                  {profile.services && profile.services.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {profile.services.slice(0, 6).map((s) => (
                        <Badge key={s} tone="accent">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            )}

            <Section
              title="Uppdrag"
              action={
                <Link
                  href="/assignments"
                  className="inline-flex items-center gap-0.5 text-[11px] text-fg-subtle hover:text-accent transition-colors"
                >
                  Alla
                  <ExternalLink size={10} />
                </Link>
              }
            >
              {assignments.length === 0 ? (
                <p className="text-[12px] text-fg-subtle px-1">Inga uppdrag ännu.</p>
              ) : (
                <div className="space-y-1">
                  {assignments.slice(0, 6).map((a) => (
                    <Link
                      key={a.id}
                      href={`/assignments/${a.id}`}
                      className="group block rounded-md border border-border bg-surface-2 p-2.5 hover:border-border-strong transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-fg truncate">{a.name}</div>
                          {(a.client || a.phase) && (
                            <div className="text-[11px] text-fg-subtle mt-0.5 truncate font-mono">
                              {[a.client, a.phase].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </div>
                        <StatusDot status={a.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );

  if (variant === "drawer") {
    return (
      <div className="fixed inset-0 z-40 md:hidden" onClick={onClose}>
        <div className="absolute inset-0 bg-fg/40 animate-fade-in" />
        <aside
          onClick={(e) => e.stopPropagation()}
          className="absolute top-0 right-0 bottom-0 w-[88%] max-w-[340px] bg-surface shadow-lg animate-slide-up border-l border-border"
        >
          {body}
        </aside>
      </div>
    );
  }

  return (
    <aside className="hidden md:flex w-[340px] shrink-0 border-l border-border animate-fade-in">
      {body}
    </aside>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <h3 className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle font-mono font-medium">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2 px-2 py-2 text-center">
      <div className="inline-flex items-center justify-center text-fg-subtle mb-0.5">{icon}</div>
      <div className="text-[16px] font-semibold tracking-tight tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[10px] text-fg-subtle font-mono mt-1">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls = cn(
    "inline-block h-1.5 w-1.5 rounded-full shrink-0 mt-1.5",
    status === "active" && "bg-success",
    status === "paused" && "bg-warning",
    status !== "active" && status !== "paused" && "bg-fg-subtle",
  );
  return <span className={cls} aria-label={status} title={status} />;
}
