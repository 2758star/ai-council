import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type SummaryPanelProps = {
  children: ReactNode;
  className?: string;
};

export function SummaryPanel({ children, className }: SummaryPanelProps) {
  return (
    <aside className={cn("flex min-h-0 flex-col gap-4", className)}>
      {children}
    </aside>
  );
}
