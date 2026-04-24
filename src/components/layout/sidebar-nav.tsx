import type { AppRoute } from "@/stores/ui-store";
import { routeItems } from "@/app/router/routes";
import { Plus } from "lucide-react";
import { Button } from "@/components/common/button";
import { cn } from "@/lib/utils/cn";

type SidebarNavProps = {
  route: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onQuickAdd: () => void;
};

export function SidebarNav({ route, onNavigate, onQuickAdd }: SidebarNavProps) {
  return (
    <aside className="flex h-full w-[var(--shell-sidebar-width)] shrink-0 flex-col bg-[var(--bg-sidebar)] px-4 py-5">
      <div className="mb-8 px-2">
        <p className="font-display text-[1.35rem] font-extrabold tracking-[-0.04em] text-[var(--accent-primary)]">
          Personal Secretary
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Desktop Workspace</p>
      </div>
      <nav className="flex-1 space-y-1.5">
        {routeItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={cn("sidebar-nav-link w-full", route === item.key && "active")}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 pt-4">
        <Button className="w-full" onClick={onQuickAdd}>
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
        <div className="rounded-[18px] border border-[var(--border-default)] bg-white/44 p-3 dark:bg-white/5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Mode</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Stable desktop flow</p>
        </div>
      </div>
    </aside>
  );
}
