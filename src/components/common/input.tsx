import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-full border border-white/14 bg-white/8 px-4 text-sm text-foreground outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/25 hover:border-white/24",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
