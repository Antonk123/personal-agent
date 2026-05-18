import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full h-10 px-3.5 rounded-md border bg-surface text-fg text-sm",
        "placeholder:text-fg-subtle",
        "transition-colors duration-150",
        "focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/20",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        invalid ? "border-danger" : "border-border",
        className,
      )}
      {...rest}
    />
  );
});

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Label({ htmlFor, children, className }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-[13px] font-medium text-fg mb-1.5", className)}
    >
      {children}
    </label>
  );
}
