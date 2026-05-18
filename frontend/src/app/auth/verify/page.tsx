"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Ingen token hittades.");
      return;
    }

    api
      .verifyToken(token)
      .then(async (data) => {
        setSession(data.session_token);
        try {
          const profile: any = await api.getProfile();
          if (!profile || !profile.onboarding_completed) {
            router.push("/onboarding");
            return;
          }
        } catch {}
        router.push("/chat");
      })
      .catch(() => {
        setError("Länken är ogiltig eller har gått ut.");
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-5 bg-bg">
        <div className="w-full max-w-[400px] animate-slide-up">
          <Logo size="md" className="mb-7" />

          <div className="rounded-lg border border-border bg-surface p-7">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-danger-soft text-danger mb-5">
              <AlertCircle size={20} />
            </div>
            <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.01em] mb-2.5">
              Den här länken <em className="italic text-danger">funkar inte.</em>
            </h1>
            <p className="text-[15px] text-fg-muted leading-relaxed mb-6">
              {error === "Ingen token hittades."
                ? "Det saknas en token i länken. Försök logga in igen."
                : "Länken kan ha gått ut eller redan använts. Magic links är giltiga i 15 minuter, en gång."}
            </p>
            <Button variant="secondary" block onClick={() => router.push("/auth/login")}>
              <ArrowLeft size={14} />
              Skicka en ny länk
            </Button>
          </div>

          <p className="mt-5 font-mono text-[11px] text-fg-subtle text-center">
            säkerhetsdetalj · varje länk fungerar bara en gång
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-5 bg-bg">
      <Logo size="md" />
      <div className="flex flex-col items-center gap-3 max-w-[320px] text-center">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-r-transparent" />
        <span className="font-serif text-[22px] leading-tight tracking-tight">
          Väcker din <em className="italic text-accent">Cortex…</em>
        </span>
        <span className="font-mono text-[11px] text-fg-subtle">verifierar länk · synkar minne · &lt; 2 s</span>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-bg">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-fg-subtle border-r-transparent" />
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
