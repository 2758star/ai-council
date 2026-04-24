import { cn } from "@/lib/utils/cn";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedModeSwitchProps<T extends string> = {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedModeSwitch<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedModeSwitchProps<T>) {
  return (
    <div className={cn("inline-flex rounded-[14px] bg-[var(--bg-panel-muted)] p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[12px] px-4 py-2 text-sm font-semibold transition-all",
              active
                ? "bg-white text-[var(--accent-primary)] shadow-sm dark:bg-[rgba(255,255,255,0.08)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
