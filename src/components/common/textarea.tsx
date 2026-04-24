import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-[22px] border border-white/14 bg-white/8 px-4 py-3 text-sm text-foreground outline-none backdrop-blur-xl transition placeholder:text-muted-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/25 hover:border-white/24",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
