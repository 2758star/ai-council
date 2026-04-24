import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ContentPanelProps = {
  children: ReactNode;
  className?: string;
};

export function ContentPanel({ children, className }: ContentPanelProps) {
  return (
    <section className={cn("panel-card flex min-h-0 flex-col p-5", className)}>
      {children}
    </section>
  );
}
