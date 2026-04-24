import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 rounded-[14px] px-4 text-center text-sm font-semibold leading-5 cursor-pointer select-none touch-manipulation transition-all duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[var(--accent-primary)] text-[var(--text-inverse)] shadow-sm hover:opacity-95",
        secondary:
          "border border-[var(--border-default)] bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-none hover:bg-white dark:hover:bg-white/10",
        ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-white/50 hover:text-[var(--text-primary)] dark:hover:bg-white/5",
        outline: "border border-[var(--border-default)] bg-[var(--bg-panel-soft)] text-[var(--text-primary)] shadow-none hover:bg-white/70 dark:hover:bg-white/10",
      },
      size: {
        default: "min-h-11 py-2.5",
        sm: "min-h-9 px-3 py-2 text-xs leading-4",
        lg: "min-h-12 px-5 py-3 text-base leading-6",
        icon: "h-10 w-10 rounded-[12px] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  ),
);

Button.displayName = "Button";
