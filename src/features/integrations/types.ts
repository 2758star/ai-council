export type NotificationRecord = {
  id: number;
  channel: string;
  sourceType: string;
  priority: "info" | "warning" | "critical" | string;
  title: string;
  content: string;
  relatedType: string | null;
  relatedId: number | null;
  sendStatus: string;
  isRead: boolean;
  isIgnored: boolean;
  snoozedUntil: string | null;
  dedupeKey: string | null;
  aggregateCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  updatedAt: string | null;
  actionPayloadJson: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type ActionResultStatus =
  | "成功"
  | "失败"
  | "已忽略"
  | "已转任务"
  | "已稍后提醒"
  | "已处理";

export type ActionResultReceipt = {
  id: number;
  scope: "通知中心" | "网页监控" | "AI 草稿";
  status: ActionResultStatus;
  summary: string;
  relatedType: string | null;
  relatedId: number | null;
  at: string;
  details: string | null;
};

export type NotificationQueryInput = {
  sourceTypes?: string[] | null;
  priorities?: string[] | null;
  unreadOnly?: boolean | null;
  includeIgnored?: boolean | null;
  includeSnoozed?: boolean | null;
  startAt?: string | null;
  endAt?: string | null;
  limit?: number | null;
};

export type DeadlineScanResult = {
  pushed: boolean;
  sentCount: number;
  failedCount: number;
  generatedCount: number;
  summary: string;
};

export type SchedulerTickResult = {
  executed: boolean;
  pushed: boolean;
  buffered: boolean;
  generatedCount: number;
  pendingCount: number;
  summary: string;
};

export type WatchTarget = {
  id: number;
  schoolName: string;
  pageLabel: string;
  targetUrl: string;
  isActive: boolean;
  lastHash: string | null;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewWatchTargetInput = {
  schoolName: string;
  pageLabel: string;
  targetUrl: string;
  isActive: boolean;
};

export type WatchScanResult = {
  checked: number;
  changed: number;
  failed: number;
  summary: string;
};

export type WatchScanTickResult = {
  executed: boolean;
  checked: number;
  changed: number;
  failed: number;
  summary: string;
};

export type WebPreset = {
  id: number;
  presetName: string;
  presetType: string;
  defaultWatchType: "full_page_text" | "selector_text" | "title_only" | "metadata_only" | string;
  defaultSelectorRule: string | null;
  defaultCheckFrequency: "manual" | "daily" | "every_6h" | "weekly" | string;
  defaultCategory: string;
  createdAt: string;
};

export type WebSource = {
  id: number;
  title: string;
  url: string;
  sourceType: string;
  category: string;
  tagsJson: string | null;
  linkedProjectId: number | null;
  linkedTaskId: number | null;
  linkedFileId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type WebSourceQueryInput = {
  query?: string | null;
  category?: string | null;
  linkedProjectId?: number | null;
  limit?: number | null;
};

export type WebSourceLinkUpdateInput = {
  sourceId: number;
  linkedProjectId?: number | null;
  linkedTaskId?: number | null;
  linkedFileId?: number | null;
};

export type WebWatcher = {
  id: number;
  sourceId: number;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourceCategory: string | null;
  watcherName: string;
  targetUrl: string;
  watchType: "full_page_text" | "selector_text" | "title_only" | "metadata_only" | string;
  selectorRule: string | null;
  checkFrequency: "manual" | "daily" | "every_6h" | "weekly" | string;
  isActive: boolean;
  lastCheckedAt: string | null;
  lastHash: string | null;
  lastStatus: "ok" | "changed" | "error" | "unreachable" | string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WebWatcherQueryInput = {
  sourceId?: number | null;
  linkedProjectId?: number | null;
  activeOnly?: boolean | null;
  limit?: number | null;
};

export type NewWebWatcherInput = {
  sourceId: number;
  watcherName: string;
  targetUrl: string;
  watchType: "full_page_text" | "selector_text" | "title_only" | "metadata_only" | string;
  selectorRule?: string | null;
  checkFrequency: "manual" | "daily" | "every_6h" | "weekly" | string;
  isActive?: boolean | null;
};

export type WebChangeLog = {
  id: number;
  watcherId: number;
  sourceId: number | null;
  sourceTitle: string | null;
  targetUrl: string | null;
  oldSnapshot: string;
  newSnapshot: string;
  diffSummary: string;
  aiSummary: string | null;
  changeDirection: string | null;
  processedAt: string | null;
  processedTaskId: number | null;
  changedAt: string;
};

export type WebChangeLogQueryInput = {
  watcherId?: number | null;
  sourceId?: number | null;
  linkedProjectId?: number | null;
  limit?: number | null;
};

export type WebClipping = {
  id: number;
  sourceId: number;
  clippedTitle: string;
  clippedText: string;
  clippedHtml: string | null;
  createdAt: string;
};

export type WebCaptureInput = {
  url: string;
  title?: string | null;
  sourceType?: string | null;
  category?: string | null;
  tagsJson?: string | null;
  linkedProjectId?: number | null;
  linkedTaskId?: number | null;
  createWatcher?: boolean | null;
  presetType?: string | null;
  watcherName?: string | null;
  watchType?: string | null;
  selectorRule?: string | null;
  checkFrequency?: string | null;
  saveAsClipping?: boolean | null;
  clippingHtml?: boolean | null;
};

export type WebCapturePayload = {
  source: WebSource;
  clipping: WebClipping | null;
  watcher: WebWatcher | null;
  summary: string;
};

export type WebWatcherScanPayload = {
  checked: number;
  changed: number;
  failed: number;
  summary: string;
};

export type WebWatcherScanTickPayload = {
  executed: boolean;
  checked: number;
  changed: number;
  failed: number;
  summary: string;
};

export type TaskSuggestion = {
  id: number;
  sourceType: string;
  sourceId: number | null;
  title: string;
  description: string | null;
  priority: "高" | "中" | "低" | string;
  suggestedDeadline: string | null;
  status: "pending" | "applied" | "dismissed" | string;
  createdAt: string;
  appliedAt: string | null;
};

export type SuggestionApplyPayload = {
  suggestionId: number;
  taskId: number;
  summary: string;
};

export type FeishuCommandResult = {
  command: string;
  success: boolean;
  action: string;
  summary: string;
  errorCode: string | null;
  errorMessage: string | null;
  logId: number | null;
  highRiskRequired: boolean;
  highRiskConfirmed: boolean;
  createdTaskId: number | null;
  createdSessionId: number | null;
  matchedProjectIds: number[];
};

export type FeishuMessageLogRecord = {
  id: number;
  direction: string;
  source: string;
  messageId: string | null;
  rawText: string;
  normalizedText: string | null;
  parsedAction: string | null;
  parsedPayloadJson: string | null;
  executionStatus: string;
  failureCode: string | null;
  failureReason: string | null;
  dedupeKey: string | null;
  isDuplicate: boolean;
  highRiskRequired: boolean;
  highRiskConfirmed: boolean;
  createdTaskId: number | null;
  createdSessionId: number | null;
  relatedNotificationId: number | null;
  latencyMs: number | null;
  createdAt: string;
  updatedAt: string;
};

export type FeishuMessageLogQueryInput = {
  direction?: string | null;
  executionStatus?: string | null;
  limit?: number | null;
};

export type FeishuRetryResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  summary: string;
  retriedLogIds: number[];
};

export type FeishuInboundInput = {
  rawText: string;
  source?: string | null;
  messageId?: string | null;
  highRiskConfirmed?: boolean | null;
};

export type FeishuBatchResult = {
  command: string;
  totalSteps: number;
  succeededSteps: number;
  failedSteps: number;
  summary: string;
  results: FeishuCommandResult[];
};

export type FeishuWebhookResult = {
  handled: boolean;
  challenge: string | null;
  messageId: string | null;
  extractedText: string | null;
  result: FeishuCommandResult | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type WebhookServerStatus = {
  running: boolean;
  port: number | null;
  bind: string;
  summary: string;
};

export type MathNotebookResult = {
  started: boolean;
  running: boolean;
  url: string;
  summary: string;
};

export type AssistantBriefingRecord = {
  id: number;
  briefType: "morning" | "evening" | string;
  dateKey: string;
  summaryText: string;
  detailJson: string;
  riskLevel: "low" | "medium" | "high" | string;
  autoGenerated: boolean;
  createdAt: string;
};

export type AssistantBriefingSuggestionRecord = {
  id: number;
  briefingId: number;
  suggestionOrder: number;
  title: string;
  actionType: string;
  actionPayloadJson: string | null;
  status: "pending" | "applied" | "dismissed" | string;
  createdTaskId: number | null;
  appliedAt: string | null;
  createdAt: string;
};

export type AssistantBriefingPayload = {
  briefing: AssistantBriefingRecord;
  suggestions: AssistantBriefingSuggestionRecord[];
  summaryLines: string[];
};

export type AssistantBriefingQueryInput = {
  briefType?: string | null;
  dateKey?: string | null;
  limit?: number | null;
};

export type AssistantBriefingApplyPayload = {
  suggestionId: number;
  status: string;
  summary: string;
  createdTaskId: number | null;
};

export type AssistantBriefingTickPayload = {
  executed: boolean;
  generatedCount: number;
  pushedCount: number;
  summary: string;
  details: string[];
};

export type NotificationSuggestionBatchResult = {
  scanned: number;
  created: number;
  skipped: number;
  summary: string;
  suggestionIds: number[];
};

export type NotificationPriorityRebalanceResult = {
  scannedNotifications: number;
  candidateTasks: number;
  promotedHigh: number;
  promotedMedium: number;
  touchedTaskIds: number[];
  summary: string;
};
