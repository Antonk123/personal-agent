import { cn } from "@/lib/cn";

interface AvatarProps {
  initials: string;
  variant?: "user" | "ai";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-base",
};

export function Avatar({ initials, variant = "user", size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold shrink-0",
        SIZES[size],
        variant === "ai"
          ? "bg-gradient-to-br from-accent to-accent-hover text-white"
          : "bg-surface-3 text-fg",
        className,
      )}
      aria-hidden
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
