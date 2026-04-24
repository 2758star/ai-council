import { cn } from "@/lib/utils/cn";

type StatusTagProps = {
  children: string;
  tone?: "primary" | "neutral" | "success" | "warning" | "danger" | "teal";
  className?: string;
};

const toneClasses: Record<NonNullable<StatusTagProps["tone"]>, string> = {
  primary: "bg-[rgba(78,87,174,0.12)] text-[var(--accent-primary)]",
  neutral: "bg-[var(--bg-panel-muted)] text-[var(--text-secondary)]",
  success: "bg-[rgba(47,139,114,0.12)] text-[var(--success)]",
  warning: "bg-[rgba(181,119,42,0.12)] text-[var(--warning)]",
  danger: "bg-[rgba(177,69,96,0.12)] text-[var(--danger)]",
  teal: "bg-[rgba(49,103,104,0.12)] text-[var(--secondary)]",
};

export function StatusTag({ children, tone = "neutral", className }: StatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
