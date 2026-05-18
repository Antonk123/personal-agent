"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
      <main className="min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-[380px]">
          <Logo size="md" className="mb-6" />
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-danger-soft text-danger mb-4">
              <AlertCircle size={20} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight mb-1">Inloggningen misslyckades</h1>
            <p className="text-sm text-fg-muted mb-5">{error}</p>
            <Button
              variant="secondary"
              block
              onClick={() => router.push("/auth/login")}
            >
              Försök igen
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <Logo size="md" />
      <div className="flex items-center gap-2 text-fg-muted text-sm">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-fg-subtle border-r-transparent" />
        Verifierar inloggning…
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-fg-subtle border-r-transparent" />
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
