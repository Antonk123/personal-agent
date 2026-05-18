import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  size?: "sm" | "md";
  children: ReactNode;
}

const SIZES = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md text-fg-muted",
        "hover:bg-surface-2 hover:text-fg transition-colors duration-150",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
