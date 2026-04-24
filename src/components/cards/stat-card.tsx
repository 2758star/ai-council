import { ArrowUpRight } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  accent?: "teal" | "orange" | "gold";
};

const accentClass = {
  teal: "metric-tile-cool",
  orange: "metric-tile-warm",
  gold: "metric-tile-lime",
};

export function StatCard({
  label,
  value,
  hint,
  accent = "teal",
}: StatCardProps) {
  return (
    <div className={`metric-tile min-w-[220px] overflow-hidden ${accentClass[accent]}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-4 font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        <div className="rounded-full border border-border/70 bg-white/90 p-2 text-foreground shadow-card dark:border-white/10 dark:bg-slate-900/90 dark:text-white">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
