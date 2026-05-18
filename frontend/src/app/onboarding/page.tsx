"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";

interface Form {
  company_name: string;
  role: string;
  services: string;
  company_description: string;
}

interface Step {
  field: keyof Form;
  question: string;
  hint?: string;
  placeholder: string;
  helper?: string;
  multiline?: boolean;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    field: "company_name",
    question: "Vad heter företaget?",
    hint: "Eller det namn du jobbar under om du är frilans.",
    placeholder: "Anton AB",
  },
  {
    field: "role",
    question: "Vad är din roll?",
    hint: "Det hjälper mig att förstå sammanhanget i dina uppdrag.",
    placeholder: "Projektledare",
    helper: "T.ex. Projektledare, Byggledare, Konsult",
  },
  {
    field: "services",
    question: "Vilka tjänster erbjuder du?",
    hint: "Lägg till nyckelområden — separera med komma.",
    placeholder: "projektledning, byggledning, kvalitetsstyrning",
  },
  {
    field: "company_description",
    question: "En mening om vad ni gör.",
    hint: "Frivilligt. Hjälper mig svara mer rakt på sak.",
    placeholder: "Vi gör projektledning åt byggherrar i Mellansverige.",
    multiline: true,
    optional: true,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    company_name: "",
    role: "",
    services: "",
    company_description: "",
  });
  const [saving, setSaving] = useState(false);
  const [showOutro, setShowOutro] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    api
      .getProfile()
      .then((p: any) => {
        if (p) {
          setForm({
            company_name: p.company_name || "",
            role: p.role || "",
            services: (p.services || []).join(", "),
            company_description: p.company_description || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step, showOutro]);

  const current = STEPS[step];
  const value = current ? form[current.field] : "";
  const canAdvance = current?.optional || value.trim().length > 0;

  async function save(complete: boolean) {
    setSaving(true);
    try {
      await api.updateProfile({
        company_name: form.company_name.trim() || undefined,
        role: form.role.trim() || undefined,
        services: form.services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        company_description: form.company_description.trim() || undefined,
        onboarding_completed: complete,
      } as any);
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      await save(true);
      setShowOutro(true);
    }
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  async function skip() {
    await save(true);
    router.push("/chat");
  }

  function done() {
    router.push("/chat");
  }

  return (
    <div className="flex flex-col h-dvh bg-bg">
      <header className="px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-2.5">
          <Logo size="sm" />
          {!showOutro && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-fg-subtle font-mono tabular-nums">
                Steg {step + 1}/{STEPS.length}
              </span>
              <button
                type="button"
                onClick={skip}
                className="inline-flex items-center gap-1 text-[12px] text-fg-muted hover:text-fg transition-colors"
              >
                Hoppa över
                <X size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                i <= step || showOutro ? "bg-accent" : "bg-surface-3"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-[560px]">
          {showOutro ? <Outro onDone={done} /> : (
            <StepView
              key={step}
              step={current}
              value={value}
              onChange={(v) => setForm({ ...form, [current.field]: v })}
              onEnter={canAdvance ? next : () => {}}
              inputRef={inputRef as any}
            />
          )}
        </div>
      </div>

      {!showOutro && (
        <footer className="border-t border-border bg-surface px-4 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 12px)" }}>
          <div className="mx-auto max-w-[560px] flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 0}
              leftIcon={<ArrowLeft size={15} />}
            >
              Tillbaka
            </Button>
            <Button
              type="button"
              onClick={next}
              disabled={!canAdvance}
              loading={saving}
              rightIcon={!saving && <ArrowRight size={15} />}
              className="flex-1"
            >
              {step === STEPS.length - 1 ? "Spara och fortsätt" : current?.optional ? "Vidare" : "Nästa"}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

function StepView({
  step,
  value,
  onChange,
  onEnter,
  inputRef,
}: {
  step: Step;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}) {
  return (
    <div className="animate-slide-up">
      <div className="flex items-start gap-3 mb-6">
        <Avatar variant="ai" size="md" initials="C" />
        <div className="pt-1">
          <h1 className="text-[20px] font-semibold tracking-tight leading-tight mb-1">
            {step.question}
          </h1>
          {step.hint && (
            <p className="text-[14px] text-fg-muted leading-relaxed">{step.hint}</p>
          )}
        </div>
      </div>

      <div className="pl-12">
        <Label htmlFor="field">Ditt svar</Label>
        {step.multiline ? (
          <textarea
            id="field"
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={step.placeholder}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onEnter();
              }
            }}
            className="w-full px-3.5 py-2.5 rounded-md border border-border bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20 resize-none"
          />
        ) : (
          <Input
            id="field"
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={step.placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }
            }}
          />
        )}
        {step.helper && (
          <p className="mt-1.5 text-[12px] text-fg-subtle">{step.helper}</p>
        )}
        {step.optional && (
          <p className="mt-1.5 text-[12px] text-fg-subtle">Du kan lämna detta tomt.</p>
        )}
      </div>
    </div>
  );
}

function Outro({ onDone }: { onDone: () => void }) {
  return (
    <div className="animate-slide-up text-center pt-8">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent-soft text-accent-soft-fg mb-5">
        <Check size={22} strokeWidth={2.5} />
      </div>
      <h1 className="text-[22px] font-semibold tracking-tight mb-2">Klart.</h1>
      <p className="text-[14px] text-fg-muted leading-relaxed max-w-[400px] mx-auto mb-6">
        Jag har sparat det du berättat. Du kan alltid ändra det senare under Konto → Redigera profil.
        Lägg till dina uppdrag direkt eller börja chatta så lär jag mig medan vi pratar.
      </p>
      <Button onClick={onDone} size="lg" rightIcon={<ArrowRight size={16} />}>
        Till Cortex
      </Button>
    </div>
  );
}
