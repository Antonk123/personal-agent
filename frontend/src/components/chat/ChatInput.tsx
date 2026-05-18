"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = "Skriv ett meddelande…" }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || disabled) return;
    onSend(value);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-surface px-3 py-3 md:px-6"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 12px)" }}
    >
      <div
        className={cn(
          "mx-auto max-w-[760px] flex items-end gap-1.5 rounded-[12px] border bg-surface-2 p-1.5",
          "transition-colors duration-150",
          "focus-within:border-accent focus-within:bg-surface",
          "border-border",
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          aria-label="Meddelande"
          className={cn(
            "flex-1 resize-none bg-transparent border-0 outline-none",
            "px-2.5 py-2 text-[14px] leading-relaxed text-fg placeholder:text-fg-subtle",
            "max-h-[140px] min-h-[24px]",
          )}
        />
        <div className="flex items-center gap-1 pb-0.5">
          <button
            type="button"
            aria-label="Bifoga"
            disabled
            className="hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md text-fg-subtle hover:text-fg hover:bg-surface-3 disabled:opacity-40"
          >
            <Paperclip size={16} />
          </button>
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Skicka"
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150",
              canSend
                ? "bg-accent text-white hover:bg-accent-hover"
                : "bg-surface-3 text-fg-subtle cursor-not-allowed",
            )}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </form>
  );
}
