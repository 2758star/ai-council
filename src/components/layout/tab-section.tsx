import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type TabSectionProps = {
  children: ReactNode;
  className?: string;
};

export function TabSection({ children, className }: TabSectionProps) {
  return (
    <div className={cn("panel-card p-2", className)}>
      {children}
    </div>
  );
}
