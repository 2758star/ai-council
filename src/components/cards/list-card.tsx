import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ListCardProps = {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function ListCard({
  title,
  subtitle,
  meta,
  children,
  className,
}: ListCardProps) {
  return (
    <article className={cn("panel-soft aurora-surface min-w-0 rounded-[18px] p-5 flex min-h-0 flex-col transition-colors duration-150 hover:bg-card/75", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="break-words text-base font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle ? <p className="break-words text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
      </div>
      {children ? <div className="mt-4 min-h-0 flex-1">{children}</div> : null}
    </article>
  );
}
