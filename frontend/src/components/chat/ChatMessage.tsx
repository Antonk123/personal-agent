"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  userInitials?: string;
}

export function ChatMessage({ role, content, timestamp, userInitials = "AK" }: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div
      className={cn(
        "group flex gap-2.5 max-w-[92%] animate-fade-in",
        isUser && "ml-auto flex-row-reverse",
      )}
    >
      <Avatar
        size="sm"
        variant={isUser ? "user" : "ai"}
        initials={isUser ? userInitials : "A"}
        className="mt-0.5"
      />
      <div className={cn("min-w-0", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-[12px] px-3.5 py-2.5 text-[14px] leading-relaxed",
            isUser
              ? "bg-accent text-white"
              : "bg-surface border border-border text-fg",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <Markdown content={content} />
          )}
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[11px] text-fg-subtle font-mono",
            isUser && "flex-row-reverse",
          )}
        >
          {timestamp && <span className="tabular-nums">{timestamp}</span>}
          {!isUser && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex">
              <IconButton size="sm" aria-label="Kopiera" onClick={copy}>
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
              </IconButton>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:font-semibold prose-strong:font-semibold prose-strong:text-fg prose-code:bg-surface-2 prose-code:rounded-[4px] prose-code:px-1 prose-code:py-px prose-code:text-[.9em] prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-mono prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-a:text-accent prose-a:no-underline hover:prose-a:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
