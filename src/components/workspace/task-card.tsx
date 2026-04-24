import { Clock3 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StatusTag } from "@/components/workspace/status-tag";

type TaskCardProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  tone?: "primary" | "teal" | "danger" | "neutral";
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

const accentByTone = {
  primary: "before:bg-[var(--accent-primary)]",
  teal: "before:bg-[var(--secondary)]",
  danger: "before:bg-[var(--danger)]",
  neutral: "before:bg-[var(--text-muted)]",
} as const;

export function TaskCard({
  title,
  subtitle,
  meta,
  tone = "primary",
  active = false,
  onClick,
  className,
}: TaskCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-col rounded-[18px] border px-4 py-3 text-left transition-all before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-full",
        accentByTone[tone],
        active ? "active-surface shadow-sm" : "bg-white/84 hover:bg-white dark:bg-[rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div className="ml-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-5 text-[var(--text-primary)]">{title}</p>
          {subtitle ? <p className="mt-1 text-xs leading-4 text-[var(--text-secondary)]">{subtitle}</p> : null}
        </div>
        {meta ? <StatusTag tone={tone === "danger" ? "danger" : tone === "teal" ? "teal" : "primary"}>{meta}</StatusTag> : null}
      </div>
      <div className="ml-2 mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{subtitle ? "Ready to act" : "Awaiting detail"}</span>
      </div>
    </button>
  );
}
