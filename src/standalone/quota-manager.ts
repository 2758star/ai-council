export interface QuotaTracker {
  provider: string;
  messagesSentToday: number;
  messagesSentThisWindow: number;
  resetIntervalHours: number;
  lastResetTime: string;
  nextEstimatedReset: string;
  estimatedLimitPerWindow: number;
  consecutiveFailures: number;
  lastFailureReason: string;
  status: "healthy" | "warning" | "rate_limited" | "error";
  dailyHistory: { date: string; totalSent: number; failures: number }[];
}

const DEFAULT_QUOTAS: Record<string, { resetIntervalHours: number; estimatedLimitPerWindow: number }> = {
  anthropic: { resetIntervalHours: 4, estimatedLimitPerWindow: 40 },
  openai: { resetIntervalHours: 3, estimatedLimitPerWindow: 40 },
  gemini: { resetIntervalHours: 24, estimatedLimitPerWindow: 50 },
};

const STORAGE_KEY = "standalone_ai_council_quotas";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600_000).toISOString();
}

function loadAll(): Record<string, QuotaTracker> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(trackers: Record<string, QuotaTracker>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackers));
  } catch {
    // quota storage full — silently ignore
  }
}

export function getTracker(provider: string): QuotaTracker {
  const all = loadAll();
  if (all[provider]) {
    const t = all[provider];
    const now = new Date();
    const resetTime = new Date(t.lastResetTime);
    if (now >= new Date(t.nextEstimatedReset)) {
      t.messagesSentThisWindow = 0;
      t.status = "healthy";
      t.lastResetTime = now.toISOString();
      t.nextEstimatedReset = addHours(now.toISOString(), t.resetIntervalHours);
      t.consecutiveFailures = 0;
      t.lastFailureReason = "";
      saveAll(all);
    }
    return t;
  }
  const defaults = DEFAULT_QUOTAS[provider] || { resetIntervalHours: 4, estimatedLimitPerWindow: 50 };
  const now = new Date().toISOString();
  const fresh: QuotaTracker = {
    provider,
    messagesSentToday: 0,
    messagesSentThisWindow: 0,
    resetIntervalHours: defaults.resetIntervalHours,
    lastResetTime: now,
    nextEstimatedReset: addHours(now, defaults.resetIntervalHours),
    estimatedLimitPerWindow: defaults.estimatedLimitPerWindow,
    consecutiveFailures: 0,
    lastFailureReason: "",
    status: "healthy",
    dailyHistory: [],
  };
  all[provider] = fresh;
  saveAll(all);
  return fresh;
}

export function recordSuccess(provider: string): QuotaTracker {
  const all = loadAll();
  const t = getTracker(provider);
  t.messagesSentToday++;
  t.messagesSentThisWindow++;
  t.consecutiveFailures = 0;
  t.lastFailureReason = "";

  const ratio = t.messagesSentThisWindow / t.estimatedLimitPerWindow;
  if (ratio >= 0.8) t.status = "warning";
  else t.status = "healthy";

  const today = todayKey();
  let todayEntry = t.dailyHistory.find((d) => d.date === today);
  if (!todayEntry) {
    todayEntry = { date: today, totalSent: 0, failures: 0 };
    t.dailyHistory.push(todayEntry);
  }
  todayEntry.totalSent++;

  all[provider] = t;
  saveAll(all);
  return t;
}

export function recordFailure(provider: string, reason: string): QuotaTracker {
  const all = loadAll();
  const t = getTracker(provider);
  t.consecutiveFailures++;
  t.lastFailureReason = reason;

  if (t.consecutiveFailures >= 2) {
    t.status = "rate_limited";
  } else if (t.status !== "warning") {
    t.status = "error";
  }

  const today = todayKey();
  let todayEntry = t.dailyHistory.find((d) => d.date === today);
  if (!todayEntry) {
    todayEntry = { date: today, totalSent: 0, failures: 0 };
    t.dailyHistory.push(todayEntry);
  }
  todayEntry.failures++;

  all[provider] = t;
  saveAll(all);
  return t;
}

export function resetTracker(provider: string): QuotaTracker {
  const all = loadAll();
  const defaults = DEFAULT_QUOTAS[provider] || { resetIntervalHours: 4, estimatedLimitPerWindow: 50 };
  const now = new Date().toISOString();
  all[provider] = {
    provider,
    messagesSentToday: 0,
    messagesSentThisWindow: 0,
    resetIntervalHours: defaults.resetIntervalHours,
    lastResetTime: now,
    nextEstimatedReset: addHours(now, defaults.resetIntervalHours),
    estimatedLimitPerWindow: defaults.estimatedLimitPerWindow,
    consecutiveFailures: 0,
    lastFailureReason: "",
    status: "healthy",
    dailyHistory: [],
  };
  saveAll(all);
  return all[provider];
}

export function updateQuotaSettings(
  provider: string,
  settings: Partial<{ resetIntervalHours: number; estimatedLimitPerWindow: number }>,
): QuotaTracker {
  const all = loadAll();
  const t = getTracker(provider);
  if (settings.resetIntervalHours !== undefined) {
    t.resetIntervalHours = settings.resetIntervalHours;
    t.nextEstimatedReset = addHours(t.lastResetTime, t.resetIntervalHours);
  }
  if (settings.estimatedLimitPerWindow !== undefined) {
    t.estimatedLimitPerWindow = settings.estimatedLimitPerWindow;
  }
  const ratio = t.messagesSentThisWindow / t.estimatedLimitPerWindow;
  if (ratio >= 0.8) t.status = "warning";
  else if (t.status === "warning" && ratio < 0.8) t.status = "healthy";
  all[provider] = t;
  saveAll(all);
  return t;
}

export function getAllTrackers(): Record<string, QuotaTracker> {
  return loadAll();
}

export function getQuotaSummary(): Record<string, { used: number; limit: number; status: string }> {
  const all = loadAll();
  const summary: Record<string, { used: number; limit: number; status: string }> = {};
  for (const [provider] of Object.entries(DEFAULT_QUOTAS)) {
    const t = getTracker(provider);
    summary[provider] = {
      used: t.messagesSentThisWindow,
      limit: t.estimatedLimitPerWindow,
      status: t.status,
    };
  }
  // also include any trackers not in defaults
  for (const [provider, t] of Object.entries(all)) {
    if (!summary[provider]) {
      summary[provider] = {
        used: t.messagesSentThisWindow,
        limit: t.estimatedLimitPerWindow,
        status: t.status,
      };
    }
  }
  return summary;
}
