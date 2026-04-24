import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";
export type AppRoute =
  | "dashboard"
  | "applications"
  | "tasks"
  | "mistakes"
  | "daily-log"
  | "library"
  | "question-bank"
  | "question-bank-list"
  | "question-bank-exam"
  | "question-bank-stats"
  | "briefing"
  | "ai"
  | "settings";

type UiStore = {
  route: AppRoute;
  theme: ThemeMode;
  rightRailOpen: boolean;
  quickCreateOpen: boolean;
  searchQuery: string;
  focusedTaskId: number | null;
  toasts: Array<{
    id: number;
    title: string;
    description?: string;
    tone: "info" | "success" | "error";
  }>;
  setRoute: (route: AppRoute) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleRightRail: () => void;
  setQuickCreateOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setFocusedTask: (taskId: number | null) => void;
  clearFocusedTask: () => void;
  pushToast: (toast: {
    title: string;
    description?: string;
    tone?: "info" | "success" | "error";
  }) => number;
  dismissToast: (id: number) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  route: "dashboard",
  theme: "system",
  rightRailOpen: true,
  quickCreateOpen: false,
  searchQuery: "",
  focusedTaskId: null,
  toasts: [],
  setRoute: (route) => set({ route }),
  toggleTheme: () =>
    set((state) => ({
      theme:
        state.theme === "light"
          ? "dark"
          : state.theme === "dark"
            ? "system"
            : "light",
    })),
  setTheme: (theme) => set({ theme }),
  toggleRightRail: () =>
    set((state) => ({ rightRailOpen: !state.rightRailOpen })),
  setQuickCreateOpen: (quickCreateOpen) => set({ quickCreateOpen }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFocusedTask: (focusedTaskId) => set({ focusedTaskId }),
  clearFocusedTask: () => set({ focusedTaskId: null }),
  pushToast: ({ title, description, tone = "info" }) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    set((state) => ({
      toasts: [...state.toasts, { id, title, description, tone }],
    }));
    return id;
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));
