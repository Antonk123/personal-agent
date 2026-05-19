"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Briefcase, Users, FileText, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

interface Profile {
  company_name?: string;
  role?: string;
  services?: string[];
  company_description?: string;
}

interface Assignment {
  id: string;
  name: string;
  status: string;
}

interface MemoryStats {
  assignments: number;
  contacts: number;
  decisions: number;
}

export default function MemoryPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProfile(),
      api.getAssignments(),
      api.getMemoryStats().catch(() => null),
    ])
      .then(([p, a, s]) => {
        setProfile(p as Profile);
        setAssignments((a as Assignment[]) || []);
        setStats(s as MemoryStats | null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Minne">
      <div className="mx-auto max-w-[640px] px-4 py-5 space-y-5">
        {loading ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
              <Skeleton className="h-[72px]" />
            </div>
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <StatCard
                icon={<Briefcase size={15} />}
                value={stats?.assignments ?? assignments.length}
                label="Uppdrag"
                href="/assignments"
              />
              <StatCard
                icon={<Users size={15} />}
                value={stats?.contacts ?? "—"}
                label="Kontakter"
              />
              <StatCard
                icon={<FileText size={15} />}
                value={stats?.decisions ?? "—"}
                label="Beslut"
              />
            </div>

            <section>
              <SectionHeader title="Profil" action={
                <Link
                  href="/memory/profile"
                  className="inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-accent transition-colors"
                >
                  <Pencil size={11} />
                  Redigera
                </Link>
              }/>
              {profile && (profile.company_name || profile.role) ? (
                <Card>
                  {profile.company_name && (
                    <div className="text-[15px] font-semibold tracking-tight">{profile.company_name}</div>
                  )}
                  {profile.role && (
                    <div className="text-[13px] text-fg-muted mt-0.5">{profile.role}</div>
                  )}
                  {profile.company_description && (
                    <p className="mt-3 text-[13px] text-fg-muted leading-relaxed">
                      {profile.company_description}
                    </p>
                  )}
                  {profile.services && profile.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {profile.services.map((s) => (
                        <Badge key={s} tone="accent">{s}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <Card>
                  <p className="text-[13px] text-fg-muted">
                    Ingen profil ifylld ännu.{" "}
                    <Link href="/memory/profile" className="text-accent hover:underline">
                      Fyll i den nu
                    </Link>
                    .
                  </p>
                </Card>
              )}
            </section>

            <section>
              <SectionHeader
                title="Senaste uppdrag"
                action={
                  <Link
                    href="/assignments"
                    className="inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-accent transition-colors"
                  >
                    Visa alla
                    <ChevronRight size={12} />
                  </Link>
                }
              />
              <div className="space-y-2">
                {assignments.slice(0, 3).map((a) => (
                  <Link key={a.id} href={`/assignments/${a.id}`}>
                    <Card interactive>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[14px] font-medium truncate">{a.name}</div>
                        <StatusBadge status={a.status} />
                      </div>
                    </Card>
                  </Link>
                ))}
                {assignments.length === 0 && (
                  <Card>
                    <p className="text-[13px] text-fg-muted">
                      Inga uppdrag registrerade ännu.{" "}
                      <Link href="/assignments/new" className="text-accent hover:underline">
                        Skapa det första
                      </Link>
                      .
                    </p>
                  </Card>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon, value, label, href }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  href?: string;
}) {
  const content = (
    <Card padding="sm" interactive={!!href} className="h-[72px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-fg-subtle">{icon}</span>
      </div>
      <div>
        <div className="text-[22px] font-semibold tracking-tight leading-none tabular-nums">{value}</div>
        <div className="text-[10px] uppercase tracking-[0.08em] text-fg-subtle font-mono mt-1">
          {label}
        </div>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle font-mono font-medium">
        {title}
      </h2>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge tone="success">● Aktivt</Badge>;
  if (status === "paused") return <Badge tone="warning">⏸ Pausat</Badge>;
  return <Badge>{status}</Badge>;
}
