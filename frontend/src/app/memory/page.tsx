"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function MemoryPage() {
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, a] = await Promise.all([api.getProfile(), api.getAssignments()]);
        setProfile(p);
        setAssignments(a);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><p className="text-surface-800/50 text-sm">Laddar...</p></div>;
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-20">
      <h1 className="text-xl font-bold">Mitt minne</h1>
      <p className="text-sm text-surface-800/60">Det här är vad jag vet om dig. Du kan korrigera allt som inte stämmer.</p>

      {profile && profile.company_name && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Profil</h3>
            <Link href="/memory/profile" className="text-xs text-primary-600">Redigera</Link>
          </div>
          <p className="text-sm"><span className="text-surface-800/50">Företag:</span> {profile.company_name}</p>
          {profile.role && <p className="text-sm"><span className="text-surface-800/50">Roll:</span> {profile.role}</p>}
          {profile.services?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.services.map((s: string) => (
                <span key={s} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Uppdrag</h2>
          <span className="text-xs text-surface-800/50">{assignments.length} st</span>
        </div>
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-sm">{a.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  a.status === "active" ? "bg-green-50 text-green-700" : "bg-surface-100 text-surface-800/60"
                }`}>{a.status}</span>
              </div>
              {a.role && <p className="text-xs text-surface-800/60">Roll: {a.role}</p>}
              {a.client && <p className="text-xs text-surface-800/60">Beställare: {a.client}</p>}
            </div>
          ))}
          {assignments.length === 0 && <p className="text-sm text-surface-800/50">Inga uppdrag registrerade ännu.</p>}
        </div>
      </div>
    </div>
  );
}
