"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RefreshCw, Briefcase, User as UserIcon, FileText } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { MessageRef } from "@/stores/chat-store";
import { cn } from "@/lib/cn";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  refs?: MessageRef[];
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isLastAssistant = false,
  onRegenerate,
  refs,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  if (isUser) {
    return (
      <div className="group flex justify-end animate-fade-in">
        <div className="max-w-[78%]">
          <div className="rounded-[18px] bg-surface-2 text-fg px-3.5 py-2.5 text-[14.5px] leading-relaxed">
            <p className="whitespace-pre-wrap">{content}</p>
          </div>
          {timestamp && (
            <div className="mt-1 pr-1 text-right text-[11px] text-fg-subtle font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group animate-fade-in">
      <Markdown content={content} />
      {refs && refs.length > 0 && <RefList refs={refs} />}
      <div
        className={cn(
          "mt-2 flex items-center gap-1 text-[11px] text-fg-subtle font-mono",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        )}
      >
        <IconButton size="sm" aria-label="Kopiera" onClick={copy}>
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
        </IconButton>
        {isLastAssistant && onRegenerate && (
          <IconButton size="sm" aria-label="Generera om svaret" onClick={onRegenerate}>
            <RefreshCw size={13} />
          </IconButton>
        )}
        {timestamp && <span className="ml-1 tabular-nums">{timestamp}</span>}
      </div>
    </div>
  );
}

function RefList({ refs }: { refs: MessageRef[] }) {
  // Cap to 8 visible to avoid clutter
  const visible = refs.slice(0, 8);
  const extra = refs.length - visible.length;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1">
      {visible.map((r) => (
        <RefPill key={`${r.type}:${r.id}`} ref_={r} />
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center px-2 h-6 rounded-full bg-surface-2 text-[11px] text-fg-subtle font-mono">
          +{extra}
        </span>
      )}
    </div>
  );
}

function RefPill({ ref_ }: { ref_: MessageRef }) {
  const { icon, href, tone } = refMeta(ref_);
  const body = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11.5px] max-w-[220px]",
        tone,
        href && "hover:bg-surface-3 transition-colors",
      )}
      title={ref_.label}
    >
      {icon}
      <span className="truncate">{ref_.label}</span>
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="contents">
        {body}
      </Link>
    );
  }
  return body;
}

function refMeta(r: MessageRef): { icon: React.ReactNode; href: string | null; tone: string } {
  const base = "bg-surface-2 text-fg-muted border border-border";
  switch (r.type) {
    case "assignment":
      return {
        icon: <Briefcase size={11} className="text-fg-subtle shrink-0" />,
        href: `/assignments/${r.id}`,
        tone: base,
      };
    case "contact":
      return {
        icon: <UserIcon size={11} className="text-fg-subtle shrink-0" />,
        href: null,
        tone: base,
      };
    case "decision":
    case "memory":
    default:
      return {
        icon: <FileText size={11} className="text-fg-subtle shrink-0" />,
        href: null,
        tone: base,
      };
  }
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body text-[14.5px] text-fg leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
