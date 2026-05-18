import { Boxes } from "lucide-react";
import { cn } from "@/lib/cn";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  wordmark?: string;
  className?: string;
}

const MARK_SIZES = {
  sm: "h-6 w-6 rounded-[6px]",
  md: "h-7 w-7 rounded-[7px]",
  lg: "h-9 w-9 rounded-[9px]",
};

const ICON_SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
};

const TEXT_SIZES = {
  sm: "text-[15px]",
  md: "text-base",
  lg: "text-lg",
};

export function Logo({ size = "md", showWordmark = true, wordmark = "Byggagent", className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center text-white",
          "bg-gradient-to-br from-accent to-accent-hover",
          MARK_SIZES[size],
        )}
        aria-hidden
      >
        <Boxes size={ICON_SIZES[size]} strokeWidth={2.5} />
      </span>
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight text-fg", TEXT_SIZES[size])}>
          {wordmark}
        </span>
      )}
    </span>
  );
}
