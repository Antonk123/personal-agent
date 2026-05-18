"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Briefcase, User as UserIcon, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface Assignment {
  id: string;
  name: string;
  role?: string;
  client?: string;
  phase?: string;
  status: string;
}

export default function AssignmentsPage() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAssignments()
      .then((a) => setItems((a as Assignment[]) || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell
      title="Uppdrag"
      action={
        <Link
          href="/assignments/new"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-accent text-white text-[13px] font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus size={14} />
          Nytt
        </Link>
      }
    >
      <div className="mx-auto max-w-[640px] px-4 py-5">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-surface-2 text-fg-subtle mb-3">
              <Briefcase size={20} />
            </div>
            <h3 className="text-[15px] font-semibold mb-1">Inga uppdrag ännu</h3>
            <p className="text-[13px] text-fg-muted mb-5 max-w-[280px] mx-auto">
              Lägg till ditt första uppdrag så börjar agenten komma ihåg kontakter och beslut kring det.
            </p>
            <Link href="/assignments/new">
              <Button leftIcon={<Plus size={15} />}>Skapa uppdrag</Button>
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((a) => (
              <Link key={a.id} href={`/assignments/${a.id}`}>
                <Card interactive>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold tracking-tight truncate">
                        {a.name}
                      </div>
                      {a.role && (
                        <div className="text-[12px] text-fg-subtle font-mono mt-0.5">
                          {a.role}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-fg-muted">
                    {a.client && (
                      <span className="inline-flex items-center gap-1">
                        <UserIcon size={11} className="opacity-60" />
                        {a.client}
                      </span>
                    )}
                    {a.phase && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={11} className="opacity-60" />
                        {a.phase}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge tone="success">● Aktivt</Badge>;
  if (status === "paused") return <Badge tone="warning">⏸ Pausat</Badge>;
  if (status === "completed") return <Badge>Avslutat</Badge>;
  return <Badge>{status}</Badge>;
}
