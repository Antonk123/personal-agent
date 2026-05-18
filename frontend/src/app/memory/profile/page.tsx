"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";

interface Form {
  company_name: string;
  role: string;
  services: string;
  company_description: string;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    company_name: "",
    role: "",
    services: "",
    company_description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getProfile().then((p: any) => {
      if (p) {
        setForm({
          company_name: p.company_name || "",
          role: p.role || "",
          services: (p.services || []).join(", "),
          company_description: p.company_description || "",
        });
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        company_name: form.company_name,
        role: form.role,
        services: form.services.split(",").map((s) => s.trim()).filter(Boolean),
        company_description: form.company_description,
      });
      router.push("/memory");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Redigera profil"
      action={
        <IconButton aria-label="Tillbaka" onClick={() => router.back()}>
          <ArrowLeft size={18} />
        </IconButton>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-[520px] px-4 py-5 space-y-4">
        <div>
          <Label htmlFor="company">Företagsnamn</Label>
          <Input
            id="company"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="Anton AB"
          />
        </div>
        <div>
          <Label htmlFor="role">Roll</Label>
          <Input
            id="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Projektledare"
          />
        </div>
        <div>
          <Label htmlFor="services">Tjänster</Label>
          <Input
            id="services"
            value={form.services}
            onChange={(e) => setForm({ ...form, services: e.target.value })}
            placeholder="projektledning, byggledning"
          />
          <p className="mt-1 text-[12px] text-fg-subtle">Separera med komma</p>
        </div>
        <div>
          <Label htmlFor="desc">Företagsbeskrivning</Label>
          <textarea
            id="desc"
            value={form.company_description}
            onChange={(e) => setForm({ ...form, company_description: e.target.value })}
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-md border border-border bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20 resize-none"
            placeholder="Vad gör företaget?"
          />
        </div>
        <div className="pt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Avbryt
          </Button>
          <Button type="submit" loading={saving} block>
            Spara
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
