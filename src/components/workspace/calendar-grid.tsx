import { cn } from "@/lib/utils/cn";

export type CalendarItemTone = "primary" | "teal" | "lavender";

export type CalendarItem = {
  id: string;
  label: string;
  tone?: CalendarItemTone;
};

export type CalendarDay = {
  key: string;
  dayNumber: number;
  muted?: boolean;
  selected?: boolean;
  items?: CalendarItem[];
  dots?: string[];
};

type CalendarGridProps = {
  days: CalendarDay[];
  onSelect?: (day: CalendarDay) => void;
  className?: string;
};

const itemToneClass: Record<CalendarItemTone, string> = {
  primary: "bg-[rgba(78,87,174,0.12)] text-[var(--accent-primary)]",
  teal: "bg-[rgba(49,103,104,0.14)] text-[var(--secondary)]",
  lavender: "bg-[rgba(149,158,252,0.12)] text-[#645b72]",
};

export function CalendarGrid({ days, onSelect, className }: CalendarGridProps) {
  return (
    <div className={cn("panel-card grid h-full grid-cols-7 overflow-hidden", className)}>
      {days.map((day) => (
        <button
          key={day.key}
          type="button"
          onClick={() => onSelect?.(day)}
          className={cn(
            "flex min-h-[110px] flex-col items-start border-r border-t px-3 py-2 text-left transition-colors first:border-t-0 [&:nth-child(-n+7)]:border-t-0 [&:nth-child(7n)]:border-r-0",
            day.selected ? "bg-[rgba(78,87,174,0.06)]" : "bg-transparent hover:bg-white/40 dark:hover:bg-white/5",
          )}
        >
          <span className={cn("text-xs font-semibold", day.muted ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]")}>
            {day.dayNumber}
          </span>
          <div className="mt-2 flex w-full flex-1 flex-col gap-1 overflow-hidden">
            {(day.items ?? []).slice(0, 2).map((item) => (
              <span
                key={item.id}
                className={cn(
                  "truncate rounded-[10px] px-2 py-1 text-[10px] font-semibold",
                  itemToneClass[item.tone ?? "primary"],
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
          {day.dots?.length ? (
            <div className="mt-auto flex gap-1">
              {day.dots.slice(0, 4).map((dot, index) => (
                <span key={`${day.key}-${index}`} className="status-dot" style={{ backgroundColor: dot }} />
              ))}
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
