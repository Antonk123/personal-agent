"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";

export default function NewAssignmentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    role: "",
    client: "",
    phase: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const result: any = await api.createAssignment({
        name: form.name.trim(),
        role: form.role.trim() || undefined,
        client: form.client.trim() || undefined,
        phase: form.phase.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      router.push(`/assignments/${result.id}`);
    } catch (e: any) {
      setError(e?.message || "Kunde inte skapa uppdraget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Nytt uppdrag"
      action={
        <IconButton aria-label="Tillbaka" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </IconButton>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-[520px] px-4 py-5 space-y-4">
        <div>
          <Label htmlFor="name">Namn *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Stenhagen etapp 3"
            autoFocus
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="role">Din roll</Label>
            <Input
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="Projektledare"
            />
          </div>
          <div>
            <Label htmlFor="phase">Fas</Label>
            <Input
              id="phase"
              value={form.phase}
              onChange={(e) => setForm({ ...form, phase: e.target.value })}
              placeholder="Produktion"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="client">Beställare</Label>
          <Input
            id="client"
            value={form.client}
            onChange={(e) => setForm({ ...form, client: e.target.value })}
            placeholder="Veidekke Sverige AB"
          />
        </div>
        <div>
          <Label htmlFor="desc">Beskrivning</Label>
          <textarea
            id="desc"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Vad omfattar uppdraget?"
            className="w-full px-3.5 py-2.5 rounded-md border border-border bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20 resize-none"
          />
        </div>
        {error && (
          <p className="text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="pt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Avbryt
          </Button>
          <Button type="submit" loading={saving} block disabled={!form.name.trim()}>
            Skapa uppdrag
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
