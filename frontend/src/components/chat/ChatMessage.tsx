"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RefreshCw } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isLastAssistant = false,
  onRegenerate,
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

function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body text-[14.5px] text-fg leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
