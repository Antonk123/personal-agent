"use client";

import { useState } from "react";
import { ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.requestMagicLink(email);
      setSent(true);
    } catch {
      setError("Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-[380px] animate-slide-up">
          <Logo size="md" className="mb-6" />
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent-soft text-accent-soft-fg mb-4">
              <CheckCircle2 size={20} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight mb-1">Kolla din inkorg</h1>
            <p className="text-sm text-fg-muted leading-relaxed">
              Vi har skickat en länk till <span className="text-fg font-medium">{email}</span>.
              Öppna mejlet för att logga in.
            </p>
            <p className="mt-4 text-[12px] text-fg-subtle font-mono">
              Länken går ut efter 15 minuter
            </p>
          </div>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-[13px] text-fg-muted hover:text-fg transition-colors"
          >
            ← Använd en annan adress
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <Logo size="md" className="mb-8" />
        <h1 className="text-2xl font-semibold tracking-tight mb-1.5">Logga in</h1>
        <p className="text-sm text-fg-muted mb-8">
          Vi skickar en inloggningslänk till din mejl. Inga lösenord.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <Label htmlFor="email">E-post</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anton@kaarle.se"
            autoComplete="email"
            inputMode="email"
            required
            invalid={!!error}
          />
          {error && (
            <p className="mt-2 text-[13px] text-danger" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            block
            size="lg"
            loading={loading}
            rightIcon={!loading && <ArrowRight size={16} />}
            className="mt-5"
          >
            {loading ? "Skickar länk…" : "Skicka inloggningslänk"}
          </Button>
        </form>
        <p className="mt-8 text-center text-[12px] text-fg-subtle">
          <Mail size={11} className="inline mr-1 -mt-px" />
          Lösenordsfri inloggning · skyddat av magic link
        </p>
      </div>
    </main>
  );
}
