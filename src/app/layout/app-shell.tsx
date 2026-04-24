import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, type ComponentType, useEffect, useMemo, useState } from "react";
import { Flame, Plus } from "lucide-react";
import { routeItems } from "@/app/router/routes";
import { QuickCreateModal } from "@/components/modals/quick-create-modal";
import { ToastViewport } from "@/components/feedback/toast-viewport";
import { initializeDatabase } from "@/lib/db/client";
import {
  getAppSetting,
  getFeishuWebhookServerStatus,
  runAssistantBriefingTick,
  runScheduledNotificationTick,
  runWebWatchersScanTick,
  startFeishuWebhookServer,
} from "@/features/integrations/api";
import { useQuestionBankStore } from "@/stores/question-bank-store";
import { useUiStore, type AppRoute } from "@/stores/ui-store";
import { useWebMonitorStore } from "@/stores/web-monitor-store";

const DashboardPageLazy = lazy(async () => ({ default: (await import("@/pages/dashboard/page")).DashboardPage }));
const ApplicationsPageLazy = lazy(async () => ({ default: (await import("@/pages/applications/page")).ApplicationsPage }));
const TasksPageLazy = lazy(async () => ({ default: (await import("@/pages/tasks/page")).TasksPage }));
const MistakesPageLazy = lazy(async () => ({ default: (await import("@/pages/mistakes/page")).MistakesPage }));
const DailyLogPageLazy = lazy(async () => ({ default: (await import("@/pages/daily-log/page")).DailyLogPage }));
const LibraryPageLazy = lazy(async () => ({ default: (await import("@/pages/library/page")).LibraryPage }));
const QuestionBankPageLazy = lazy(async () => ({ default: (await import("@/pages/question-bank/index")).QuestionBankIndexPage }));
const QuestionBankListPageLazy = lazy(async () => ({ default: (await import("@/pages/question-bank/list")).QuestionBankListPage }));
const QuestionBankExamPageLazy = lazy(async () => ({ default: (await import("@/pages/question-bank/exam")).QuestionBankExamPage }));
const QuestionBankStatsPageLazy = lazy(async () => ({ default: (await import("@/pages/question-bank/stats")).QuestionBankStatsPage }));
const AISecretaryPageLazy = lazy(async () => ({ default: (await import("@/pages/ai-secretary/page")).AISecretaryPage }));
const SettingsPageLazy = lazy(async () => ({ default: (await import("@/pages/settings/page")).SettingsPage }));

const routeMap: Record<AppRoute, ComponentType> = {
  dashboard: DashboardPageLazy,
  tasks: TasksPageLazy,
  applications: ApplicationsPageLazy,
  mistakes: MistakesPageLazy,
  "daily-log": DailyLogPageLazy,
  library: LibraryPageLazy,
  "question-bank": QuestionBankPageLazy,
  "question-bank-list": QuestionBankListPageLazy,
  "question-bank-exam": QuestionBankExamPageLazy,
  "question-bank-stats": QuestionBankStatsPageLazy,
  briefing: AISecretaryPageLazy,
  ai: AISecretaryPageLazy,
  settings: SettingsPageLazy,
};

const routePrefetchers: Record<AppRoute, () => Promise<unknown>> = {
  dashboard: () => import("@/pages/dashboard/page"),
  tasks: () => import("@/pages/tasks/page"),
  applications: () => import("@/pages/applications/page"),
  mistakes: () => import("@/pages/mistakes/page"),
  "daily-log": () => import("@/pages/daily-log/page"),
  library: () => import("@/pages/library/page"),
  "question-bank": () => import("@/pages/question-bank/index"),
  "question-bank-list": () => import("@/pages/question-bank/list"),
  "question-bank-exam": () => import("@/pages/question-bank/exam"),
  "question-bank-stats": () => import("@/pages/question-bank/stats"),
  briefing: () => import("@/pages/ai-secretary/page"),
  ai: () => import("@/pages/ai-secretary/page"),
  settings: () => import("@/pages/settings/page"),
};

const routeTitle: Record<AppRoute, string> = {
  dashboard: "Dashboard",
  tasks: "Tasks",
  applications: "Applications",
  mistakes: "Mistakes",
  "daily-log": "DailyLog",
  library: "Library",
  "question-bank": "QuestionBank",
  "question-bank-list": "QuestionBank",
  "question-bank-exam": "Exam",
  "question-bank-stats": "QB Stats",
  briefing: "AI Secretary",
  ai: "AI Secretary",
  settings: "Settings",
};

function matchesTrue(value: string | null) {
  return value === "1" || value === "true" || value === "TRUE" || value === "True";
}

export function AppShell() {
  const route = useUiStore((state) => state.route);
  const setRoute = useUiStore((state) => state.setRoute);
  const setActiveBankId = useQuestionBankStore((state) => state.setActiveBankId);
  const setActiveBankName = useQuestionBankStore((state) => state.setActiveBankName);
  const setActivePassageId = useQuestionBankStore((state) => state.setActivePassageId);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const ActiveRouteComponent = routeMap[route];
  const [prefetchedRoutes, setPrefetchedRoutes] = useState<Set<AppRoute>>(() => new Set<AppRoute>());
  const [shellStatus, setShellStatus] = useState("Initializing local workspace...");
  const [streakDays, setStreakDays] = useState(7);

  const navItems = useMemo(() => routeItems, []);

  function prefetchRoute(target: AppRoute) {
    if (prefetchedRoutes.has(target)) return;
    routePrefetchers[target]()
      .then(() => {
        setPrefetchedRoutes((prev) => {
          if (prev.has(target)) return prev;
          const next = new Set(prev);
          next.add(target);
          return next;
        });
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    initializeDatabase()
      .then((payload) => setShellStatus(`Database ready · ${payload.databasePath}`))
      .catch(() => setShellStatus("Database pending Tauri runtime"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetRoute = params.get("route") as AppRoute | null;
    if (targetRoute && Object.prototype.hasOwnProperty.call(routeMap, targetRoute)) {
      setRoute(targetRoute);
    }
    const bankId = Number(params.get("bankId"));
    if (Number.isFinite(bankId) && bankId > 0) setActiveBankId(bankId);
    const bankName = params.get("bankName");
    if (bankName && bankName.trim()) setActiveBankName(bankName.trim());
    const passageId = Number(params.get("passageId"));
    if (Number.isFinite(passageId) && passageId > 0) setActivePassageId(passageId);
  }, [setActiveBankId, setActiveBankName, setActivePassageId, setRoute]);

  useEffect(() => {
    useWebMonitorStore.getState().setCategory("application");
  }, []);

  useEffect(() => {
    getAppSetting("study_streak_days")
      .then((raw) => {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) setStreakDays(parsed);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let disposed = false;
    const ensureWebhookServer = async () => {
      try {
        const [autoStartRaw, portRaw, status] = await Promise.all([
          getAppSetting("feishu_local_webhook_auto_start"),
          getAppSetting("feishu_local_webhook_port"),
          getFeishuWebhookServerStatus(),
        ]);
        const autoStart = autoStartRaw === null ? true : matchesTrue(autoStartRaw);
        if (!autoStart || status.running) return;
        const parsedPort = Number(portRaw ?? "27140");
        const started = await startFeishuWebhookServer(Number.isFinite(parsedPort) ? parsedPort : 27140);
        if (!disposed) {
          setShellStatus(`Webhook online · ${started.summary}`);
        }
      } catch {
        // ignore boot-time webhook failures
      }
    };
    ensureWebhookServer();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const runTick = async () => {
      try {
        const [notifyResult, watchResult, briefingResult] = await Promise.all([
          runScheduledNotificationTick(),
          runWebWatchersScanTick(),
          runAssistantBriefingTick(),
        ]);
        if (disposed) return;
        const activeSummaries = [notifyResult, watchResult, briefingResult]
          .filter((item) => item.executed)
          .map((item) => item.summary);
        if (activeSummaries.length > 0) {
          setShellStatus(activeSummaries.join(" · "));
        }
      } catch {
        // keep shell calm
      }
    };
    runTick();
    const timer = window.setInterval(runTick, 10 * 60 * 1000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <>
      <QuickCreateModal />
      <ToastViewport />
      <div className="desktop-shell flex bg-[var(--app-bg)] text-[var(--text-primary)]">
        <aside className="shell-sidebar no-drag-region flex w-[52px] shrink-0 flex-col items-center py-2">
          <nav className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = route === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onMouseEnter={() => prefetchRoute(item.key)}
                  onFocus={() => prefetchRoute(item.key)}
                  onClick={() => setRoute(item.key)}
                  className={`shell-nav-icon ${active ? "active" : ""}`}
                >
                  <Icon size={17} strokeWidth={2} />
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            title="快速新建"
            aria-label="快速新建"
            onClick={() => setQuickCreateOpen(true)}
            className="shell-nav-icon mt-2"
          >
            <Plus size={17} strokeWidth={2.1} />
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="shell-titlebar no-drag-region flex h-[38px] shrink-0 items-center justify-between border-b px-3">
            <div className="text-[12px] font-semibold text-zinc-700">{routeTitle[route]}</div>
            <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600">
              <Flame size={12} />
              {streakDays}天
            </div>
          </header>

          <main className="app-shell-main min-h-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={route}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="h-full min-h-0"
              >
                <Suspense
                  fallback={
                    <div className="gc grid h-full place-items-center">
                      <p className="text-sm text-[var(--text-secondary)]">Loading workspace...</p>
                    </div>
                  }
                >
                  <ActiveRouteComponent />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>

          <div className="flex h-8 shrink-0 items-center border-t border-[rgba(0,0,0,0.06)] px-4 text-[11px] text-[var(--text-muted)]">
            {shellStatus}
          </div>
        </div>
      </div>
    </>
  );
}
