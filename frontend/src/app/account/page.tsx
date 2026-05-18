"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Moon, Sun, Download, ChevronRight, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface Profile {
  company_name?: string;
  role?: string;
  email?: string;
  name?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api
      .getProfile()
      .then((p) => setProfile(p as Profile))
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearSession();
    router.push("/auth/login");
  }

  async function exportData() {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `byggagent-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const name = profile?.name || profile?.company_name || "Användare";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <AppShell title="Konto">
      <div className="mx-auto max-w-[520px] px-4 py-5 space-y-5">
        {loading ? (
          <Skeleton className="h-[88px]" />
        ) : (
          <Card>
            <div className="flex items-center gap-3">
              <Avatar initials={initials} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold tracking-tight">{name}</div>
                {profile?.email && (
                  <div className="text-[12px] text-fg-subtle font-mono truncate">
                    {profile.email}
                  </div>
                )}
                {profile?.role && (
                  <div className="text-[12px] text-fg-muted mt-0.5">{profile.role}</div>
                )}
              </div>
              <Link
                href="/memory/profile"
                aria-label="Redigera profil"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
              >
                <Pencil size={15} />
              </Link>
            </div>
          </Card>
        )}

        <Section title="Utseende">
          <Card padding="none">
            <SettingRow
              label="Mörkt läge"
              desc={mounted && theme === "dark" ? "Aktivt" : "Aktivera mörkt tema"}
            >
              <button
                type="button"
                role="switch"
                aria-checked={mounted ? theme === "dark" : false}
                aria-label="Mörkt läge"
                onClick={toggle}
                className={`relative h-6 w-10 rounded-full transition-colors duration-150 ${
                  mounted && theme === "dark" ? "bg-accent" : "bg-surface-3"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-150 ${
                    mounted && theme === "dark" ? "translate-x-4" : ""
                  }`}
                >
                  {mounted && theme === "dark" ? (
                    <Moon size={11} className="text-accent" />
                  ) : (
                    <Sun size={11} className="text-fg-subtle" />
                  )}
                </span>
              </button>
            </SettingRow>
          </Card>
        </Section>

        <Section title="Data">
          <Card padding="none">
            <button
              onClick={exportData}
              disabled={exporting}
              className="w-full"
            >
              <SettingRow
                label={exporting ? "Exporterar…" : "Exportera all data"}
                desc="JSON-arkiv enligt GDPR"
              >
                <Download size={15} className="text-fg-subtle" />
              </SettingRow>
            </button>
          </Card>
        </Section>

        <Button
          variant="danger"
          block
          leftIcon={<LogOut size={15} />}
          onClick={logout}
        >
          Logga ut
        </Button>

        <p className="text-center text-[11px] text-fg-subtle font-mono">
          Byggagent · v0.1.0
        </p>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 mb-2 text-[10px] uppercase tracking-[0.08em] text-fg-subtle font-mono font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border last:border-b-0">
      <div className="text-left min-w-0">
        <div className="text-[14px] font-medium text-fg">{label}</div>
        {desc && <div className="text-[12px] text-fg-subtle mt-0.5 truncate">{desc}</div>}
      </div>
      {children || <ChevronRight size={15} className="text-fg-subtle shrink-0" />}
    </div>
  );
}
