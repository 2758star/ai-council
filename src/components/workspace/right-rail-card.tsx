import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type RightRailCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function RightRailCard({ title, subtitle, action, children, className }: RightRailCardProps) {
  return (
    <section className={cn("panel-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-[var(--text-primary)]">{title}</h4>
          {subtitle ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
