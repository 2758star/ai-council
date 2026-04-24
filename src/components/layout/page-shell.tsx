import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/stores/ui-store";

type PageShellProps = {
  header: ReactNode;
  tabs?: ReactNode;
  toolbar?: ReactNode;
  content: ReactNode;
  summary?: ReactNode;
  className?: string;
};

export function PageShell({
  header,
  tabs,
  toolbar,
  content,
  summary,
  className,
}: PageShellProps) {
  const rightRailOpen = useUiStore((state) => state.rightRailOpen);
  const shouldShowSummary = Boolean(summary) && rightRailOpen;

  return (
    <div className={cn("flex h-full min-h-0 flex-col gap-4", className)}>
      {header}
      {tabs}
      {toolbar}
      <div className={cn("grid min-h-0 flex-1 gap-4", shouldShowSummary ? "workspace-grid" : "grid-cols-1")}>
        <div className="min-h-0">{content}</div>
        {shouldShowSummary ? <div className="min-h-0">{summary}</div> : null}
      </div>
    </div>
  );
}
