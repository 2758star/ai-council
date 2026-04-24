export type AiLogRecord = {
  id: number;
  moduleName: string;
  actionName: string;
  modelName: string | null;
  providerName: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number | null;
  success: boolean;
  createdAt: string;
};

export type NewAiLogInput = {
  moduleName: string;
  actionName: string;
  modelName: string | null;
  providerName: string | null;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number | null;
  success: boolean;
};

export type AiDigestPayload = {
  summary: string;
  actions: string[];
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
};

export type StudyAnalysisLogRecord = {
  id: number;
  dateKey: string;
  examType: string;
  subject: string;
  module: string | null;
  material: string | null;
  inputSummary: string | null;
  performanceSummary: string;
  analysisSummary: string | null;
  weakestModule: string | null;
  keyErrorsJson: string | null;
  suggestedAdjustment: string | null;
  tomorrowAdjustment: string | null;
  intensityChange: string | null;
  notes: string | null;
  adoptionStatus: string;
  sourceType: string;
  sourceRefId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type NewStudyAnalysisLogInput = {
  dateKey: string;
  examType: string;
  subject: string;
  module?: string | null;
  material: string | null;
  inputSummary?: string | null;
  performanceSummary: string;
  analysisSummary?: string | null;
  weakestModule: string | null;
  keyErrorsJson: string | null;
  suggestedAdjustment: string | null;
  tomorrowAdjustment?: string | null;
  intensityChange: string | null;
  notes: string | null;
  adoptionStatus?: string | null;
  sourceType?: string | null;
  sourceRefId?: number | null;
};

export type WeeklyGrowthReviewRecord = {
  id: number;
  weekKey: string;
  weekRange: string | null;
  linkedLogIdsJson: string | null;
  summaryText: string;
  weeklySummary: string | null;
  strengthsJson: string | null;
  growthPointsJson: string | null;
  weaknessesJson: string | null;
  persistentWeaknessJson: string | null;
  focusJson: string | null;
  nextWeekFocusJson: string | null;
  scheduleAdjustmentRulesJson: string | null;
  statsJson: string | null;
  generatedBy: string;
  createdAt: string;
  updatedAt: string | null;
};

export type PlanDraftRecord = {
  id: number;
  draftType: string;
  title: string;
  targetDate: string | null;
  weekKey: string | null;
  sourceContextJson: string | null;
  suggestionText: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PlanDraftItemRecord = {
  id: number;
  draftId: number;
  itemOrder: number;
  itemType: string;
  title: string;
  description: string | null;
  priority: string;
  estimatedMinutes: number | null;
  scheduledDate: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  deadline: string | null;
  linkedProjectId: number | null;
  actionPayloadJson: string | null;
  applyStatus: string;
  createdTaskId: number | null;
  createdAt: string;
};

export type PlanDraftItemCreateInput = {
  itemOrder?: number | null;
  itemType?: string | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  estimatedMinutes?: number | null;
  scheduledDate?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  deadline?: string | null;
  linkedProjectId?: number | null;
  actionPayloadJson?: string | null;
};

export type PlanDraftCreateInput = {
  draftType: string;
  title: string;
  targetDate?: string | null;
  weekKey?: string | null;
  sourceContextJson?: string | null;
  suggestionText?: string | null;
  status?: string | null;
  items: PlanDraftItemCreateInput[];
};

export type PlanDraftQueryInput = {
  status?: string | null;
  limit?: number | null;
};

export type PlanDraftAuditLogRecord = {
  id: number;
  draftId: number;
  action: string;
  status: string;
  operatorName: string;
  reasonCode: string | null;
  reasonNote: string | null;
  affectedTaskIdsJson: string | null;
  itemCount: number;
  createdAt: string;
};

export type PlanDraftAuditLogQueryInput = {
  draftId?: number | null;
  limit?: number | null;
};

export type PlanDraftPayload = {
  draft: PlanDraftRecord;
  items: PlanDraftItemRecord[];
  summary: string;
};

export type PlanDraftApplyPayload = {
  draftId: number;
  appliedItems: number;
  createdTaskIds: number[];
  summary: string;
};

export type ApplyPlanDraftCommitInput = {
  draftId: number;
  confirmToken: string;
  riskAcknowledged: boolean;
  expectedItems?: number | null;
};

export type PlanDraftRollbackPayload = {
  draftId: number;
  rolledBackItems: number;
  deletedTaskIds: number[];
  summary: string;
};

export type StudyWebChangeBatchApplyPayload = {
  attempted: number;
  applied: number;
  skipped: number;
  failed: number;
  createdTaskIds: number[];
  summary: string;
};
