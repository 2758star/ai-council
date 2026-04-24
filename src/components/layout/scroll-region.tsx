import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type ScrollRegionProps = {
  children: ReactNode;
  className?: string;
  behavior?: "auto" | "hidden";
};

export function ScrollRegion({ children, className, behavior = "auto" }: ScrollRegionProps) {
  return (
    <div
      className={cn(
        "min-h-0",
        behavior === "hidden" ? "overflow-hidden" : "overflow-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}
