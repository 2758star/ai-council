import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils/cn";

type SideEditorProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function SideEditor({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  className,
}: SideEditorProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/12 backdrop-blur-[1px]">
      <div className="absolute inset-y-4 right-4 w-[min(480px,calc(100vw-2rem))]">
        <section className={cn("panel-card flex h-full min-h-0 flex-col p-5", className)}>
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h3>
              {description ? <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p> : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="mt-5 min-h-0 flex-1">{children}</div>
          {footer ? <div className="mt-4">{footer}</div> : null}
        </section>
      </div>
    </div>
  );
}
