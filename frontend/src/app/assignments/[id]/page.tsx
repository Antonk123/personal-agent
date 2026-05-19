"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Phone, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconButton } from "@/components/ui/IconButton";

interface Contact {
  id: string;
  name: string;
  role?: string;
  company?: string;
  phone?: string;
  email?: string;
}

interface Decision {
  id: string;
  title: string;
  description?: string;
  decided_at?: string;
}

interface Assignment {
  id: string;
  name: string;
  role?: string;
  client?: string;
  phase?: string;
  status: string;
  description?: string;
  contacts?: Contact[];
  decisions?: Decision[];
}

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);

  async function refresh() {
    if (!id) return;
    const result: any = await api.getAssignment(id);
    setData(result);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <AppShell title="Uppdrag" action={<BackButton />}>
        <div className="mx-auto max-w-[640px] px-4 py-5 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24" />
          <Skeleton className="h-32" />
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="Hittades inte" action={<BackButton />}>
        <p className="text-center text-fg-muted text-sm py-12">
          Uppdraget kunde inte hittas.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={data.name} action={<BackButton />}>
      <div className="mx-auto max-w-[640px] px-4 py-5 space-y-5">
        <div>
          <StatusBadge status={data.status} className="mb-2.5" />
          <h1 className="text-[22px] font-semibold tracking-tight leading-tight">
            {data.name}
          </h1>
          {data.description && (
            <p className="mt-2 text-[14px] text-fg-muted leading-relaxed">
              {data.description}
            </p>
          )}
        </div>

        <Card padding="none">
          <DetailRow label="Roll" value={data.role} />
          <DetailRow label="Beställare" value={data.client} />
          <DetailRow label="Fas" value={data.phase} />
        </Card>

        <section>
          <SectionHeader
            title={`Kontakter · ${data.contacts?.length || 0}`}
            action={
              <Button variant="ghost" size="sm" leftIcon={<Plus size={13} />} onClick={() => setContactOpen((v) => !v)}>
                {contactOpen ? "Stäng" : "Ny"}
              </Button>
            }
          />
          {contactOpen && (
            <div className="mb-3">
              <NewContactForm assignmentId={data.id} onDone={() => { setContactOpen(false); refresh(); }} />
            </div>
          )}
          <div className="space-y-1.5">
            {(data.contacts || []).map((c) => (
              <Card key={c.id} padding="sm">
                <div className="flex items-center gap-3">
                  <Avatar initials={c.name.split(" ").map((p) => p[0]).join("")} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{c.name}</div>
                    <div className="text-[12px] text-fg-subtle truncate">
                      {[c.role, c.company].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      aria-label="Ring"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
                    >
                      <Phone size={14} />
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      aria-label="Mejla"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
                    >
                      <Mail size={14} />
                    </a>
                  )}
                </div>
              </Card>
            ))}
            {(!data.contacts || data.contacts.length === 0) && !contactOpen && (
              <p className="text-[13px] text-fg-subtle px-1">Inga kontakter ännu.</p>
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            title={`Beslut · ${data.decisions?.length || 0}`}
            action={
              <Button variant="ghost" size="sm" leftIcon={<Plus size={13} />} onClick={() => setDecisionOpen((v) => !v)}>
                {decisionOpen ? "Stäng" : "Nytt"}
              </Button>
            }
          />
          {decisionOpen && (
            <div className="mb-3">
              <NewDecisionForm assignmentId={data.id} onDone={() => { setDecisionOpen(false); refresh(); }} />
            </div>
          )}
          <div className="space-y-1.5">
            {(data.decisions || []).map((d) => (
              <Card key={d.id} padding="sm">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-[14px] font-medium">{d.title}</div>
                  {d.decided_at && (
                    <div className="text-[11px] text-fg-subtle font-mono tabular-nums shrink-0">
                      {d.decided_at.slice(0, 10)}
                    </div>
                  )}
                </div>
                {d.description && (
                  <p className="text-[13px] text-fg-muted leading-relaxed">{d.description}</p>
                )}
              </Card>
            ))}
            {(!data.decisions || data.decisions.length === 0) && !decisionOpen && (
              <p className="text-[13px] text-fg-subtle px-1">Inga beslut loggade ännu.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );

  function BackButton() {
    return (
      <IconButton aria-label="Tillbaka" onClick={() => router.back()}>
        <ArrowLeft size={18} />
      </IconButton>
    );
  }
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border last:border-b-0">
      <span className="text-[11px] uppercase tracking-[0.08em] text-fg-subtle font-mono">
        {label}
      </span>
      <span className="text-[14px] text-fg text-right truncate">{value || "—"}</span>
    </div>
  );
}

function NewContactForm({ assignmentId, onDone }: { assignmentId: string; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", role: "", company: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.addContact(assignmentId, {
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        company: form.company.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-2.5">
        <Input placeholder="Namn *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus required />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Roll" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <Input placeholder="Företag" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input type="tel" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="email" placeholder="E-post" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <Button type="submit" size="sm" loading={saving} disabled={!form.name.trim()}>
          Lägg till
        </Button>
      </form>
    </Card>
  );
}

function NewDecisionForm({ assignmentId, onDone }: { assignmentId: string; onDone: () => void }) {
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.addDecision(assignmentId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-2.5">
        <Input placeholder="Vad beslöts? *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus required />
        <textarea
          placeholder="Bakgrund och motivering (frivilligt)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-md border border-border bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20 resize-none"
        />
        <Button type="submit" size="sm" loading={saving} disabled={!form.title.trim()}>
          Spara beslut
        </Button>
      </form>
    </Card>
  );
}
