import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DataStateType = "info" | "success" | "error" | "loading";

type DataStateCardProps = {
  type?: DataStateType;
  text: string;
  className?: string;
};

const stateStyles: Record<DataStateType, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
  loading:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
};

const StateIcon = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
  loading: Loader2,
} as const;

export function DataStateCard({ type = "info", text, className }: DataStateCardProps) {
  const Icon = StateIcon[type];
  return (
    <div className={cn("flex items-center gap-2 rounded-[16px] border px-3 py-2 text-sm", stateStyles[type], className)}>
      <Icon className={cn("h-4 w-4 shrink-0", type === "loading" ? "animate-spin" : "")} />
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}

