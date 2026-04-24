import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PanelCardProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "soft" | "muted";
  clipContent?: boolean;
};

export function PanelCard({
  children,
  className,
  tone = "default",
  clipContent = false,
}: PanelCardProps) {
  const toneClass =
    tone === "soft" ? "panel-card-soft" : tone === "muted" ? "panel-card-muted" : "panel-card";
  return (
    <section className={cn(toneClass, "min-h-0", clipContent ? "overflow-hidden" : "overflow-visible", className)}>
      {children}
    </section>
  );
}
