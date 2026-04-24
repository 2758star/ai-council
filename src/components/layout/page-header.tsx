import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  tools?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  tools,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("panel-card p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <p className="inline-flex items-center rounded-full bg-[var(--bg-panel-muted)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-primary)]">{eyebrow}</p>
          ) : null}
          <h1 className="break-words font-display text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h1>
          {description ? <p className="max-w-4xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {tools ? <div className="mt-3">{tools}</div> : null}
    </header>
  );
}
