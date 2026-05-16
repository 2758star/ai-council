export type QuotaState =
  | 'available'
  | 'limited'
  | 'cooldown'
  | 'unknown'
  | 'login_required'
  | 'captcha_required';

export interface ProviderQuota {
  provider: string;
  state: QuotaState;
  sentCount: number;
  estimatedLimit: number;
  windowStartTime: number;
  windowDurationMs: number;
  cooldownUntil?: number;
  lastSendAt?: number;
  lastSuccessAt?: number;
  lastErrorText?: string;
}

// 各 provider 的默认额度窗口（Plus 账户）
const DEFAULT_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  chatgpt: { limit: 80, windowMs: 3 * 60 * 60 * 1000 },   // 80条/3小时
  claude:  { limit: 45, windowMs: 24 * 60 * 60 * 1000 },  // 45条/天
  gemini:  { limit: 50, windowMs: 24 * 60 * 60 * 1000 },  // 50条/天
};

// 保持向后兼容的旧接口
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

// ─── 旧接口（保持兼容） ───────────────────────────────────────────

export function getTracker(provider: string): QuotaTracker {
  const all = loadAll();
  if (all[provider]) {
    const t = all[provider];
    const now = new Date();
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
  const defaults: Record<string, { resetIntervalHours: number; estimatedLimitPerWindow: number }> = {
    anthropic: { resetIntervalHours: 4, estimatedLimitPerWindow: 40 },
    openai: { resetIntervalHours: 3, estimatedLimitPerWindow: 40 },
    gemini: { resetIntervalHours: 24, estimatedLimitPerWindow: 50 },
  };
  const d = defaults[provider] || { resetIntervalHours: 4, estimatedLimitPerWindow: 50 };
  const now = new Date().toISOString();
  const fresh: QuotaTracker = {
    provider,
    messagesSentToday: 0,
    messagesSentThisWindow: 0,
    resetIntervalHours: d.resetIntervalHours,
    lastResetTime: now,
    nextEstimatedReset: addHours(now, d.resetIntervalHours),
    estimatedLimitPerWindow: d.estimatedLimitPerWindow,
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
  const defaults: Record<string, { resetIntervalHours: number; estimatedLimitPerWindow: number }> = {
    anthropic: { resetIntervalHours: 4, estimatedLimitPerWindow: 40 },
    openai: { resetIntervalHours: 3, estimatedLimitPerWindow: 40 },
    gemini: { resetIntervalHours: 24, estimatedLimitPerWindow: 50 },
  };
  const d = defaults[provider] || { resetIntervalHours: 4, estimatedLimitPerWindow: 50 };
  const now = new Date().toISOString();
  all[provider] = {
    provider,
    messagesSentToday: 0,
    messagesSentThisWindow: 0,
    resetIntervalHours: d.resetIntervalHours,
    lastResetTime: now,
    nextEstimatedReset: addHours(now, d.resetIntervalHours),
    estimatedLimitPerWindow: d.estimatedLimitPerWindow,
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
  const defaults: Record<string, unknown> = {
    anthropic: true,
    openai: true,
    gemini: true,
  };
  for (const provider of Object.keys(defaults)) {
    const t = getTracker(provider);
    summary[provider] = {
      used: t.messagesSentThisWindow,
      limit: t.estimatedLimitPerWindow,
      status: t.status,
    };
  }
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

// ─── 新增：运行时状态识别 ────────────────────────────────────────

export class QuotaManager {
  private quotas: Map<string, ProviderQuota> = new Map();

  constructor() {
    ['chatgpt', 'claude', 'gemini'].forEach(p => {
      const defaults = DEFAULT_LIMITS[p];
      this.quotas.set(p, {
        provider: p,
        state: 'unknown',
        sentCount: 0,
        estimatedLimit: defaults.limit,
        windowStartTime: Date.now(),
        windowDurationMs: defaults.windowMs,
      });
    });
  }

  recordSend(provider: string) {
    const q = this.quotas.get(provider);
    if (!q) return;
    if (Date.now() - q.windowStartTime >= q.windowDurationMs) {
      q.sentCount = 0;
      q.windowStartTime = Date.now();
    }
    q.sentCount++;
    q.lastSendAt = Date.now();
    q.state = q.sentCount >= q.estimatedLimit * 0.9 ? 'limited' : 'available';
  }

  recordSuccess(provider: string) {
    const q = this.quotas.get(provider);
    if (!q) return;
    q.lastSuccessAt = Date.now();
    q.state = 'available';
  }

  recordError(provider: string, errorText: string) {
    const q = this.quotas.get(provider);
    if (!q) return;
    q.lastErrorText = errorText;
    if (errorText.includes('login') || errorText.includes('登录')) {
      q.state = 'login_required';
    } else if (errorText.includes('rate') || errorText.includes('limit') || errorText.includes('限制')) {
      q.state = 'cooldown';
      q.cooldownUntil = Date.now() + 30 * 60 * 1000; // 30分钟冷却
    } else if (errorText.includes('captcha') || errorText.includes('验证')) {
      q.state = 'captcha_required';
    }
  }

  getEstimatedRemaining(provider: string): number {
    const q = this.quotas.get(provider);
    if (!q) return 0;
    if (Date.now() - q.windowStartTime >= q.windowDurationMs) return q.estimatedLimit;
    return Math.max(0, q.estimatedLimit - q.sentCount);
  }

  getAll(): ProviderQuota[] {
    return Array.from(this.quotas.values());
  }

  getSummary(): string {
    return Array.from(this.quotas.values()).map(q => {
      const remaining = this.getEstimatedRemaining(q.provider);
      return `${q.provider}:${q.state}:${remaining}`;
    }).join(',');
  }
}
