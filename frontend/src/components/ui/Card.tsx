import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const PAD = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  interactive,
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[10px] bg-surface border border-border",
        PAD[padding],
        interactive &&
          "transition-colors duration-150 hover:border-border-strong cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
