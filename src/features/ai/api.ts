import { invoke } from "@tauri-apps/api/core";
import type {
  ApplyPlanDraftCommitInput,
  AiDigestPayload,
  AiLogRecord,
  NewAiLogInput,
  PlanDraftAuditLogQueryInput,
  PlanDraftAuditLogRecord,
  NewStudyAnalysisLogInput,
  PlanDraftApplyPayload,
  PlanDraftRollbackPayload,
  PlanDraftCreateInput,
  PlanDraftItemRecord,
  PlanDraftPayload,
  PlanDraftQueryInput,
  PlanDraftRecord,
  StudyAnalysisLogRecord,
  StudyWebChangeBatchApplyPayload,
  WeeklyGrowthReviewRecord,
} from "@/features/ai/types";

export async function listAiLogs(limit = 100) {
  return invoke<AiLogRecord[]>("list_ai_logs", { limit });
}

export async function createAiLog(payload: NewAiLogInput) {
  return invoke<number>("create_ai_log", { payload });
}

export async function generateAiDigest() {
  return invoke<AiDigestPayload>("generate_ai_digest");
}

export async function listStudyAnalysisLogs(limit = 120) {
  return invoke<StudyAnalysisLogRecord[]>("list_study_analysis_logs", { limit });
}

export async function createStudyAnalysisLog(payload: NewStudyAnalysisLogInput) {
  return invoke<number>("create_study_analysis_log", { payload });
}

export async function listWeeklyGrowthReviews(limit = 40) {
  return invoke<WeeklyGrowthReviewRecord[]>("list_weekly_growth_reviews", { limit });
}

export async function generateWeeklyGrowthReview(weekKey?: string | null) {
  return invoke<WeeklyGrowthReviewRecord>("generate_weekly_growth_review", { weekKey: weekKey ?? null });
}

export async function listPlanDrafts(payload?: PlanDraftQueryInput) {
  return invoke<PlanDraftRecord[]>("list_plan_drafts", { payload: payload ?? null });
}

export async function listPlanDraftItems(draftId: number) {
  return invoke<PlanDraftItemRecord[]>("list_plan_draft_items", { draftId });
}

export async function listPlanDraftAuditLogs(payload?: PlanDraftAuditLogQueryInput) {
  return invoke<PlanDraftAuditLogRecord[]>("list_plan_draft_audit_logs", { payload: payload ?? null });
}

export async function createPlanDraft(payload: PlanDraftCreateInput) {
  return invoke<number>("create_plan_draft", { payload });
}

export async function updatePlanDraftStatus(draftId: number, status: string) {
  return invoke<void>("update_plan_draft_status", { draftId, status });
}

export async function applyPlanDraft(draftId: number) {
  return invoke<PlanDraftApplyPayload>("apply_plan_draft", { draftId });
}

export async function applyPlanDraftCommit(payload: ApplyPlanDraftCommitInput) {
  return invoke<PlanDraftApplyPayload>("apply_plan_draft_commit", { payload });
}

export async function rollbackPlanDraftApply(draftId: number) {
  return invoke<PlanDraftRollbackPayload>("rollback_plan_draft_apply", { draftId });
}

export async function applyStudyWebChangeSuggestions(limit?: number) {
  return invoke<StudyWebChangeBatchApplyPayload>("apply_study_web_change_suggestions", { limit: limit ?? null });
}

export async function generateTomorrowPlanDraft() {
  return invoke<PlanDraftPayload>("generate_tomorrow_plan_draft");
}

// v0.3 产品收缩：移除“日程产品层”，仅保留任务/草稿与申请联动。
