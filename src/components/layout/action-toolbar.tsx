import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ActionToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function ActionToolbar({ children, className }: ActionToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 overflow-hidden rounded-[16px] border border-border/70 bg-muted/35 px-3 py-2", className)}>
      {children}
    </div>
  );
}
