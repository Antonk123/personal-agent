"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ProfileEditPage() {
  const router = useRouter();
  const [form, setForm] = useState({ company_name: "", role: "", services: "", company_description: "" });
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
    <div className="p-4 max-w-lg mx-auto pb-20">
      <h1 className="text-xl font-bold mb-4">Redigera profil</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Företagsnamn</label>
          <input className="input-field" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Roll</label>
          <input className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tjänster (kommaseparerade)</label>
          <input className="input-field" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} placeholder="projektledning, byggledning" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Företagsbeskrivning</label>
          <textarea className="input-field resize-none" rows={3} value={form.company_description} onChange={(e) => setForm({ ...form, company_description: e.target.value })} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? "Sparar..." : "Spara"}</button>
      </form>
    </div>
  );
}
