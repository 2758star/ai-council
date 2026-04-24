import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type RiskLevel = "low" | "medium" | "high";

type RiskCardProps = {
  title: string;
  detail: string;
  level: RiskLevel;
  className?: string;
};

const riskStyles: Record<RiskLevel, string> = {
  low: "border-emerald-200 bg-emerald-50/95 dark:border-emerald-500/30 dark:bg-emerald-500/10",
  medium: "border-amber-200 bg-amber-50/95 dark:border-amber-500/30 dark:bg-amber-500/10",
  high: "border-red-200 bg-red-50/95 dark:border-red-500/30 dark:bg-red-500/10",
};

const textStyles: Record<RiskLevel, string> = {
  low: "text-emerald-700 dark:text-emerald-300",
  medium: "text-amber-700 dark:text-amber-300",
  high: "text-red-700 dark:text-red-300",
};

export function RiskCard({ title, detail, level, className }: RiskCardProps) {
  return (
    <div className={cn("rounded-[16px] border px-3 py-2", riskStyles[level], className)}>
      <p className={cn("inline-flex items-center gap-1 text-xs font-semibold", textStyles[level])}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {title}
      </p>
      <p className={cn("mt-1 text-xs", textStyles[level])}>{detail}</p>
    </div>
  );
}
