"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
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

  return (
    <main className="min-h-dvh grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] bg-bg">
      {/* Form column */}
      <div className="relative flex flex-col">
        <header className="hidden lg:flex p-8">
          <Logo size="md" />
        </header>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:px-16 lg:py-10">
          {sent ? (
            <SentCard email={email} onBack={() => { setSent(false); setEmail(""); }} />
          ) : (
            <div className="w-full max-w-[400px]">
              <div className="lg:hidden mb-8"><Logo size="md" /></div>

              <div className="hidden lg:flex items-center gap-2 mb-10 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                logga in
              </div>

              <h1 className="font-serif text-[44px] leading-[0.98] tracking-[-0.02em] mb-3">
                Välkommen <em className="italic text-accent">tillbaka.</em>
              </h1>
              <p className="text-[15px] text-fg-muted leading-relaxed mb-9 max-w-[36ch]">
                Skriv din e-post så skickar vi en inloggningslänk.
                Din Cortex känner igen dig — inga lösenord, inga sessioner att hålla reda på.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  placeholder="anton@kaarle.se"
                  autoComplete="email"
                  inputMode="email"
                  required
                  invalid={!!error}
                  className="h-11 text-[15px]"
                />
                {error && (
                  <p className="mt-2 text-[13px] text-danger" role="alert">{error}</p>
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

              <div className="mt-7 flex items-center gap-2.5 font-mono text-[11px] text-fg-subtle">
                <ShieldCheck size={11} />
                <span>Lösenordsfri · länk giltig i 15 min · signerad av Cortex</span>
              </div>

              {/* Mobile-only presence strip */}
              <div className="lg:hidden mt-10 pt-8 border-t border-border">
                <p className="font-serif text-[22px] leading-tight tracking-tight text-fg-muted mb-3">
                  Den minns <em className="italic text-fg">var ni slutade.</em>
                </p>
                <PresenceDot label="din cortex · vaken" />
              </div>
            </div>
          )}
        </div>

        <footer className="hidden lg:flex p-8 justify-between font-mono text-[11px] text-fg-subtle">
          <span>© Cortex {new Date().getFullYear()}</span>
          <span className="inline-flex gap-5">
            <a className="hover:text-fg transition-colors" href="/privacy">integritet</a>
            <a className="hover:text-fg transition-colors" href="/security">säkerhet</a>
            <a className="hover:text-fg transition-colors" href="/help">hjälp</a>
          </span>
        </footer>
      </div>

      {/* Atmosphere column (lg+) */}
      <PresencePane />
    </main>
  );
}

function SentCard({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="w-full max-w-[400px] animate-slide-up">
      <div className="lg:hidden mb-8"><Logo size="md" /></div>

      <div className="rounded-lg border border-border bg-surface p-7">
        <div className="relative inline-flex items-center justify-center h-11 w-11 rounded-full bg-accent-soft text-accent-soft-fg mb-5">
          <CheckCircle2 size={20} />
          <span className="absolute inset-0 rounded-full border border-accent/30 animate-pulse-soft" />
        </div>
        <h1 className="font-serif text-[34px] leading-[1.05] tracking-[-0.01em] mb-2.5">
          En länk är på <em className="italic text-accent">väg till dig.</em>
        </h1>
        <p className="text-[15px] text-fg-muted leading-relaxed">
          Vi skickade en inloggningslänk till{" "}
          <span className="text-fg font-medium">{email}</span>.
          Öppna mejlet på den här enheten för att slutföra inloggningen.
        </p>

        <div className="mt-6 pt-5 border-t border-border flex items-center justify-between font-mono text-[11px] text-fg-subtle">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={11} />
            endast giltig på den här enheten
          </span>
          <span>15 min</span>
        </div>
      </div>

      <button
        onClick={onBack}
        className="mt-5 inline-flex items-center gap-2 text-[13px] text-fg-muted hover:text-fg transition-colors"
      >
        <ArrowLeft size={13} />
        Använd en annan adress
      </button>
    </div>
  );
}

function PresenceDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[11px] text-fg-subtle">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-success animate-pulse-soft" />
      </span>
      {label}
    </span>
  );
}

function PresencePane() {
  return (
    <aside
      className="relative h-full overflow-hidden hidden lg:flex flex-col"
      style={{
        backgroundColor: "var(--color-surface-2)",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--color-border-strong) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(80% 80% at 50% 40%, transparent, var(--color-bg) 105%)" }}
      />

      {/* Constellation — pure SVG, themes naturally with currentColor */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          width="420"
          height="420"
          className="text-fg-subtle/60 opacity-90"
          aria-hidden
        >
          {[
            [200, 200, 4, "accent"],
            [120, 140, 2.2, ""], [280, 130, 2.6, ""],
            [90, 230, 1.8, ""],  [310, 250, 2.4, ""],
            [200, 80,  1.6, ""], [200, 320, 2, ""],
            [160, 260, 1.6, ""], [240, 170, 2.2, ""],
            [70, 170,  1.4, ""], [330, 200, 1.8, ""],
            [260, 290, 1.8, ""], [140, 100, 1.4, ""],
          ].map(([x, y, r, kind], i) => {
            const cx = x as number, cy = y as number;
            return (
              <g key={i}>
                <line x1={200} y1={200} x2={cx} y2={cy} stroke="currentColor" strokeOpacity="0.18" strokeWidth="0.6" />
                <circle
                  cx={cx} cy={cy} r={r as number}
                  fill={kind === "accent" ? "var(--color-accent)" : "currentColor"}
                  style={{
                    animation: `pulse-soft ${2 + (i % 5) * 0.4}s ease-in-out ${i * 0.18}s infinite`,
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="relative z-10 flex items-center justify-between p-8">
        <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-fg-subtle">
          cortex · sto-1
        </span>
        <PresenceDot label="systemet vaket" />
      </div>

      <div className="relative z-10 mt-auto p-8 flex flex-col gap-6">
        <p className="font-serif text-[28px] leading-[1.15] tracking-[-0.01em] text-fg max-w-[28ch]">
          Den minns <em className="italic text-accent">var ni slutade.</em>
        </p>

        <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-surface/80 backdrop-blur-sm px-4 py-3 max-w-fit">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-accent to-accent-hover inline-flex items-center justify-center text-white">
            <Mail size={16} strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-fg">Din Cortex väntar</span>
            <span className="font-mono text-[11px] text-fg-subtle">senast aktiv för 14 min sedan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
