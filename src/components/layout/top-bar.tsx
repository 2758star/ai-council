import { Bell, Laptop2, MoonStar, PanelRight, Plus, Settings2, SunMedium } from "lucide-react";
import { Button } from "@/components/common/button";
import { SearchInput } from "@/components/workspace/search-input";
import type { ThemeMode } from "@/stores/ui-store";

type TopBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onQuickAdd: () => void;
  theme: ThemeMode;
  onThemeToggle: () => void;
  onToggleRail: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
};

export function TopBar({
  searchQuery,
  onSearchChange,
  onQuickAdd,
  theme,
  onThemeToggle,
  onToggleRail,
  onOpenNotifications,
  onOpenSettings,
}: TopBarProps) {
  const themeIcon =
    theme === "light" ? (
      <SunMedium className="h-4 w-4" />
    ) : theme === "dark" ? (
      <MoonStar className="h-4 w-4" />
    ) : (
      <Laptop2 className="h-4 w-4" />
    );

  return (
    <header
      data-tauri-drag-region
      className="shell-panel flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-default)] px-6"
    >
      <div className="no-drag-region flex min-w-0 flex-1 items-center gap-4">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search tasks, projects..."
          className="w-full max-w-[360px]"
        />
      </div>
      <div className="no-drag-region flex items-center gap-2">
        <Button onClick={onQuickAdd} size="sm">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
        <Button variant="outline" size="icon" onClick={onThemeToggle}>
          {themeIcon}
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenNotifications}>
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onToggleRail}>
          <PanelRight className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
