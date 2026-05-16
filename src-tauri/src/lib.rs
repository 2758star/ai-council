mod db;
pub mod feishu_bot;

use chrono::{DateTime, Datelike, Local, NaiveTime, TimeZone, Timelike, Utc};
use db::{
    FileLinkInput, NewAiLogInput, NewHabitInput, NewHabitLogInput, NewIdeaNoteInput,
    NewJournalEntryInput, NewMistakeNoteInput, NewProjectDocumentInput, NewProjectInput, NewRequirementInput,
    NewRecommendationLetterInput, UpdateRecommendationLetterInput,
    NewTaskInput, NewWatchTargetInput, NotificationQueryInput, PostponeTaskInput, TaskConflictCheckInput,
    UpdateProjectInput, UpdateRequirementInput, UpdateTaskInput, FeishuMessageLogQueryInput,
    NewWebSourceInput, NewWebWatcherInput, WebSourceQueryInput, WebWatcherQueryInput, WebChangeLogQueryInput,
    NewPlanDraftInput, NewPlanDraftItemInput, NewStudyAnalysisLogInput, NewWeeklyGrowthReviewInput,
};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use futures_util::StreamExt;
use tauri::{Manager, State};
use tokio_tungstenite;

mod keys {
    pub const GEMINI_API_KEY: &str = "gemini_api_key";
    pub const FEISHU_APP_ID: &str = "feishu_app_id";
    pub const FEISHU_APP_SECRET: &str = "feishu_app_secret";
    pub const FEISHU_WEBHOOK_URL: &str = "feishu_webhook_url";
    pub const NGROK_AUTHTOKEN: &str = "ngrok_authtoken";
    pub const OPENAI_API_KEY: &str = "openai_api_key";
}

#[derive(Clone)]
struct AppState {
    bridge: Arc<Mutex<BridgeState>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            bridge: Arc::new(Mutex::new(BridgeState::new())),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapPayload {
    app_name: String,
    database_path: String,
    initialized_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DeadlineScanPayload {
    pushed: bool,
    sent_count: i64,
    failed_count: i64,
    generated_count: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SchedulerTickPayload {
    executed: bool,
    pushed: bool,
    buffered: bool,
    generated_count: i64,
    pending_count: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CalendarSyncPayload {
    synced: i64,
    failed: i64,
    skipped: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CalendarPullPayload {
    executed: bool,
    updated: i64,
    failed: i64,
    skipped: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchScanPayload {
    checked: i64,
    changed: i64,
    failed: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchScanTickPayload {
    executed: bool,
    checked: i64,
    changed: i64,
    failed: i64,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryImportPayload {
    imported: i64,
    skipped: i64,
    failed: i64,
    imported_file_ids: Vec<i64>,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryInboxResolvePayload {
    file_id: i64,
    action: String,
    target_key: String,
    category: String,
    tags: Vec<String>,
    log_id: i64,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibrarySummaryRefreshPayload {
    refreshed: i64,
    skipped: i64,
    failed: i64,
    touched_file_ids: Vec<i64>,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryOcrIndexPayload {
    refreshed: i64,
    skipped: i64,
    failed: i64,
    touched_file_ids: Vec<i64>,
    summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LibraryCustomCategory {
    id: i64,
    name: String,
    parent: String,
    order: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebCaptureInput {
    url: String,
    title: Option<String>,
    source_type: Option<String>,
    category: Option<String>,
    tags_json: Option<String>,
    linked_project_id: Option<i64>,
    linked_task_id: Option<i64>,
    create_watcher: Option<bool>,
    preset_type: Option<String>,
    watcher_name: Option<String>,
    watch_type: Option<String>,
    selector_rule: Option<String>,
    check_frequency: Option<String>,
    save_as_clipping: Option<bool>,
    clipping_html: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebCapturePayload {
    source: db::WebSource,
    clipping: Option<db::WebClipping>,
    watcher: Option<db::WebWatcher>,
    summary: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebSourceLinkUpdateInput {
    source_id: i64,
    linked_project_id: Option<i64>,
    linked_task_id: Option<i64>,
    linked_file_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApplyPlanDraftCommitInput {
    draft_id: i64,
    confirm_token: String,
    risk_acknowledged: bool,
    expected_items: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebWatcherScanPayload {
    checked: i64,
    changed: i64,
    failed: i64,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebWatcherScanTickPayload {
    executed: bool,
    checked: i64,
    changed: i64,
    failed: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PomodoroFinishPayload {
    session_id: i64,
    status: String,
    interrupted_count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SuggestionApplyPayload {
    suggestion_id: i64,
    task_id: i64,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AiDigestPayload {
    summary: String,
    actions: Vec<String>,
    provider: String,
    model: String,
    input_tokens: i64,
    output_tokens: i64,
    estimated_cost: f64,
    latency_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AssistantBriefingPayload {
    briefing: db::AssistantBriefingRecord,
    suggestions: Vec<db::AssistantBriefingSuggestionRecord>,
    summary_lines: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AssistantBriefingApplyPayload {
    suggestion_id: i64,
    status: String,
    summary: String,
    created_task_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AssistantBriefingTickPayload {
    executed: bool,
    generated_count: i64,
    pushed_count: i64,
    summary: String,
    details: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssistantBriefingQueryInput {
    brief_type: Option<String>,
    date_key: Option<String>,
    limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftItemCreatePayload {
    item_order: Option<i64>,
    item_type: Option<String>,
    title: String,
    description: Option<String>,
    priority: Option<String>,
    estimated_minutes: Option<i64>,
    scheduled_date: Option<String>,
    time_start: Option<String>,
    time_end: Option<String>,
    deadline: Option<String>,
    linked_project_id: Option<i64>,
    action_payload_json: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftCreatePayload {
    draft_type: String,
    title: String,
    target_date: Option<String>,
    week_key: Option<String>,
    source_context_json: Option<String>,
    suggestion_text: Option<String>,
    status: Option<String>,
    items: Vec<PlanDraftItemCreatePayload>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftQueryInput {
    status: Option<String>,
    limit: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftAuditLogQueryInput {
    draft_id: Option<i64>,
    limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftPayload {
    draft: db::PlanDraftRecord,
    items: Vec<db::PlanDraftItemRecord>,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftApplyPayload {
    draft_id: i64,
    applied_items: i64,
    created_task_ids: Vec<i64>,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PlanDraftRollbackPayload {
    draft_id: i64,
    rolled_back_items: i64,
    deleted_task_ids: Vec<i64>,
    summary: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StudyWebChangeBatchApplyPayload {
    attempted: i64,
    applied: i64,
    skipped: i64,
    failed: i64,
    created_task_ids: Vec<i64>,
    summary: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyPlanItemCreatePayload {
    item_order: Option<i64>,
    title: String,
    module: Option<String>,
    estimated_minutes: Option<i64>,
    priority: Option<String>,
    source_reason: Option<String>,
    suggested_time_block: Option<String>,
    task_id: Option<i64>,
    is_completed: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyPlanVersionCreatePayload {
    date_key: String,
    title: String,
    status: Option<String>,
    source_reason: Option<String>,
    created_from_type: Option<String>,
    base_version_id: Option<i64>,
    items: Vec<DailyPlanItemCreatePayload>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DailyPlanVersionQueryInput {
    date_key: Option<String>,
    status: Option<String>,
    limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeishuCommandPayload {
    command: String,
    success: bool,
    action: String,
    summary: String,
    error_code: Option<String>,
    error_message: Option<String>,
    log_id: Option<i64>,
    high_risk_required: bool,
    high_risk_confirmed: bool,
    created_task_id: Option<i64>,
    created_session_id: Option<i64>,
    matched_project_ids: Vec<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MathNotebookPayload {
    started: bool,
    running: bool,
    url: String,
    summary: String,
}

// ─── AI Council Bridge 协议 ───────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BridgeMessage {
    #[serde(skip_serializing_if = "Option::is_none")]
    r#type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ProviderStatus {
    provider: String,
    connected: bool,
    is_streaming: bool,
    has_input: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeishuInboundInput {
    raw_text: String,
    source: Option<String>,
    message_id: Option<String>,
    high_risk_confirmed: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeishuBatchPayload {
    command: String,
    total_steps: i64,
    succeeded_steps: i64,
    failed_steps: i64,
    summary: String,
    results: Vec<FeishuCommandPayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeishuRetryPayload {
    attempted: i64,
    succeeded: i64,
    failed: i64,
    summary: String,
    retried_log_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationSuggestionBatchPayload {
    scanned: i64,
    created: i64,
    skipped: i64,
    summary: String,
    suggestion_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationPriorityRebalancePayload {
    scanned_notifications: i64,
    candidate_tasks: i64,
    promoted_high: i64,
    promoted_medium: i64,
    touched_task_ids: Vec<i64>,
    summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FeishuWebhookPayload {
    handled: bool,
    challenge: Option<String>,
    message_id: Option<String>,
    extracted_text: Option<String>,
    result: Option<FeishuCommandPayload>,
    error_code: Option<String>,
    error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WebhookServerStatusPayload {
    running: bool,
    port: Option<u16>,
    bind: String,
    summary: String,
}


fn get_database_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    std::fs::create_dir_all(&app_dir)
        .map_err(|error| format!("failed to create app data dir: {error}"))?;
    let db_path = app_dir.join("personal-secretary.db");
    db::initialize_schema(&db_path)
        .map_err(|error| format!("failed to initialize database schema: {error}"))?;
    Ok(db_path)
}

fn is_sensitive_secret_key(key: &str) -> bool {
    matches!(
        key,
        keys::GEMINI_API_KEY
            | keys::FEISHU_APP_ID
            | keys::FEISHU_APP_SECRET
            | keys::FEISHU_WEBHOOK_URL
            | keys::NGROK_AUTHTOKEN
            | keys::OPENAI_API_KEY
    )
}

fn get_secret_optional(db_path: &Path, key: &str) -> Result<Option<String>, String> {
    if !is_sensitive_secret_key(key) {
        return Err(format!("unsupported secret key: {key}"));
    }
    let value = db::get_app_setting(db_path, key)
        .map_err(|error| format!("failed to read secret-like setting '{key}': {error}"))?
        .unwrap_or_default();
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() { Ok(None) } else { Ok(Some(trimmed)) }
}

fn parse_yyyy_mm_dd(value: &str) -> Option<chrono::NaiveDate> {
    let date_part = value.get(0..10)?;
    chrono::NaiveDate::parse_from_str(date_part, "%Y-%m-%d").ok()
}

fn week_key_of(date: chrono::NaiveDate) -> String {
    let iso = date.iso_week();
    format!("{}-W{:02}", iso.year(), iso.week())
}

fn rough_token_count(text: &str) -> i64 {
    let chars = text.chars().count() as i64;
    (chars / 4).max(1)
}

#[derive(Debug, Clone)]
struct BriefingSuggestionDraft {
    title: String,
    action_type: String,
    action_payload_json: Option<String>,
}

#[derive(Debug, Clone)]
struct BriefingBuildResult {
    summary_text: String,
    risk_level: String,
    detail_json: String,
    summary_lines: Vec<String>,
    push_title: String,
    push_body: String,
    suggestions: Vec<BriefingSuggestionDraft>,
}

fn normalize_brief_type(raw: &str) -> Option<&'static str> {
    let value = raw.trim().to_lowercase();
    if value.contains("morning") || value.contains("晨") {
        return Some("morning");
    }
    if value.contains("evening") || value.contains("晚") || value.contains("review") || value.contains("回顾") {
        return Some("evening");
    }
    None
}

fn parse_hhmm_minutes(value: &str) -> Option<i64> {
    let mut parts = value.split(':');
    let hour = parts.next()?.trim().parse::<i64>().ok()?;
    let minute = parts.next()?.trim().parse::<i64>().ok()?;
    if !(0..=23).contains(&hour) || !(0..=59).contains(&minute) {
        return None;
    }
    Some(hour * 60 + minute)
}

fn task_is_unfinished(task: &db::Task) -> bool {
    task.status != "已完成"
}

fn task_is_today_target(task: &db::Task, date: chrono::NaiveDate) -> bool {
    task
        .scheduled_date
        .as_deref()
        .and_then(parse_yyyy_mm_dd)
        .map(|value| value == date)
        .unwrap_or(false)
        || task
            .deadline
            .as_deref()
            .and_then(parse_yyyy_mm_dd)
            .map(|value| value == date)
            .unwrap_or(false)
}

fn task_is_carryover_unfinished(task: &db::Task, date: chrono::NaiveDate) -> bool {
    if !task_is_unfinished(task) {
        return false;
    }
    let scheduled_before = task
        .scheduled_date
        .as_deref()
        .and_then(parse_yyyy_mm_dd)
        .map(|value| value < date)
        .unwrap_or(false);
    let deadline_before = task
        .deadline
        .as_deref()
        .and_then(parse_yyyy_mm_dd)
        .map(|value| value < date)
        .unwrap_or(false);
    scheduled_before || deadline_before
}

fn format_task_digest_item(task: &db::Task, date: chrono::NaiveDate) -> String {
    let mut labels: Vec<String> = vec![task.priority.clone()];
    if let Some(deadline) = task.deadline.as_deref().and_then(parse_yyyy_mm_dd) {
        let diff = (deadline - date).num_days();
        if diff < 0 {
            labels.push(format!("超期{}天", diff.abs()));
        } else if diff == 0 {
            labels.push("DDL今日".to_string());
        } else if diff <= 3 {
            labels.push(format!("剩余{}天", diff));
        }
    }
    if task.status != "未开始" {
        labels.push(task.status.clone());
    }
    format!("{}（{}）", task.title, labels.join("·"))
}

fn summarize_task_digest(tasks: &[db::Task], date: chrono::NaiveDate, limit: usize, empty_text: &str) -> String {
    if tasks.is_empty() {
        return empty_text.to_string();
    }
    let mut items = tasks
        .iter()
        .take(limit)
        .map(|task| format_task_digest_item(task, date))
        .collect::<Vec<_>>();
    if tasks.len() > limit {
        items.push(format!("还有 {} 项", tasks.len() - limit));
    }
    items.join("；")
}

fn is_study_web_change(change: &db::WebChangeLog) -> bool {
    let merged = format!(
        "{} {} {}",
        change.change_direction.clone().unwrap_or_default(),
        change.ai_summary.clone().unwrap_or_default(),
        change.diff_summary
    )
    .to_lowercase();
    merged.contains("study")
        || merged.contains("resource")
        || merged.contains("announcement")
        || merged.contains("docs")
        || merged.contains("exam")
        || merged.contains("article")
        || merged.contains("课程")
        || merged.contains("资料")
        || merged.contains("备考")
        || merged.contains("announcement_posted")
        || merged.contains("resource_updated")
        || merged.contains("schedule_changed")
        || merged.contains("exam_policy_changed")
        || merged.contains("article_revised")
        || merged.contains("docs_updated")
}

fn ymd(dt: DateTime<Local>) -> String {
    dt.format("%Y-%m-%d").to_string()
}

fn bool_setting_enabled(value: Option<String>, default_enabled: bool) -> bool {
    match value {
        Some(raw) if !raw.trim().is_empty() => matches!(raw.trim(), "1" | "true" | "TRUE" | "True"),
        _ => default_enabled,
    }
}

fn build_morning_briefing(db_path: &std::path::Path, date: chrono::NaiveDate) -> Result<BriefingBuildResult, String> {
    let tasks = db::list_tasks(db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let projects = db::list_projects(db_path).map_err(|error| format!("failed to list projects: {error}"))?;
    let notifications = db::list_notifications(db_path, 120)
        .map_err(|error| format!("failed to list notifications for morning briefing: {error}"))?;
    let web_changes = db::list_web_change_logs(
        db_path,
        &db::WebChangeLogQueryInput {
            watcher_id: None,
            source_id: None,
            linked_project_id: None,
            limit: Some(120),
        },
    )
    .map_err(|error| format!("failed to list web changes for morning briefing: {error}"))?;
    let today_key = date.format("%Y-%m-%d").to_string();

    let today_tasks = tasks
        .iter()
        .filter(|task| task_is_today_target(task, date))
        .cloned()
        .collect::<Vec<_>>();
    let pending_today = today_tasks
        .iter()
        .filter(|task| task_is_unfinished(task))
        .cloned()
        .collect::<Vec<_>>();
    let carryover_unfinished = tasks
        .iter()
        .filter(|task| task_is_carryover_unfinished(task, date))
        .cloned()
        .collect::<Vec<_>>();

    let mut urgent_deadlines = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| {
            let ddl = task.deadline.as_deref().and_then(parse_yyyy_mm_dd)?;
            let diff = (ddl - date).num_days();
            if diff <= 3 {
                Some((task.id, task.title.clone(), diff, task.priority.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    urgent_deadlines.sort_by_key(|(_, _, diff, _)| *diff);

    let mut overlap_count = 0_i64;
    let mut time_blocks = pending_today
        .iter()
        .filter_map(|task| {
            let start = task.time_start.as_deref().and_then(parse_hhmm_minutes)?;
            let end = task.time_end.as_deref().and_then(parse_hhmm_minutes)?;
            Some((task.id, start, end))
        })
        .collect::<Vec<_>>();
    time_blocks.sort_by_key(|(_, start, _)| *start);
    for idx in 1..time_blocks.len() {
        let prev = time_blocks[idx - 1];
        let current = time_blocks[idx];
        if current.1 < prev.2 {
            overlap_count += 1;
        }
    }
    let total_minutes = pending_today
        .iter()
        .map(|task| task.estimated_minutes.unwrap_or(30))
        .sum::<i64>();
    let high_priority_count = pending_today
        .iter()
        .filter(|task| task.priority == "高")
        .count() as i64;
    let overdue_count = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| task.deadline.as_deref().and_then(parse_yyyy_mm_dd))
        .filter(|ddl| *ddl < date)
        .count() as i64;
    let critical_unread_notifications = notifications
        .iter()
        .filter(|item| item.priority == "critical" && !item.is_read && !item.is_ignored)
        .cloned()
        .collect::<Vec<_>>();
    let today_study_updates = web_changes
        .iter()
        .filter(|item| item.changed_at.get(0..10).map(|v| v == today_key).unwrap_or(false))
        .filter(|item| is_study_web_change(item))
        .cloned()
        .collect::<Vec<_>>();
    let pending_today_study_updates = today_study_updates
        .iter()
        .filter(|item| item.processed_at.is_none())
        .cloned()
        .collect::<Vec<_>>();

    let mut conflict_messages = Vec::new();
    if overlap_count > 0 {
        conflict_messages.push(format!("今日存在 {} 处时间段重叠。", overlap_count));
    }
    if total_minutes > 8 * 60 {
        conflict_messages.push(format!("今日预计负荷 {} 分钟，建议减载。", total_minutes));
    }
    if high_priority_count > 3 {
        conflict_messages.push(format!("今日高优先任务 {} 项，建议只保留 3 项核心。", high_priority_count));
    }
    if overdue_count > 0 {
        conflict_messages.push(format!("存在 {} 项历史超期任务，会影响今日节奏。", overdue_count));
    }
    if conflict_messages.is_empty() {
        conflict_messages.push("今日任务结构可控，按优先级推进即可。".to_string());
    }

    let risk_level = if overlap_count > 0 || overdue_count > 0 || (total_minutes > 9 * 60 && high_priority_count > 3) {
        "high".to_string()
    } else if total_minutes > 8 * 60 || high_priority_count > 3 {
        "medium".to_string()
    } else {
        "low".to_string()
    };

    let mut ranked = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| {
            let ddl = task.deadline.as_deref().and_then(parse_yyyy_mm_dd);
            let ddl_diff = ddl.map(|d| (d - date).num_days()).unwrap_or(999);
            let priority_score = match task.priority.as_str() {
                "高" => 0_i64,
                "中" => 1_i64,
                _ => 2_i64,
            };
            Some((ddl_diff, priority_score, task.clone()))
        })
        .collect::<Vec<_>>();
    ranked.sort_by_key(|(ddl_diff, priority_score, _)| (*ddl_diff, *priority_score));
    let priority_three = ranked
        .into_iter()
        .take(3)
        .map(|(diff, _, task)| {
            let reason = if diff < 0 {
                format!("已超期 {} 天", diff.abs())
            } else if diff <= 2 {
                format!("距离 DDL {} 天", diff)
            } else {
                "核心推进项".to_string()
            };
            (task.id, task.title, reason)
        })
        .collect::<Vec<_>>();

    let mut today_calendar = today_tasks
        .iter()
        .map(|task| {
            let time = match (&task.time_start, &task.time_end) {
                (Some(s), Some(e)) => format!("{s}-{e}"),
                _ => "未设置时段".to_string(),
            };
            format!("{time} · {}（{}）", task.title, task.status)
        })
        .collect::<Vec<_>>();
    if today_calendar.is_empty() {
        today_calendar.push("今天还没有固定日程，可先锁定 2 个专注时段。".to_string());
    }

    let mut suggestions: Vec<BriefingSuggestionDraft> = Vec::new();
    if let Some((_, title, _)) = priority_three.first() {
        let task_payload = serde_json::json!({
            "title": format!("专注推进：{}", title),
            "description": "来自晨间简报建议：先完成今天最关键的一项任务。",
            "sourceType": "assistant_briefing",
            "sourceId": serde_json::Value::Null,
            "taskType": "专注",
            "priority": "高",
            "status": "未开始",
            "estimatedMinutes": 50,
            "scheduledDate": today_key,
            "timeStart": serde_json::Value::Null,
            "timeEnd": serde_json::Value::Null,
            "reminderAt": serde_json::Value::Null,
            "deadline": today_key,
            "parentTaskId": serde_json::Value::Null,
            "recurrenceEnabled": false,
            "recurrenceType": serde_json::Value::Null,
            "recurrenceInterval": serde_json::Value::Null,
            "recurrenceDaysOfWeek": serde_json::Value::Null,
            "recurrenceDayOfMonth": serde_json::Value::Null,
            "recurrenceUntil": serde_json::Value::Null,
            "recurrenceSourceTaskId": serde_json::Value::Null,
            "completionTag": serde_json::Value::Null,
            "lastDelayReasonCode": serde_json::Value::Null,
            "lastDelayReasonNote": serde_json::Value::Null
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: "一键创建首件关键任务专注块".to_string(),
            action_type: "create_task".to_string(),
            action_payload_json: Some(task_payload),
        });
    }
    if let Some(task) = carryover_unfinished.first() {
        let carry_payload = serde_json::json!({
            "title": format!("先清结转：{}", task.title),
            "description": "来自晨间简报：优先处理历史未完成任务，避免继续堆积。",
            "sourceType": "assistant_briefing",
            "sourceId": serde_json::Value::Null,
            "taskType": "结转清理",
            "priority": "高",
            "status": "未开始",
            "estimatedMinutes": 45,
            "scheduledDate": today_key,
            "timeStart": serde_json::Value::Null,
            "timeEnd": serde_json::Value::Null,
            "reminderAt": serde_json::Value::Null,
            "deadline": task.deadline.clone().unwrap_or_else(|| today_key.clone()),
            "parentTaskId": serde_json::Value::Null,
            "recurrenceEnabled": false,
            "recurrenceType": serde_json::Value::Null,
            "recurrenceInterval": serde_json::Value::Null,
            "recurrenceDaysOfWeek": serde_json::Value::Null,
            "recurrenceDayOfMonth": serde_json::Value::Null,
            "recurrenceUntil": serde_json::Value::Null,
            "recurrenceSourceTaskId": serde_json::Value::Null,
            "completionTag": serde_json::Value::Null,
            "lastDelayReasonCode": serde_json::Value::Null,
            "lastDelayReasonNote": serde_json::Value::Null
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: format!("一键创建结转处理任务：{}", task.title),
            action_type: "create_task".to_string(),
            action_payload_json: Some(carry_payload),
        });
    }
    if let Some(task) = pending_today.first() {
        let must_payload = serde_json::json!({
            "title": format!("今日必做优先：{}", task.title),
            "description": "来自晨间简报：先完成今日应完成任务，降低晚间延期风险。",
            "sourceType": "assistant_briefing",
            "sourceId": serde_json::Value::Null,
            "taskType": "今日必做",
            "priority": "高",
            "status": "未开始",
            "estimatedMinutes": task.estimated_minutes.unwrap_or(50),
            "scheduledDate": today_key,
            "timeStart": task.time_start.clone(),
            "timeEnd": task.time_end.clone(),
            "reminderAt": serde_json::Value::Null,
            "deadline": task.deadline.clone().unwrap_or_else(|| today_key.clone()),
            "parentTaskId": serde_json::Value::Null,
            "recurrenceEnabled": false,
            "recurrenceType": serde_json::Value::Null,
            "recurrenceInterval": serde_json::Value::Null,
            "recurrenceDaysOfWeek": serde_json::Value::Null,
            "recurrenceDayOfMonth": serde_json::Value::Null,
            "recurrenceUntil": serde_json::Value::Null,
            "recurrenceSourceTaskId": serde_json::Value::Null,
            "completionTag": serde_json::Value::Null,
            "lastDelayReasonCode": serde_json::Value::Null,
            "lastDelayReasonNote": serde_json::Value::Null
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: format!("一键创建今日必做推进任务：{}", task.title),
            action_type: "create_task".to_string(),
            action_payload_json: Some(must_payload),
        });
    }
    if let Some(notification) = critical_unread_notifications.first() {
        if let Some((title, description, priority, suggested_deadline)) =
            build_notification_task_suggestion(notification)
        {
            let notification_payload = serde_json::json!({
                "title": title,
                "description": format!("来自晨间简报：优先清理严重通知。\n{}", description),
                "sourceType": "assistant_briefing",
                "sourceId": serde_json::Value::Null,
                "taskType": "通知处置",
                "priority": priority,
                "status": "未开始",
                "estimatedMinutes": 35,
                "scheduledDate": today_key,
                "timeStart": serde_json::Value::Null,
                "timeEnd": serde_json::Value::Null,
                "reminderAt": serde_json::Value::Null,
                "deadline": suggested_deadline.unwrap_or_else(|| today_key.clone()),
                "parentTaskId": serde_json::Value::Null,
                "recurrenceEnabled": false,
                "recurrenceType": serde_json::Value::Null,
                "recurrenceInterval": serde_json::Value::Null,
                "recurrenceDaysOfWeek": serde_json::Value::Null,
                "recurrenceDayOfMonth": serde_json::Value::Null,
                "recurrenceUntil": serde_json::Value::Null,
                "recurrenceSourceTaskId": serde_json::Value::Null,
                "completionTag": serde_json::Value::Null,
                "lastDelayReasonCode": serde_json::Value::Null,
                "lastDelayReasonNote": serde_json::Value::Null
            })
            .to_string();
            suggestions.push(BriefingSuggestionDraft {
                title: format!("一键创建通知处置任务：{}", notification.title),
                action_type: "create_task".to_string(),
                action_payload_json: Some(notification_payload),
            });
        }
    }
    if total_minutes > 9 * 60 {
        if let Some(task) = pending_today.iter().rev().find(|task| task.priority != "高") {
            let tomorrow = (date + chrono::Duration::days(1)).format("%Y-%m-%d").to_string();
            let postpone_payload = serde_json::json!({
                "taskId": task.id,
                "newScheduledDate": tomorrow,
                "newDeadline": task.deadline.clone().unwrap_or_else(|| tomorrow.clone()),
                "newTimeStart": serde_json::Value::Null,
                "newTimeEnd": serde_json::Value::Null,
                "reasonCode": "精力不足",
                "reasonNote": "晨间简报建议：当前日负荷过高，建议减载后提高完成率。"
            })
            .to_string();
            suggestions.push(BriefingSuggestionDraft {
                title: format!("一键顺延低优先任务：{}", task.title),
                action_type: "postpone_task".to_string(),
                action_payload_json: Some(postpone_payload),
            });
        }
    }

    let nearest_project = projects
        .iter()
        .filter(|project| project.status != "完成")
        .filter_map(|project| {
            let ddl = project.deadline.as_deref().and_then(parse_yyyy_mm_dd)?;
            Some((project.school_name.clone(), project.program_name.clone(), (ddl - date).num_days()))
        })
        .min_by_key(|(_, _, diff)| *diff);

    let mut summary_lines = vec![
        format!("今日任务总览：{} 项（未完成 {} 项）。", today_tasks.len(), pending_today.len()),
        format!(
            "历史未完成任务：{} 项。{}",
            carryover_unfinished.len(),
            summarize_task_digest(&carryover_unfinished, date, 4, "暂无")
        ),
        format!(
            "今日应完成任务：{} 项。{}",
            today_tasks.len(),
            summarize_task_digest(&today_tasks, date, 4, "今日暂未设定任务")
        ),
        format!(
            "最紧急 DDL：{}",
            urgent_deadlines
                .first()
                .map(|(_, title, diff, _)| {
                    if *diff < 0 {
                        format!("{title}（已超期 {} 天）", diff.abs())
                    } else {
                        format!("{title}（剩余 {diff} 天）")
                    }
                })
                .unwrap_or_else(|| "暂无 3 天内任务 DDL".to_string())
        ),
        format!("今日冲突风险：{}", conflict_messages.join("；")),
        format!(
            "建议优先 3 件事：{}",
            if priority_three.is_empty() {
                "今天可先做资料整理与复盘。".to_string()
            } else {
                priority_three
                    .iter()
                    .map(|(_, title, reason)| format!("{title}（{reason}）"))
                    .collect::<Vec<_>>()
                    .join("；")
            }
        ),
        format!("今日日历安排：{}", today_calendar.join("；")),
    ];
    if total_minutes > 8 * 60 {
        summary_lines.push("建议：今日任务负荷偏高，建议降低负荷或至少提前启动首个高优先任务。".to_string());
    } else {
        summary_lines.push("建议：负荷可控，先做高优先任务，再安排文书/刷题。".to_string());
    }
    if let Some((school, program, diff)) = nearest_project {
        summary_lines.push(if diff < 0 {
            format!("申请提醒：{school} · {program} 已超期 {} 天，请立即检查补交策略。", diff.abs())
        } else {
            format!("申请提醒：{school} · {program} 距离 DDL {diff} 天。")
        });
    }
    if !critical_unread_notifications.is_empty() {
        let top = critical_unread_notifications
            .iter()
            .take(2)
            .map(|item| item.title.clone())
            .collect::<Vec<_>>()
            .join("；");
        summary_lines.push(format!(
            "通知风险：有 {} 条严重未读提醒，优先处理：{}。",
            critical_unread_notifications.len(),
            top
        ));
    }
    if !today_study_updates.is_empty() {
        let top = today_study_updates
            .iter()
            .take(2)
            .map(|item| item.source_title.clone().unwrap_or_else(|| "学习资源页".to_string()))
            .collect::<Vec<_>>()
            .join("；");
        summary_lines.push(format!(
            "学习资源更新：今日 {} 条（待处理 {} 条），建议优先查看：{}。",
            today_study_updates.len(),
            pending_today_study_updates.len(),
            top
        ));
    } else {
        summary_lines.push("学习资源更新：今日暂无新增。".to_string());
    }

    let detail_json = serde_json::json!({
        "briefType": "morning",
        "dateKey": today_key,
        "todayTaskTotal": today_tasks.len(),
        "todayPendingTotal": pending_today.len(),
        "carryoverUnfinishedTotal": carryover_unfinished.len(),
        "carryoverUnfinished": carryover_unfinished.iter().map(|task| {
            serde_json::json!({
                "taskId": task.id,
                "title": task.title,
                "status": task.status,
                "priority": task.priority,
                "scheduledDate": task.scheduled_date,
                "deadline": task.deadline
            })
        }).collect::<Vec<_>>(),
        "todayMustDoTasks": today_tasks.iter().map(|task| {
            serde_json::json!({
                "taskId": task.id,
                "title": task.title,
                "status": task.status,
                "priority": task.priority,
                "scheduledDate": task.scheduled_date,
                "deadline": task.deadline
            })
        }).collect::<Vec<_>>(),
        "urgentDeadlines": urgent_deadlines.iter().take(8).map(|(task_id, title, diff, priority)| {
            serde_json::json!({ "taskId": task_id, "title": title, "daysToDeadline": diff, "priority": priority })
        }).collect::<Vec<_>>(),
        "conflictRiskMessages": conflict_messages,
        "priorityTop3": priority_three.iter().map(|(task_id, title, reason)| {
            serde_json::json!({ "taskId": task_id, "title": title, "reason": reason })
        }).collect::<Vec<_>>(),
        "todayCalendar": today_calendar,
        "totalEstimatedMinutes": total_minutes,
        "highPriorityCount": high_priority_count,
        "overdueTaskCount": overdue_count,
        "criticalUnreadNotificationCount": critical_unread_notifications.len(),
        "criticalUnreadNotifications": critical_unread_notifications.iter().take(6).map(|item| {
            serde_json::json!({
                "id": item.id,
                "title": item.title,
                "sourceType": item.source_type,
                "createdAt": item.created_at
            })
        }).collect::<Vec<_>>(),
        "todayStudyUpdatesTotal": today_study_updates.len(),
        "todayStudyUpdatesPending": pending_today_study_updates.len(),
        "todayStudyUpdates": today_study_updates.iter().take(8).map(|item| {
            serde_json::json!({
                "changeId": item.id,
                "sourceTitle": item.source_title,
                "changeDirection": item.change_direction,
                "processedAt": item.processed_at,
                "changedAt": item.changed_at
            })
        }).collect::<Vec<_>>(),
        "loadAdvice": if total_minutes > 8 * 60 { "reduce_or_start_early" } else { "normal" }
    })
    .to_string();

    Ok(BriefingBuildResult {
        summary_text: summary_lines.join(" "),
        risk_level,
        detail_json,
        push_title: format!("晨间简报 {}", today_key),
        push_body: summary_lines.join("\n"),
        summary_lines,
        suggestions,
    })
}

fn build_evening_briefing(db_path: &std::path::Path, date: chrono::NaiveDate) -> Result<BriefingBuildResult, String> {
    let tasks = db::list_tasks(db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let focus = db::get_focus_stats(db_path).map_err(|error| format!("failed to get focus stats: {error}"))?;
    let web_changes = db::list_web_change_logs(
        db_path,
        &db::WebChangeLogQueryInput {
            watcher_id: None,
            source_id: None,
            linked_project_id: None,
            limit: Some(120),
        },
    )
    .map_err(|error| format!("failed to list web changes for evening briefing: {error}"))?;
    let today_key = date.format("%Y-%m-%d").to_string();
    let tomorrow_key = (date + chrono::Duration::days(1)).format("%Y-%m-%d").to_string();

    let completed_today = tasks
        .iter()
        .filter(|task| !task_is_unfinished(task))
        .filter(|task| {
            task.updated_at
                .get(0..10)
                .map(|value| value == today_key)
                .unwrap_or(false)
        })
        .map(|task| task.title.clone())
        .collect::<Vec<_>>();
    let carryover_unfinished = tasks
        .iter()
        .filter(|task| task_is_carryover_unfinished(task, date))
        .cloned()
        .collect::<Vec<_>>();
    let today_must_do = tasks
        .iter()
        .filter(|task| task_is_today_target(task, date))
        .cloned()
        .collect::<Vec<_>>();
    let today_must_do_pending = today_must_do
        .iter()
        .filter(|task| task_is_unfinished(task))
        .cloned()
        .collect::<Vec<_>>();
    let today_study_updates = web_changes
        .iter()
        .filter(|item| item.changed_at.get(0..10).map(|v| v == today_key).unwrap_or(false))
        .filter(|item| is_study_web_change(item))
        .cloned()
        .collect::<Vec<_>>();
    let pending_today_study_updates = today_study_updates
        .iter()
        .filter(|item| item.processed_at.is_none())
        .cloned()
        .collect::<Vec<_>>();

    let mut postponed_today: Vec<(i64, String, Option<String>)> = Vec::new();
    let mut delay_reason_counter: HashMap<String, i64> = HashMap::new();
    for task in &tasks {
        let logs = db::list_task_event_logs(db_path, task.id, 20).unwrap_or_default();
        for log in logs {
            let same_day = log
                .created_at
                .get(0..10)
                .map(|value| value == today_key)
                .unwrap_or(false);
            if !same_day {
                continue;
            }
            if log.event_type == "postpone" {
                postponed_today.push((task.id, task.title.clone(), log.reason_code.clone()));
                if let Some(reason) = log.reason_code {
                    *delay_reason_counter.entry(reason).or_insert(0) += 1;
                } else {
                    *delay_reason_counter.entry("未填写".to_string()).or_insert(0) += 1;
                }
            }
        }
    }

    let overdue_unfinished = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| {
            let ddl = task.deadline.as_deref().and_then(parse_yyyy_mm_dd)?;
            if ddl < date {
                Some((task.id, task.title.clone(), (date - ddl).num_days(), task.priority.clone()))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    let tomorrow_focus = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| {
            let ddl = task.deadline.as_deref().and_then(parse_yyyy_mm_dd)?;
            let diff = (ddl - date).num_days();
            if diff <= 1 {
                Some(format!("{}（{}，剩余 {} 天）", task.title, task.priority, diff))
            } else {
                None
            }
        })
        .take(3)
        .collect::<Vec<_>>();

    let mut reason_items = delay_reason_counter
        .iter()
        .map(|(reason, count)| format!("{reason}: {count}"))
        .collect::<Vec<_>>();
    reason_items.sort();
    if reason_items.is_empty() {
        reason_items.push("今日无延期记录".to_string());
    }

    let mut suggestions: Vec<BriefingSuggestionDraft> = Vec::new();
    for (task_id, title, days, _) in overdue_unfinished.iter().take(2) {
        let postpone_payload = serde_json::json!({
            "taskId": task_id,
            "newScheduledDate": tomorrow_key,
            "newDeadline": tomorrow_key,
            "newTimeStart": serde_json::Value::Null,
            "newTimeEnd": serde_json::Value::Null,
            "reasonCode": "临时插入任务",
            "reasonNote": format!("晚间回顾建议：任务已超期 {} 天，自动顺延并明日优先处理。", days)
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: format!("一键顺延到明天：{}", title),
            action_type: "postpone_task".to_string(),
            action_payload_json: Some(postpone_payload),
        });
    }
    if let Some(task) = today_must_do_pending.first() {
        let tomorrow_payload = serde_json::json!({
            "title": format!("明日先做：{}", task.title),
            "description": "来自晚间回顾：将今日未完成的关键任务前置到明日第一时段。",
            "sourceType": "assistant_briefing",
            "sourceId": serde_json::Value::Null,
            "taskType": "明日重点",
            "priority": "高",
            "status": "未开始",
            "estimatedMinutes": task.estimated_minutes.unwrap_or(45),
            "scheduledDate": tomorrow_key,
            "timeStart": serde_json::Value::Null,
            "timeEnd": serde_json::Value::Null,
            "reminderAt": serde_json::Value::Null,
            "deadline": task.deadline.clone().unwrap_or_else(|| tomorrow_key.clone()),
            "parentTaskId": serde_json::Value::Null,
            "recurrenceEnabled": false,
            "recurrenceType": serde_json::Value::Null,
            "recurrenceInterval": serde_json::Value::Null,
            "recurrenceDaysOfWeek": serde_json::Value::Null,
            "recurrenceDayOfMonth": serde_json::Value::Null,
            "recurrenceUntil": serde_json::Value::Null,
            "recurrenceSourceTaskId": serde_json::Value::Null,
            "completionTag": serde_json::Value::Null,
            "lastDelayReasonCode": serde_json::Value::Null,
            "lastDelayReasonNote": serde_json::Value::Null
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: format!("一键创建明日重点任务：{}", task.title),
            action_type: "create_task".to_string(),
            action_payload_json: Some(tomorrow_payload),
        });
    }
    if focus.today_minutes < 60 {
        let payload = serde_json::json!({
            "title": "明日晨间 25 分钟启动任务",
            "description": "来自晚间回顾建议：先用 25 分钟启动最关键任务。",
            "sourceType": "assistant_briefing",
            "sourceId": serde_json::Value::Null,
            "taskType": "复盘",
            "priority": "中",
            "status": "未开始",
            "estimatedMinutes": 25,
            "scheduledDate": tomorrow_key,
            "timeStart": serde_json::Value::Null,
            "timeEnd": serde_json::Value::Null,
            "reminderAt": serde_json::Value::Null,
            "deadline": tomorrow_key,
            "parentTaskId": serde_json::Value::Null,
            "recurrenceEnabled": false,
            "recurrenceType": serde_json::Value::Null,
            "recurrenceInterval": serde_json::Value::Null,
            "recurrenceDaysOfWeek": serde_json::Value::Null,
            "recurrenceDayOfMonth": serde_json::Value::Null,
            "recurrenceUntil": serde_json::Value::Null,
            "recurrenceSourceTaskId": serde_json::Value::Null,
            "completionTag": serde_json::Value::Null,
            "lastDelayReasonCode": serde_json::Value::Null,
            "lastDelayReasonNote": serde_json::Value::Null
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: "一键创建明日启动任务".to_string(),
            action_type: "create_task".to_string(),
            action_payload_json: Some(payload),
        });
    }
    if let Some(item) = pending_today_study_updates.first() {
        let source_title = item
            .source_title
            .clone()
            .unwrap_or_else(|| "学习资源页".to_string());
        let title = format!("检查学习资源更新：{}", source_title);
        let description = format!(
            "来自晚间回顾：{}。建议明天第一时段完成阅读并更新计划。",
            item.ai_summary
                .clone()
                .unwrap_or_else(|| item.diff_summary.clone())
        );
        let payload = serde_json::json!({
            "title": title,
            "description": description,
            "sourceType": "assistant_briefing",
            "sourceId": serde_json::Value::Null,
            "taskType": "学习更新",
            "priority": "中",
            "status": "未开始",
            "estimatedMinutes": 30,
            "scheduledDate": tomorrow_key,
            "timeStart": serde_json::Value::Null,
            "timeEnd": serde_json::Value::Null,
            "reminderAt": serde_json::Value::Null,
            "deadline": tomorrow_key,
            "parentTaskId": serde_json::Value::Null,
            "recurrenceEnabled": false,
            "recurrenceType": serde_json::Value::Null,
            "recurrenceInterval": serde_json::Value::Null,
            "recurrenceDaysOfWeek": serde_json::Value::Null,
            "recurrenceDayOfMonth": serde_json::Value::Null,
            "recurrenceUntil": serde_json::Value::Null,
            "recurrenceSourceTaskId": serde_json::Value::Null,
            "completionTag": serde_json::Value::Null,
            "lastDelayReasonCode": serde_json::Value::Null,
            "lastDelayReasonNote": serde_json::Value::Null
        })
        .to_string();
        suggestions.push(BriefingSuggestionDraft {
            title: format!("一键创建学习更新处理任务：{}", source_title),
            action_type: "create_task".to_string(),
            action_payload_json: Some(payload),
        });
    }

    let risk_level = if !overdue_unfinished.is_empty() || postponed_today.len() >= 3 {
        "high".to_string()
    } else if !postponed_today.is_empty() || focus.today_minutes < 50 {
        "medium".to_string()
    } else {
        "low".to_string()
    };

    let summary_lines = vec![
        format!(
            "今天完成了什么：{}",
            if completed_today.is_empty() {
                "暂无完成记录".to_string()
            } else {
                completed_today.iter().take(5).cloned().collect::<Vec<_>>().join("；")
            }
        ),
        format!(
            "延期任务：{} 项。",
            postponed_today.len()
        ),
        format!(
            "历史未完成任务：{} 项。{}",
            carryover_unfinished.len(),
            summarize_task_digest(&carryover_unfinished, date, 4, "暂无")
        ),
        format!(
            "今日应完成任务：{} 项，未完成 {} 项。{}",
            today_must_do.len(),
            today_must_do_pending.len(),
            summarize_task_digest(&today_must_do, date, 4, "今日未设应完成任务")
        ),
        format!("延期原因统计：{}", reason_items.join("；")),
        format!(
            "今日专注：{} 分钟，近 7 天中断 {} 次。",
            focus.today_minutes, focus.interrupted_count
        ),
        format!(
            "明日建议关注：{}",
            if tomorrow_focus.is_empty() {
                "先完成今日未完成的高优先任务。".to_string()
            } else {
                tomorrow_focus.join("；")
            }
        ),
        if today_study_updates.is_empty() {
            "学习资源更新：今日暂无新增。".to_string()
        } else {
            format!(
                "学习资源更新：今日 {} 条（待处理 {} 条）。",
                today_study_updates.len(),
                pending_today_study_updates.len()
            )
        },
        if overdue_unfinished.is_empty() {
            "自动顺延建议：暂无必须顺延任务。".to_string()
        } else {
            format!("自动顺延建议：有 {} 项超期任务可一键顺延到明天。", overdue_unfinished.len())
        },
    ];

    let detail_json = serde_json::json!({
        "briefType": "evening",
        "dateKey": today_key,
        "completedToday": completed_today,
        "carryoverUnfinishedTotal": carryover_unfinished.len(),
        "carryoverUnfinished": carryover_unfinished.iter().map(|task| {
            serde_json::json!({
                "taskId": task.id,
                "title": task.title,
                "status": task.status,
                "priority": task.priority,
                "scheduledDate": task.scheduled_date,
                "deadline": task.deadline
            })
        }).collect::<Vec<_>>(),
        "todayMustDoTotal": today_must_do.len(),
        "todayMustDoPendingTotal": today_must_do_pending.len(),
        "todayMustDoTasks": today_must_do.iter().map(|task| {
            serde_json::json!({
                "taskId": task.id,
                "title": task.title,
                "status": task.status,
                "priority": task.priority,
                "scheduledDate": task.scheduled_date,
                "deadline": task.deadline
            })
        }).collect::<Vec<_>>(),
        "postponedToday": postponed_today.iter().map(|(task_id, title, reason)| {
            serde_json::json!({ "taskId": task_id, "title": title, "reasonCode": reason })
        }).collect::<Vec<_>>(),
        "delayReasonStats": delay_reason_counter,
        "focusStats": {
            "todayMinutes": focus.today_minutes,
            "weekMinutes": focus.week_minutes,
            "interruptedCount": focus.interrupted_count
        },
        "todayStudyUpdatesTotal": today_study_updates.len(),
        "todayStudyUpdatesPending": pending_today_study_updates.len(),
        "todayStudyUpdates": today_study_updates.iter().take(8).map(|item| {
            serde_json::json!({
                "changeId": item.id,
                "sourceTitle": item.source_title,
                "changeDirection": item.change_direction,
                "processedAt": item.processed_at,
                "changedAt": item.changed_at
            })
        }).collect::<Vec<_>>(),
        "tomorrowFocus": tomorrow_focus,
        "overdueUnfinished": overdue_unfinished.iter().map(|(task_id, title, days, priority)| {
            serde_json::json!({ "taskId": task_id, "title": title, "overdueDays": days, "priority": priority })
        }).collect::<Vec<_>>()
    })
    .to_string();

    Ok(BriefingBuildResult {
        summary_text: summary_lines.join(" "),
        risk_level,
        detail_json,
        summary_lines: summary_lines.clone(),
        push_title: format!("晚间回顾 {}", today_key),
        push_body: summary_lines.join("\n"),
        suggestions,
    })
}

fn build_assistant_briefing(
    db_path: &std::path::Path,
    brief_type: &str,
    date: chrono::NaiveDate,
) -> Result<BriefingBuildResult, String> {
    match brief_type {
        "morning" => build_morning_briefing(db_path, date),
        "evening" => build_evening_briefing(db_path, date),
        _ => Err("unsupported brief type".to_string()),
    }
}

fn persist_assistant_briefing(
    db_path: &std::path::Path,
    brief_type: &str,
    date_key: &str,
    auto_generated: bool,
    built: BriefingBuildResult,
) -> Result<AssistantBriefingPayload, String> {
    let briefing_id = db::create_assistant_briefing(
        db_path,
        brief_type,
        date_key,
        &built.summary_text,
        &built.detail_json,
        &built.risk_level,
        auto_generated,
    )
    .map_err(|error| format!("failed to create assistant briefing: {error}"))?;

    for (index, suggestion) in built.suggestions.iter().enumerate() {
        db::create_assistant_briefing_suggestion(
            db_path,
            briefing_id,
            index as i64,
            &suggestion.title,
            &suggestion.action_type,
            suggestion.action_payload_json.as_deref(),
        )
        .map_err(|error| format!("failed to create assistant briefing suggestion: {error}"))?;
    }

    let briefing = db::list_assistant_briefings(db_path, None, None, 200)
        .map_err(|error| format!("failed to load briefings: {error}"))?
        .into_iter()
        .find(|item| item.id == briefing_id)
        .ok_or_else(|| "briefing not found after create".to_string())?;
    let suggestions = db::list_assistant_briefing_suggestions(db_path, briefing_id)
        .map_err(|error| format!("failed to list briefing suggestions: {error}"))?;
    Ok(AssistantBriefingPayload {
        briefing,
        suggestions,
        summary_lines: built.summary_lines,
    })
}

fn push_assistant_briefing_to_feishu(
    db_path: &std::path::Path,
    title: &str,
    body: &str,
    source: &str,
) -> Result<bool, String> {
    let enabled = bool_setting_enabled(
        db::get_app_setting(db_path, "feishu_enabled")
            .map_err(|error| format!("failed to read feishu enabled: {error}"))?,
        false,
    );
    let webhook = get_secret_optional(db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();
    if !enabled || webhook.trim().is_empty() {
        return Ok(false);
    }
    let text = format!("{title}\n{body}\n生成时间：{}", Local::now().format("%Y-%m-%d %H:%M:%S"));
    let decorated = decorate_feishu_webhook_text(db_path, &text)?;
    match send_feishu_webhook_message_with_dedupe(db_path, &webhook, &decorated, source) {
        Ok(_) => Ok(true),
        Err(error) => {
            let _ = db::create_notification(
                db_path,
                "feishu",
                "秘书简报推送失败",
                &error,
                Some("assistant_briefing"),
                None,
                "failed",
                None,
            );
            Err(error)
        }
    }
}

fn parse_first_number(text: &str) -> Option<i64> {
    let mut buf = String::new();
    for ch in text.chars() {
        if ch.is_ascii_digit() {
            buf.push(ch);
        } else if !buf.is_empty() {
            break;
        }
    }
    if buf.is_empty() {
        None
    } else {
        buf.parse::<i64>().ok()
    }
}

fn task_to_update_input(task: &db::Task) -> UpdateTaskInput {
    UpdateTaskInput {
        id: task.id,
        title: task.title.clone(),
        description: task.description.clone(),
        source_type: task.source_type.clone(),
        source_id: task.source_id,
        task_type: task.task_type.clone(),
        priority: task.priority.clone(),
        status: task.status.clone(),
        estimated_minutes: task.estimated_minutes,
        scheduled_date: task.scheduled_date.clone(),
        time_start: task.time_start.clone(),
        time_end: task.time_end.clone(),
        reminder_at: task.reminder_at.clone(),
        deadline: task.deadline.clone(),
        parent_task_id: task.parent_task_id,
        recurrence_enabled: Some(task.recurrence_enabled),
        recurrence_type: task.recurrence_type.clone(),
        recurrence_interval: task.recurrence_interval,
        recurrence_days_of_week: task.recurrence_days_of_week.clone(),
        recurrence_day_of_month: task.recurrence_day_of_month,
        recurrence_until: task.recurrence_until.clone(),
        recurrence_source_task_id: task.recurrence_source_task_id,
        completion_tag: task.completion_tag.clone(),
        last_delay_reason_code: task.last_delay_reason_code.clone(),
        last_delay_reason_note: task.last_delay_reason_note.clone(),
    }
}

fn parse_delay_reason_code(text: &str) -> Option<String> {
    let lower = text.to_lowercase();
    if lower.contains("低估") {
        return Some("低估时长".to_string());
    }
    if lower.contains("打断") {
        return Some("被打断".to_string());
    }
    if lower.contains("插入") || lower.contains("临时") {
        return Some("临时插入任务".to_string());
    }
    if lower.contains("精力") {
        return Some("精力不足".to_string());
    }
    if lower.contains("材料") {
        return Some("材料未齐".to_string());
    }
    None
}

fn parse_ai_digest_text(raw: &str) -> (String, Vec<String>) {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(raw) {
        let summary = value
            .get("summary")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        let actions = value
            .get("actions")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|item| item.as_str().map(|s| s.trim().to_string()))
                    .filter(|s| !s.is_empty())
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        if !summary.is_empty() || !actions.is_empty() {
            return (
                if summary.is_empty() { "已生成智能摘要。".to_string() } else { summary },
                if actions.is_empty() {
                    vec!["请按摘要中的优先级逐项执行。".to_string()]
                } else {
                    actions
                },
            );
        }
    }
    let lines = raw
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    if lines.is_empty() {
        return ("已生成智能摘要。".to_string(), vec!["请按当前计划推进。".to_string()]);
    }
    let summary = lines[0].to_string();
    let actions = lines
        .iter()
        .skip(1)
        .take(6)
        .map(|line| line.trim_start_matches(|c: char| c.is_ascii_digit() || c == '.' || c == '-' || c == ' ').to_string())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>();
    (
        summary,
        if actions.is_empty() {
            vec!["请按当前计划推进。".to_string()]
        } else {
            actions
        },
    )
}

fn call_gemini_generate(
    api_key: &str,
    model: &str,
    prompt: &str,
) -> Result<(String, Option<i64>, Option<i64>), String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model.trim(),
        api_key.trim()
    );
    let payload = serde_json::json!({
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.35
        }
    })
    .to_string();
    let output = Command::new("curl")
        .args([
            "-sS",
            "-X",
            "POST",
            "-H",
            "Content-Type: application/json",
            "-d",
            &payload,
            "--max-time",
            "45",
            &url,
        ])
        .output()
        .map_err(|error| format!("failed to execute gemini request: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("gemini request failed: {stderr}"));
    }
    let response_text = String::from_utf8_lossy(&output.stdout).to_string();
    let value: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|error| format!("invalid gemini response: {error}"))?;
    if let Some(err) = value.get("error") {
        let msg = err
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown gemini error");
        return Err(format!("gemini error: {msg}"));
    }
    let text = value
        .pointer("/candidates/0/content/parts/0/text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    if text.trim().is_empty() {
        return Err("gemini returned empty text".to_string());
    }
    let input_tokens = value
        .pointer("/usageMetadata/promptTokenCount")
        .and_then(|v| v.as_i64());
    let output_tokens = value
        .pointer("/usageMetadata/candidatesTokenCount")
        .and_then(|v| v.as_i64());
    Ok((text, input_tokens, output_tokens))
}

#[tauri::command]
fn run_secure_ai_prompt(
    app: tauri::AppHandle,
    model: Option<String>,
    system_prompt: Option<String>,
    prompt: String,
) -> Result<serde_json::Value, String> {
    let db_path = get_database_path(&app)?;
    let provider = db::get_app_setting(&db_path, "ai_provider")
        .map_err(|error| format!("failed to read ai provider: {error}"))?
        .unwrap_or_else(|| "gemini".to_string());
    let provider_normalized = provider.trim().to_ascii_lowercase();
    if provider_normalized == "openai" {
        return Err("当前安全通道仅支持 Gemini，请切换 provider 或扩展 OpenAI 后端实现。".to_string());
    }
    if provider_normalized != "gemini" && provider_normalized != "local" {
        return Err(format!("unsupported provider: {}", provider.trim()));
    }

    let gemini_model = model
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| {
            db::get_app_setting(&db_path, "gemini_model")
                .ok()
                .flatten()
                .unwrap_or_else(|| "gemini-1.5-flash".to_string())
        });

    let api_key = get_secret_optional(&db_path, keys::GEMINI_API_KEY)?
        .ok_or_else(|| "Gemini API Key 未配置".to_string())?;

    let effective_prompt = if let Some(system) = system_prompt
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        format!("System:\n{system}\n\nUser:\n{}", prompt.trim())
    } else {
        prompt.trim().to_string()
    };

    if effective_prompt.is_empty() {
        return Err("prompt is empty".to_string());
    }

    let (text, input_tokens, output_tokens) =
        call_gemini_generate(api_key.trim(), gemini_model.trim(), &effective_prompt)?;
    Ok(serde_json::json!({
        "text": text,
        "provider": "gemini",
        "model": gemini_model.trim(),
        "inputTokens": input_tokens,
        "outputTokens": output_tokens
    }))
}

fn is_http_url_ready(url: &str) -> bool {
    let output = Command::new("curl")
        .args(["-sS", "-I", "--max-time", "2", url])
        .output();
    match output {
        Ok(res) if res.status.success() => true,
        _ => false,
    }
}

fn send_feishu_webhook_message_once(webhook_url: &str, text: &str) -> Result<(), String> {
    let payload = serde_json::json!({
        "msg_type": "text",
        "content": {
            "text": text
        }
    })
    .to_string();

    let output = Command::new("curl")
        .args([
            "-sS",
            "-X",
            "POST",
            "-H",
            "Content-Type: application/json",
            "-d",
            &payload,
            webhook_url,
        ])
        .output()
        .map_err(|error| format!("failed to execute curl: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("feishu webhook request failed: {stderr}"));
    }
    Ok(())
}

fn send_feishu_webhook_message(webhook_url: &str, text: &str) -> Result<(), String> {
    let max_attempts = 3usize;
    let mut last_error: Option<String> = None;
    for attempt in 1..=max_attempts {
        match send_feishu_webhook_message_once(webhook_url, text) {
            Ok(_) => return Ok(()),
            Err(error) => {
                last_error = Some(error);
                if attempt < max_attempts {
                    let backoff_ms = 350_u64.saturating_mul(attempt as u64);
                    std::thread::sleep(std::time::Duration::from_millis(backoff_ms));
                }
            }
        }
    }
    Err(format!(
        "feishu webhook send failed after {} attempts: {}",
        max_attempts,
        last_error.unwrap_or_else(|| "unknown error".to_string())
    ))
}

enum FeishuWebhookSendResult {
    Sent,
    Deduped,
}

fn send_feishu_webhook_message_with_dedupe(
    db_path: &std::path::Path,
    webhook_url: &str,
    text: &str,
    source: &str,
) -> Result<FeishuWebhookSendResult, String> {
    let normalized = text.trim();
    let dedupe_key = format!("outbound|{}|{}", source.trim(), stable_hash_hex(normalized));
    let window_minutes = db::get_app_setting(db_path, "feishu_webhook_dedupe_window_minutes")
        .map_err(|error| format!("failed to read feishu dedupe window: {error}"))?
        .and_then(|raw| raw.trim().parse::<i64>().ok())
        .unwrap_or(10)
        .clamp(1, 240);
    let duplicated = db::find_recent_feishu_duplicate(db_path, "outbound", &dedupe_key, window_minutes)
        .map_err(|error| format!("failed to check outbound dedupe: {error}"))?;
    if duplicated.is_some() {
        let _ = db::create_feishu_message_log(
            db_path,
            "outbound",
            source,
            None,
            normalized,
            Some(normalized),
            Some("webhook_send"),
            None,
            "duplicate",
            None,
            None,
            Some(&dedupe_key),
            true,
            false,
            false,
            None,
            None,
            None,
            Some(0),
        );
        return Ok(FeishuWebhookSendResult::Deduped);
    }
    let start = std::time::Instant::now();
    match send_feishu_webhook_message(webhook_url, normalized) {
        Ok(_) => {
            let _ = db::create_feishu_message_log(
                db_path,
                "outbound",
                source,
                None,
                normalized,
                Some(normalized),
                Some("webhook_send"),
                None,
                "success",
                None,
                None,
                Some(&dedupe_key),
                false,
                false,
                false,
                None,
                None,
                None,
                Some(start.elapsed().as_millis() as i64),
            );
            Ok(FeishuWebhookSendResult::Sent)
        }
        Err(error) => {
            let _ = db::create_feishu_message_log(
                db_path,
                "outbound",
                source,
                None,
                normalized,
                Some(normalized),
                Some("webhook_send"),
                None,
                "failed",
                Some("WEBHOOK_SEND_FAILED"),
                Some(&error),
                Some(&dedupe_key),
                false,
                false,
                false,
                None,
                None,
                None,
                Some(start.elapsed().as_millis() as i64),
            );
            Err(error)
        }
    }
}

fn decorate_feishu_webhook_text(db_path: &std::path::Path, text: &str) -> Result<String, String> {
    let keyword = db::get_app_setting(db_path, "feishu_webhook_keyword")
        .map_err(|error| format!("failed to read feishu webhook keyword: {error}"))?
        .unwrap_or_default();
    let normalized = keyword.trim();
    if normalized.is_empty() || text.contains(normalized) {
        return Ok(text.to_string());
    }
    Ok(format!("{normalized}：{text}"))
}

fn maybe_send_feishu_inbound_reply(
    db_path: &std::path::Path,
    result: &FeishuCommandPayload,
    message_id: Option<&str>,
) -> Result<(), String> {
    let auto_reply_enabled = db::get_app_setting(db_path, "feishu_inbound_auto_reply_enabled")
        .map_err(|error| format!("failed to read inbound auto reply setting: {error}"))?
        .map(|raw| matches_true(Some(raw.as_str())))
        .unwrap_or(true);
    if !auto_reply_enabled {
        return Ok(());
    }
    let enabled = db::get_app_setting(db_path, "feishu_enabled")
        .map_err(|error| format!("failed to read feishu enabled: {error}"))?
        .map(|raw| matches_true(Some(raw.as_str())))
        .unwrap_or(false);
    if !enabled {
        return Ok(());
    }
    let webhook = get_secret_optional(db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();
    let webhook_trimmed = webhook.trim();
    if webhook_trimmed.is_empty() {
        return Ok(());
    }
    if webhook_trimmed.contains("127.0.0.1")
        || webhook_trimmed.contains("localhost")
        || webhook_trimmed.contains("/feishu/webhook")
    {
        // prevent accidental self-loop when user points outgoing webhook to local inbound endpoint
        return Ok(());
    }
    let status = if result.success { "已处理" } else { "处理失败" };
    let reason = result
        .error_message
        .as_ref()
        .map(|msg| format!("\n原因：{msg}"))
        .unwrap_or_default();
    let reply = format!(
        "飞书指令回执\n状态：{status}\n动作：{}\n结果：{}{}",
        result.action, result.summary, reason
    );
    if let Some(message_id) = message_id {
        if !message_id.trim().is_empty() {
            if send_feishu_message_reply_by_message_id(db_path, message_id.trim(), &reply).is_ok() {
                return Ok(());
            }
        }
    }
    let decorated = decorate_feishu_webhook_text(db_path, &reply)?;
    let send_result = send_feishu_webhook_message_with_dedupe(
        db_path,
        webhook_trimmed,
        &decorated,
        "inbound_reply",
    );
    if let Err(error) = send_result {
        let _ = db::create_notification(
            db_path,
            "feishu",
            "飞书回执失败",
            &format!("指令回执发送失败。\n动作：{}\n结果：{}\n原因：{}", result.action, result.summary, error),
            Some("feishu_delivery"),
            None,
            "failed",
            None,
        );
        return Err(error);
    }
    Ok(())
}

fn retry_single_feishu_delivery(
    db_path: &std::path::Path,
    item: &db::FeishuMessageLogRecord,
) -> Result<(), String> {
    if item.direction != "outbound" {
        return Err("当前仅支持重试 outbound 消息".to_string());
    }
    let content = item.raw_text.trim();
    if content.is_empty() {
        return Err("原始消息内容为空，无法重试".to_string());
    }
    if item.source == "inbound_reply_im" || item.parsed_action.as_deref() == Some("im_reply") {
        let message_id = item
            .message_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| "缺少 message_id，无法重试原会话回执".to_string())?;
        return send_feishu_message_reply_by_message_id(db_path, message_id, content);
    }
    let webhook = get_secret_optional(db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();
    if webhook.trim().is_empty() {
        return Err("未配置飞书 Webhook URL，无法重试".to_string());
    }
    let retry_source = format!("retry:{}", item.source.trim());
    send_feishu_webhook_message_with_dedupe(db_path, webhook.trim(), content, &retry_source)?;
    Ok(())
}

fn build_notification_task_suggestion(
    item: &db::NotificationRecord,
) -> Option<(String, String, String, Option<String>)> {
    if item.related_type.as_deref() == Some("task") || item.source_type == "task" {
        return None;
    }
    let priority = match item.priority.as_str() {
        "critical" => "高".to_string(),
        "warning" => "中".to_string(),
        _ => "低".to_string(),
    };
    let today = Local::now().format("%Y-%m-%d").to_string();
    let tomorrow = (Local::now() + chrono::Duration::days(1))
        .format("%Y-%m-%d")
        .to_string();
    let suggested_deadline = match item.priority.as_str() {
        "critical" => Some(today),
        "warning" => Some(tomorrow),
        _ => None,
    };
    let title = match item.source_type.as_str() {
        "ddl" => format!("处理 DDL 提醒：{}", item.title),
        "school_web_change" | "study_web_change" | "watch" => format!("核对网页变化：{}", item.title),
        "ai_suggestion" | "ai" => format!("跟进 AI 建议：{}", item.title),
        "feishu" if item.send_status == "failed" => format!("检查飞书发送失败：{}", item.title),
        "system" if item.title.contains("简报") => format!("查看秘书简报：{}", item.title),
        _ if item.priority == "critical" || item.priority == "warning" => format!("处理通知：{}", item.title),
        _ => return None,
    };
    let description = format!(
        "来源：{} · 级别：{} · 时间：{}\n{}\n聚合次数：{}",
        item.source_type,
        item.priority,
        item.created_at,
        item.content,
        item.aggregate_count
    );
    Some((title, description, priority, suggested_deadline))
}

fn generate_task_suggestions_from_notifications_with_db(
    db_path: &std::path::Path,
    limit: i64,
) -> Result<NotificationSuggestionBatchPayload, String> {
    let rows = db::list_notifications_with_filters(
        db_path,
        &NotificationQueryInput {
            source_types: None,
            priorities: None,
            unread_only: Some(true),
            include_ignored: Some(false),
            include_snoozed: Some(false),
            start_at: None,
            end_at: None,
            limit: Some(limit.clamp(1, 100)),
        },
    )
    .map_err(|error| format!("failed to list notifications for suggestion generation: {error}"))?;
    let mut created = 0_i64;
    let mut skipped = 0_i64;
    let mut suggestion_ids = Vec::new();
    for item in rows.iter() {
        let Some((title, description, priority, suggested_deadline)) = build_notification_task_suggestion(item) else {
            skipped += 1;
            continue;
        };
        let duplicated = db::find_pending_task_suggestion(db_path, "notification", Some(item.id), &title)
            .map_err(|error| format!("failed to check notification suggestion duplicate: {error}"))?;
        if duplicated.is_some() {
            skipped += 1;
            continue;
        }
        let suggestion_id = db::create_task_suggestion(
            db_path,
            "notification",
            Some(item.id),
            &title,
            Some(&description),
            &priority,
            suggested_deadline.as_deref(),
        )
        .map_err(|error| format!("failed to create notification suggestion: {error}"))?;
        let _ = db::record_notification_action(
            db_path,
            item.id,
            "queue_task_suggestion",
            Some(&serde_json::json!({
                "suggestionId": suggestion_id,
                "title": title
            }).to_string()),
        );
        created += 1;
        suggestion_ids.push(suggestion_id);
    }
    let scanned = rows.len() as i64;
    Ok(NotificationSuggestionBatchPayload {
        scanned,
        created,
        skipped,
        summary: if created == 0 {
            "已扫描通知，但当前没有新的建议任务可生成。".to_string()
        } else {
            format!("已扫描 {} 条通知，生成 {} 条建议任务，跳过 {} 条。", scanned, created, skipped)
        },
        suggestion_ids,
    })
}

fn send_feishu_message_reply_by_message_id(
    db_path: &std::path::Path,
    message_id: &str,
    text: &str,
) -> Result<(), String> {
    let result = (|| -> Result<(), String> {
        let app_id = get_secret_optional(db_path, keys::FEISHU_APP_ID)?
            .unwrap_or_default();
        let app_secret = get_secret_optional(db_path, keys::FEISHU_APP_SECRET)?
            .unwrap_or_default();
        if app_id.trim().is_empty() || app_secret.trim().is_empty() {
            return Err("未配置 feishu_app_id / feishu_app_secret，无法直接回执原会话".to_string());
        }
        let token = feishu_tenant_access_token(app_id.trim(), app_secret.trim())?;
        let content_json = serde_json::json!({ "text": text }).to_string();
        let payload = serde_json::json!({
            "msg_type": "text",
            "content": content_json
        })
        .to_string();
        let endpoint = format!(
            "https://open.feishu.cn/open-apis/im/v1/messages/{}/reply",
            message_id
        );
        let output = Command::new("curl")
            .args([
                "-sS",
                "-X",
                "POST",
                "-H",
                "Content-Type: application/json",
                "-H",
                &format!("Authorization: Bearer {token}"),
                "-d",
                &payload,
                &endpoint,
            ])
            .output()
            .map_err(|error| format!("failed to send feishu reply: {error}"))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
        let response_text = String::from_utf8_lossy(&output.stdout).to_string();
        let value: serde_json::Value = serde_json::from_str(&response_text)
            .map_err(|error| format!("invalid feishu reply response: {error}"))?;
        let code = value.get("code").and_then(|item| item.as_i64()).unwrap_or(-1);
        if code != 0 {
            let msg = value
                .get("msg")
                .and_then(|item| item.as_str())
                .unwrap_or("unknown feishu im reply error");
            return Err(format!("feishu im reply error: {msg}"));
        }
        Ok(())
    })();
    match result {
        Ok(()) => {
            let _ = db::create_feishu_message_log(
                db_path,
                "outbound",
                "inbound_reply_im",
                Some(message_id),
                text,
                None,
                Some("im_reply"),
                None,
                "success",
                None,
                None,
                Some(&format!("outbound|{}", stable_hash_hex(text))),
                false,
                false,
                false,
                None,
                None,
                None,
                None,
            );
            Ok(())
        }
        Err(error) => {
            let _ = db::create_feishu_message_log(
                db_path,
                "outbound",
                "inbound_reply_im",
                Some(message_id),
                text,
                None,
                Some("im_reply"),
                None,
                "failed",
                Some("IM_REPLY_FAILED"),
                Some(&error),
                Some(&format!("outbound|{}", stable_hash_hex(text))),
                false,
                false,
                false,
                None,
                None,
                None,
                None,
            );
            Err(error)
        }
    }
}

fn stable_hash_hex(input: &str) -> String {
    let mut hash: u64 = 0xcbf29ce484222325;
    for byte in input.as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

fn fetch_webpage_text(url: &str) -> Result<String, String> {
    let output = Command::new("curl")
        .args(["-sS", "-L", "--max-time", "20", url])
        .output()
        .map_err(|error| format!("failed to execute curl: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("curl failed: {stderr}"));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn extract_html_title(raw: &str) -> Option<String> {
    let lower = raw.to_ascii_lowercase();
    let start_tag = "<title>";
    let end_tag = "</title>";
    let start = lower.find(start_tag)?;
    let end = lower[start + start_tag.len()..].find(end_tag)?;
    let title_start = start + start_tag.len();
    let title_end = title_start + end;
    let value = raw.get(title_start..title_end)?.trim().to_string();
    if value.is_empty() { None } else { Some(value) }
}

fn html_to_plain_text(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    let mut in_tag = false;
    for ch in raw.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                out.push(' ');
            }
            _ => {
                if !in_tag {
                    out.push(ch);
                }
            }
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn excerpt_text(raw: &str, max_chars: usize) -> String {
    let plain = html_to_plain_text(raw);
    plain.chars().take(max_chars).collect()
}

fn extract_change_signals(text: &str) -> Vec<String> {
    let mut signals = Vec::new();
    let lower = text.to_ascii_lowercase();
    let keywords = vec![
        ("deadline", "检测到 deadline 相关描述"),
        ("application", "检测到 application 相关描述"),
        ("requirement", "检测到 requirement 相关描述"),
        ("scholarship", "检测到 scholarship 相关描述"),
        ("截止", "检测到“截止”相关描述"),
        ("申请", "检测到“申请”相关描述"),
        ("材料", "检测到“材料”相关描述"),
        ("奖学金", "检测到“奖学金”相关描述"),
        ("gre", "检测到 GRE 相关描述"),
        ("toefl", "检测到 TOEFL 相关描述"),
        ("ielts", "检测到 IELTS 相关描述"),
    ];
    for (needle, label) in keywords {
        if lower.contains(needle) {
            signals.push(label.to_string());
        }
    }
    let mut date_hits = Vec::new();
    for token in text.split_whitespace() {
        let trimmed = token.trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != '-' && c != '/');
        let has_digit = trimmed.chars().any(|c| c.is_ascii_digit());
        if has_digit
            && ((trimmed.len() >= 8 && trimmed.contains('-')) || (trimmed.len() >= 8 && trimmed.contains('/')))
        {
            date_hits.push(trimmed.to_string());
            if date_hits.len() >= 3 {
                break;
            }
        }
    }
    if !date_hits.is_empty() {
        signals.push(format!("检测到日期样式：{}", date_hits.join(", ")));
    }
    signals
}

fn classify_watch_priority(signals: &[String]) -> &'static str {
    let joined = signals.join(" ");
    if joined.contains("deadline")
        || joined.contains("截止")
        || joined.contains("材料")
        || joined.contains("requirement")
        || joined.contains("日期样式")
    {
        "高"
    } else if joined.contains("申请") || joined.contains("application") || joined.contains("scholarship") {
        "中"
    } else {
        "低"
    }
}

fn detect_first_date_like(text: &str) -> Option<String> {
    for token in text.split_whitespace() {
        let cleaned = token.trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != '-' && c != '/');
        if cleaned.len() < 8 {
            continue;
        }
        let normalized = cleaned.replace('/', "-");
        let candidate = normalized.get(0..10).unwrap_or(normalized.as_str());
        if let Some(date) = parse_yyyy_mm_dd(candidate) {
            return Some(date.format("%Y-%m-%d").to_string());
        }
    }
    None
}

fn normalize_watch_type(raw: Option<&str>) -> String {
    match raw.unwrap_or("full_page_text").trim() {
        "selector_text" => "selector_text".to_string(),
        "title_only" => "title_only".to_string(),
        "metadata_only" => "metadata_only".to_string(),
        _ => "full_page_text".to_string(),
    }
}

fn normalize_watch_frequency(raw: Option<&str>) -> String {
    match raw.unwrap_or("daily").trim() {
        "manual" => "manual".to_string(),
        "every_6h" => "every_6h".to_string(),
        "weekly" => "weekly".to_string(),
        _ => "daily".to_string(),
    }
}

fn parse_mixed_datetime(value: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S") {
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc));
    }
    None
}

fn infer_web_source_type(url: &str, title: &str, text: &str) -> String {
    let sample = format!("{} {} {}", url, title, text).to_lowercase();
    if sample.contains("announcement") || sample.contains("公告") {
        "announcement".to_string()
    } else if sample.contains("blog")
        || sample.contains("article")
        || sample.contains("post")
        || sample.contains("笔记")
    {
        "article".to_string()
    } else if sample.contains("docs")
        || sample.contains("documentation")
        || sample.contains("guide")
        || sample.contains("manual")
    {
        "docs".to_string()
    } else if sample.contains("deadline")
        || sample.contains("admission")
        || sample.contains("requirement")
        || sample.contains("scholarship")
        || sample.contains("apply")
        || sample.contains("申请")
        || sample.contains("截止")
    {
        "page".to_string()
    } else {
        "other".to_string()
    }
}

fn infer_web_category(url: &str, title: &str, text: &str) -> String {
    let sample = format!("{} {} {}", url, title, text).to_lowercase();
    if sample.contains("admission")
        || sample.contains("deadline")
        || sample.contains("requirement")
        || sample.contains("scholarship")
        || sample.contains("申请")
        || sample.contains("文书")
    {
        "application".to_string()
    } else if sample.contains("ielts")
        || sample.contains("toefl")
        || sample.contains("gre")
        || sample.contains("course")
        || sample.contains("study")
        || sample.contains("学习")
    {
        "study".to_string()
    } else if sample.contains("price")
        || sample.contains("product")
        || sample.contains("work")
        || sample.contains("release")
    {
        "work".to_string()
    } else if sample.contains("blog") || sample.contains("newsletter") {
        "personal".to_string()
    } else {
        "other".to_string()
    }
}

fn extract_domain(url: &str) -> String {
    let cleaned = url
        .trim()
        .trim_start_matches("https://")
        .trim_start_matches("http://");
    cleaned
        .split('/')
        .next()
        .unwrap_or(cleaned)
        .trim()
        .to_string()
}

fn extract_tag_text_blocks(raw_html: &str, tag: &str, cap: usize) -> String {
    let tag = tag.trim().to_ascii_lowercase();
    if tag.is_empty() {
        return String::new();
    }
    let html = raw_html.to_string();
    let lower = html.to_ascii_lowercase();
    let mut cursor = 0usize;
    let mut blocks = Vec::new();
    let open = format!("<{tag}");
    let close = format!("</{tag}>");
    while let Some(start_rel) = lower[cursor..].find(&open) {
        let start = cursor + start_rel;
        let Some(gt_rel) = lower[start..].find('>') else { break };
        let content_start = start + gt_rel + 1;
        let Some(end_rel) = lower[content_start..].find(&close) else { break };
        let end = content_start + end_rel;
        if let Some(slice) = html.get(content_start..end) {
            let plain = html_to_plain_text(slice);
            if !plain.trim().is_empty() {
                blocks.push(plain);
            }
        }
        cursor = end + close.len();
        if blocks.len() >= 12 {
            break;
        }
    }
    blocks
        .join(" ")
        .chars()
        .take(cap)
        .collect::<String>()
        .trim()
        .to_string()
}

fn extract_selector_snapshot(raw_html: &str, selector_rule: Option<&str>) -> String {
    let selector = selector_rule.unwrap_or("").trim();
    if selector.is_empty() {
        return excerpt_text(raw_html, 2400);
    }
    if let Some(tag) = selector.strip_prefix('.') {
        let tag_lower = tag.trim().to_ascii_lowercase();
        let lower = raw_html.to_ascii_lowercase();
        let mut collected = Vec::new();
        for token in ["div", "section", "article", "main", "li", "p", "span", "a"] {
            let open = format!("<{token}");
            let close = format!("</{token}>");
            let mut cursor = 0usize;
            while let Some(start_rel) = lower[cursor..].find(&open) {
                let start = cursor + start_rel;
                let Some(gt_rel) = lower[start..].find('>') else { break };
                let attr = &lower[start..start + gt_rel + 1];
                if !(attr.contains("class=") && attr.contains(&tag_lower)) {
                    cursor = start + gt_rel + 1;
                    continue;
                }
                let content_start = start + gt_rel + 1;
                let Some(end_rel) = lower[content_start..].find(&close) else { break };
                let end = content_start + end_rel;
                if let Some(slice) = raw_html.get(content_start..end) {
                    let plain = html_to_plain_text(slice);
                    if !plain.trim().is_empty() {
                        collected.push(plain);
                    }
                }
                cursor = end + close.len();
                if collected.len() >= 8 {
                    break;
                }
            }
        }
        if !collected.is_empty() {
            return collected
                .join(" ")
                .chars()
                .take(2400)
                .collect::<String>()
                .trim()
                .to_string();
        }
    }
    if let Some(tag) = selector.strip_prefix('#') {
        let needle = format!("id=\"{}\"", tag.trim().to_ascii_lowercase());
        let lower = raw_html.to_ascii_lowercase();
        if let Some(pos) = lower.find(&needle) {
            let start = pos.saturating_sub(240);
            let end = (pos + 1400).min(raw_html.len());
            return html_to_plain_text(&raw_html[start..end])
                .chars()
                .take(2200)
                .collect::<String>();
        }
    }
    let candidate = selector
        .trim_matches(|c: char| !c.is_ascii_alphanumeric())
        .to_ascii_lowercase();
    if !candidate.is_empty()
        && candidate.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        let tag_result = extract_tag_text_blocks(raw_html, &candidate, 2400);
        if !tag_result.is_empty() {
            return tag_result;
        }
    }
    excerpt_text(raw_html, 2400)
}

fn build_watch_snapshot(
    raw_html: &str,
    title: &str,
    target_url: &str,
    watch_type: &str,
    selector_rule: Option<&str>,
) -> String {
    match watch_type {
        "title_only" => title.to_string(),
        "metadata_only" => {
            let domain = extract_domain(target_url);
            let excerpt = excerpt_text(raw_html, 560);
            let dates = extract_change_signals(&excerpt)
                .into_iter()
                .filter(|item| item.contains("日期样式"))
                .collect::<Vec<_>>()
                .join("；");
            format!(
                "title={title}\ndomain={domain}\nlen={}\n{}\n{}",
                raw_html.len(),
                if dates.is_empty() { "dates=none" } else { dates.as_str() },
                excerpt
            )
        }
        "selector_text" => extract_selector_snapshot(raw_html, selector_rule),
        _ => excerpt_text(raw_html, 12000),
    }
}

fn tokenize_words(text: &str) -> HashSet<String> {
    text.split_whitespace()
        .map(|item| {
            item.trim_matches(|c: char| !c.is_ascii_alphanumeric() && c != '-' && c != '_')
                .to_ascii_lowercase()
        })
        .filter(|item| item.len() >= 3)
        .take(3000)
        .collect::<HashSet<_>>()
}

fn summarize_change_direction(old_text: &str, new_text: &str) -> String {
    let old_lower = old_text.to_lowercase();
    let new_lower = new_text.to_lowercase();
    if (new_lower.contains("application open") || new_lower.contains("申请开放") || new_lower.contains("open for application"))
        && !(old_lower.contains("application open") || old_lower.contains("申请开放"))
    {
        return "application_opened".to_string();
    }
    if (new_lower.contains("application close") || new_lower.contains("申请关闭") || new_lower.contains("closed"))
        && !(old_lower.contains("application close") || old_lower.contains("申请关闭"))
    {
        return "application_closed".to_string();
    }
    if new_lower.contains("deadline") || new_lower.contains("截止") {
        return "deadline_updated".to_string();
    }
    if new_lower.contains("requirement") || new_lower.contains("材料要求") || new_lower.contains("eligibility") {
        return "requirement_changed".to_string();
    }
    if new_lower.contains("scholarship") || new_lower.contains("tuition") || new_lower.contains("fee") || new_lower.contains("奖学金") {
        return "scholarship_updated".to_string();
    }
    if (new_lower.contains("course announcement")
        || new_lower.contains("class announcement")
        || new_lower.contains("课程公告")
        || new_lower.contains("班级公告")
        || new_lower.contains("讲义更新"))
        && !(old_lower.contains("course announcement")
            || old_lower.contains("class announcement")
            || old_lower.contains("课程公告")
            || old_lower.contains("班级公告")
            || old_lower.contains("讲义更新"))
    {
        return "announcement_posted".to_string();
    }
    if new_lower.contains("announcement") || new_lower.contains("webinar") || new_lower.contains("open day") || new_lower.contains("公告") {
        return "event_announced".to_string();
    }
    if new_lower.contains("schedule") || new_lower.contains("timetable") || new_lower.contains("课表") {
        return "schedule_changed".to_string();
    }
    if new_lower.contains("exam policy") || new_lower.contains("考试政策") || new_lower.contains("policy") {
        return "exam_policy_changed".to_string();
    }
    if new_lower.contains("article") || new_lower.contains("blog") || new_lower.contains("长文") {
        return "article_revised".to_string();
    }
    if new_lower.contains("docs")
        || new_lower.contains("documentation")
        || new_lower.contains("文档")
        || new_lower.contains("syllabus")
        || new_lower.contains("课程大纲")
    {
        return "docs_updated".to_string();
    }
    if new_lower.contains("resource") || new_lower.contains("资料") {
        return "resource_updated".to_string();
    }
    "generic_update".to_string()
}

fn build_rule_diff_summary(old_text: &str, new_text: &str) -> (String, String) {
    let old_set = tokenize_words(old_text);
    let new_set = tokenize_words(new_text);
    let mut added = new_set
        .difference(&old_set)
        .cloned()
        .take(10)
        .collect::<Vec<_>>();
    let mut removed = old_set
        .difference(&new_set)
        .cloned()
        .take(8)
        .collect::<Vec<_>>();
    added.sort();
    removed.sort();
    let added_text = if added.is_empty() {
        "无明显新增".to_string()
    } else {
        added.join(", ")
    };
    let removed_text = if removed.is_empty() {
        "无明显减少".to_string()
    } else {
        removed.join(", ")
    };
    let mut direction = summarize_change_direction(old_text, new_text);
    if direction == "generic_update" && (added.len() + removed.len()) >= 16 {
        direction = "page_structure_changed".to_string();
    }
    let human_direction = match direction.as_str() {
        "deadline_updated" => "deadline 更新",
        "requirement_changed" => "requirement 变更",
        "scholarship_updated" => "奖学金/费用更新",
        "application_opened" => "申请通道开放",
        "application_closed" => "申请通道关闭",
        "event_announced" => "新增公告/活动",
        "page_structure_changed" => "页面结构变更",
        "resource_updated" => "学习资源更新",
        "announcement_posted" => "课程公告更新",
        "schedule_changed" => "日程/课表变化",
        "exam_policy_changed" => "考试政策变化",
        "article_revised" => "文章内容修订",
        "docs_updated" => "文档更新",
        _ => "通用内容更新",
    };
    let summary = format!(
        "方向：{}（{}）；新增关键词：{}；减少关键词：{}；新摘要：{}",
        direction,
        human_direction,
        added_text,
        removed_text,
        new_text.chars().take(260).collect::<String>(),
    );
    (summary, direction)
}

fn maybe_generate_web_ai_summary(
    db_path: &std::path::Path,
    title: &str,
    old_snapshot: &str,
    new_snapshot: &str,
    fallback_diff: &str,
) -> Option<String> {
    let provider = db::get_app_setting(db_path, "ai_provider").ok().flatten().unwrap_or_default();
    if !provider.trim().eq_ignore_ascii_case("gemini") {
        return None;
    }
    let gemini_key = get_secret_optional(db_path, keys::GEMINI_API_KEY)
        .ok()
        .flatten()
        .unwrap_or_default();
    if gemini_key.trim().is_empty() {
        return None;
    }
    let model = db::get_app_setting(db_path, "gemini_model")
        .ok()
        .flatten()
        .unwrap_or_else(|| "gemini-1.5-flash".to_string());
    let prompt = format!(
        "你是个人秘书系统的网页监控摘要助手。请用中文输出 3 行：1)变化结论 2)风险等级(高/中/低) 3)建议下一步动作。\n网页：{title}\n规则摘要：{fallback_diff}\n旧快照：{}\n新快照：{}",
        old_snapshot.chars().take(1200).collect::<String>(),
        new_snapshot.chars().take(1400).collect::<String>(),
    );
    call_gemini_generate(&gemini_key, &model, &prompt).ok().map(|v| v.0)
}

fn watcher_due_by_frequency(last_checked_at: Option<&str>, frequency: &str, include_manual: bool) -> bool {
    let now = Utc::now();
    let elapsed_minutes = last_checked_at
        .and_then(parse_mixed_datetime)
        .map(|dt| now.signed_duration_since(dt).num_minutes());
    match frequency {
        "manual" => include_manual,
        "every_6h" => elapsed_minutes.map(|v| v >= 6 * 60).unwrap_or(true),
        "weekly" => elapsed_minutes.map(|v| v >= 7 * 24 * 60).unwrap_or(true),
        _ => elapsed_minutes.map(|v| v >= 24 * 60).unwrap_or(true),
    }
}

fn parse_weekday_token(token: char) -> Option<chrono::Weekday> {
    match token {
        '一' => Some(chrono::Weekday::Mon),
        '二' => Some(chrono::Weekday::Tue),
        '三' => Some(chrono::Weekday::Wed),
        '四' => Some(chrono::Weekday::Thu),
        '五' => Some(chrono::Weekday::Fri),
        '六' => Some(chrono::Weekday::Sat),
        '日' | '天' => Some(chrono::Weekday::Sun),
        _ => None,
    }
}

fn detect_relative_date(text: &str, base: chrono::NaiveDate) -> Option<String> {
    if text.contains("大后天") {
        return Some((base + chrono::Duration::days(3)).format("%Y-%m-%d").to_string());
    }
    if text.contains("后天") {
        return Some((base + chrono::Duration::days(2)).format("%Y-%m-%d").to_string());
    }
    if text.contains("明天") || text.contains("明早") || text.contains("明晚") || text.contains("明晨") {
        return Some((base + chrono::Duration::days(1)).format("%Y-%m-%d").to_string());
    }
    if text.contains("今天") || text.contains("今早") || text.contains("今晚") || text.contains("今日") {
        return Some(base.format("%Y-%m-%d").to_string());
    }

    let chars = text.chars().collect::<Vec<_>>();
    for idx in 0..chars.len() {
        let weekday_token = if chars[idx] == '周' {
            chars.get(idx + 1).copied()
        } else if chars[idx] == '星' && chars.get(idx + 1).copied() == Some('期') {
            chars.get(idx + 2).copied()
        } else {
            None
        };
        let Some(weekday_token) = weekday_token else {
            continue;
        };
        let Some(target_weekday) = parse_weekday_token(weekday_token) else {
            continue;
        };
        let current_num = base.weekday().number_from_monday() as i64;
        let target_num = target_weekday.number_from_monday() as i64;
        let mut delta = target_num - current_num;
        if delta < 0 {
            delta += 7;
        }
        let has_next_week =
            text.contains("下周") || text.contains("下星期") || text.contains("下礼拜");
        if has_next_week {
            delta += 7;
        }
        if delta == 0 && !text.contains("这周") && !text.contains("本周") && !text.contains("这星期") {
            delta = 7;
        }
        return Some((base + chrono::Duration::days(delta)).format("%Y-%m-%d").to_string());
    }
    None
}

fn parse_cn_digit(c: char) -> Option<i32> {
    match c {
        '零' => Some(0),
        '一' => Some(1),
        '二' | '两' => Some(2),
        '三' => Some(3),
        '四' => Some(4),
        '五' => Some(5),
        '六' => Some(6),
        '七' => Some(7),
        '八' => Some(8),
        '九' => Some(9),
        _ => None,
    }
}

fn parse_cn_number_token(token: &str) -> Option<i32> {
    if token.is_empty() {
        return None;
    }
    if token.chars().all(|c| c.is_ascii_digit()) {
        return token.parse::<i32>().ok();
    }
    if token == "十" {
        return Some(10);
    }
    if token.contains('十') {
        let mut parts = token.split('十');
        let left = parts.next().unwrap_or_default();
        let right = parts.next().unwrap_or_default();
        let tens = if left.is_empty() {
            1
        } else {
            parse_cn_digit(left.chars().next()?)?
        };
        let units = if right.is_empty() {
            0
        } else {
            parse_cn_digit(right.chars().next()?)?
        };
        return Some(tens * 10 + units);
    }
    if token.chars().count() == 1 {
        return parse_cn_digit(token.chars().next()?);
    }
    None
}

fn detect_time_hhmm(text: &str) -> Option<String> {
    let normalized = text.replace('：', ":");
    let chars = normalized.chars().collect::<Vec<_>>();
    let mut dot_index: Option<usize> = None;
    for (i, ch) in chars.iter().enumerate() {
        if *ch == '点' {
            dot_index = Some(i);
            break;
        }
    }
    if dot_index.is_none() {
        // fallback: 08:30 style
        for token in normalized.split_whitespace() {
            if let Some((h, m)) = token.split_once(':') {
                let hh = h.trim().parse::<i32>().ok()?;
                let mm = m
                    .chars()
                    .take_while(|c| c.is_ascii_digit())
                    .collect::<String>()
                    .parse::<i32>()
                    .ok()?;
                if (0..=23).contains(&hh) && (0..=59).contains(&mm) {
                    return Some(format!("{hh:02}:{mm:02}"));
                }
            }
        }
        return None;
    }
    let idx = dot_index?;
    let mut start = idx;
    while start > 0 {
        let c = chars[start - 1];
        if c.is_ascii_digit() || "零一二两三四五六七八九十".contains(c) {
            start -= 1;
        } else {
            break;
        }
    }
    if start == idx {
        return None;
    }
    let hour_token = chars[start..idx].iter().collect::<String>();
    let mut hour = parse_cn_number_token(&hour_token)?;
    let mut minute = 0_i32;
    let suffix = chars[idx + 1..].iter().collect::<String>();
    if suffix.starts_with('半') {
        minute = 30;
    } else if suffix.starts_with("一刻") {
        minute = 15;
    } else if suffix.starts_with("三刻") {
        minute = 45;
    } else {
        let mut minute_token = String::new();
        for ch in suffix.chars() {
            if ch.is_ascii_digit() || "零一二两三四五六七八九十".contains(ch) {
                minute_token.push(ch);
            } else if ch == '分' {
                break;
            } else {
                break;
            }
        }
        if !minute_token.is_empty() {
            minute = parse_cn_number_token(&minute_token)?;
        }
    }

    if normalized.contains("下午") || normalized.contains("晚上") || normalized.contains("今晚") {
        if hour < 12 {
            hour += 12;
        }
    } else if normalized.contains("中午") {
        if (1..=10).contains(&hour) {
            hour += 12;
        }
    } else if normalized.contains("凌晨") && hour == 12 {
        hour = 0;
    }

    if !(0..=23).contains(&hour) || !(0..=59).contains(&minute) {
        return None;
    }
    Some(format!("{hour:02}:{minute:02}"))
}

fn detect_title_after_time(text: &str) -> Option<String> {
    let chars = text.chars().collect::<Vec<_>>();
    for (i, ch) in chars.iter().enumerate() {
        if *ch == '点' || *ch == ':' || *ch == '：' {
            let mut tail = chars[i + 1..].iter().collect::<String>();
            for marker in ["半", "一刻", "三刻", "分"] {
                if tail.starts_with(marker) {
                    tail = tail.trim_start_matches(marker).to_string();
                    break;
                }
            }
            let candidate = tail
                .trim()
                .trim_start_matches("上")
                .trim_start_matches("去")
                .trim_start_matches("安排")
                .trim_start_matches("完成")
                .trim_start_matches("做")
                .trim_start_matches("把")
                .trim()
                .to_string();
            if !candidate.is_empty() {
                return Some(candidate);
            }
        }
    }
    None
}

fn extract_natural_task_command(
    text: &str,
    today: chrono::NaiveDate,
) -> Option<(String, Option<String>, Option<String>, Option<String>)> {
    let date = detect_first_date_like(text).or_else(|| detect_relative_date(text, today));
    let time_start = detect_time_hhmm(text);
    if date.is_none() && time_start.is_none() {
        return None;
    }
    let mut title = detect_title_after_time(text).unwrap_or_else(|| text.to_string());
    for marker in [
        "新增任务",
        "创建任务",
        "安排",
        "提醒我",
        "提醒",
        "请",
        "帮我",
        "说明",
        "说",
        "明早",
        "明晚",
        "明天",
        "后天",
        "大后天",
        "今天",
        "今早",
        "今晚",
        "上午",
        "下午",
        "晚上",
        "中午",
        "周一",
        "周二",
        "周三",
        "周四",
        "周五",
        "周六",
        "周日",
        "周天",
        "下周",
        "这周",
        "本周",
        "到",
    ] {
        title = title.replace(marker, " ");
    }
    title = title
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();
    if title.is_empty() {
        return None;
    }
    let deadline = date.clone();
    Some((title, date, time_start, deadline))
}

fn infer_task_type_from_text(text: &str, time_start: Option<&str>) -> String {
    let lower = text.to_lowercase();
    if lower.contains("上课")
        || lower.contains("课程")
        || lower.contains("课")
        || lower.contains("讲座")
        || lower.contains("会议")
        || lower.contains("预约")
        || lower.contains("面试")
        || lower.contains("日程")
        || time_start.is_some()
    {
        return "日程".to_string();
    }
    "任务".to_string()
}

fn normalize_feishu_command_text(text: &str, keyword: Option<&str>) -> String {
    let compact_text = text.replace('\n', " ");
    let mut cleaned_tokens = compact_text
        .split_whitespace()
        .filter(|token| {
            let trimmed = token.trim();
            !trimmed.is_empty()
                && !trimmed.starts_with("@")
                && !trimmed.starts_with("<at")
                && trimmed != "_user_1"
        })
        .collect::<Vec<_>>();

    if let Some(keyword_text) = keyword.map(|v| v.trim()).filter(|v| !v.is_empty()) {
        if let Some(first) = cleaned_tokens.first() {
            let first_normalized = first.trim().trim_end_matches(['：', ':']);
            if first_normalized == keyword_text {
                cleaned_tokens.remove(0);
            }
        }
    }
    cleaned_tokens.join(" ").trim().to_string()
}

fn extract_text_from_value(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(s) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        serde_json::Value::Array(items) => {
            for item in items {
                if let Some(v) = extract_text_from_value(item) {
                    return Some(v);
                }
            }
            None
        }
        serde_json::Value::Object(map) => {
            if let Some(text) = map.get("text").and_then(extract_text_from_value) {
                return Some(text);
            }
            for value in map.values() {
                if let Some(v) = extract_text_from_value(value) {
                    return Some(v);
                }
            }
            None
        }
        _ => None,
    }
}

fn matches_true(value: Option<&str>) -> bool {
    matches!(value, Some("1" | "true" | "TRUE" | "True"))
}

fn make_task_event_key(task_id: i64) -> String {
    format!("feishu_calendar_event_task_{task_id}")
}

fn make_task_sync_error_key(task_id: i64) -> String {
    format!("feishu_calendar_sync_error_task_{task_id}")
}

fn feishu_tenant_access_token(app_id: &str, app_secret: &str) -> Result<String, String> {
    let payload = serde_json::json!({
        "app_id": app_id,
        "app_secret": app_secret
    })
    .to_string();
    let output = Command::new("curl")
        .args([
            "-sS",
            "-X",
            "POST",
            "-H",
            "Content-Type: application/json",
            "-d",
            &payload,
            "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        ])
        .output()
        .map_err(|error| format!("failed to request tenant token: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let response_text = String::from_utf8_lossy(&output.stdout).to_string();
    let value: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|error| format!("invalid token response: {error}"))?;
    let code = value.get("code").and_then(|item| item.as_i64()).unwrap_or(-1);
    if code != 0 {
        let msg = value
            .get("msg")
            .and_then(|item| item.as_str())
            .unwrap_or("unknown feishu token error");
        return Err(format!("feishu token error: {msg}"));
    }
    value
        .get("tenant_access_token")
        .and_then(|item| item.as_str())
        .map(|item| item.to_string())
        .ok_or_else(|| "tenant_access_token missing in response".to_string())
}

fn parse_event_id_from_response(value: &serde_json::Value) -> Option<String> {
    value
        .pointer("/data/event_id")
        .and_then(|item| item.as_str())
        .map(|item| item.to_string())
        .or_else(|| {
            value
                .pointer("/data/event/event_id")
                .and_then(|item| item.as_str())
                .map(|item| item.to_string())
        })
        .or_else(|| {
            value
                .pointer("/data/id")
                .and_then(|item| item.as_str())
                .map(|item| item.to_string())
        })
}

fn upsert_feishu_calendar_event(
    tenant_access_token: &str,
    calendar_id: &str,
    task: &db::Task,
    existing_event_id: Option<&str>,
) -> Result<String, String> {
    let anchor_date = task
        .deadline
        .as_ref()
        .or(task.scheduled_date.as_ref())
        .ok_or_else(|| "task does not have deadline/scheduled date".to_string())?;
    let anchor = parse_yyyy_mm_dd(anchor_date).ok_or_else(|| "invalid task date".to_string())?;
    let start_naive = anchor.and_time(NaiveTime::from_hms_opt(9, 0, 0).ok_or("invalid start time")?);
    let end_naive = anchor.and_time(NaiveTime::from_hms_opt(10, 0, 0).ok_or("invalid end time")?);
    let start_ts = Local
        .from_local_datetime(&start_naive)
        .single()
        .ok_or_else(|| "invalid local start datetime".to_string())?
        .timestamp();
    let end_ts = Local
        .from_local_datetime(&end_naive)
        .single()
        .ok_or_else(|| "invalid local end datetime".to_string())?
        .timestamp();

    let description = format!(
        "LOCAL_TASK_ID: {}\n任务类型：{}\n优先级：{}\n状态：{}\nDDL：{}\n说明：{}",
        task.id,
        task.task_type,
        task.priority,
        task.status,
        task.deadline.as_deref().unwrap_or("未设置"),
        task.description.as_deref().unwrap_or("无")
    );
    let payload = serde_json::json!({
        "summary": task.title,
        "description": description,
        "start_time": start_ts.to_string(),
        "end_time": end_ts.to_string(),
        "need_notification": true,
    })
    .to_string();

    let (method, endpoint) = if let Some(event_id) = existing_event_id {
        (
            "PATCH",
            format!("https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events/{event_id}"),
        )
    } else {
        (
            "POST",
            format!("https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events"),
        )
    };

    let output = Command::new("curl")
        .args([
            "-sS",
            "-X",
            method,
            "-H",
            "Content-Type: application/json",
            "-H",
            &format!("Authorization: Bearer {tenant_access_token}"),
            "-d",
            &payload,
            &endpoint,
        ])
        .output()
        .map_err(|error| format!("failed to request feishu calendar api: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|error| format!("invalid feishu event response: {error}"))?;
    let code = value.get("code").and_then(|item| item.as_i64()).unwrap_or(-1);
    if code != 0 {
        let msg = value
            .get("msg")
            .and_then(|item| item.as_str())
            .unwrap_or("unknown feishu calendar error");
        return Err(format!("feishu calendar error: {msg}"));
    }
    if let Some(existing) = existing_event_id {
        return Ok(existing.to_string());
    }
    parse_event_id_from_response(&value).ok_or_else(|| "event_id missing in feishu response".to_string())
}

fn parse_feishu_timestamp_to_date(raw: &str) -> Option<String> {
    let parsed = raw.trim().parse::<i64>().ok()?;
    let seconds = if parsed > 9_999_999_999 { parsed / 1000 } else { parsed };
    let dt = Local.timestamp_opt(seconds, 0).single()?;
    Some(dt.format("%Y-%m-%d").to_string())
}

fn fetch_feishu_calendar_event(
    tenant_access_token: &str,
    calendar_id: &str,
    event_id: &str,
) -> Result<(String, Option<String>), String> {
    let endpoint =
        format!("https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events/{event_id}");
    let output = Command::new("curl")
        .args([
            "-sS",
            "-X",
            "GET",
            "-H",
            &format!("Authorization: Bearer {tenant_access_token}"),
            &endpoint,
        ])
        .output()
        .map_err(|error| format!("failed to request feishu calendar event: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|error| format!("invalid feishu event response: {error}"))?;
    let code = value.get("code").and_then(|item| item.as_i64()).unwrap_or(-1);
    if code != 0 {
        let msg = value
            .get("msg")
            .and_then(|item| item.as_str())
            .unwrap_or("unknown feishu event query error");
        return Err(format!("feishu event query error: {msg}"));
    }
    let summary = value
        .pointer("/data/event/summary")
        .and_then(|item| item.as_str())
        .or_else(|| value.pointer("/data/summary").and_then(|item| item.as_str()))
        .unwrap_or("未命名任务")
        .to_string();
    let start_raw = value
        .pointer("/data/event/start_time")
        .and_then(|item| item.as_str())
        .or_else(|| value.pointer("/data/start_time").and_then(|item| item.as_str()))
        .unwrap_or_default()
        .to_string();
    let anchor_date = if start_raw.is_empty() {
        None
    } else {
        parse_feishu_timestamp_to_date(&start_raw)
    };
    Ok((summary, anchor_date))
}

fn sync_task_to_feishu_calendar(db_path: &std::path::Path, task_id: i64) -> Result<(), String> {
    let sync_enabled = matches_true(
        db::get_app_setting(db_path, "feishu_calendar_sync_enabled")
            .map_err(|error| format!("failed to read calendar sync setting: {error}"))?
            .as_deref(),
    );
    if !sync_enabled {
        return Ok(());
    }

    let app_id = get_secret_optional(db_path, keys::FEISHU_APP_ID)?
        .unwrap_or_default();
    let app_secret = get_secret_optional(db_path, keys::FEISHU_APP_SECRET)?
        .unwrap_or_default();
    let calendar_id = db::get_app_setting(db_path, "feishu_calendar_id")
        .map_err(|error| format!("failed to read feishu calendar_id: {error}"))?
        .unwrap_or_default();
    if app_id.trim().is_empty() || app_secret.trim().is_empty() || calendar_id.trim().is_empty() {
        return Err("飞书日历同步已开启，但 app_id/app_secret/calendar_id 未完整配置".to_string());
    }

    let task = db::list_tasks(db_path)
        .map_err(|error| format!("failed to list tasks: {error}"))?
        .into_iter()
        .find(|item| item.id == task_id)
        .ok_or_else(|| "task not found for calendar sync".to_string())?;
    if task.status == "已完成" {
        return Ok(());
    }
    let token = feishu_tenant_access_token(&app_id, &app_secret)?;
    let key = make_task_event_key(task_id);
    let existing_event_id = db::get_app_setting(db_path, &key)
        .map_err(|error| format!("failed to read task event mapping: {error}"))?;
    let event_id = upsert_feishu_calendar_event(&token, &calendar_id, &task, existing_event_id.as_deref())?;
    db::set_app_setting(db_path, &key, &event_id)
        .map_err(|error| format!("failed to save task event mapping: {error}"))?;
    db::set_app_setting(db_path, &make_task_sync_error_key(task_id), "")
        .map_err(|error| format!("failed to clear sync error: {error}"))?;
    Ok(())
}

fn pull_task_from_feishu_calendar(db_path: &std::path::Path, task_id: i64) -> Result<bool, String> {
    let sync_enabled = matches_true(
        db::get_app_setting(db_path, "feishu_calendar_sync_enabled")
            .map_err(|error| format!("failed to read calendar sync setting: {error}"))?
            .as_deref(),
    );
    let pull_enabled = matches_true(
        db::get_app_setting(db_path, "feishu_calendar_pull_enabled")
            .map_err(|error| format!("failed to read calendar pull setting: {error}"))?
            .as_deref(),
    );
    if !sync_enabled || !pull_enabled {
        return Ok(false);
    }

    let app_id = get_secret_optional(db_path, keys::FEISHU_APP_ID)?
        .unwrap_or_default();
    let app_secret = get_secret_optional(db_path, keys::FEISHU_APP_SECRET)?
        .unwrap_or_default();
    let calendar_id = db::get_app_setting(db_path, "feishu_calendar_id")
        .map_err(|error| format!("failed to read feishu calendar_id: {error}"))?
        .unwrap_or_default();
    if app_id.trim().is_empty() || app_secret.trim().is_empty() || calendar_id.trim().is_empty() {
        return Ok(false);
    }

    let event_key = make_task_event_key(task_id);
    let event_id = db::get_app_setting(db_path, &event_key)
        .map_err(|error| format!("failed to read task event mapping: {error}"))?;
    let Some(event_id) = event_id else {
        return Ok(false);
    };

    let task = db::list_tasks(db_path)
        .map_err(|error| format!("failed to list tasks: {error}"))?
        .into_iter()
        .find(|item| item.id == task_id)
        .ok_or_else(|| "task not found for pull sync".to_string())?;
    if task.status == "已完成" {
        return Ok(false);
    }

    let token = feishu_tenant_access_token(&app_id, &app_secret)?;
    let (remote_title, remote_date) = fetch_feishu_calendar_event(&token, &calendar_id, &event_id)?;
    let local_date = task
        .deadline
        .clone()
        .or(task.scheduled_date.clone())
        .and_then(|item| parse_yyyy_mm_dd(&item).map(|d| d.format("%Y-%m-%d").to_string()));

    let title_changed = remote_title.trim() != task.title.trim();
    let date_changed = remote_date != local_date;
    if !title_changed && !date_changed {
        return Ok(false);
    }

    db::update_task_from_calendar(
        db_path,
        task.id,
        remote_title.trim(),
        remote_date.as_deref(),
        remote_date.as_deref(),
    )
    .map_err(|error| format!("failed to update task from calendar: {error}"))?;
    Ok(true)
}

fn collect_deadline_lines(db_path: &std::path::Path) -> Result<Vec<String>, String> {
    let tasks = db::list_tasks(db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let projects = db::list_projects(db_path).map_err(|error| format!("failed to list projects: {error}"))?;
    let today = chrono::Local::now().date_naive();
    let mut lines: Vec<String> = Vec::new();

    tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| {
            let ddl = task.deadline.as_ref()?;
            let date = parse_yyyy_mm_dd(ddl)?;
            let diff = (date - today).num_days();
            if diff <= 3 {
                let flag = if diff < 0 {
                    format!("已超期 {} 天", diff.abs())
                } else {
                    format!("剩余 {} 天", diff)
                };
                Some(format!("任务：{}（{}）", task.title, flag))
            } else {
                None
            }
        })
        .for_each(|line| lines.push(line));

    projects
        .iter()
        .filter(|project| project.status != "完成")
        .filter_map(|project| {
            let ddl = project.deadline.as_ref()?;
            let date = parse_yyyy_mm_dd(ddl)?;
            let diff = (date - today).num_days();
            if diff <= 7 {
                let flag = if diff < 0 {
                    format!("已超期 {} 天", diff.abs())
                } else {
                    format!("剩余 {} 天", diff)
                };
                Some(format!(
                    "申请：{} · {}（{}）",
                    project.school_name, project.program_name, flag
                ))
            } else {
                None
            }
        })
        .for_each(|line| lines.push(line));

    lines.sort();
    lines.dedup();
    Ok(lines)
}

#[tauri::command]
fn initialize_database(app: tauri::AppHandle, _state: State<'_, AppState>) -> Result<BootstrapPayload, String> {
    let db_path = get_database_path(&app)?;
    db::initialize_schema(&db_path).map_err(|error| format!("failed to initialize database: {error}"))?;
    db::seed_real_study_data(&db_path).map_err(|error| format!("failed to seed real study data: {error}"))?;

    Ok(BootstrapPayload {
        app_name: "AI Council".to_string(),
        database_path: db_path.display().to_string(),
        initialized_at: Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
fn list_projects(app: tauri::AppHandle) -> Result<Vec<db::Project>, String> {
    let db_path = get_database_path(&app)?;
    db::list_projects(&db_path).map_err(|error| format!("failed to list projects: {error}"))
}

#[tauri::command]
fn list_school_profiles(app: tauri::AppHandle) -> Result<Vec<db::SchoolProfile>, String> {
    let db_path = get_database_path(&app)?;
    db::list_school_profiles(&db_path).map_err(|error| format!("failed to list school profiles: {error}"))
}

#[tauri::command]
fn create_project(app: tauri::AppHandle, payload: NewProjectInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_project(&db_path, &payload).map_err(|error| format!("failed to create project: {error}"))
}

#[tauri::command]
fn update_project(app: tauri::AppHandle, payload: UpdateProjectInput) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_project(&db_path, &payload).map_err(|error| format!("failed to update project: {error}"))
}

#[tauri::command]
fn delete_project(app: tauri::AppHandle, project_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_project(&db_path, project_id).map_err(|error| format!("failed to delete project: {error}"))
}

#[tauri::command]
fn list_project_requirements(app: tauri::AppHandle, project_id: i64) -> Result<Vec<db::ProjectRequirement>, String> {
    let db_path = get_database_path(&app)?;
    db::list_requirements(&db_path, project_id)
        .map_err(|error| format!("failed to list project requirements: {error}"))
}

#[tauri::command]
fn create_project_requirement(app: tauri::AppHandle, payload: NewRequirementInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_requirement(&db_path, &payload)
        .map_err(|error| format!("failed to create project requirement: {error}"))
}

#[tauri::command]
fn update_project_requirement(app: tauri::AppHandle, payload: UpdateRequirementInput) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_requirement(&db_path, &payload)
        .map_err(|error| format!("failed to update project requirement: {error}"))
}

#[tauri::command]
fn delete_project_requirement(app: tauri::AppHandle, requirement_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_requirement(&db_path, requirement_id)
        .map_err(|error| format!("failed to delete project requirement: {error}"))
}

#[tauri::command]
fn list_project_documents(app: tauri::AppHandle, project_id: i64) -> Result<Vec<db::ProjectDocument>, String> {
    let db_path = get_database_path(&app)?;
    db::list_project_documents(&db_path, project_id)
        .map_err(|error| format!("failed to list project documents: {error}"))
}

#[tauri::command]
fn create_project_document(app: tauri::AppHandle, payload: NewProjectDocumentInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_project_document(&db_path, &payload)
        .map_err(|error| format!("failed to create project document: {error}"))
}

#[tauri::command]
fn delete_project_document(app: tauri::AppHandle, document_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_project_document(&db_path, document_id)
        .map_err(|error| format!("failed to delete project document: {error}"))
}

#[tauri::command]
fn list_recommendation_letters(app: tauri::AppHandle, project_id: i64) -> Result<Vec<db::RecommendationLetter>, String> {
    let db_path = get_database_path(&app)?;
    db::list_recommendation_letters(&db_path, project_id)
        .map_err(|error| format!("failed to list recommendation letters: {error}"))
}

#[tauri::command]
fn create_recommendation_letter(app: tauri::AppHandle, payload: NewRecommendationLetterInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_recommendation_letter(&db_path, &payload)
        .map_err(|error| format!("failed to create recommendation letter: {error}"))
}

#[tauri::command]
fn update_recommendation_letter(app: tauri::AppHandle, payload: UpdateRecommendationLetterInput) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_recommendation_letter(&db_path, &payload)
        .map_err(|error| format!("failed to update recommendation letter: {error}"))
}

#[tauri::command]
fn delete_recommendation_letter(app: tauri::AppHandle, letter_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_recommendation_letter(&db_path, letter_id)
        .map_err(|error| format!("failed to delete recommendation letter: {error}"))
}

#[tauri::command]
fn seed_application_demo_data(app: tauri::AppHandle) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::seed_demo_data(&db_path).map_err(|error| format!("failed to seed demo data: {error}"))
}

#[tauri::command]
fn list_tasks(app: tauri::AppHandle) -> Result<Vec<db::Task>, String> {
    let db_path = get_database_path(&app)?;
    db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))
}

#[tauri::command]
fn get_tasks_by_date(app: tauri::AppHandle, date: String) -> Result<Vec<db::Task>, String> {
    let db_path = get_database_path(&app)?;
    db::get_tasks_by_date(&db_path, &date).map_err(|error| format!("failed to get tasks by date: {error}"))
}

#[tauri::command]
fn get_tasks_by_date_range(
    app: tauri::AppHandle,
    start_date: String,
    end_date: String,
) -> Result<Vec<db::Task>, String> {
    let db_path = get_database_path(&app)?;
    db::get_tasks_by_date_range(&db_path, &start_date, &end_date)
        .map_err(|error| format!("failed to get tasks by date range: {error}"))
}

#[tauri::command]
fn get_goals(app: tauri::AppHandle) -> Result<Vec<db::Goal>, String> {
    let db_path = get_database_path(&app)?;
    db::get_goals(&db_path).map_err(|error| format!("failed to get goals: {error}"))
}

#[tauri::command]
fn log_goal_progress(app: tauri::AppHandle, goal_id: i64, date: String, amount: i32) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::log_goal_progress(&db_path, goal_id, &date, amount)
        .map_err(|error| format!("failed to log goal progress: {error}"))
}

#[tauri::command]
fn get_goal_log_by_date(app: tauri::AppHandle, date: String) -> Result<Vec<db::GoalLog>, String> {
    let db_path = get_database_path(&app)?;
    db::get_goal_log_by_date(&db_path, &date).map_err(|error| format!("failed to get goal logs by date: {error}"))
}

#[tauri::command]
fn get_today_goal_logs(app: tauri::AppHandle, date: String) -> Result<Vec<db::GoalLog>, String> {
    let db_path = get_database_path(&app)?;
    db::get_today_goal_logs(&db_path, &date).map_err(|error| format!("failed to get today goal logs: {error}"))
}

#[tauri::command]
fn batch_insert_goals(app: tauri::AppHandle, goals: Vec<db::GoalInput>) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::batch_insert_goals(&db_path, &goals).map_err(|error| format!("failed to batch insert goals: {error}"))
}

#[tauri::command]
fn batch_insert_tasks(app: tauri::AppHandle, tasks: Vec<db::BatchTaskInput>) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::batch_insert_tasks(&db_path, &tasks).map_err(|error| format!("failed to batch insert tasks: {error}"))
}

#[tauri::command]
fn get_daily_completion_stats(app: tauri::AppHandle, days: i32) -> Result<Vec<db::DailyStats>, String> {
    let db_path = get_database_path(&app)?;
    db::get_daily_completion_stats(&db_path, days).map_err(|error| format!("failed to get daily completion stats: {error}"))
}

#[tauri::command]
fn create_task(app: tauri::AppHandle, payload: NewTaskInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let task_id = db::create_task(&db_path, &payload).map_err(|error| format!("failed to create task: {error}"))?;
    if let Err(error) = sync_task_to_feishu_calendar(&db_path, task_id) {
        let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(task_id), &error);
        let _ = db::create_notification(
            &db_path,
            "system",
            "飞书日历同步失败",
            &format!("任务ID {task_id}：{error}"),
            Some("task"),
            Some(task_id),
            "failed",
            None,
        );
    }
    Ok(task_id)
}

#[tauri::command]
fn update_task(app: tauri::AppHandle, payload: UpdateTaskInput) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_task(&db_path, &payload).map_err(|error| format!("failed to update task: {error}"))?;
    if let Err(error) = sync_task_to_feishu_calendar(&db_path, payload.id) {
        let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(payload.id), &error);
        let _ = db::create_notification(
            &db_path,
            "system",
            "飞书日历同步失败",
            &format!("任务ID {}：{}", payload.id, error),
            Some("task"),
            Some(payload.id),
            "failed",
            None,
        );
    }
    Ok(())
}

#[tauri::command]
fn update_task_status(app: tauri::AppHandle, task_id: i64, status: String) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let completion_tag = None::<String>;
    db::update_task_status(&db_path, task_id, &status, completion_tag.as_deref())
        .map_err(|error| format!("failed to update task status: {error}"))?;
    if status != "已完成" {
        if let Err(error) = sync_task_to_feishu_calendar(&db_path, task_id) {
            let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(task_id), &error);
        }
    }
    Ok(())
}

#[tauri::command]
fn update_task_status_with_tag(
    app: tauri::AppHandle,
    task_id: i64,
    status: String,
    completion_tag: Option<String>,
) -> Result<Option<i64>, String> {
    let db_path = get_database_path(&app)?;
    let created_next = db::update_task_status(&db_path, task_id, &status, completion_tag.as_deref())
        .map_err(|error| format!("failed to update task status with tag: {error}"))?;
    if status != "已完成" {
        if let Err(error) = sync_task_to_feishu_calendar(&db_path, task_id) {
            let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(task_id), &error);
        }
    }
    if let Some(next_id) = created_next {
        if let Err(error) = sync_task_to_feishu_calendar(&db_path, next_id) {
            let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(next_id), &error);
        }
    }
    Ok(created_next)
}

#[tauri::command]
fn preview_task_conflicts(
    app: tauri::AppHandle,
    payload: TaskConflictCheckInput,
) -> Result<db::TaskConflictCheckResult, String> {
    let db_path = get_database_path(&app)?;
    db::preview_task_conflicts(&db_path, &payload)
        .map_err(|error| format!("failed to preview task conflicts: {error}"))
}

#[tauri::command]
fn postpone_task(app: tauri::AppHandle, payload: PostponeTaskInput) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::postpone_task(&db_path, &payload)
        .map_err(|error| format!("failed to postpone task: {error}"))?;
    if let Err(error) = sync_task_to_feishu_calendar(&db_path, payload.task_id) {
        let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(payload.task_id), &error);
    }
    Ok(())
}

#[tauri::command]
fn list_task_event_logs(
    app: tauri::AppHandle,
    task_id: i64,
    limit: Option<i64>,
) -> Result<Vec<db::TaskEventLog>, String> {
    let db_path = get_database_path(&app)?;
    db::list_task_event_logs(&db_path, task_id, limit.unwrap_or(30))
        .map_err(|error| format!("failed to list task event logs: {error}"))
}

#[tauri::command]
fn delete_task(app: tauri::AppHandle, task_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let exists = db::list_tasks(&db_path)
        .map_err(|error| format!("failed to list tasks before delete: {error}"))?
        .into_iter()
        .any(|task| task.id == task_id);
    if !exists {
        return Err(format!("task not found: {task_id}"));
    }
    db::delete_task(&db_path, task_id).map_err(|error| format!("failed to delete task: {error}"))
}

#[tauri::command]
fn seed_task_demo_data(app: tauri::AppHandle) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::seed_task_demo_data(&db_path).map_err(|error| format!("failed to seed task data: {error}"))
}

#[tauri::command]
fn update_task_words(
    app: tauri::AppHandle,
    date: String,
    exam: String,
    additional_words: i64,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let rows = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let mut updated_count = 0_i64;
    let normalized_exam = exam.trim();
    let extra_minutes = (additional_words.max(0) + 1) / 2;

    for task in rows {
        let scheduled_hit = task
            .scheduled_date
            .as_deref()
            .map(|value| value == date)
            .unwrap_or(false);
        if !scheduled_hit {
            continue;
        }
        if !task.title.contains("单词") {
            continue;
        }
        if !task.task_type.contains(normalized_exam) && !task.title.contains(normalized_exam) {
            continue;
        }
        let next_estimated = task.estimated_minutes.unwrap_or(0) + extra_minutes;
        let mut next_desc = task.description.clone().unwrap_or_default();
        if !next_desc.is_empty() {
            next_desc.push('\n');
        }
        next_desc.push_str(&format!("AI补偿：+{}词", additional_words.max(0)));
        let payload = db::UpdateTaskInput {
            id: task.id,
            title: task.title,
            description: Some(next_desc),
            source_type: task.source_type,
            source_id: task.source_id,
            task_type: task.task_type,
            priority: task.priority,
            status: task.status,
            estimated_minutes: Some(next_estimated.max(0)),
            scheduled_date: task.scheduled_date,
            reminder_at: task.reminder_at,
            deadline: task.deadline,
            parent_task_id: task.parent_task_id,
            time_start: task.time_start,
            time_end: task.time_end,
            recurrence_enabled: Some(task.recurrence_enabled),
            recurrence_type: task.recurrence_type,
            recurrence_interval: task.recurrence_interval,
            recurrence_days_of_week: task.recurrence_days_of_week,
            recurrence_day_of_month: task.recurrence_day_of_month,
            recurrence_until: task.recurrence_until,
            recurrence_source_task_id: task.recurrence_source_task_id,
            completion_tag: task.completion_tag,
            last_delay_reason_code: task.last_delay_reason_code,
            last_delay_reason_note: task.last_delay_reason_note,
        };
        db::update_task(&db_path, &payload).map_err(|error| format!("failed to update task words: {error}"))?;
        updated_count += 1;
    }
    Ok(updated_count)
}

#[tauri::command]
fn get_accuracy_logs(
    app: tauri::AppHandle,
    subject: String,
    days: Option<i64>,
) -> Result<Vec<serde_json::Value>, String> {
    let db_path = get_database_path(&app)?;
    let day_window = days.unwrap_or(7).clamp(1, 60);
    let since = (Local::now().date_naive() - chrono::Duration::days(day_window - 1))
        .format("%Y-%m-%d")
        .to_string();
    let subject_text = subject.trim().to_string();
    let logs = db::list_study_analysis_logs(&db_path, day_window * 30)
        .map_err(|error| format!("failed to list study analysis logs: {error}"))?;
    let mut rows: Vec<serde_json::Value> = Vec::new();
    for item in logs {
        if item.date_key < since {
            continue;
        }
        if !subject_text.is_empty()
            && subject_text != "全部"
            && !item.subject.contains(&subject_text)
            && !item.exam_type.contains(&subject_text)
        {
            continue;
        }
        let accuracy = item
            .performance_summary
            .split('%')
            .next()
            .and_then(|prefix| {
                let digits = prefix
                    .chars()
                    .rev()
                    .take_while(|ch| ch.is_ascii_digit() || *ch == '.')
                    .collect::<String>()
                    .chars()
                    .rev()
                    .collect::<String>();
                digits.parse::<f64>().ok()
            })
            .unwrap_or(0.0);
        rows.push(serde_json::json!({
            "date": item.date_key,
            "subject": item.subject,
            "accuracy": accuracy
        }));
    }
    rows.sort_by(|a, b| {
        let ad = a.get("date").and_then(|v| v.as_str()).unwrap_or_default();
        let bd = b.get("date").and_then(|v| v.as_str()).unwrap_or_default();
        ad.cmp(bd)
    });
    Ok(rows)
}

#[tauri::command]
fn get_library_directories(app: tauri::AppHandle) -> Result<Vec<db::LibraryDirectory>, String> {
    let db_path = get_database_path(&app)?;
    db::get_library_directories(&db_path).map_err(|error| format!("failed to read library directories: {error}"))
}

#[tauri::command]
fn set_library_directory(app: tauri::AppHandle, key: String, directory_path: Option<String>) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::set_library_directory(&db_path, &key, directory_path.as_deref())
        .map_err(|error| format!("failed to save library directory: {error}"))
}

#[tauri::command]
fn scan_library(app: tauri::AppHandle) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::scan_library(&db_path).map_err(|error| format!("failed to scan library: {error}"))
}

#[tauri::command]
fn list_library_files(
    app: tauri::AppHandle,
    query: Option<String>,
    category: Option<String>,
    favorites_only: Option<bool>,
    match_mode: Option<String>,
) -> Result<Vec<db::FileRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_files(
        &db_path,
        query.as_deref(),
        category.as_deref(),
        favorites_only.unwrap_or(false),
        match_mode.as_deref(),
    )
    .map_err(|error| format!("failed to list library files: {error}"))
}

fn read_library_excerpt_from_path(path: &str, max_chars: usize) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|error| format!("failed to read file: {error}"))?;
    if bytes.contains(&0) {
        return Ok("该文件为二进制内容，建议直接打开原文件。".to_string());
    }
    let text = String::from_utf8_lossy(&bytes).to_string();
    let excerpt: String = text.chars().take(max_chars.min(20_000)).collect();
    Ok(excerpt)
}

fn command_exists(program: &str) -> bool {
    Command::new(program)
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn extract_text_with_pdftotext(path: &str, max_chars: usize) -> Option<String> {
    let output = Command::new("pdftotext")
        .arg(path)
        .arg("-")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let cleaned = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if cleaned.trim().is_empty() {
        return None;
    }
    Some(cleaned.chars().take(max_chars.min(20_000)).collect())
}

fn extract_text_with_tesseract(path: &str, language: &str, max_chars: usize) -> Option<String> {
    let output = Command::new("tesseract")
        .arg(path)
        .arg("stdout")
        .arg("-l")
        .arg(language)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let cleaned = text.split_whitespace().collect::<Vec<_>>().join(" ");
    if cleaned.trim().is_empty() {
        return None;
    }
    Some(cleaned.chars().take(max_chars.min(20_000)).collect())
}

fn read_library_ocr_text(path: &str, max_chars: usize, language: &str) -> Result<String, String> {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if ext == "pdf" {
        if command_exists("pdftotext") {
            if let Some(text) = extract_text_with_pdftotext(path, max_chars) {
                return Ok(text);
            }
        }
        if command_exists("tesseract") {
            if let Some(text) = extract_text_with_tesseract(path, language, max_chars) {
                return Ok(text);
            }
        }
        return Err("当前环境未检测到可用 PDF OCR 引擎（pdftotext/tesseract）。".to_string());
    }

    let image_ext = ["png", "jpg", "jpeg", "webp", "bmp", "tiff", "heic"];
    if image_ext.contains(&ext.as_str()) {
        if command_exists("tesseract") {
            if let Some(text) = extract_text_with_tesseract(path, language, max_chars) {
                return Ok(text);
            }
            return Err("tesseract 已安装，但未识别到有效文字。".to_string());
        }
        return Err("当前环境未检测到 tesseract，无法进行图片 OCR。".to_string());
    }

    Err("该文件类型暂不走 OCR 通道。".to_string())
}

fn build_library_semantic_summary(file: &db::FileRecord, excerpt: &str) -> String {
    let mut tags = parse_tags_json(file.tags_json.as_deref());
    let lower = file.file_name.to_lowercase();
    if lower.contains("ielts") || file.category.contains("IELTS") {
        tags.push("ielts".to_string());
    }
    if lower.contains("toefl") || file.category.contains("TOEFL") {
        tags.push("toefl".to_string());
    }
    if lower.contains("gre") || file.category.contains("GRE") {
        tags.push("gre".to_string());
    }
    if lower.contains("sop") || lower.contains("ps") || file.category.contains("文书") {
        tags.push("essay".to_string());
    }
    if file.category.contains("作品集") || lower.contains("portfolio") {
        tags.push("portfolio".to_string());
    }
    tags.sort();
    tags.dedup();
    let excerpt_normalized = excerpt
        .replace('\n', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let excerpt_short: String = excerpt_normalized.chars().take(520).collect();
    let tags_text = if tags.is_empty() {
        "general".to_string()
    } else {
        tags.join("|")
    };
    format!(
        "semantic:{tags_text}; category:{}; type:{}; excerpt:{}",
        file.category,
        file.file_type.as_deref().unwrap_or("unknown"),
        excerpt_short
    )
}

#[tauri::command]
fn refresh_library_file_summary(
    app: tauri::AppHandle,
    file_id: i64,
    max_chars: Option<usize>,
) -> Result<String, String> {
    let db_path = get_database_path(&app)?;
    let file = db::get_file_by_id(&db_path, file_id)
        .map_err(|error| format!("failed to read file: {error}"))?
        .ok_or_else(|| "file not found".to_string())?;
    let excerpt = read_library_excerpt_from_path(&file.file_path, max_chars.unwrap_or(4000))?;
    let summary = build_library_semantic_summary(&file, &excerpt);
    db::update_file_summary(&db_path, file_id, &summary)
        .map_err(|error| format!("failed to update file summary: {error}"))?;
    Ok(summary)
}

#[tauri::command]
fn refresh_library_search_index(
    app: tauri::AppHandle,
    limit: Option<i64>,
    only_empty: Option<bool>,
) -> Result<LibrarySummaryRefreshPayload, String> {
    let db_path = get_database_path(&app)?;
    let files = db::list_files_for_summary_refresh(&db_path, limit.unwrap_or(40), only_empty.unwrap_or(true))
        .map_err(|error| format!("failed to list files for summary refresh: {error}"))?;
    let mut refreshed = 0_i64;
    let mut skipped = 0_i64;
    let mut failed = 0_i64;
    let mut touched_file_ids: Vec<i64> = Vec::new();
    for file in files {
        match read_library_excerpt_from_path(&file.file_path, 3000) {
            Ok(excerpt) => {
                let summary = build_library_semantic_summary(&file, &excerpt);
                match db::update_file_summary(&db_path, file.id, &summary) {
                    Ok(_) => {
                        refreshed += 1;
                        touched_file_ids.push(file.id);
                    }
                    Err(_) => {
                        failed += 1;
                    }
                }
            }
            Err(_) => {
                skipped += 1;
            }
        }
    }
    Ok(LibrarySummaryRefreshPayload {
        refreshed,
        skipped,
        failed,
        touched_file_ids,
        summary: format!(
            "索引刷新完成：更新 {} 条，跳过 {} 条，失败 {} 条。",
            refreshed, skipped, failed
        ),
    })
}

#[tauri::command]
fn refresh_library_file_ocr_summary(
    app: tauri::AppHandle,
    file_id: i64,
    ocr_language: Option<String>,
    max_chars: Option<usize>,
) -> Result<String, String> {
    let db_path = get_database_path(&app)?;
    let file = db::get_file_by_id(&db_path, file_id)
        .map_err(|error| format!("failed to read file: {error}"))?
        .ok_or_else(|| "file not found".to_string())?;
    let lang = ocr_language.unwrap_or_else(|| "eng+chi_sim".to_string());
    let text = read_library_ocr_text(&file.file_path, max_chars.unwrap_or(3000), &lang)?;
    let summary = build_library_semantic_summary(&file, &text);
    db::update_file_summary(&db_path, file_id, &summary)
        .map_err(|error| format!("failed to update file summary: {error}"))?;
    Ok(summary)
}

#[tauri::command]
fn refresh_library_ocr_index(
    app: tauri::AppHandle,
    limit: Option<i64>,
    only_empty: Option<bool>,
    ocr_language: Option<String>,
) -> Result<LibraryOcrIndexPayload, String> {
    let db_path = get_database_path(&app)?;
    let files = db::list_files_for_summary_refresh(&db_path, limit.unwrap_or(30), only_empty.unwrap_or(true))
        .map_err(|error| format!("failed to list files for OCR refresh: {error}"))?;
    let lang = ocr_language.unwrap_or_else(|| "eng+chi_sim".to_string());
    let mut refreshed = 0_i64;
    let mut skipped = 0_i64;
    let mut failed = 0_i64;
    let mut touched_file_ids: Vec<i64> = Vec::new();
    for file in files {
        match read_library_ocr_text(&file.file_path, 2600, &lang) {
            Ok(text) => {
                let summary = build_library_semantic_summary(&file, &text);
                match db::update_file_summary(&db_path, file.id, &summary) {
                    Ok(_) => {
                        refreshed += 1;
                        touched_file_ids.push(file.id);
                    }
                    Err(_) => failed += 1,
                }
            }
            Err(reason) => {
                let lower = reason.to_lowercase();
                if lower.contains("暂不走 ocr") || lower.contains("未检测到") || lower.contains("未识别到") {
                    skipped += 1;
                } else {
                    failed += 1;
                }
            }
        }
    }
    Ok(LibraryOcrIndexPayload {
        refreshed,
        skipped,
        failed,
        touched_file_ids,
        summary: format!(
            "OCR 索引完成：更新 {} 条，跳过 {} 条，失败 {} 条。",
            refreshed, skipped, failed
        ),
    })
}

#[tauri::command]
fn list_library_import_logs(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<Vec<db::LibraryImportLogRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_library_import_logs(&db_path, limit.unwrap_or(40))
        .map_err(|error| format!("failed to list library import logs: {error}"))
}

#[tauri::command]
fn toggle_library_file_favorite(app: tauri::AppHandle, file_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::toggle_file_favorite(&db_path, file_id)
        .map_err(|error| format!("failed to toggle file favorite: {error}"))
}

#[tauri::command]
fn open_library_file(app: tauri::AppHandle, file_id: i64, file_path: String) -> Result<(), String> {
    let path = std::path::PathBuf::from(file_path);
    if !path.exists() {
        return Err("file does not exist".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg(&path)
            .status()
            .map_err(|error| format!("failed to open file: {error}"))?;
        if !status.success() {
            return Err("system failed to open file".to_string());
        }
    }
    #[cfg(target_os = "linux")]
    {
        let status = Command::new("xdg-open")
            .arg(&path)
            .status()
            .map_err(|error| format!("failed to open file: {error}"))?;
        if !status.success() {
            return Err("system failed to open file".to_string());
        }
    }
    #[cfg(target_os = "windows")]
    {
        let path_str = path.to_string_lossy().to_string();
        let status = Command::new("cmd")
            .args(["/C", "start", "", &path_str])
            .status()
            .map_err(|error| format!("failed to open file: {error}"))?;
        if !status.success() {
            return Err("system failed to open file".to_string());
        }
    }

    let db_path = get_database_path(&app)?;
    db::mark_file_opened(&db_path, file_id)
        .map_err(|error| format!("failed to update file open timestamp: {error}"))?;
    Ok(())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err("仅支持 http/https 链接".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let status = Command::new("open")
            .arg(trimmed)
            .status()
            .map_err(|error| format!("failed to open url: {error}"))?;
        if !status.success() {
            return Err("系统未能打开链接".to_string());
        }
    }
    #[cfg(target_os = "linux")]
    {
        let status = Command::new("xdg-open")
            .arg(trimmed)
            .status()
            .map_err(|error| format!("failed to open url: {error}"))?;
        if !status.success() {
            return Err("系统未能打开链接".to_string());
        }
    }
    #[cfg(target_os = "windows")]
    {
        let status = Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .status()
            .map_err(|error| format!("failed to open url: {error}"))?;
        if !status.success() {
            return Err("系统未能打开链接".to_string());
        }
    }
    Ok(())
}


// ─── AI Council Bridge WebSocket 服务 ─────────────────────────────

/// 桥接服务器共享状态
struct BridgeState {
    /// provider -> 连接信息
    providers: HashMap<String, ProviderConnection>,
    /// 等待回复的请求 id -> oneshot sender
    pending: HashMap<String, tokio::sync::oneshot::Sender<Result<String, String>>>,
}

struct ProviderConnection {
    sender: tokio::sync::mpsc::UnboundedSender<String>,
    status: ProviderStatus,
}

impl BridgeState {
    fn new() -> Self {
        Self {
            providers: HashMap::new(),
            pending: HashMap::new(),
        }
    }
}

/// 启动 WebSocket 服务器
async fn start_bridge_server(state: Arc<Mutex<BridgeState>>) -> Result<(), String> {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:19280")
        .await
        .map_err(|e| format!("WebSocket 绑定失败: {e}"))?;

    loop {
        let (stream, _) = match listener.accept().await {
            Ok(conn) => conn,
            Err(_) => continue,
        };

        let state = state.clone();
        tokio::spawn(async move {
            let ws = match tokio_tungstenite::accept_async(stream).await {
                Ok(ws) => ws,
                Err(_) => return,
            };

            let (write, mut read) = ws.split();
            let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();

            // 写任务：把 channel 中的消息写入 WebSocket
            let write_task = tokio::spawn(async move {
                use futures_util::SinkExt;
                let mut write = write;
                while let Some(msg) = rx.recv().await {
                    let _ = write
                        .send(tokio_tungstenite::tungstenite::Message::Text(msg.into()))
                        .await;
                }
            });

            let mut registered_provider: Option<String> = None;

            // 读任务：处理来自油猴脚本的消息
            while let Some(Ok(msg)) = read.next().await {
                let text = match msg {
                    tokio_tungstenite::tungstenite::Message::Text(t) => t,
                    tokio_tungstenite::tungstenite::Message::Close(_) => break,
                    _ => continue,
                };

                let parsed: BridgeMessage = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let msg_type = parsed.r#type.as_deref().unwrap_or("");

                match msg_type {
                    "register" => {
                        if let Some(ref provider) = parsed.provider {
                            let mut state = state.lock().unwrap();
                            state.providers.insert(
                                provider.clone(),
                                ProviderConnection {
                                    sender: tx.clone(),
                                    status: ProviderStatus {
                                        provider: provider.clone(),
                                        connected: true,
                                        is_streaming: false,
                                        has_input: false,
                                    },
                                },
                            );
                            registered_provider = Some(provider.clone());
                        }
                    }
                    "send_ack" => {
                        if let (Some(ref id), Some(ref status)) = (&parsed.id, &parsed.status) {
                            let mut state = state.lock().unwrap();
                            if let Some(sender) = state.pending.remove(id.as_str()) {
                                if status == "ok" {
                                    let _ = sender.send(Ok("sent".to_string()));
                                } else {
                                    let err = parsed
                                        .error
                                        .unwrap_or_else(|| "unknown error".to_string());
                                    let _ = sender.send(Err(err));
                                }
                            }
                        }
                    }
                    "read_ack" => {
                        if let Some(ref id) = parsed.id {
                            let mut state = state.lock().unwrap();
                            if let Some(sender) = state.pending.remove(id.as_str()) {
                                match (parsed.status.as_deref(), parsed.text.as_deref()) {
                                    (Some("error"), _) => {
                                        let err = parsed
                                            .error
                                            .unwrap_or_else(|| "read failed".to_string());
                                        let _ = sender.send(Err(err));
                                    }
                                    (_, Some(text)) => {
                                        let _ = sender.send(Ok(text.to_string()));
                                    }
                                    _ => {
                                        let _ = sender.send(Err("empty reply".to_string()));
                                    }
                                }
                            }
                        }
                    }
                    "status_ack" => {
                        if let Some(ref provider) = parsed.provider {
                            let mut state = state.lock().unwrap();
                            if let Some(conn) = state.providers.get_mut(provider) {
                                if let Some(ref status_str) = parsed.status {
                                    conn.status.is_streaming = status_str == "streaming" || status_str == "true";
                                    conn.status.has_input = status_str == "true";
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }

            // 清理：断开时移除 provider
            if let Some(provider) = registered_provider {
                let mut state = state.lock().unwrap();
                state.providers.remove(&provider);
            }

            write_task.abort();
        });
    }
}

#[tauri::command]
async fn send_to_provider(
    state: State<'_, Arc<Mutex<BridgeState>>>,
    provider: String,
    text: String,
    request_id: String,
) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    {
        let mut bridge = state.lock().unwrap();
        let conn = bridge
            .providers
            .get(&provider)
            .ok_or_else(|| format!("{provider} 未连接"))?;

        let msg = BridgeMessage {
            r#type: Some("send".to_string()),
            id: Some(request_id.clone()),
            provider: Some(provider.clone()),
            text: Some(text),
            status: None,
            error: None,
        };
        let json = serde_json::to_string(&msg).map_err(|e| format!("序列化失败: {e}"))?;
        conn.sender
            .send(json)
            .map_err(|_| format!("{provider} 连接已断开"))?;

        bridge.pending.insert(request_id.clone(), tx);
    }

    match tokio::time::timeout(Duration::from_secs(120), rx).await {
        Ok(Ok(result)) => result,
        Ok(Err(_)) => Err("通道关闭".to_string()),
        Err(_) => {
            state.lock().unwrap().pending.remove(&request_id);
            Err("等待回复超时".to_string())
        }
    }
}

#[tauri::command]
async fn read_from_provider(
    state: State<'_, Arc<Mutex<BridgeState>>>,
    provider: String,
    request_id: String,
) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    {
        let mut bridge = state.lock().unwrap();
        let conn = bridge
            .providers
            .get(&provider)
            .ok_or_else(|| format!("{provider} 未连接"))?;

        let msg = BridgeMessage {
            r#type: Some("read".to_string()),
            id: Some(request_id.clone()),
            provider: Some(provider.clone()),
            text: None,
            status: None,
            error: None,
        };
        let json = serde_json::to_string(&msg).map_err(|e| format!("序列化失败: {e}"))?;
        conn.sender
            .send(json)
            .map_err(|_| format!("{provider} 连接已断开"))?;

        bridge.pending.insert(request_id.clone(), tx);
    }

    match tokio::time::timeout(Duration::from_secs(120), rx).await {
        Ok(Ok(result)) => result,
        Ok(Err(_)) => Err("通道关闭".to_string()),
        Err(_) => {
            state.lock().unwrap().pending.remove(&request_id);
            Err("等待回复超时".to_string())
        }
    }
}

#[tauri::command]
async fn get_provider_status(
    state: State<'_, Arc<Mutex<BridgeState>>>,
) -> Result<Vec<ProviderStatus>, String> {
    let bridge = state.lock().unwrap();
    Ok(bridge
        .providers
        .values()
        .map(|c| c.status.clone())
        .collect())
}

#[tauri::command]
fn list_library_file_links(app: tauri::AppHandle, file_id: i64) -> Result<Vec<db::FileLinkView>, String> {
    let db_path = get_database_path(&app)?;
    db::list_file_links(&db_path, file_id).map_err(|error| format!("failed to list file links: {error}"))
}

#[tauri::command]
fn replace_library_file_links(app: tauri::AppHandle, file_id: i64, links: Vec<FileLinkInput>) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::replace_file_links(&db_path, file_id, &links)
        .map_err(|error| format!("failed to replace file links: {error}"))
}

#[tauri::command]
fn batch_set_library_file_tags(
    app: tauri::AppHandle,
    file_ids: Vec<i64>,
    tags: Vec<String>,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let normalized: Vec<String> = tags
        .into_iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect();
    let tags_json = if normalized.is_empty() {
        None
    } else {
        Some(serde_json::to_string(&normalized).map_err(|error| format!("failed to serialize tags: {error}"))?)
    };
    db::batch_set_file_tags(&db_path, &file_ids, tags_json.as_deref())
        .map_err(|error| format!("failed to batch set tags: {error}"))
}

#[tauri::command]
fn batch_append_library_file_links(
    app: tauri::AppHandle,
    file_ids: Vec<i64>,
    links: Vec<FileLinkInput>,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::append_file_links(&db_path, &file_ids, &links)
        .map_err(|error| format!("failed to batch append links: {error}"))
}

#[tauri::command]
fn get_app_setting(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let db_path = get_database_path(&app)?;
    db::get_app_setting(&db_path, &key).map_err(|error| format!("failed to read app setting: {error}"))
}

#[tauri::command]
fn set_app_setting(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::set_app_setting(&db_path, &key, &value).map_err(|error| format!("failed to write app setting: {error}"))
}

fn read_custom_categories(db_path: &Path) -> Result<Vec<LibraryCustomCategory>, String> {
    let raw = db::get_app_setting(db_path, "library_custom_categories")
        .map_err(|error| format!("failed to read custom categories: {error}"))?;
    if let Some(text) = raw {
        if text.trim().is_empty() {
            return Ok(Vec::new());
        }
        return serde_json::from_str::<Vec<LibraryCustomCategory>>(&text)
            .map_err(|error| format!("failed to parse custom categories: {error}"));
    }
    Ok(Vec::new())
}

fn write_custom_categories(db_path: &Path, categories: &[LibraryCustomCategory]) -> Result<(), String> {
    let payload = serde_json::to_string(categories)
        .map_err(|error| format!("failed to serialize custom categories: {error}"))?;
    db::set_app_setting(db_path, "library_custom_categories", &payload)
        .map_err(|error| format!("failed to persist custom categories: {error}"))
}

#[tauri::command]
async fn delete_library_file(app: tauri::AppHandle, file_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_file(&db_path, file_id).map_err(|error| format!("failed to delete library file: {error}"))
}

#[tauri::command]
async fn rename_library_file(app: tauri::AppHandle, file_id: i64, new_name: String) -> Result<(), String> {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return Err("new_name is empty".to_string());
    }
    let db_path = get_database_path(&app)?;
    db::rename_file(&db_path, file_id, trimmed)
        .map_err(|error| format!("failed to rename library file: {error}"))
}

#[tauri::command]
async fn move_library_file(
    app: tauri::AppHandle,
    file_id: i64,
    new_category: String,
    new_big_category: String,
) -> Result<(), String> {
    let category = new_category.trim();
    if category.is_empty() {
        return Err("new_category is empty".to_string());
    }
    let db_path = get_database_path(&app)?;
    db::move_file_category(&db_path, file_id, category)
        .map_err(|error| format!("failed to move library file: {error}"))?;
    let mut tags = db::get_file_by_id(&db_path, file_id)
        .map_err(|error| format!("failed to read file after move: {error}"))?
        .and_then(|file| file.tags_json)
        .unwrap_or_else(|| "[]".to_string());
    if let Ok(mut parsed) = serde_json::from_str::<Vec<String>>(&tags) {
        parsed.retain(|item| !item.starts_with("big_category:"));
        if !new_big_category.trim().is_empty() {
            parsed.push(format!("big_category:{}", new_big_category.trim()));
        }
        tags = serde_json::to_string(&parsed).unwrap_or_else(|_| "[]".to_string());
    }
    db::update_file_category_and_tags(&db_path, file_id, category, Some(tags.as_str()))
        .map_err(|error| format!("failed to persist move tags: {error}"))?;
    Ok(())
}

#[tauri::command]
async fn toggle_favorite(app: tauri::AppHandle, file_id: i64) -> Result<bool, String> {
    let db_path = get_database_path(&app)?;
    db::toggle_file_favorite_with_state(&db_path, file_id)
        .map_err(|error| format!("failed to toggle favorite: {error}"))
}

#[tauri::command]
async fn create_category(app: tauri::AppHandle, name: String, parent: String) -> Result<i64, String> {
    let normalized_name = name.trim();
    let normalized_parent = parent.trim();
    if normalized_name.is_empty() {
        return Err("name is empty".to_string());
    }
    if normalized_parent.is_empty() {
        return Err("parent is empty".to_string());
    }
    let db_path = get_database_path(&app)?;
    let mut categories = read_custom_categories(&db_path)?;
    if categories.iter().any(|item| item.parent == normalized_parent && item.name.eq_ignore_ascii_case(normalized_name)) {
        return Err("同一分组下已存在同名分类".to_string());
    }
    let next_id = Utc::now().timestamp_millis();
    let next_order = categories
        .iter()
        .filter(|item| item.parent == normalized_parent)
        .map(|item| item.order)
        .max()
        .unwrap_or(0)
        + 1;
    categories.push(LibraryCustomCategory {
        id: next_id,
        name: normalized_name.to_string(),
        parent: normalized_parent.to_string(),
        order: next_order,
    });
    write_custom_categories(&db_path, &categories)?;
    Ok(next_id)
}

#[tauri::command]
async fn delete_category(app: tauri::AppHandle, category_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let mut categories = read_custom_categories(&db_path)?;
    let Some(target) = categories.iter().find(|item| item.id == category_id).cloned() else {
        return Ok(());
    };
    let files = db::list_files(&db_path, None, Some(target.name.as_str()), false, None)
        .map_err(|error| format!("failed to check files before delete category: {error}"))?;
    if !files.is_empty() {
        return Err("请先移走文件".to_string());
    }
    categories.retain(|item| item.id != category_id);
    write_custom_categories(&db_path, &categories)?;
    Ok(())
}

#[tauri::command]
async fn rename_category(app: tauri::AppHandle, category_id: i64, new_name: String) -> Result<(), String> {
    let normalized_name = new_name.trim();
    if normalized_name.is_empty() {
        return Err("new_name is empty".to_string());
    }
    let db_path = get_database_path(&app)?;
    let mut categories = read_custom_categories(&db_path)?;
    let Some(index) = categories.iter().position(|item| item.id == category_id) else {
        return Err("category not found".to_string());
    };
    let parent = categories[index].parent.clone();
    if categories
        .iter()
        .any(|item| item.id != category_id && item.parent == parent && item.name.eq_ignore_ascii_case(normalized_name))
    {
        return Err("同一分组下已存在同名分类".to_string());
    }
    let old_name = categories[index].name.clone();
    categories[index].name = normalized_name.to_string();
    write_custom_categories(&db_path, &categories)?;

    let files = db::list_files(&db_path, None, Some(old_name.as_str()), false, None)
        .map_err(|error| format!("failed to list files for category rename: {error}"))?;
    for file in files {
        db::move_file_category(&db_path, file.id, normalized_name)
            .map_err(|error| format!("failed to rename category for file {}: {error}", file.id))?;
    }
    Ok(())
}

#[tauri::command]
async fn set_library_file_school(
    app: tauri::AppHandle,
    file_id: i64,
    school: Option<String>,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let Some(file) = db::get_file_by_id(&db_path, file_id)
        .map_err(|error| format!("failed to read file before updating school: {error}"))? else {
        return Err("file not found".to_string());
    };
    let mut tags = parse_tags_json(file.tags_json.as_deref());
    tags.retain(|item| !item.starts_with("school:"));
    if let Some(value) = school
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        tags.push(format!("school:{value}"));
    }
    tags.sort_unstable();
    tags.dedup();
    let tags_json = serde_json::to_string(&tags)
        .map_err(|error| format!("failed to serialize school tags: {error}"))?;
    db::update_file_category_and_tags(&db_path, file_id, file.category.as_str(), Some(tags_json.as_str()))
        .map_err(|error| format!("failed to update school tags: {error}"))?;
    Ok(())
}

#[tauri::command]
async fn import_library_files_to_documents(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
    big_category: String,
    category: String,
) -> Result<LibraryImportPayload, String> {
    let normalized_big = big_category.trim();
    let normalized_category = category.trim();
    if normalized_big.is_empty() {
        return Err("big_category is empty".to_string());
    }
    if normalized_category.is_empty() {
        return Err("category is empty".to_string());
    }
    let db_path = get_database_path(&app)?;
    let home_dir = app
        .path()
        .home_dir()
        .map_err(|error| format!("failed to resolve home dir: {error}"))?;
    let target_dir = home_dir
        .join("Documents")
        .join("申请助手")
        .join("Library")
        .join(normalized_big)
        .join(normalized_category);
    std::fs::create_dir_all(&target_dir)
        .map_err(|error| format!("failed to create target directory: {error}"))?;

    let mut imported = 0_i64;
    let mut skipped = 0_i64;
    let mut failed = 0_i64;
    let mut imported_file_ids: Vec<i64> = Vec::new();

    for raw in file_paths {
        let source = std::path::PathBuf::from(raw.trim());
        if !source.exists() || !source.is_file() {
            skipped += 1;
            continue;
        }
        let original_name = source
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("imported_file");
        let safe_name = sanitize_visible_file_name(original_name);
        let stem = std::path::Path::new(&safe_name)
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or("imported_file");
        let ext = std::path::Path::new(&safe_name)
            .extension()
            .and_then(|value| value.to_str())
            .map(|value| value.to_ascii_lowercase());

        let mut destination = target_dir.join(&safe_name);
        if destination.exists() {
            let now_suffix = Local::now().format("%Y%m%d-%H%M%S").to_string();
            let fallback_name = if let Some(extension) = ext.as_deref() {
                format!("{stem}-{now_suffix}.{extension}")
            } else {
                format!("{stem}-{now_suffix}")
            };
            destination = target_dir.join(fallback_name);
        }

        match std::fs::copy(&source, &destination) {
            Ok(_) => {
                let metadata = std::fs::metadata(&destination).ok();
                let mut tags = vec![
                    "manual_import".to_string(),
                    format!("big_category:{normalized_big}"),
                ];
                tags.sort_unstable();
                tags.dedup();
                let tags_json = serde_json::to_string(&tags)
                    .map_err(|error| format!("failed to serialize import tags: {error}"))?;
                let file_id = db::upsert_file_record(
                    &db_path,
                    &destination.to_string_lossy(),
                    destination
                        .file_name()
                        .and_then(|value| value.to_str())
                        .unwrap_or(&safe_name),
                    ext.as_deref(),
                    metadata.map(|item| item.len() as i64),
                    normalized_category,
                    None,
                    Some(tags_json.as_str()),
                )
                .map_err(|error| format!("failed to save imported file record: {error}"))?;
                imported += 1;
                imported_file_ids.push(file_id);
            }
            Err(_) => failed += 1,
        }
    }

    Ok(LibraryImportPayload {
        imported,
        skipped,
        failed,
        imported_file_ids,
        summary: format!("导入完成：成功 {imported}，跳过 {skipped}，失败 {failed}。"),
    })
}

#[tauri::command]
fn list_notifications(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<db::NotificationRecord>, String> {
    let db_path = get_database_path(&app)?;
    let safe_limit = limit.unwrap_or(30).max(1).min(200);
    db::list_notifications(&db_path, safe_limit).map_err(|error| format!("failed to list notifications: {error}"))
}

#[tauri::command]
fn list_notifications_with_filters(
    app: tauri::AppHandle,
    payload: NotificationQueryInput,
) -> Result<Vec<db::NotificationRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_notifications_with_filters(&db_path, &payload)
        .map_err(|error| format!("failed to list notifications with filters: {error}"))
}

#[tauri::command]
fn mark_notification_read(
    app: tauri::AppHandle,
    notification_id: i64,
    is_read: bool,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::mark_notification_read(&db_path, notification_id, is_read)
        .map_err(|error| format!("failed to mark notification read state: {error}"))
}

#[tauri::command]
fn ignore_notification(
    app: tauri::AppHandle,
    notification_id: i64,
    reason: Option<String>,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::ignore_notification(&db_path, notification_id, reason.as_deref())
        .map_err(|error| format!("failed to ignore notification: {error}"))
}

fn snooze_until_from_preset(preset: &str) -> DateTime<Utc> {
    let now = Local::now();
    match preset {
        "1h" => (now + chrono::Duration::hours(1)).with_timezone(&Utc),
        "later_today" => {
            let target_today = now
                .with_hour(20)
                .and_then(|v| v.with_minute(0))
                .and_then(|v| v.with_second(0))
                .unwrap_or(now + chrono::Duration::hours(4));
            if target_today > now {
                target_today.with_timezone(&Utc)
            } else {
                (now + chrono::Duration::hours(4)).with_timezone(&Utc)
            }
        }
        "tomorrow" => {
            let tomorrow = now + chrono::Duration::days(1);
            tomorrow
                .with_hour(9)
                .and_then(|v| v.with_minute(0))
                .and_then(|v| v.with_second(0))
                .unwrap_or(tomorrow)
                .with_timezone(&Utc)
        }
        _ => (now + chrono::Duration::hours(1)).with_timezone(&Utc),
    }
}

#[tauri::command]
fn snooze_notification(
    app: tauri::AppHandle,
    notification_id: i64,
    preset: String,
) -> Result<String, String> {
    let db_path = get_database_path(&app)?;
    let until = snooze_until_from_preset(preset.trim());
    let until_text = until.to_rfc3339();
    db::snooze_notification(&db_path, notification_id, &until_text, preset.trim())
        .map_err(|error| format!("failed to snooze notification: {error}"))?;
    Ok(until_text)
}

#[tauri::command]
fn create_task_from_notification(app: tauri::AppHandle, notification_id: i64) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let item = db::get_notification_by_id(&db_path, notification_id)
        .map_err(|error| format!("failed to read notification: {error}"))?
        .ok_or_else(|| "notification not found".to_string())?;
    let task_priority = match item.priority.as_str() {
        "critical" => "高",
        "warning" => "中",
        _ => "低",
    };
    let detected_deadline = detect_first_date_like(&item.content);
    let today = Local::now().format("%Y-%m-%d").to_string();
    let task_id = db::create_task(
        &db_path,
        &NewTaskInput {
            title: format!("[通知处理] {}", item.title),
            description: Some(format!(
                "来源：{} / {}\n通知ID：{}\n\n{}",
                item.channel, item.source_type, item.id, item.content
            )),
            source_type: Some("notification".to_string()),
            source_id: Some(item.id),
            task_type: "通知处理".to_string(),
            priority: task_priority.to_string(),
            status: "未开始".to_string(),
            estimated_minutes: Some(45),
            scheduled_date: Some(today.clone()),
            time_start: None,
            time_end: None,
            reminder_at: None,
            deadline: detected_deadline.or(Some(today)),
            parent_task_id: None,
            recurrence_enabled: Some(false),
            recurrence_type: None,
            recurrence_interval: None,
            recurrence_days_of_week: None,
            recurrence_day_of_month: None,
            recurrence_until: None,
            recurrence_source_task_id: None,
            completion_tag: None,
            last_delay_reason_code: None,
            last_delay_reason_note: None,
        },
    )
    .map_err(|error| format!("failed to create task from notification: {error}"))?;
    db::mark_notification_read(&db_path, notification_id, true)
        .map_err(|error| format!("failed to update notification read state: {error}"))?;
    let _ = db::record_notification_action(
        &db_path,
        notification_id,
        "convert_to_task",
        Some(&serde_json::json!({ "taskId": task_id }).to_string()),
    );
    let _ = db::set_app_setting(
        &db_path,
        &format!("notification_task_link_{}", notification_id),
        &task_id.to_string(),
    );
    Ok(task_id)
}

#[tauri::command]
fn log_notification_action(
    app: tauri::AppHandle,
    notification_id: i64,
    action_name: String,
    action_payload_json: Option<String>,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::record_notification_action(
        &db_path,
        notification_id,
        action_name.trim(),
        action_payload_json.as_deref(),
    )
    .map_err(|error| format!("failed to log notification action: {error}"))
}

fn sanitize_file_stem(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
            out.push(ch);
        } else if ch.is_whitespace() {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "web-capture".to_string()
    } else {
        trimmed.chars().take(40).collect()
    }
}

fn sanitize_file_name(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
            out.push(ch);
        } else if ch.is_whitespace() {
            out.push('_');
        }
    }
    let trimmed = out.trim_matches('.').trim_matches('_').trim_matches('-').to_string();
    if trimmed.is_empty() {
        "imported_file".to_string()
    } else {
        trimmed.chars().take(120).collect()
    }
}

fn sanitize_visible_file_name(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return "imported_file".to_string();
    }
    let mut out = String::with_capacity(trimmed.len());
    for ch in trimmed.chars() {
        if matches!(ch, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') {
            out.push('_');
        } else {
            out.push(ch);
        }
    }
    let normalized = out.trim().trim_matches('.').to_string();
    if normalized.is_empty() {
        "imported_file".to_string()
    } else {
        normalized
    }
}

fn library_label_from_key(key: &str) -> String {
    match key {
        "ielts" => "IELTS".to_string(),
        "gre" => "GRE".to_string(),
        "toefl" => "TOEFL".to_string(),
        "documents" => "申请个人资料".to_string(),
        "essays" => "文书".to_string(),
        "portfolio" => "作品集".to_string(),
        "videos" => "视频资料".to_string(),
        "other" => "其他文档".to_string(),
        _ => "资料收纳箱".to_string(),
    }
}

fn infer_library_key_from_source(path: &std::path::Path) -> &'static str {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if matches!(
        extension.as_str(),
        "mp4" | "mov" | "m4v" | "webm" | "mkv" | "avi" | "wmv"
    ) {
        return "videos";
    }

    if file_name.contains("ielts") || file_name.contains("雅思") {
        return "ielts";
    }
    if file_name.contains("toefl") || file_name.contains("托福") {
        return "toefl";
    }
    if file_name.contains("gre") || file_name.contains("gmat") {
        return "gre";
    }

    if file_name.contains("essay")
        || file_name.contains("sop")
        || file_name.contains("ps")
        || file_name.contains("文书")
        || file_name.contains("personal statement")
    {
        return "essays";
    }

    if file_name.contains("portfolio")
        || file_name.contains("作品集")
        || file_name.contains("demo reel")
    {
        return "portfolio";
    }

    if file_name.contains("cv")
        || file_name.contains("resume")
        || file_name.contains("passport")
        || file_name.contains("transcript")
        || file_name.contains("推荐信")
        || file_name.contains("recommendation")
        || file_name.contains("成绩单")
    {
        return "documents";
    }

    "inbox"
}

fn compose_import_tags(key: &str, auto_classified: bool) -> String {
    if auto_classified {
        format!(
            r#"["manual_import","library_{key}","library_auto_classified"]"#,
            key = key
        )
    } else {
        format!(r#"["manual_import","library_{key}"]"#, key = key)
    }
}

fn parse_tags_json(raw: Option<&str>) -> Vec<String> {
    raw.and_then(|text| serde_json::from_str::<Vec<String>>(text).ok())
        .unwrap_or_default()
        .into_iter()
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect()
}

fn normalize_library_key(raw: Option<&str>) -> String {
    let key = raw.unwrap_or("inbox").trim().to_ascii_lowercase();
    if key.is_empty() {
        "inbox".to_string()
    } else {
        key
    }
}

fn build_inbox_resolve_tags(
    existing_tags: &[String],
    target_key: &str,
    archive_mode: bool,
) -> Vec<String> {
    let mut tags: Vec<String> = existing_tags
        .iter()
        .filter(|tag| !tag.starts_with("library_"))
        .cloned()
        .collect();
    if !tags.iter().any(|tag| tag == "manual_import") {
        tags.push("manual_import".to_string());
    }
    if archive_mode {
        tags.push("library_archived".to_string());
    } else {
        tags.push(format!("library_{target_key}"));
    }
    tags.sort_unstable();
    tags.dedup();
    tags
}

#[tauri::command]
fn resolve_library_inbox_file(
    app: tauri::AppHandle,
    file_id: i64,
    target_key: Option<String>,
    action: Option<String>,
) -> Result<LibraryInboxResolvePayload, String> {
    let db_path = get_database_path(&app)?;
    let file = db::get_file_by_id(&db_path, file_id)
        .map_err(|error| format!("failed to read file: {error}"))?
        .ok_or_else(|| "file not found".to_string())?;
    let action_name = action.unwrap_or_else(|| "classify".to_string()).trim().to_ascii_lowercase();
    let archive_mode = action_name == "archive";
    let effective_key = normalize_library_key(target_key.as_deref());
    let resolved_key = if archive_mode {
        "archive".to_string()
    } else if effective_key == "inbox" {
        infer_library_key_from_source(std::path::Path::new(&file.file_path)).to_string()
    } else {
        effective_key
    };
    let category = if archive_mode {
        "资料归档".to_string()
    } else {
        library_label_from_key(&resolved_key)
    };
    let existing_tags = parse_tags_json(file.tags_json.as_deref());
    let next_tags = build_inbox_resolve_tags(&existing_tags, &resolved_key, archive_mode);
    let tags_json =
        serde_json::to_string(&next_tags).map_err(|error| format!("failed to serialize tags: {error}"))?;
    db::update_file_category_and_tags(&db_path, file_id, &category, Some(tags_json.as_str()))
        .map_err(|error| format!("failed to update file category: {error}"))?;
    let import_status = if archive_mode { "archived" } else { "resolved" };
    let reason = if archive_mode {
        "manual_archive"
    } else {
        "manual_classify"
    };
    let log_id = db::create_library_import_log(
        &db_path,
        &file.file_path,
        Some(&file.file_path),
        Some(&file.file_name),
        &resolved_key,
        &category,
        import_status,
        Some(reason),
        Some(file_id),
    )
    .map_err(|error| format!("failed to write import log: {error}"))?;
    let summary = if archive_mode {
        format!("已归档：{}", file.file_name)
    } else {
        format!("已整理到「{}」：{}", category, file.file_name)
    };
    Ok(LibraryInboxResolvePayload {
        file_id,
        action: if archive_mode { "archive".to_string() } else { "classify".to_string() },
        target_key: resolved_key,
        category,
        tags: next_tags,
        log_id,
        summary,
    })
}

#[tauri::command]
fn import_library_files(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
    target_key: Option<String>,
) -> Result<LibraryImportPayload, String> {
    let db_path = get_database_path(&app)?;
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    let managed_root = app_dir.join("library_managed");
    std::fs::create_dir_all(&managed_root)
        .map_err(|error| format!("failed to create managed root: {error}"))?;

    let raw_key = target_key.unwrap_or_else(|| "inbox".to_string());
    let key = if raw_key.trim().is_empty() {
        "inbox".to_string()
    } else {
        raw_key.trim().to_ascii_lowercase()
    };
    let mut imported = 0_i64;
    let mut skipped = 0_i64;
    let mut failed = 0_i64;
    let mut duplicate_skipped = 0_i64;
    let mut invalid_skipped = 0_i64;
    let mut imported_file_ids: Vec<i64> = Vec::new();

    for raw in file_paths {
        let source = std::path::PathBuf::from(raw.trim());
        if !source.exists() || !source.is_file() {
            skipped += 1;
            invalid_skipped += 1;
            let _ = db::create_library_import_log(
                &db_path,
                raw.trim(),
                None,
                source.file_name().and_then(|v| v.to_str()),
                &key,
                &library_label_from_key(&key),
                "skipped",
                Some("invalid_path"),
                None,
            );
            continue;
        }

        let effective_key = if key == "inbox" {
            infer_library_key_from_source(&source).to_string()
        } else {
            key.clone()
        };
        let auto_classified = key == "inbox" && effective_key != "inbox";
        let target_dir = managed_root.join(&effective_key);
        std::fs::create_dir_all(&target_dir)
            .map_err(|error| format!("failed to create target managed folder: {error}"))?;
        let category = library_label_from_key(&effective_key);

        let original_name = source
            .file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("imported_file");
        let safe_name = sanitize_file_name(original_name);
        let ext = source
            .extension()
            .and_then(|v| v.to_str())
            .map(|v| v.to_ascii_lowercase());
        let stem = source
            .file_stem()
            .and_then(|v| v.to_str())
            .map(sanitize_file_name)
            .unwrap_or_else(|| "imported_file".to_string());
        let source_metadata = std::fs::metadata(&source).ok();
        let source_size = source_metadata.as_ref().map(|item| item.len() as i64);
        let mut destination = target_dir.join(&safe_name);
        if destination.exists() {
            if let (Some(existing), Some(source_bytes)) =
                (std::fs::metadata(&destination).ok(), source_metadata.as_ref())
            {
                if existing.len() == source_bytes.len() {
                    skipped += 1;
                    duplicate_skipped += 1;
                    let _ = db::create_library_import_log(
                        &db_path,
                        &source.to_string_lossy(),
                        Some(&destination.to_string_lossy()),
                        Some(original_name),
                        &effective_key,
                        &category,
                        "skipped",
                        Some("duplicate_by_name_and_size"),
                        None,
                    );
                    continue;
                }
            }
            let now_suffix = Local::now().format("%Y%m%d-%H%M%S").to_string();
            let fallback_name = if ext.as_deref().unwrap_or("").is_empty() {
                format!("{stem}-{now_suffix}")
            } else {
                format!("{stem}-{now_suffix}.{}", ext.clone().unwrap_or_default())
            };
            destination = target_dir.join(fallback_name);
        }

        match std::fs::copy(&source, &destination) {
            Ok(_) => {
                let metadata = std::fs::metadata(&destination).ok();
                let tags_json = compose_import_tags(&effective_key, auto_classified);
                let file_id = db::upsert_file_record(
                    &db_path,
                    &destination.to_string_lossy(),
                    destination
                        .file_name()
                        .and_then(|v| v.to_str())
                        .unwrap_or(&safe_name),
                    ext.as_deref(),
                    metadata.map(|m| m.len() as i64).or(source_size),
                    &category,
                    None,
                    Some(tags_json.as_str()),
                )
                .map_err(|error| format!("failed to upsert imported file: {error}"))?;
                imported += 1;
                imported_file_ids.push(file_id);
                let _ = db::create_library_import_log(
                    &db_path,
                    &source.to_string_lossy(),
                    Some(&destination.to_string_lossy()),
                    Some(original_name),
                    &effective_key,
                    &category,
                    "imported",
                    if auto_classified { Some("auto_classified") } else { None },
                    Some(file_id),
                );
            }
            Err(_) => {
                failed += 1;
                let _ = db::create_library_import_log(
                    &db_path,
                    &source.to_string_lossy(),
                    Some(&destination.to_string_lossy()),
                    Some(original_name),
                    &effective_key,
                    &category,
                    "failed",
                    Some("copy_failed"),
                    None,
                );
            }
        }
    }

    Ok(LibraryImportPayload {
        imported,
        skipped,
        failed,
        imported_file_ids,
        summary: format!(
            "导入完成：成功 {imported}，跳过 {skipped}（重复 {duplicate_skipped} / 无效 {invalid_skipped}），失败 {failed}。"
        ),
    })
}

fn save_clipping_as_library_internal(
    app: &tauri::AppHandle,
    db_path: &std::path::Path,
    clipping_id: i64,
) -> Result<i64, String> {
    let clipping = db::get_web_clipping(db_path, clipping_id)
        .map_err(|error| format!("failed to read clipping: {error}"))?
        .ok_or_else(|| "clipping not found".to_string())?;
    let source = db::get_web_source(db_path, clipping.source_id)
        .map_err(|error| format!("failed to read source: {error}"))?;
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app dir: {error}"))?;
    let capture_dir = app_dir.join("web_captures");
    std::fs::create_dir_all(&capture_dir)
        .map_err(|error| format!("failed to create capture directory: {error}"))?;
    let date_key = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let stem = sanitize_file_stem(&clipping.clipped_title);
    let file_name = format!("{stem}-{date_key}.md");
    let file_path = capture_dir.join(file_name);
    let mut body = String::new();
    body.push_str(&format!("# {}\n\n", clipping.clipped_title));
    if let Some(item) = source.as_ref() {
        body.push_str(&format!("- URL: {}\n", item.url));
        body.push_str(&format!("- 分类: {}\n", item.category));
        body.push_str(&format!("- 类型: {}\n", item.source_type));
    }
    body.push_str(&format!("- 保存时间: {}\n\n", clipping.created_at));
    body.push_str("## 摘录正文\n\n");
    body.push_str(&clipping.clipped_text);
    if let Some(html) = clipping.clipped_html.as_ref() {
        body.push_str("\n\n## 原始 HTML 片段\n\n```html\n");
        body.push_str(&html.chars().take(6000).collect::<String>());
        body.push_str("\n```\n");
    }
    std::fs::write(&file_path, body.as_bytes())
        .map_err(|error| format!("failed to write clipping file: {error}"))?;
    let file_path_text = file_path.to_string_lossy().to_string();
    let file_id = db::upsert_file_record(
        db_path,
        &file_path_text,
        &file_path
            .file_name()
            .and_then(|v| v.to_str())
            .unwrap_or("web-capture.md"),
        Some("md"),
        Some(body.len() as i64),
        "网页抓取",
        Some(&clipping.clipped_text.chars().take(180).collect::<String>()),
        Some(r#"["web_capture"]"#),
    )
    .map_err(|error| format!("failed to upsert library file: {error}"))?;
    db::mark_web_clipping_saved_as_library_item(db_path, clipping_id, Some(file_id))
        .map_err(|error| format!("failed to mark clipping library state: {error}"))?;
    if let Some(item) = source {
        let _ = db::update_web_source_links(
            db_path,
            item.id,
            item.linked_project_id,
            item.linked_task_id,
            Some(file_id),
        );
    }
    Ok(file_id)
}

fn run_web_watchers_scan_internal(
    db_path: &std::path::Path,
    include_manual: bool,
    only_watcher_id: Option<i64>,
    force: bool,
) -> Result<WebWatcherScanPayload, String> {
    let query = WebWatcherQueryInput {
        source_id: None,
        linked_project_id: None,
        active_only: Some(false),
        limit: Some(1200),
    };
    let all_watchers = db::list_web_watchers(db_path, &query)
        .map_err(|error| format!("failed to list web watchers: {error}"))?;
    let feishu_enabled = matches_true(
        db::get_app_setting(db_path, "feishu_enabled")
            .map_err(|error| format!("failed to read feishu enabled: {error}"))?
            .as_deref(),
    );
    let webhook = get_secret_optional(db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();
    let web_push_enabled = db::get_app_setting(db_path, "web_monitor_feishu_push_enabled")
        .ok()
        .flatten()
        .map(|v| matches_true(Some(v.as_str())))
        .unwrap_or(true);
    let mut checked = 0_i64;
    let mut changed = 0_i64;
    let mut failed = 0_i64;
    for watcher in all_watchers {
        if let Some(target_id) = only_watcher_id {
            if watcher.id != target_id {
                continue;
            }
        }
        if !watcher.is_active {
            continue;
        }
        let freq = normalize_watch_frequency(Some(&watcher.check_frequency));
        if !force && !watcher_due_by_frequency(watcher.last_checked_at.as_deref(), &freq, include_manual) {
            continue;
        }
        checked += 1;
        match fetch_webpage_text(&watcher.target_url) {
            Ok(raw_html) => {
                let page_title = extract_html_title(&raw_html)
                    .or_else(|| watcher.source_title.clone())
                    .unwrap_or_else(|| watcher.watcher_name.clone());
                let watch_type = normalize_watch_type(Some(&watcher.watch_type));
                let snapshot = build_watch_snapshot(
                    &raw_html,
                    &page_title,
                    &watcher.target_url,
                    &watch_type,
                    watcher.selector_rule.as_deref(),
                );
                let stable_snapshot = if snapshot.trim().is_empty() {
                    format!(
                        "{}\n{}",
                        page_title,
                        excerpt_text(&raw_html, 1600)
                    )
                } else {
                    snapshot
                };
                let hash = stable_hash_hex(&stable_snapshot);
                let first_scan = watcher.last_hash.is_none();
                let changed_now = watcher
                    .last_hash
                    .as_deref()
                    .map(|old| old != hash)
                    .unwrap_or(false);
                let snapshot_key = format!("web_watcher_snapshot_{}", watcher.id);
                let previous_snapshot = db::get_app_setting(db_path, &snapshot_key)
                    .map_err(|error| format!("failed to read previous watcher snapshot: {error}"))?
                    .unwrap_or_default();
                db::update_web_watcher_scan_state(
                    db_path,
                    watcher.id,
                    Some(&hash),
                    "ok",
                    None,
                    changed_now,
                )
                .map_err(|error| format!("failed to update web watcher scan state: {error}"))?;
                let _ = db::set_app_setting(db_path, &snapshot_key, &stable_snapshot);
                if changed_now && !first_scan {
                    changed += 1;
                    let (rule_diff, direction) =
                        build_rule_diff_summary(&previous_snapshot, &stable_snapshot);
                    let ai_summary = maybe_generate_web_ai_summary(
                        db_path,
                        &page_title,
                        &previous_snapshot,
                        &stable_snapshot,
                        &rule_diff,
                    );
                    let change_id = db::create_web_change_log(
                        db_path,
                        watcher.id,
                        Some(watcher.source_id),
                        &previous_snapshot.chars().take(6000).collect::<String>(),
                        &stable_snapshot.chars().take(6000).collect::<String>(),
                        &rule_diff,
                        ai_summary.as_deref(),
                        Some(&direction),
                    )
                    .map_err(|error| format!("failed to create web change log: {error}"))?;
                    let brief = ai_summary.clone().unwrap_or_else(|| rule_diff.clone());
                    let body = format!(
                        "监控对象：{}\n链接：{}\n变化方向：{}\n摘要：{}\n变化ID：{}\n变更后片段：{}",
                        watcher.watcher_name,
                        watcher.target_url,
                        direction,
                        brief,
                        change_id,
                        stable_snapshot.chars().take(280).collect::<String>()
                    );
                    let notification_type = match watcher.source_category.as_deref() {
                        Some("application") => "school_web_change",
                        Some("study") => "study_web_change",
                        _ => "web_watcher",
                    };
                    let _ = db::create_notification(
                        db_path,
                        "watch",
                        &format!(
                            "{}：{}",
                            if notification_type == "school_web_change" {
                                "院校官网变化"
                            } else if notification_type == "study_web_change" {
                                "学习资源变化"
                            } else {
                                "网页变化"
                            },
                            watcher.watcher_name
                        ),
                        &body,
                        Some(notification_type),
                        Some(watcher.id),
                        "sent",
                        Some(&Utc::now().to_rfc3339()),
                    );
                    let suggestion_title = format!("核对网页变化：{}", watcher.watcher_name);
                    let suggestion_desc = format!(
                        "来源：{}\n变化摘要：{}\n建议：核查原网页并决定是否更新任务/项目材料。",
                        watcher.target_url, brief
                    );
                    let duplicated = db::find_pending_task_suggestion(
                        db_path,
                        "web_change",
                        Some(change_id),
                        &suggestion_title,
                    )
                    .ok()
                    .flatten();
                    if duplicated.is_none() {
                        let priority = if direction.contains("deadline") { "高" } else { "中" };
                        let _ = db::create_task_suggestion(
                            db_path,
                            "web_change",
                            Some(change_id),
                            &suggestion_title,
                            Some(&suggestion_desc),
                            priority,
                            detect_first_date_like(&stable_snapshot).as_deref(),
                        );
                    }
                    if feishu_enabled && web_push_enabled && !webhook.trim().is_empty() {
                        let concise = format!(
                            "网页变化：{}\n{}\n{}",
                            watcher.watcher_name,
                            watcher.target_url,
                            brief.chars().take(180).collect::<String>()
                        );
                        let decorated = decorate_feishu_webhook_text(db_path, &concise)?;
                        let _ = send_feishu_webhook_message_with_dedupe(
                            db_path,
                            &webhook,
                            &decorated,
                            "web_watch_change",
                        );
                    }
                }
            }
            Err(error) => {
                failed += 1;
                let _ = db::update_web_watcher_scan_state(
                    db_path,
                    watcher.id,
                    None,
                    "error",
                    Some(&error),
                    false,
                );
                let _ = db::create_notification(
                    db_path,
                    "watch",
                    &format!("网页监控失败：{}", watcher.watcher_name),
                    &format!("链接：{}\n错误：{}", watcher.target_url, error),
                    Some(match watcher.source_category.as_deref() {
                        Some("application") => "school_web_change",
                        Some("study") => "study_web_change",
                        _ => "web_watcher",
                    }),
                    Some(watcher.id),
                    "failed",
                    None,
                );
            }
        }
    }
    Ok(WebWatcherScanPayload {
        checked,
        changed,
        failed,
        summary: format!("网页监控完成：检查 {checked}，变化 {changed}，失败 {failed}。"),
    })
}

#[tauri::command]
fn list_web_presets(app: tauri::AppHandle) -> Result<Vec<db::WebPreset>, String> {
    let db_path = get_database_path(&app)?;
    db::list_web_presets(&db_path).map_err(|error| format!("failed to list web presets: {error}"))
}

#[tauri::command]
fn list_web_sources(app: tauri::AppHandle, payload: Option<WebSourceQueryInput>) -> Result<Vec<db::WebSource>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(WebSourceQueryInput {
        query: None,
        category: None,
        linked_project_id: None,
        limit: Some(200),
    });
    db::list_web_sources(&db_path, &query).map_err(|error| format!("failed to list web sources: {error}"))
}

#[tauri::command]
fn update_web_source_links(
    app: tauri::AppHandle,
    payload: WebSourceLinkUpdateInput,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_web_source_links(
        &db_path,
        payload.source_id,
        payload.linked_project_id,
        payload.linked_task_id,
        payload.linked_file_id,
    )
    .map_err(|error| format!("failed to update web source links: {error}"))
}

#[tauri::command]
fn list_web_watchers(app: tauri::AppHandle, payload: Option<WebWatcherQueryInput>) -> Result<Vec<db::WebWatcher>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(WebWatcherQueryInput {
        source_id: None,
        linked_project_id: None,
        active_only: Some(false),
        limit: Some(200),
    });
    db::list_web_watchers(&db_path, &query).map_err(|error| format!("failed to list web watchers: {error}"))
}

#[tauri::command]
fn list_web_change_logs(app: tauri::AppHandle, payload: Option<WebChangeLogQueryInput>) -> Result<Vec<db::WebChangeLog>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(WebChangeLogQueryInput {
        watcher_id: None,
        source_id: None,
        linked_project_id: None,
        limit: Some(100),
    });
    db::list_web_change_logs(&db_path, &query).map_err(|error| format!("failed to list web change logs: {error}"))
}

#[tauri::command]
fn list_web_clippings(
    app: tauri::AppHandle,
    source_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<db::WebClipping>, String> {
    let db_path = get_database_path(&app)?;
    db::list_web_clippings(&db_path, source_id, limit.unwrap_or(100).clamp(1, 300))
        .map_err(|error| format!("failed to list web clippings: {error}"))
}

#[tauri::command]
fn set_web_watcher_active(
    app: tauri::AppHandle,
    watcher_id: i64,
    is_active: bool,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_web_watcher_active(&db_path, watcher_id, is_active)
        .map_err(|error| format!("failed to update watcher active state: {error}"))
}

#[tauri::command]
fn delete_web_watcher(app: tauri::AppHandle, watcher_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_web_watcher(&db_path, watcher_id).map_err(|error| format!("failed to delete watcher: {error}"))
}

#[tauri::command]
fn create_web_watcher(app: tauri::AppHandle, payload: NewWebWatcherInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let normalized = NewWebWatcherInput {
        source_id: payload.source_id,
        watcher_name: payload.watcher_name,
        target_url: payload.target_url,
        watch_type: normalize_watch_type(Some(&payload.watch_type)),
        selector_rule: payload.selector_rule,
        check_frequency: normalize_watch_frequency(Some(&payload.check_frequency)),
        is_active: payload.is_active,
    };
    db::create_web_watcher(&db_path, &normalized).map_err(|error| format!("failed to create watcher: {error}"))
}

#[tauri::command]
fn capture_web_url(app: tauri::AppHandle, payload: WebCaptureInput) -> Result<WebCapturePayload, String> {
    let db_path = get_database_path(&app)?;
    let url = payload.url.trim();
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("URL 必须以 http:// 或 https:// 开头".to_string());
    }
    let fetched = fetch_webpage_text(url);
    let save_as_clipping = payload.save_as_clipping.unwrap_or(true);
    let mut title = payload.title.unwrap_or_default();
    let mut plain_text = String::new();
    let mut html_text: Option<String> = None;
    let mut fetch_note = None::<String>;
    match fetched {
        Ok(raw_html) => {
            title = if title.trim().is_empty() {
                extract_html_title(&raw_html).unwrap_or_else(|| extract_domain(url))
            } else {
                title
            };
            plain_text = excerpt_text(&raw_html, 14000);
            if payload.clipping_html.unwrap_or(false) {
                html_text = Some(raw_html.chars().take(10000).collect::<String>());
            }
        }
        Err(error) => {
            if title.trim().is_empty() {
                title = extract_domain(url);
            }
            plain_text = format!("抓取失败，建议在浏览器打开后手动保存。\nURL: {url}\n错误: {error}");
            fetch_note = Some(error);
        }
    }
    let source_type = payload
        .source_type
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| v.to_string())
        .unwrap_or_else(|| infer_web_source_type(url, &title, &plain_text));
    let category = payload
        .category
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(|v| v.to_string())
        .unwrap_or_else(|| infer_web_category(url, &title, &plain_text));
    let source_id = db::upsert_web_source(
        &db_path,
        &NewWebSourceInput {
            title: title.clone(),
            url: url.to_string(),
            source_type: Some(source_type),
            category: Some(category),
            tags_json: payload.tags_json.clone(),
            linked_project_id: payload.linked_project_id,
            linked_task_id: payload.linked_task_id,
            linked_file_id: None,
        },
    )
    .map_err(|error| format!("failed to upsert web source: {error}"))?;
    let mut clipping: Option<db::WebClipping> = None;
    if save_as_clipping {
        let clipping_id = db::create_web_clipping(
            &db_path,
            source_id,
            &title,
            &plain_text,
            html_text.as_deref(),
        )
        .map_err(|error| format!("failed to save web clipping: {error}"))?;
        clipping = db::get_web_clipping(&db_path, clipping_id)
            .map_err(|error| format!("failed to read clipping: {error}"))?;
    }
    let mut watcher: Option<db::WebWatcher> = None;
    if payload.create_watcher.unwrap_or(false) {
        let mut watch_type = normalize_watch_type(payload.watch_type.as_deref());
        let mut selector_rule = payload.selector_rule.clone();
        let mut check_frequency = normalize_watch_frequency(payload.check_frequency.as_deref());
        if let Some(preset_type) = payload.preset_type.as_ref().map(|v| v.trim()).filter(|v| !v.is_empty()) {
            if let Ok(presets) = db::list_web_presets(&db_path) {
                if let Some(preset) = presets.iter().find(|item| item.preset_type == preset_type || item.preset_name == preset_type) {
                    watch_type = normalize_watch_type(Some(&preset.default_watch_type));
                    if selector_rule.as_deref().unwrap_or("").trim().is_empty() {
                        selector_rule = preset.default_selector_rule.clone();
                    }
                    check_frequency = normalize_watch_frequency(Some(&preset.default_check_frequency));
                }
            }
        }
        let watcher_name = payload
            .watcher_name
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .map(|v| v.to_string())
            .unwrap_or_else(|| format!("{} Watcher", title.chars().take(18).collect::<String>()));
        let watcher_id = db::create_web_watcher(
            &db_path,
            &NewWebWatcherInput {
                source_id,
                watcher_name,
                target_url: url.to_string(),
                watch_type,
                selector_rule,
                check_frequency,
                is_active: Some(true),
            },
        )
        .map_err(|error| format!("failed to create watcher: {error}"))?;
        watcher = db::get_web_watcher(&db_path, watcher_id)
            .map_err(|error| format!("failed to read watcher: {error}"))?;
    }
    let source = db::get_web_source(&db_path, source_id)
        .map_err(|error| format!("failed to read source: {error}"))?
        .ok_or_else(|| "source not found after upsert".to_string())?;
    Ok(WebCapturePayload {
        source,
        clipping,
        watcher,
        summary: fetch_note
            .map(|note| format!("已保存网页条目，但正文抓取失败：{note}"))
            .unwrap_or_else(|| "网页已抓取并保存。".to_string()),
    })
}

#[tauri::command]
fn run_web_watchers_scan(
    app: tauri::AppHandle,
    include_manual: Option<bool>,
) -> Result<WebWatcherScanPayload, String> {
    let db_path = get_database_path(&app)?;
    run_web_watchers_scan_internal(&db_path, include_manual.unwrap_or(false), None, true)
}

#[tauri::command]
fn run_web_watcher_check(
    app: tauri::AppHandle,
    watcher_id: i64,
) -> Result<WebWatcherScanPayload, String> {
    let db_path = get_database_path(&app)?;
    run_web_watchers_scan_internal(&db_path, true, Some(watcher_id), true)
}

#[tauri::command]
fn run_web_watchers_scan_tick(app: tauri::AppHandle) -> Result<WebWatcherScanTickPayload, String> {
    let db_path = get_database_path(&app)?;
    let enabled = db::get_app_setting(&db_path, "web_watch_auto_enabled")
        .map_err(|error| format!("failed to read web watch auto setting: {error}"))?
        .or_else(|| db::get_app_setting(&db_path, "watch_scan_auto_enabled").ok().flatten())
        .unwrap_or_else(|| "true".to_string());
    if !matches_true(Some(enabled.as_str())) {
        return Ok(WebWatcherScanTickPayload {
            executed: false,
            checked: 0,
            changed: 0,
            failed: 0,
            summary: "Web Monitor 自动扫描已关闭。".to_string(),
        });
    }
    let interval_minutes = db::get_app_setting(&db_path, "web_watch_tick_interval_minutes")
        .ok()
        .flatten()
        .and_then(|raw| raw.parse::<i64>().ok())
        .map(|v| v.clamp(5, 24 * 60))
        .unwrap_or(30);
    let now = Local::now();
    let last_scan = db::get_app_setting(&db_path, "web_watch_tick_last_at")
        .ok()
        .flatten()
        .and_then(|raw| chrono::DateTime::parse_from_rfc3339(&raw).ok())
        .map(|dt| dt.with_timezone(&Local));
    let due = last_scan
        .map(|time| now.signed_duration_since(time).num_minutes() >= interval_minutes)
        .unwrap_or(true);
    if !due {
        return Ok(WebWatcherScanTickPayload {
            executed: false,
            checked: 0,
            changed: 0,
            failed: 0,
            summary: "未到 Web Monitor 下一次扫描窗口。".to_string(),
        });
    }
    let _ = db::set_app_setting(&db_path, "web_watch_tick_last_at", &now.to_rfc3339());
    let result = run_web_watchers_scan_internal(&db_path, false, None, false)?;
    Ok(WebWatcherScanTickPayload {
        executed: true,
        checked: result.checked,
        changed: result.changed,
        failed: result.failed,
        summary: result.summary,
    })
}

#[tauri::command]
fn create_task_from_web_change(app: tauri::AppHandle, change_id: i64) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let item = db::get_web_change_log(&db_path, change_id)
        .map_err(|error| format!("failed to read web change: {error}"))?
        .ok_or_else(|| "change record not found".to_string())?;
    create_task_from_web_change_internal(&db_path, &item)
}

fn create_task_from_web_change_internal(
    db_path: &std::path::Path,
    item: &db::WebChangeLog,
) -> Result<i64, String> {
    let summary = item.ai_summary.clone().unwrap_or_else(|| item.diff_summary.clone());
    let deadline = detect_first_date_like(&item.new_snapshot);
    let priority = if summary.contains("deadline") || summary.contains("截止") {
        "高"
    } else {
        "中"
    };
    let today = Local::now().format("%Y-%m-%d").to_string();
    let page_name = item.source_title.clone().unwrap_or_else(|| "未命名页面".to_string());
    let task_title = if item.change_direction.as_deref() == Some("deadline_updated") {
        format!("核对 {page_name} 最新 deadline")
    } else if item.change_direction.as_deref() == Some("requirement_changed") {
        format!("检查 {page_name} 更新后的材料要求")
    } else if item.change_direction.as_deref() == Some("event_announced") {
        format!("阅读 {page_name} 新公告并更新申请计划")
    } else if item.change_direction.as_deref() == Some("resource_updated") {
        format!("复习资料更新：{page_name}")
    } else {
        format!("核对网页变化：{page_name}")
    };
    let description = format!(
        "变化ID：{}\n链接：{}\n时间：{}\n\n{}\n\n新内容片段：{}",
        item.id,
        item.target_url.clone().unwrap_or_default(),
        item.changed_at,
        summary,
        item.new_snapshot.chars().take(800).collect::<String>(),
    );
    let task_id = db::create_task(
        &db_path,
        &NewTaskInput {
            title: task_title,
            description: Some(description),
            source_type: Some("web_change".to_string()),
            source_id: Some(item.id),
            task_type: "网页监控".to_string(),
            priority: priority.to_string(),
            status: "未开始".to_string(),
            estimated_minutes: Some(45),
            scheduled_date: Some(today.clone()),
            time_start: None,
            time_end: None,
            reminder_at: None,
            deadline,
            parent_task_id: None,
            recurrence_enabled: Some(false),
            recurrence_type: None,
            recurrence_interval: None,
            recurrence_days_of_week: None,
            recurrence_day_of_month: None,
            recurrence_until: None,
            recurrence_source_task_id: None,
            completion_tag: None,
            last_delay_reason_code: None,
            last_delay_reason_note: None,
        },
    )
    .map_err(|error| format!("failed to create task from web change: {error}"))?;
    let _ = db::set_web_change_processed(&db_path, item.id, true, Some(task_id));
    Ok(task_id)
}

#[tauri::command]
fn apply_study_web_change_suggestions(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<StudyWebChangeBatchApplyPayload, String> {
    let db_path = get_database_path(&app)?;
    let target_limit = limit.unwrap_or(3).clamp(1, 20) as usize;
    let rows = db::list_web_change_logs(
        &db_path,
        &db::WebChangeLogQueryInput {
            watcher_id: None,
            source_id: None,
            linked_project_id: None,
            limit: Some(300),
        },
    )
    .map_err(|error| format!("failed to list web changes: {error}"))?;
    let candidates = rows
        .into_iter()
        .filter(|item| is_study_web_change(item))
        .filter(|item| item.processed_at.is_none())
        .take(target_limit)
        .collect::<Vec<_>>();

    let attempted = candidates.len() as i64;
    if attempted == 0 {
        return Ok(StudyWebChangeBatchApplyPayload {
            attempted: 0,
            applied: 0,
            skipped: 0,
            failed: 0,
            created_task_ids: vec![],
            summary: "当前没有待处理的学习网页变化建议。".to_string(),
        });
    }

    let mut applied = 0_i64;
    let mut failed = 0_i64;
    let mut created_task_ids: Vec<i64> = Vec::new();
    for item in candidates {
        match create_task_from_web_change_internal(&db_path, &item) {
            Ok(task_id) => {
                applied += 1;
                created_task_ids.push(task_id);
            }
            Err(_) => {
                failed += 1;
            }
        }
    }
    let skipped = attempted - applied - failed;
    Ok(StudyWebChangeBatchApplyPayload {
        attempted,
        applied,
        skipped,
        failed,
        created_task_ids: created_task_ids.clone(),
        summary: format!(
            "学习网页变化批量采纳完成：尝试 {}，成功 {}，跳过 {}，失败 {}。",
            attempted, applied, skipped, failed
        ),
    })
}

#[tauri::command]
fn mark_web_change_processed(
    app: tauri::AppHandle,
    change_id: i64,
    processed: bool,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::set_web_change_processed(&db_path, change_id, processed, None)
        .map_err(|error| format!("failed to mark web change processed: {error}"))
}

#[tauri::command]
fn save_web_clipping_as_note(app: tauri::AppHandle, clipping_id: i64) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let clipping = db::get_web_clipping(&db_path, clipping_id)
        .map_err(|error| format!("failed to read clipping: {error}"))?
        .ok_or_else(|| "clipping not found".to_string())?;
    let source = db::get_web_source(&db_path, clipping.source_id)
        .map_err(|error| format!("failed to read source: {error}"))?;
    let title = clipping.clipped_title.chars().take(50).collect::<String>();
    let body = format!(
        "来源：{}\n链接：{}\n\n{}",
        source.as_ref().map(|s| s.title.clone()).unwrap_or_else(|| "网页抓取".to_string()),
        source.as_ref().map(|s| s.url.clone()).unwrap_or_default(),
        clipping.clipped_text
    );
    let note_id = db::create_idea_note(
        &db_path,
        &NewIdeaNoteInput {
            title: Some(title),
            content: body,
            tags_json: Some(r#"["web_capture"]"#.to_string()),
            source: Some("web_capture".to_string()),
        },
    )
    .map_err(|error| format!("failed to create note from clipping: {error}"))?;
    db::mark_web_clipping_saved_as_note(&db_path, clipping_id)
        .map_err(|error| format!("failed to mark clipping as note: {error}"))?;
    Ok(note_id)
}

#[tauri::command]
fn save_web_clipping_as_library_item(app: tauri::AppHandle, clipping_id: i64) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    save_clipping_as_library_internal(&app, &db_path, clipping_id)
}

#[tauri::command]
fn list_watch_targets(app: tauri::AppHandle) -> Result<Vec<db::WatchTarget>, String> {
    let db_path = get_database_path(&app)?;
    db::list_watch_targets(&db_path).map_err(|error| format!("failed to list watch targets: {error}"))
}

#[tauri::command]
fn create_watch_target(app: tauri::AppHandle, payload: NewWatchTargetInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_watch_target(&db_path, &payload).map_err(|error| format!("failed to create watch target: {error}"))
}

#[tauri::command]
fn delete_watch_target(app: tauri::AppHandle, target_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_watch_target(&db_path, target_id).map_err(|error| format!("failed to delete watch target: {error}"))
}

#[tauri::command]
fn set_watch_target_active(app: tauri::AppHandle, target_id: i64, is_active: bool) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::set_watch_target_active(&db_path, target_id, is_active)
        .map_err(|error| format!("failed to update watch target active state: {error}"))
}

#[tauri::command]
fn run_watch_targets_scan(app: tauri::AppHandle) -> Result<WatchScanPayload, String> {
    let db_path = get_database_path(&app)?;
    run_watch_targets_scan_internal(&db_path)
}

fn run_watch_targets_scan_internal(db_path: &std::path::Path) -> Result<WatchScanPayload, String> {
    let result = run_web_watchers_scan_internal(db_path, true, None, true)?;
    Ok(WatchScanPayload {
        checked: result.checked,
        changed: result.changed,
        failed: result.failed,
        summary: result.summary,
    })
}

#[tauri::command]
fn run_watch_targets_scan_tick(app: tauri::AppHandle) -> Result<WatchScanTickPayload, String> {
    let result = run_web_watchers_scan_tick(app)?;
    Ok(WatchScanTickPayload {
        executed: result.executed,
        checked: result.checked,
        changed: result.changed,
        failed: result.failed,
        summary: result.summary,
    })
}

#[tauri::command]
fn list_pomodoro_sessions(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<db::PomodoroSessionRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_pomodoro_sessions(&db_path, limit.unwrap_or(20).clamp(1, 200))
        .map_err(|error| format!("failed to list pomodoro sessions: {error}"))
}

#[tauri::command]
fn start_pomodoro_session(
    app: tauri::AppHandle,
    task_id: Option<i64>,
    duration_minutes: i64,
    break_minutes: i64,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::start_pomodoro_session(
        &db_path,
        task_id,
        duration_minutes.clamp(1, 240),
        break_minutes.clamp(1, 60),
    )
    .map_err(|error| format!("failed to start pomodoro session: {error}"))
}

#[tauri::command]
fn finish_pomodoro_session(
    app: tauri::AppHandle,
    session_id: i64,
    status: String,
    interrupted_count: Option<i64>,
) -> Result<PomodoroFinishPayload, String> {
    let db_path = get_database_path(&app)?;
    let normalized = match status.as_str() {
        "completed" | "interrupted" | "abandoned" => status,
        _ => "completed".to_string(),
    };
    let interrupt = interrupted_count.unwrap_or(0).max(0);
    db::finish_pomodoro_session(&db_path, session_id, &normalized, interrupt)
        .map_err(|error| format!("failed to finish pomodoro session: {error}"))?;
    Ok(PomodoroFinishPayload {
        session_id,
        status: normalized,
        interrupted_count: interrupt,
    })
}

#[tauri::command]
fn get_focus_stats(app: tauri::AppHandle) -> Result<db::FocusStats, String> {
    let db_path = get_database_path(&app)?;
    db::get_focus_stats(&db_path).map_err(|error| format!("failed to get focus stats: {error}"))
}

#[tauri::command]
fn list_habits(app: tauri::AppHandle) -> Result<Vec<db::Habit>, String> {
    let db_path = get_database_path(&app)?;
    db::list_habits(&db_path).map_err(|error| format!("failed to list habits: {error}"))
}

#[tauri::command]
fn create_habit(app: tauri::AppHandle, payload: NewHabitInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_habit(&db_path, &payload).map_err(|error| format!("failed to create habit: {error}"))
}

#[tauri::command]
fn delete_habit(app: tauri::AppHandle, habit_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_habit(&db_path, habit_id).map_err(|error| format!("failed to delete habit: {error}"))
}

#[tauri::command]
fn list_habit_logs(app: tauri::AppHandle, habit_id: i64, limit: Option<i64>) -> Result<Vec<db::HabitLog>, String> {
    let db_path = get_database_path(&app)?;
    db::list_habit_logs(&db_path, habit_id, limit.unwrap_or(60).clamp(1, 365))
        .map_err(|error| format!("failed to list habit logs: {error}"))
}

#[tauri::command]
fn create_habit_log(app: tauri::AppHandle, payload: NewHabitLogInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_habit_log(&db_path, &payload).map_err(|error| format!("failed to create habit log: {error}"))
}

#[tauri::command]
fn list_journal_entries(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<db::JournalEntry>, String> {
    let db_path = get_database_path(&app)?;
    db::list_journal_entries(&db_path, limit.unwrap_or(80).clamp(1, 500))
        .map_err(|error| format!("failed to list journal entries: {error}"))
}

#[tauri::command]
fn create_journal_entry(app: tauri::AppHandle, payload: NewJournalEntryInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_journal_entry(&db_path, &payload)
        .map_err(|error| format!("failed to create journal entry: {error}"))
}

#[tauri::command]
fn list_idea_notes(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<db::IdeaNote>, String> {
    let db_path = get_database_path(&app)?;
    db::list_idea_notes(&db_path, limit.unwrap_or(120).clamp(1, 500))
        .map_err(|error| format!("failed to list idea notes: {error}"))
}

#[tauri::command]
fn create_idea_note(app: tauri::AppHandle, payload: NewIdeaNoteInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_idea_note(&db_path, &payload).map_err(|error| format!("failed to create idea note: {error}"))
}

#[tauri::command]
fn list_mistake_notes(
    app: tauri::AppHandle,
    exam_type: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<db::MistakeNote>, String> {
    let db_path = get_database_path(&app)?;
    db::list_mistake_notes(&db_path, exam_type.as_deref(), limit.unwrap_or(200).clamp(1, 1000))
        .map_err(|error| format!("failed to list mistake notes: {error}"))
}

#[tauri::command]
fn create_mistake_note(app: tauri::AppHandle, payload: NewMistakeNoteInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_mistake_note(&db_path, &payload).map_err(|error| format!("failed to create mistake note: {error}"))
}

#[tauri::command]
fn delete_mistake_note(app: tauri::AppHandle, mistake_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_mistake_note(&db_path, mistake_id).map_err(|error| format!("failed to delete mistake note: {error}"))
}

#[tauri::command]
async fn extract_pdf_text(file_path: String) -> Result<String, String> {
    let output = Command::new("pdftotext")
        .args(["-layout", &file_path, "-"])
        .output()
        .map_err(|error| format!("failed to run pdftotext: {error}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("pdftotext failed: {}", stderr.trim()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ParsedPassageBatch {
    items: Vec<serde_json::Value>,
}

fn normalize_question_type(raw: &str) -> String {
    let trimmed = raw.trim();
    let mapped = match trimmed {
        "主旨" => "主旨题",
        "推断" => "推断题",
        "细节" => "事实信息题",
        "句子功能" => "句子作用题",
        "词汇" => "词汇题",
        "多选" => "多选题",
        _ => trimmed,
    };
    mapped.to_string()
}

fn pick_json_value<'a>(
    object: &'a serde_json::Map<String, serde_json::Value>,
    keys: &[&str],
) -> Option<&'a serde_json::Value> {
    keys.iter().find_map(|key| object.get(*key))
}

fn value_to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(text) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        serde_json::Value::Number(number) => Some(number.to_string()),
        serde_json::Value::Bool(flag) => Some(flag.to_string()),
        _ => None,
    }
}

fn value_to_bool(value: &serde_json::Value) -> Option<bool> {
    match value {
        serde_json::Value::Bool(flag) => Some(*flag),
        serde_json::Value::String(text) => {
            let lower = text.trim().to_lowercase();
            if lower == "true" || lower == "1" {
                Some(true)
            } else if lower == "false" || lower == "0" {
                Some(false)
            } else {
                None
            }
        }
        serde_json::Value::Number(number) => number.as_i64().map(|value| value != 0),
        _ => None,
    }
}

fn normalize_answer_value(value: Option<&serde_json::Value>) -> Option<String> {
    let Some(raw) = value else {
        return None;
    };
    match raw {
        serde_json::Value::Array(items) => {
            let values: Vec<String> = items.iter().filter_map(value_to_string).collect();
            if values.is_empty() {
                None
            } else {
                Some(values.join(","))
            }
        }
        serde_json::Value::Object(map) => {
            let mut keys: Vec<&String> = map.keys().collect();
            keys.sort();
            let values: Vec<String> = keys
                .into_iter()
                .filter_map(|key| map.get(key).and_then(value_to_string))
                .collect();
            if values.is_empty() {
                None
            } else {
                Some(values.join(","))
            }
        }
        _ => value_to_string(raw),
    }
}

fn normalize_question_value(
    value: &serde_json::Value,
    fallback_index: usize,
) -> Option<db::ParsedQuestionInput> {
    let object = value.as_object()?;

    let q_num = pick_json_value(object, &["number", "q_num", "qNum", "id", "question_id", "questionId"])
        .and_then(value_to_string)
        .unwrap_or_else(|| (fallback_index + 1).to_string());
    let q_text = pick_json_value(object, &["question", "q_text", "qText", "question_text", "questionText"])
        .and_then(value_to_string)
        .unwrap_or_default();
    if q_text.trim().is_empty() {
        return None;
    }

    let choices_value = pick_json_value(object, &["choices", "options"]);
    let mut normalized_options: Vec<String> = Vec::new();
    let mut is_sentence_select = false;

    if let Some(choices) = choices_value {
        if let Some(map) = choices.as_object() {
            if let Some(sentence) = map.get("sentence").and_then(value_to_string) {
                is_sentence_select = true;
                normalized_options = vec![sentence, String::new(), String::new(), String::new(), String::new()];
            } else {
                for key in ["A", "B", "C", "D", "E"] {
                    let value = map.get(key).and_then(value_to_string).unwrap_or_default();
                    normalized_options.push(value);
                }
            }
        } else if let Some(list) = choices.as_array() {
            for index in 0..5 {
                let text = list.get(index).and_then(value_to_string).unwrap_or_default();
                normalized_options.push(text);
            }
        }
    }

    let has_a = normalized_options.get(0).map(|item| !item.trim().is_empty()).unwrap_or(false);
    let has_b = normalized_options.get(1).map(|item| !item.trim().is_empty()).unwrap_or(false);
    let has_c = normalized_options.get(2).map(|item| !item.trim().is_empty()).unwrap_or(false);
    let has_d = normalized_options.get(3).map(|item| !item.trim().is_empty()).unwrap_or(false);
    let inferred_multi = has_a && has_b && has_c && !has_d;
    let is_multi_select = pick_json_value(object, &["is_multi_select", "isMultiSelect"])
        .and_then(value_to_bool)
        .unwrap_or(inferred_multi);

    let mut q_type = pick_json_value(object, &["type", "q_type", "qType"])
        .and_then(value_to_string)
        .map(|value| normalize_question_type(&value))
        .unwrap_or_default();

    if is_sentence_select {
        q_type = "选句子题".to_string();
    } else if is_multi_select && q_type.trim().is_empty() {
        q_type = "多选题".to_string();
    }

    let highlighted_text = pick_json_value(object, &["highlighted_text", "highlightedText"]).and_then(value_to_string);
    let answer = normalize_answer_value(pick_json_value(
        object,
        &["correct_answer", "correctAnswer", "answer"],
    ));

    Some(db::ParsedQuestionInput {
        question_id: q_num,
        question_text: q_text,
        q_type: if q_type.trim().is_empty() { None } else { Some(q_type) },
        options: if normalized_options.is_empty() {
            None
        } else {
            Some(normalized_options)
        },
        answer,
        explanation: pick_json_value(object, &["explanation"]).and_then(value_to_string),
        highlighted_text,
    })
}

fn normalize_passage_value(
    value: &serde_json::Value,
    fallback_index: usize,
) -> Option<db::ParsedPassageInput> {
    let object = value.as_object()?;
    let passage_id = pick_json_value(
        object,
        &["id", "passage_num", "passageNum", "passage_id", "passageId"],
    )
    .and_then(value_to_string)
    .unwrap_or_else(|| (fallback_index + 1).to_string());
    let passage_text = pick_json_value(object, &["article", "passage_text", "passageText"])
        .and_then(value_to_string)
        .unwrap_or_default();
    if passage_text.trim().is_empty() {
        return None;
    }

    let question_values: Vec<serde_json::Value> = pick_json_value(object, &["exercises", "questions"])
        .and_then(|raw| raw.as_array().cloned())
        .unwrap_or_default();
    let questions: Vec<db::ParsedQuestionInput> = question_values
        .iter()
        .enumerate()
        .filter_map(|(idx, item)| normalize_question_value(item, idx))
        .collect();

    Some(db::ParsedPassageInput {
        passage_id,
        passage_text,
        questions,
    })
}

#[tauri::command]
async fn save_passages(
    app: tauri::AppHandle,
    passages_json: String,
    bank_name: String,
    subject: Option<String>,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let value: serde_json::Value =
        serde_json::from_str(&passages_json).map_err(|error| format!("invalid passages json: {error}"))?;
    let raw_items: Vec<serde_json::Value> = if let Some(items) = value.as_array() {
        items.clone()
    } else {
        match serde_json::from_value::<ParsedPassageBatch>(value.clone()) {
            Ok(batch) => batch.items,
            Err(_) => vec![value],
        }
    };

    let passages: Vec<db::ParsedPassageInput> = raw_items
        .iter()
        .enumerate()
        .filter_map(|(index, item)| normalize_passage_value(item, index))
        .collect();
    if passages.is_empty() {
        return Err("invalid passages payload: no valid passages after normalization".to_string());
    }

    let inferred_subject = {
        let lower_name = bank_name.to_lowercase();
        if lower_name.contains("gre") || bank_name.contains("GRE") {
            Some("GRE".to_string())
        } else if lower_name.contains("ielts") || bank_name.contains("雅思") {
            Some("雅思".to_string())
        } else {
            None
        }
    };
    let normalized_subject = subject
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .or(inferred_subject);

    db::save_question_bank(
        &db_path,
        bank_name.trim(),
        normalized_subject.as_deref(),
        None,
        &passages,
    )
        .map_err(|error| format!("failed to save passages: {error}"))
}

#[tauri::command]
fn get_question_banks(app: tauri::AppHandle) -> Result<Vec<db::QuestionBank>, String> {
    let db_path = get_database_path(&app)?;
    db::list_question_banks(&db_path).map_err(|error| format!("failed to list question banks: {error}"))
}

fn answer_value_to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::String(text) => {
            let trimmed = text.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        serde_json::Value::Number(number) => Some(number.to_string()),
        serde_json::Value::Array(items) => {
            let mut values = Vec::new();
            for item in items {
                if let Some(text) = answer_value_to_string(item) {
                    values.push(text);
                }
            }
            if values.is_empty() {
                None
            } else {
                Some(values.join(","))
            }
        }
        _ => None,
    }
}

#[tauri::command]
fn import_answers(
    app: tauri::AppHandle,
    bank_id: i64,
    answers_json: String,
) -> Result<db::ImportAnswerResult, String> {
    let db_path = get_database_path(&app)?;
    let value: serde_json::Value =
        serde_json::from_str(&answers_json).map_err(|error| format!("invalid answers json: {error}"))?;
    let object = value
        .as_object()
        .ok_or_else(|| "answers json must be an object map".to_string())?;
    let mut entries: Vec<db::ImportAnswerEntry> = Vec::new();
    for (raw_key, raw_value) in object {
        let Some(correct_answer) = answer_value_to_string(raw_value) else {
            continue;
        };
        let key = raw_key.trim();
        if key.is_empty() {
            continue;
        }
        if let Some((left, right)) = key.split_once('-') {
            let passage_num = left.trim().parse::<i64>().ok();
            let q_num = right.trim().parse::<i64>().ok();
            if let (Some(passage_num), Some(q_num)) = (passage_num, q_num) {
                entries.push(db::ImportAnswerEntry {
                    passage_num: Some(passage_num),
                    q_num,
                    correct_answer,
                });
            }
            continue;
        }
        if let Ok(q_num) = key.parse::<i64>() {
            entries.push(db::ImportAnswerEntry {
                passage_num: None,
                q_num,
                correct_answer,
            });
        }
    }
    if entries.is_empty() {
        return Err("no valid answer entries found".to_string());
    }
    db::import_answer_key(&db_path, bank_id, &entries)
        .map_err(|error| format!("failed to import answers: {error}"))
}

#[tauri::command]
fn get_passages(
    app: tauri::AppHandle,
    bank_id: i64,
    q_type_filter: Option<String>,
) -> Result<Vec<db::PassageSummary>, String> {
    let db_path = get_database_path(&app)?;
    db::list_passages(&db_path, bank_id, q_type_filter.as_deref())
        .map_err(|error| format!("failed to list passages: {error}"))
}

#[tauri::command]
fn get_passage_detail(app: tauri::AppHandle, passage_id: i64) -> Result<Option<db::PassageDetail>, String> {
    let db_path = get_database_path(&app)?;
    db::get_passage_detail(&db_path, passage_id).map_err(|error| format!("failed to get passage detail: {error}"))
}

#[tauri::command]
fn submit_answer(
    app: tauri::AppHandle,
    question_id: i64,
    my_answer: String,
    time_spent_seconds: Option<i64>,
) -> Result<db::AnswerResult, String> {
    let db_path = get_database_path(&app)?;
    db::submit_question_answer(&db_path, question_id, &my_answer, time_spent_seconds)
        .map_err(|error| format!("failed to submit answer: {error}"))
}

#[tauri::command]
fn submit_self_evaluation(
    app: tauri::AppHandle,
    payload: db::QuestionAttemptInput,
) -> Result<db::AnswerResult, String> {
    let db_path = get_database_path(&app)?;
    db::submit_self_evaluation(&db_path, &payload)
        .map_err(|error| format!("failed to submit self evaluation: {error}"))
}

#[tauri::command]
fn add_question_annotation(
    app: tauri::AppHandle,
    payload: db::NewQuestionAnnotationInput,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_question_annotation(&db_path, &payload)
        .map_err(|error| format!("failed to add annotation: {error}"))
}

#[tauri::command]
fn get_question_annotations(
    app: tauri::AppHandle,
    passage_id: i64,
) -> Result<Vec<db::QuestionAnnotation>, String> {
    let db_path = get_database_path(&app)?;
    db::list_question_annotations(&db_path, passage_id)
        .map_err(|error| format!("failed to list annotations: {error}"))
}

#[tauri::command]
fn get_question_bank_stats(
    app: tauri::AppHandle,
    bank_id: Option<i64>,
    range: Option<String>,
) -> Result<db::QuestionBankStats, String> {
    let db_path = get_database_path(&app)?;
    let days = match range.unwrap_or_else(|| "month".to_string()).as_str() {
        "week" => 7,
        "all" => 180,
        _ => 30,
    };
    db::get_question_bank_stats(&db_path, bank_id, days)
        .map_err(|error| format!("failed to build stats: {error}"))
}

#[tauri::command]
fn add_mistake_from_question(
    app: tauri::AppHandle,
    question_id: i64,
    error_analysis: String,
    error_type: String,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let snapshot = db::get_question_snapshot_for_mistake(&db_path, question_id)
        .map_err(|error| format!("failed to read question snapshot: {error}"))?
        .ok_or_else(|| "question not found".to_string())?;

    let (q_text, source_label, correct_answer, subject_hint) = snapshot;
    let exam_type = if subject_hint.as_deref() == Some("雅思") { "雅思" } else { "GRE" };
    let payload = NewMistakeNoteInput {
        exam_type: exam_type.to_string(),
        subject: subject_hint.unwrap_or_else(|| "阅读".to_string()),
        topic: Some(q_text.chars().take(120).collect()),
        question_source: Some(format!("题库 {} · Q{}", source_label, question_id)),
        mistake_reason: Some(error_analysis),
        correct_method: Some(
            correct_answer
                .map(|v| format!("正确答案：{}；错误类型：{}", v, error_type))
                .unwrap_or_else(|| format!("错误类型：{}", error_type)),
        ),
        review_date: None,
        linked_file_id: None,
    };
    db::create_mistake_note(&db_path, &payload).map_err(|error| format!("failed to create mistake note: {error}"))
}

#[tauri::command]
fn add_mistake_from_exam(
    app: tauri::AppHandle,
    payload: db::NewMistakeFromExamInput,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let record_id = db::create_mistake_from_exam(&db_path, &payload)
        .map_err(|error| format!("failed to create exam mistake: {error}"))?;
    if let Some((q_text, source_label, correct_answer, subject_hint)) =
        db::get_question_snapshot_for_mistake(&db_path, payload.question_id)
            .map_err(|error| format!("failed to read exam snapshot: {error}"))?
    {
        let exam_type = if subject_hint.as_deref() == Some("雅思") { "雅思" } else { "GRE" };
        let mistake_reason = payload
            .ai_analysis
            .clone()
            .or_else(|| payload.error_type.clone())
            .or_else(|| Some("题库做题错误".to_string()));
        let method_text = format!(
            "我的答案：{}；正确答案：{}；耗时：{}秒",
            payload.my_answer.clone().unwrap_or_else(|| "-".to_string()),
            correct_answer.clone().unwrap_or_else(|| "-".to_string()),
            payload.time_spent.unwrap_or(0)
        );
        let note_payload = NewMistakeNoteInput {
            exam_type: exam_type.to_string(),
            subject: subject_hint.unwrap_or_else(|| "阅读".to_string()),
            topic: Some(q_text.chars().take(120).collect()),
            question_source: Some(format!("题库 {} · Q{}", source_label, payload.question_id)),
            mistake_reason,
            correct_method: Some(method_text),
            review_date: None,
            linked_file_id: None,
        };
        let _ = db::create_mistake_note(&db_path, &note_payload);
    }
    Ok(record_id)
}

#[tauri::command]
fn list_mistakes_from_exam(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<Vec<db::MistakeFromExamRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_mistakes_from_exam(&db_path, limit.unwrap_or(200).clamp(1, 2000))
        .map_err(|error| format!("failed to list exam mistakes: {error}"))
}

#[tauri::command]
fn list_ai_logs(app: tauri::AppHandle, limit: Option<i64>) -> Result<Vec<db::AiLogRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_ai_logs(&db_path, limit.unwrap_or(100).clamp(1, 1000))
        .map_err(|error| format!("failed to list ai logs: {error}"))
}

#[tauri::command]
fn create_ai_log(app: tauri::AppHandle, payload: NewAiLogInput) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_ai_log(&db_path, &payload).map_err(|error| format!("failed to create ai log: {error}"))
}

#[tauri::command]
fn list_study_analysis_logs(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<Vec<db::StudyAnalysisLogRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_study_analysis_logs(&db_path, limit.unwrap_or(120).clamp(1, 1000))
        .map_err(|error| format!("failed to list study analysis logs: {error}"))
}

#[tauri::command]
fn create_study_analysis_log(
    app: tauri::AppHandle,
    payload: NewStudyAnalysisLogInput,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    db::create_study_analysis_log(&db_path, &payload)
        .map_err(|error| format!("failed to create study analysis log: {error}"))
}

#[tauri::command]
fn list_weekly_growth_reviews(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<Vec<db::WeeklyGrowthReviewRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_weekly_growth_reviews(&db_path, limit.unwrap_or(60).clamp(1, 300))
        .map_err(|error| format!("failed to list weekly growth reviews: {error}"))
}

#[tauri::command]
fn generate_weekly_growth_review(
    app: tauri::AppHandle,
    week_key: Option<String>,
) -> Result<db::WeeklyGrowthReviewRecord, String> {
    let db_path = get_database_path(&app)?;
    let now = Local::now().date_naive();
    let target_week_key = week_key
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| week_key_of(now));
    let logs = db::list_study_analysis_logs(&db_path, 500)
        .map_err(|error| format!("failed to list study analysis logs: {error}"))?;
    let week_logs = logs
        .iter()
        .filter(|item| parse_yyyy_mm_dd(&item.date_key).map(week_key_of).as_deref() == Some(target_week_key.as_str()))
        .collect::<Vec<_>>();
    let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let week_tasks = tasks
        .iter()
        .filter(|task| {
            task.scheduled_date
                .as_deref()
                .and_then(parse_yyyy_mm_dd)
                .map(week_key_of)
                .as_deref()
                == Some(target_week_key.as_str())
                || task
                    .deadline
                    .as_deref()
                    .and_then(parse_yyyy_mm_dd)
                    .map(week_key_of)
                    .as_deref()
                    == Some(target_week_key.as_str())
        })
        .collect::<Vec<_>>();
    let done_tasks = week_tasks.iter().filter(|task| task.status == "已完成").count() as i64;
    let total_tasks = week_tasks.len() as i64;
    let completion_rate = if total_tasks > 0 {
        (done_tasks * 100) / total_tasks
    } else {
        0
    };
    let focus = db::get_focus_stats(&db_path).unwrap_or(db::FocusStats {
        today_minutes: 0,
        week_minutes: 0,
        interrupted_count: 0,
    });
    let mut weak_counter: HashMap<String, i64> = HashMap::new();
    for item in &week_logs {
        if let Some(module) = item.weakest_module.as_deref().map(|value| value.trim()).filter(|value| !value.is_empty()) {
            *weak_counter.entry(module.to_string()).or_insert(0) += 1;
        }
    }
    let mut weakness_pairs = weak_counter.into_iter().collect::<Vec<_>>();
    weakness_pairs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    let top_weak_modules = weakness_pairs
        .iter()
        .take(3)
        .map(|(name, count)| format!("{name}（{count}次）"))
        .collect::<Vec<_>>();

    let mut strengths = Vec::new();
    if completion_rate >= 70 {
        strengths.push(format!("本周任务完成率 {}%，执行稳定。", completion_rate));
    }
    if week_logs.len() as i64 >= 4 {
        strengths.push(format!("已记录 {} 条学习分析，复盘节奏良好。", week_logs.len()));
    }
    if focus.week_minutes >= 240 {
        strengths.push(format!("本周专注 {} 分钟，连续投入较好。", focus.week_minutes));
    }
    if strengths.is_empty() {
        strengths.push("本周在持续记录与执行方面保持了连续性。".to_string());
    }

    let mut weaknesses = Vec::new();
    if total_tasks > 0 && completion_rate < 50 {
        weaknesses.push(format!("任务完成率仅 {}%，需要压缩承诺量。", completion_rate));
    }
    if focus.interrupted_count >= 6 {
        weaknesses.push(format!("专注中断 {} 次，建议收敛上下文切换。", focus.interrupted_count));
    }
    if top_weak_modules.is_empty() {
        weaknesses.push("错因分布尚不集中，建议继续细化记录标签。".to_string());
    } else {
        weaknesses.push(format!("薄弱模块集中在：{}。", top_weak_modules.join("、")));
    }

    let mut focus_next = Vec::new();
    if !top_weak_modules.is_empty() {
        for item in top_weak_modules.iter().take(3) {
            focus_next.push(format!("安排 2 次针对性训练：{}", item));
        }
    }
    if focus_next.is_empty() {
        focus_next.push("优先补齐本周未完成任务并做一次错因归档。".to_string());
    }
    focus_next.push("将高优先级任务拆为 <= 90 分钟的可执行单元。".to_string());
    focus_next.push("每日结束前进行 10 分钟回顾并更新次日草案。".to_string());

    let stats_json = serde_json::json!({
        "weekKey": target_week_key,
        "studyLogCount": week_logs.len(),
        "taskTotal": total_tasks,
        "taskDone": done_tasks,
        "taskCompletionRate": completion_rate,
        "focusWeekMinutes": focus.week_minutes,
        "focusInterrupts": focus.interrupted_count
    })
    .to_string();

    let mut summary_text = format!(
        "周复盘（{}）：学习分析 {} 条，任务完成 {}/{}（{}%），专注 {} 分钟。下周优先聚焦：{}。",
        target_week_key,
        week_logs.len(),
        done_tasks,
        total_tasks,
        completion_rate,
        focus.week_minutes,
        if top_weak_modules.is_empty() {
            "任务收敛与执行节奏".to_string()
        } else {
            top_weak_modules.join("、")
        }
    );

    let ai_provider = db::get_app_setting(&db_path, "ai_provider")
        .map_err(|error| format!("failed to read ai provider: {error}"))?
        .unwrap_or_else(|| "local".to_string());
    let gemini_key = get_secret_optional(&db_path, keys::GEMINI_API_KEY)?
        .unwrap_or_default();
    let gemini_model = db::get_app_setting(&db_path, "gemini_model")
        .map_err(|error| format!("failed to read gemini model: {error}"))?
        .unwrap_or_else(|| "gemini-1.5-flash".to_string());
    let mut model_name = "rule-engine-v1".to_string();
    let mut provider_name = "local".to_string();
    let mut input_tokens = rough_token_count(&summary_text);
    let mut output_tokens = rough_token_count(&summary_text);
    if ai_provider.trim().eq_ignore_ascii_case("gemini") && !gemini_key.trim().is_empty() {
        let prompt = format!(
            "你是学习与申请秘书。请把下面周复盘信息润色成 120-180 字中文，语气明确可执行。\n{}\n优势：{}\n风险：{}\n下周重点：{}",
            summary_text,
            strengths.join("；"),
            weaknesses.join("；"),
            focus_next.join("；")
        );
        if let Ok((text, in_tokens, out_tokens)) = call_gemini_generate(&gemini_key, &gemini_model, &prompt) {
            let cleaned = text.trim();
            if !cleaned.is_empty() {
                summary_text = cleaned.to_string();
                provider_name = "gemini".to_string();
                model_name = gemini_model.clone();
                input_tokens = in_tokens.unwrap_or_else(|| rough_token_count(&prompt));
                output_tokens = out_tokens.unwrap_or_else(|| rough_token_count(cleaned));
            }
        }
    }

    let review_id = db::create_weekly_growth_review(
        &db_path,
        &NewWeeklyGrowthReviewInput {
            week_key: target_week_key.clone(),
            week_range: Some(target_week_key.clone()),
            linked_log_ids_json: Some(
                serde_json::to_string(
                    &logs
                        .iter()
                        .map(|item| item.id)
                        .collect::<Vec<i64>>(),
                )
                .unwrap_or_else(|_| "[]".to_string()),
            ),
            summary_text: summary_text.clone(),
            weekly_summary: Some(summary_text.clone()),
            strengths_json: Some(serde_json::to_string(&strengths).unwrap_or_else(|_| "[]".to_string())),
            growth_points_json: Some(serde_json::to_string(&strengths).unwrap_or_else(|_| "[]".to_string())),
            weaknesses_json: Some(serde_json::to_string(&weaknesses).unwrap_or_else(|_| "[]".to_string())),
            persistent_weakness_json: Some(serde_json::to_string(&weaknesses).unwrap_or_else(|_| "[]".to_string())),
            focus_json: Some(serde_json::to_string(&focus_next).unwrap_or_else(|_| "[]".to_string())),
            next_week_focus_json: Some(serde_json::to_string(&focus_next).unwrap_or_else(|_| "[]".to_string())),
            schedule_adjustment_rules_json: Some(
                serde_json::to_string(&vec![
                    "高强度模块优先排在上午".to_string(),
                    "连续两天同模块错误率高于40%时自动降载".to_string(),
                    "DDL 小于72小时任务提升到高优先级".to_string(),
                ])
                .unwrap_or_else(|_| "[]".to_string()),
            ),
            stats_json: Some(stats_json),
            generated_by: Some(provider_name.clone()),
        },
    )
    .map_err(|error| format!("failed to create weekly growth review: {error}"))?;

    let _ = db::create_ai_log(
        &db_path,
        &NewAiLogInput {
            module_name: "assistant".to_string(),
            action_name: "weekly_growth_review".to_string(),
            model_name: Some(model_name),
            provider_name: Some(provider_name),
            input_tokens,
            output_tokens,
            estimated_cost: ((input_tokens + output_tokens) as f64) * 0.0000008_f64,
            latency_ms: None,
            success: true,
        },
    );

    let created = db::list_weekly_growth_reviews(&db_path, 120)
        .map_err(|error| format!("failed to list weekly growth reviews: {error}"))?
        .into_iter()
        .find(|item| item.id == review_id)
        .ok_or_else(|| "created weekly review not found".to_string())?;
    Ok(created)
}

#[tauri::command]
fn list_plan_drafts(
    app: tauri::AppHandle,
    payload: Option<PlanDraftQueryInput>,
) -> Result<Vec<db::PlanDraftRecord>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(PlanDraftQueryInput {
        status: None,
        limit: Some(120),
    });
    db::list_plan_drafts(&db_path, query.status.as_deref(), query.limit.unwrap_or(120).clamp(1, 500))
        .map_err(|error| format!("failed to list plan drafts: {error}"))
}

#[tauri::command]
fn list_plan_draft_items(
    app: tauri::AppHandle,
    draft_id: i64,
) -> Result<Vec<db::PlanDraftItemRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_plan_draft_items(&db_path, draft_id)
        .map_err(|error| format!("failed to list plan draft items: {error}"))
}

#[tauri::command]
fn create_plan_draft(
    app: tauri::AppHandle,
    payload: PlanDraftCreatePayload,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    if payload.items.is_empty() {
        return Err("plan draft items cannot be empty".to_string());
    }
    let draft_input = NewPlanDraftInput {
        draft_type: payload.draft_type,
        title: payload.title,
        target_date: payload.target_date,
        week_key: payload.week_key,
        source_context_json: payload.source_context_json,
        suggestion_text: payload.suggestion_text,
        status: payload.status,
    };
    let item_inputs = payload
        .items
        .into_iter()
        .map(|item| NewPlanDraftItemInput {
            item_order: item.item_order,
            item_type: item.item_type,
            title: item.title,
            description: item.description,
            priority: item.priority,
            estimated_minutes: item.estimated_minutes,
            scheduled_date: item.scheduled_date,
            time_start: item.time_start,
            time_end: item.time_end,
            deadline: item.deadline,
            linked_project_id: item.linked_project_id,
            action_payload_json: item.action_payload_json,
        })
        .collect::<Vec<_>>();
    db::create_plan_draft_with_items(&db_path, &draft_input, &item_inputs)
        .map_err(|error| format!("failed to create plan draft: {error}"))
}

#[tauri::command]
fn update_plan_draft_status(
    app: tauri::AppHandle,
    draft_id: i64,
    status: String,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::set_plan_draft_status(&db_path, draft_id, status.trim())
        .map_err(|error| format!("failed to update plan draft status: {error}"))
}

#[tauri::command]
fn apply_plan_draft(
    app: tauri::AppHandle,
    draft_id: i64,
) -> Result<PlanDraftApplyPayload, String> {
    apply_plan_draft_internal(&app, draft_id)
}

fn apply_plan_draft_internal(
    app: &tauri::AppHandle,
    draft_id: i64,
) -> Result<PlanDraftApplyPayload, String> {
    let db_path = get_database_path(&app)?;
    let draft = db::get_plan_draft(&db_path, draft_id)
        .map_err(|error| format!("failed to get plan draft: {error}"))?
        .ok_or_else(|| "plan draft not found".to_string())?;
    if draft.status == "applied" {
        let existing_items = db::list_plan_draft_items(&db_path, draft_id)
            .map_err(|error| format!("failed to list plan draft items: {error}"))?;
        let created_task_ids = existing_items
            .iter()
            .filter_map(|item| item.created_task_id)
            .collect::<Vec<_>>();
        let _ = db::create_plan_draft_audit_log(
            &db_path,
            &db::NewPlanDraftAuditLogInput {
                draft_id,
                action: "apply".to_string(),
                status: "noop".to_string(),
                operator_name: Some("user".to_string()),
                reason_code: Some("ALREADY_APPLIED".to_string()),
                reason_note: Some("草稿已是应用状态，返回幂等结果。".to_string()),
                affected_task_ids_json: Some(serde_json::to_string(&created_task_ids).unwrap_or_else(|_| "[]".to_string())),
                item_count: Some(created_task_ids.len() as i64),
            },
        );
        return Ok(PlanDraftApplyPayload {
            draft_id,
            applied_items: created_task_ids.len() as i64,
            created_task_ids,
            summary: "该草案已应用。".to_string(),
        });
    }
    let items = db::list_plan_draft_items(&db_path, draft_id)
        .map_err(|error| format!("failed to list plan draft items: {error}"))?;
    let mut created_task_ids = Vec::new();
    let mut applied_items = 0_i64;
    for item in items {
        if item.apply_status == "applied" {
            if let Some(task_id) = item.created_task_id {
                created_task_ids.push(task_id);
            }
            continue;
        }
        let task_id = db::create_task(
            &db_path,
            &NewTaskInput {
                title: item.title.clone(),
                description: item.description.clone(),
                source_type: Some("plan_draft".to_string()),
                source_id: Some(draft_id),
                task_type: "计划草案".to_string(),
                priority: item.priority.clone(),
                status: "未开始".to_string(),
                estimated_minutes: item.estimated_minutes,
                scheduled_date: item.scheduled_date.clone().or_else(|| draft.target_date.clone()),
                reminder_at: None,
                deadline: item.deadline.clone(),
                parent_task_id: None,
                time_start: item.time_start.clone(),
                time_end: item.time_end.clone(),
                recurrence_enabled: Some(false),
                recurrence_type: None,
                recurrence_interval: None,
                recurrence_days_of_week: None,
                recurrence_day_of_month: None,
                recurrence_until: None,
                recurrence_source_task_id: None,
                completion_tag: None,
                last_delay_reason_code: None,
                last_delay_reason_note: None,
            },
        )
        .map_err(|error| format!("failed to apply plan draft item: {error}"))?;
        let _ = sync_task_to_feishu_calendar(&db_path, task_id);
        db::mark_plan_draft_item_applied(&db_path, item.id, Some(task_id))
            .map_err(|error| format!("failed to update plan draft item status: {error}"))?;
        created_task_ids.push(task_id);
        applied_items += 1;
    }
    db::set_plan_draft_status(&db_path, draft_id, "applied")
        .map_err(|error| format!("failed to set plan draft status: {error}"))?;
    let _ = db::create_notification(
        &db_path,
        "system",
        "计划草案已应用",
        &format!("草案《{}》已生成 {} 条任务。", draft.title, applied_items),
        Some("plan_draft"),
        Some(draft_id),
        "sent",
        Some(&Utc::now().to_rfc3339()),
    );
    let _ = db::create_plan_draft_audit_log(
        &db_path,
        &db::NewPlanDraftAuditLogInput {
            draft_id,
            action: "apply".to_string(),
            status: "success".to_string(),
            operator_name: Some("user".to_string()),
            reason_code: None,
            reason_note: Some(format!("草稿《{}》应用成功。", draft.title)),
            affected_task_ids_json: Some(serde_json::to_string(&created_task_ids).unwrap_or_else(|_| "[]".to_string())),
            item_count: Some(applied_items),
        },
    );
    Ok(PlanDraftApplyPayload {
        draft_id,
        applied_items,
        created_task_ids,
        summary: format!("已应用草案并生成 {} 条任务。", applied_items),
    })
}

#[tauri::command]
fn apply_plan_draft_commit(
    app: tauri::AppHandle,
    payload: ApplyPlanDraftCommitInput,
) -> Result<PlanDraftApplyPayload, String> {
    let db_path = get_database_path(&app)?;
    if !payload.risk_acknowledged {
        let _ = db::create_plan_draft_audit_log(
            &db_path,
            &db::NewPlanDraftAuditLogInput {
                draft_id: payload.draft_id,
                action: "apply".to_string(),
                status: "failed".to_string(),
                operator_name: Some("user".to_string()),
                reason_code: Some("RISK_NOT_ACKNOWLEDGED".to_string()),
                reason_note: Some("未勾选风险确认，阻止 commit-write。".to_string()),
                affected_task_ids_json: None,
                item_count: Some(0),
            },
        );
        return Err("commit-write requires risk confirmation".to_string());
    }
    let expected_token = format!("APPLY-{}", payload.draft_id);
    if payload.confirm_token.trim().to_uppercase() != expected_token {
        let _ = db::create_plan_draft_audit_log(
            &db_path,
            &db::NewPlanDraftAuditLogInput {
                draft_id: payload.draft_id,
                action: "apply".to_string(),
                status: "failed".to_string(),
                operator_name: Some("user".to_string()),
                reason_code: Some("TOKEN_MISMATCH".to_string()),
                reason_note: Some(format!("确认口令不匹配，期望 {expected_token}。")),
                affected_task_ids_json: None,
                item_count: Some(0),
            },
        );
        return Err(format!("commit token mismatch, expected {expected_token}"));
    }
    if let Some(expected_items) = payload.expected_items {
        let items = db::list_plan_draft_items(&db_path, payload.draft_id)
            .map_err(|error| format!("failed to list plan draft items: {error}"))?;
        if items.len() as i64 != expected_items {
            let _ = db::create_plan_draft_audit_log(
                &db_path,
                &db::NewPlanDraftAuditLogInput {
                    draft_id: payload.draft_id,
                    action: "apply".to_string(),
                    status: "failed".to_string(),
                    operator_name: Some("user".to_string()),
                    reason_code: Some("STALE_DRAFT_SNAPSHOT".to_string()),
                    reason_note: Some("确认面板快照与当前草稿条目数量不一致。".to_string()),
                    affected_task_ids_json: None,
                    item_count: Some(expected_items),
                },
            );
            return Err("draft items changed, please reopen confirm panel".to_string());
        }
    }
    apply_plan_draft_internal(&app, payload.draft_id)
}

#[tauri::command]
fn rollback_plan_draft_apply(
    app: tauri::AppHandle,
    draft_id: i64,
) -> Result<PlanDraftRollbackPayload, String> {
    let db_path = get_database_path(&app)?;
    let draft = db::get_plan_draft(&db_path, draft_id)
        .map_err(|error| format!("failed to get plan draft: {error}"))?
        .ok_or_else(|| "plan draft not found".to_string())?;
    let items = db::list_plan_draft_items(&db_path, draft_id)
        .map_err(|error| format!("failed to list plan draft items: {error}"))?;
    let mut rolled_back_items = 0_i64;
    let mut deleted_task_ids: Vec<i64> = Vec::new();
    for item in items {
        if item.apply_status != "applied" {
            continue;
        }
        if let Some(task_id) = item.created_task_id {
            db::delete_task(&db_path, task_id)
                .map_err(|error| format!("failed to delete applied task: {error}"))?;
            deleted_task_ids.push(task_id);
        }
        db::reset_plan_draft_item_pending(&db_path, item.id)
            .map_err(|error| format!("failed to reset draft item state: {error}"))?;
        rolled_back_items += 1;
    }
    db::set_plan_draft_status(&db_path, draft_id, "pending")
        .map_err(|error| format!("failed to reset draft status: {error}"))?;
    let summary = if rolled_back_items == 0 {
        "该草稿当前没有已应用条目，无需回滚。".to_string()
    } else {
        format!("已回滚草稿《{}》，撤销 {} 条已应用任务。", draft.title, rolled_back_items)
    };
    let _ = db::create_notification(
        &db_path,
        "system",
        "计划草案已回滚",
        &summary,
        Some("plan_draft"),
        Some(draft_id),
        "sent",
        Some(&Utc::now().to_rfc3339()),
    );
    let _ = db::create_plan_draft_audit_log(
        &db_path,
        &db::NewPlanDraftAuditLogInput {
            draft_id,
            action: "rollback".to_string(),
            status: if rolled_back_items == 0 { "noop".to_string() } else { "success".to_string() },
            operator_name: Some("user".to_string()),
            reason_code: if rolled_back_items == 0 {
                Some("NO_APPLIED_ITEMS".to_string())
            } else {
                None
            },
            reason_note: Some(summary.clone()),
            affected_task_ids_json: Some(serde_json::to_string(&deleted_task_ids).unwrap_or_else(|_| "[]".to_string())),
            item_count: Some(rolled_back_items),
        },
    );
    Ok(PlanDraftRollbackPayload {
        draft_id,
        rolled_back_items,
        deleted_task_ids,
        summary,
    })
}

#[tauri::command]
fn list_plan_draft_audit_logs(
    app: tauri::AppHandle,
    payload: Option<PlanDraftAuditLogQueryInput>,
) -> Result<Vec<db::PlanDraftAuditLogRecord>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(PlanDraftAuditLogQueryInput {
        draft_id: None,
        limit: Some(60),
    });
    db::list_plan_draft_audit_logs(&db_path, query.draft_id, query.limit.unwrap_or(60).clamp(1, 300))
        .map_err(|error| format!("failed to list plan draft audit logs: {error}"))
}

#[tauri::command]
fn list_daily_plan_versions(
    app: tauri::AppHandle,
    payload: Option<DailyPlanVersionQueryInput>,
) -> Result<Vec<db::DailyPlanVersionRecord>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(DailyPlanVersionQueryInput {
        date_key: None,
        status: None,
        limit: Some(120),
    });
    db::list_daily_plan_versions(
        &db_path,
        query.date_key.as_deref(),
        query.status.as_deref(),
        query.limit.unwrap_or(120).clamp(1, 500),
    )
    .map_err(|error| format!("failed to list daily plan versions: {error}"))
}

#[tauri::command]
fn list_daily_plan_items(
    app: tauri::AppHandle,
    version_id: i64,
) -> Result<Vec<db::DailyPlanItemRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_daily_plan_items(&db_path, version_id)
        .map_err(|error| format!("failed to list daily plan items: {error}"))
}

#[tauri::command]
fn create_daily_plan_version(
    app: tauri::AppHandle,
    payload: DailyPlanVersionCreatePayload,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    if payload.items.is_empty() {
        return Err("daily plan items cannot be empty".to_string());
    }
    let version_input = db::NewDailyPlanVersionInput {
        date_key: payload.date_key,
        title: payload.title,
        status: payload.status,
        source_reason: payload.source_reason,
        created_from_type: payload.created_from_type,
        base_version_id: payload.base_version_id,
    };
    let item_inputs = payload
        .items
        .into_iter()
        .map(|item| db::NewDailyPlanItemInput {
            item_order: item.item_order,
            title: item.title,
            module: item.module,
            estimated_minutes: item.estimated_minutes,
            priority: item.priority,
            source_reason: item.source_reason,
            suggested_time_block: item.suggested_time_block,
            task_id: item.task_id,
            is_completed: item.is_completed,
        })
        .collect::<Vec<_>>();
    db::create_daily_plan_version_with_items(&db_path, &version_input, &item_inputs)
        .map_err(|error| format!("failed to create daily plan version: {error}"))
}

#[tauri::command]
fn update_daily_plan_version_status(
    app: tauri::AppHandle,
    version_id: i64,
    status: String,
) -> Result<(), String> {
    let value = status.trim();
    if value != "draft" && value != "accepted" && value != "superseded" {
        return Err("invalid daily plan status".to_string());
    }
    let db_path = get_database_path(&app)?;
    db::set_daily_plan_version_status(&db_path, version_id, value)
        .map_err(|error| format!("failed to update daily plan version status: {error}"))
}

#[tauri::command]
fn delete_daily_plan_version(
    app: tauri::AppHandle,
    version_id: i64,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::delete_daily_plan_version(&db_path, version_id)
        .map_err(|error| format!("failed to delete daily plan version: {error}"))
}

#[tauri::command]
fn update_daily_plan_item(
    app: tauri::AppHandle,
    item_id: i64,
    payload: db::UpdateDailyPlanItemInput,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::update_daily_plan_item(&db_path, item_id, &payload)
        .map_err(|error| format!("failed to update daily plan item: {error}"))
}

#[tauri::command]
fn generate_daily_plan_version_draft(
    app: tauri::AppHandle,
    date_key: Option<String>,
) -> Result<i64, String> {
    let db_path = get_database_path(&app)?;
    let today = Local::now().date_naive().format("%Y-%m-%d").to_string();
    let target_date = date_key
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or(today);
    let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let mut candidates = tasks
        .into_iter()
        .filter(|task| {
            task.scheduled_date.as_deref() == Some(target_date.as_str())
                || task.deadline.as_deref().map(|value| value.starts_with(&target_date)).unwrap_or(false)
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|a, b| {
        let pa = match a.priority.as_str() {
            "高" => 0_i32,
            "中" => 1_i32,
            _ => 2_i32,
        };
        let pb = match b.priority.as_str() {
            "高" => 0_i32,
            "中" => 1_i32,
            _ => 2_i32,
        };
        pa.cmp(&pb).then_with(|| a.id.cmp(&b.id))
    });
    if candidates.is_empty() {
        return Err("当天暂无可用于生成版本的任务".to_string());
    }
    let items = candidates
        .iter()
        .enumerate()
        .map(|(index, task)| db::NewDailyPlanItemInput {
            item_order: Some((index + 1) as i64),
            title: task.title.clone(),
            module: Some(task.task_type.clone()),
            estimated_minutes: task.estimated_minutes,
            priority: Some(task.priority.clone()),
            source_reason: Some("从当日任务自动生成".to_string()),
            suggested_time_block: task.time_start.as_ref().map(|start| {
                let end = task.time_end.clone().unwrap_or_else(|| "--:--".to_string());
                format!("{start}-{end}")
            }),
            task_id: Some(task.id),
            is_completed: Some(task.status == "已完成"),
        })
        .collect::<Vec<_>>();
    db::create_daily_plan_version_with_items(
        &db_path,
        &db::NewDailyPlanVersionInput {
            date_key: target_date.clone(),
            title: format!("{target_date} 计划草案"),
            status: Some("draft".to_string()),
            source_reason: Some("自动聚合当日任务".to_string()),
            created_from_type: Some("task_snapshot".to_string()),
            base_version_id: None,
        },
        &items,
    )
    .map_err(|error| format!("failed to generate daily plan version draft: {error}"))
}

#[tauri::command]
fn generate_tomorrow_plan_draft(app: tauri::AppHandle) -> Result<PlanDraftPayload, String> {
    let db_path = get_database_path(&app)?;
    let today = Local::now().date_naive();
    let tomorrow = today + chrono::Duration::days(1);
    let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;

    let mut candidates = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .map(|task| {
            let mut score = 0_i64;
            if task.priority == "高" {
                score += 30;
            } else if task.priority == "中" {
                score += 15;
            }
            if let Some(deadline) = task.deadline.as_deref().and_then(parse_yyyy_mm_dd) {
                let diff = (deadline - tomorrow).num_days();
                if diff < 0 {
                    score += 90 + diff.abs() * 6;
                } else if diff == 0 {
                    score += 75;
                } else if diff <= 2 {
                    score += 55 - diff * 10;
                }
            }
            if let Some(scheduled) = task.scheduled_date.as_deref().and_then(parse_yyyy_mm_dd) {
                if scheduled < tomorrow {
                    score += 35;
                } else if scheduled == tomorrow {
                    score += 25;
                }
            }
            (task, score)
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| b.0.updated_at.cmp(&a.0.updated_at)));

    let mut items = candidates
        .into_iter()
        .take(6)
        .enumerate()
        .map(|(index, (task, _score))| NewPlanDraftItemInput {
            item_order: Some((index + 1) as i64),
            item_type: Some("task".to_string()),
            title: task.title.clone(),
            description: task.description.clone(),
            priority: Some(task.priority.clone()),
            estimated_minutes: task.estimated_minutes.or(Some(60)),
            scheduled_date: Some(tomorrow.format("%Y-%m-%d").to_string()),
            time_start: None,
            time_end: None,
            deadline: task.deadline.clone(),
            linked_project_id: if task.source_type.as_deref() == Some("project") {
                task.source_id
            } else {
                None
            },
            action_payload_json: Some(
                serde_json::json!({
                    "fromTaskId": task.id,
                    "reason": "carryover_or_deadline"
                })
                .to_string(),
            ),
        })
        .collect::<Vec<_>>();
    if items.is_empty() {
        items.push(NewPlanDraftItemInput {
            item_order: Some(1),
            item_type: Some("task".to_string()),
            title: "整理并确认明日计划".to_string(),
            description: Some("优先确认本周最紧急三项任务，并补齐缺失材料。".to_string()),
            priority: Some("中".to_string()),
            estimated_minutes: Some(30),
            scheduled_date: Some(tomorrow.format("%Y-%m-%d").to_string()),
            time_start: None,
            time_end: None,
            deadline: None,
            linked_project_id: None,
            action_payload_json: None,
        });
    }
    let suggestion_text = format!(
        "明日草案已生成，共 {} 项。建议先处理高优先级 + 临近DDL任务，再安排至少 1 个 90 分钟深度块。",
        items.len()
    );
    let draft_id = db::create_plan_draft_with_items(
        &db_path,
        &NewPlanDraftInput {
            draft_type: "tomorrow".to_string(),
            title: format!("明日执行草案 · {}", tomorrow.format("%Y-%m-%d")),
            target_date: Some(tomorrow.format("%Y-%m-%d").to_string()),
            week_key: Some(week_key_of(tomorrow)),
            source_context_json: Some(
                serde_json::json!({
                    "generatedAt": Local::now().to_rfc3339(),
                    "source": "rule-engine",
                    "candidateCount": items.len()
                })
                .to_string(),
            ),
            suggestion_text: Some(suggestion_text.clone()),
            status: Some("pending".to_string()),
        },
        &items,
    )
    .map_err(|error| format!("failed to create tomorrow plan draft: {error}"))?;

    let draft = db::get_plan_draft(&db_path, draft_id)
        .map_err(|error| format!("failed to get created plan draft: {error}"))?
        .ok_or_else(|| "created plan draft not found".to_string())?;
    let draft_items = db::list_plan_draft_items(&db_path, draft_id)
        .map_err(|error| format!("failed to list plan draft items: {error}"))?;
    Ok(PlanDraftPayload {
        draft,
        items: draft_items,
        summary: suggestion_text,
    })
}

#[tauri::command]
fn generate_weekly_focus_plan_draft(app: tauri::AppHandle) -> Result<PlanDraftPayload, String> {
    let db_path = get_database_path(&app)?;
    let now = Local::now().date_naive();
    let next_week_anchor = now + chrono::Duration::days(7);
    let start_of_week = next_week_anchor
        - chrono::Duration::days(next_week_anchor.weekday().num_days_from_monday() as i64);
    let target_week_key = week_key_of(start_of_week);

    let logs = db::list_study_analysis_logs(&db_path, 240)
        .map_err(|error| format!("failed to list study analysis logs: {error}"))?;
    let recent_logs = logs
        .iter()
        .filter(|item| parse_yyyy_mm_dd(&item.date_key).map(|date| (now - date).num_days() <= 14).unwrap_or(false))
        .collect::<Vec<_>>();
    let mut weak_counter: HashMap<String, i64> = HashMap::new();
    for item in recent_logs {
        let key = item
            .weakest_module
            .as_deref()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| item.subject.clone());
        *weak_counter.entry(key).or_insert(0) += 1;
    }
    let mut weak_pairs = weak_counter.into_iter().collect::<Vec<_>>();
    weak_pairs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

    let mut items: Vec<NewPlanDraftItemInput> = Vec::new();
    for (index, (module, _count)) in weak_pairs.iter().take(3).enumerate() {
        let day = start_of_week + chrono::Duration::days((index * 2) as i64);
        items.push(NewPlanDraftItemInput {
            item_order: Some((index + 1) as i64),
            item_type: Some("task".to_string()),
            title: format!("{} 强化训练", module),
            description: Some("按错因清单做 60-90 分钟专项训练，并记录复盘。".to_string()),
            priority: Some("高".to_string()),
            estimated_minutes: Some(90),
            scheduled_date: Some(day.format("%Y-%m-%d").to_string()),
            time_start: None,
            time_end: None,
            deadline: Some((day + chrono::Duration::days(1)).format("%Y-%m-%d").to_string()),
            linked_project_id: None,
            action_payload_json: None,
        });
    }

    let study_changes = db::list_web_change_logs(
        &db_path,
        &db::WebChangeLogQueryInput {
            watcher_id: None,
            source_id: None,
            linked_project_id: None,
            limit: Some(240),
        },
    )
    .map_err(|error| format!("failed to list web changes: {error}"))?;
    let recent_pending_study_changes = study_changes
        .into_iter()
        .filter(|item| is_study_web_change(item))
        .filter(|item| item.processed_at.is_none())
        .filter(|item| {
            parse_mixed_datetime(&item.changed_at)
                .map(|time| now.signed_duration_since(time.with_timezone(&Local).date_naive()).num_days() <= 14)
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();

    for (offset, change) in recent_pending_study_changes.iter().take(2).enumerate() {
        let day = start_of_week + chrono::Duration::days((offset * 3 + 1) as i64);
        let topic = change
            .source_title
            .clone()
            .unwrap_or_else(|| "学习资料更新".to_string());
        items.push(NewPlanDraftItemInput {
            item_order: Some((items.len() + 1) as i64),
            item_type: Some("task".to_string()),
            title: format!("处理资料更新：{}", topic),
            description: Some(
                "来自 Web Monitor 的学习资料变化，建议先核对更新内容，再同步到本周计划。".to_string(),
            ),
            priority: Some("中".to_string()),
            estimated_minutes: Some(45),
            scheduled_date: Some(day.format("%Y-%m-%d").to_string()),
            time_start: None,
            time_end: None,
            deadline: Some((day + chrono::Duration::days(1)).format("%Y-%m-%d").to_string()),
            linked_project_id: None,
            action_payload_json: Some(
                serde_json::json!({
                    "source": "study_web_change",
                    "changeId": change.id,
                    "targetUrl": change.target_url,
                    "changeDirection": change.change_direction,
                })
                .to_string(),
            ),
        });
    }
    if items.is_empty() {
        items.push(NewPlanDraftItemInput {
            item_order: Some(1),
            item_type: Some("task".to_string()),
            title: "下周学习重点规划".to_string(),
            description: Some("复盘近两周任务与错题，提炼 3 个重点主题并拆解执行。".to_string()),
            priority: Some("中".to_string()),
            estimated_minutes: Some(60),
            scheduled_date: Some(start_of_week.format("%Y-%m-%d").to_string()),
            time_start: None,
            time_end: None,
            deadline: Some((start_of_week + chrono::Duration::days(1)).format("%Y-%m-%d").to_string()),
            linked_project_id: None,
            action_payload_json: None,
        });
    }
    let web_change_boost_count = recent_pending_study_changes.len().min(2);
    let suggestion_text = format!(
        "下周重点草案（{}）已生成。建议优先执行 {} 项高价值训练{}，并在周三/周六做阶段复盘。",
        target_week_key,
        items.len(),
        if web_change_boost_count > 0 {
            format!("，其中包含 {} 条学习资源更新跟进", web_change_boost_count)
        } else {
            "".to_string()
        }
    );
    let draft_id = db::create_plan_draft_with_items(
        &db_path,
        &NewPlanDraftInput {
            draft_type: "weekly_focus".to_string(),
            title: format!("下周重点草案 · {}", target_week_key),
            target_date: None,
            week_key: Some(target_week_key.clone()),
            source_context_json: Some(
                serde_json::json!({
                    "generatedAt": Local::now().to_rfc3339(),
                    "source": "rule-engine",
                    "focusModules": weak_pairs.iter().take(3).map(|item| item.0.clone()).collect::<Vec<_>>(),
                    "pendingStudyWebChanges": recent_pending_study_changes.len(),
                    "includedStudyWebChanges": web_change_boost_count,
                })
                .to_string(),
            ),
            suggestion_text: Some(suggestion_text.clone()),
            status: Some("pending".to_string()),
        },
        &items,
    )
    .map_err(|error| format!("failed to create weekly focus draft: {error}"))?;

    let draft = db::get_plan_draft(&db_path, draft_id)
        .map_err(|error| format!("failed to get created plan draft: {error}"))?
        .ok_or_else(|| "created plan draft not found".to_string())?;
    let draft_items = db::list_plan_draft_items(&db_path, draft_id)
        .map_err(|error| format!("failed to list plan draft items: {error}"))?;
    Ok(PlanDraftPayload {
        draft,
        items: draft_items,
        summary: suggestion_text,
    })
}

#[tauri::command]
fn generate_ai_digest(app: tauri::AppHandle) -> Result<AiDigestPayload, String> {
    let db_path = get_database_path(&app)?;
    let start = std::time::Instant::now();
    let now = Local::now().date_naive();
    let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let projects = db::list_projects(&db_path).map_err(|error| format!("failed to list projects: {error}"))?;
    let mut actions: Vec<String> = Vec::new();
    let mut summary_lines: Vec<String> = Vec::new();

    let urgent_tasks = tasks
        .iter()
        .filter(|task| task.status != "已完成")
        .filter_map(|task| {
            let ddl = task.deadline.as_ref()?;
            let d = parse_yyyy_mm_dd(ddl)?;
            let diff = (d - now).num_days();
            if diff <= 2 {
                Some((task.title.clone(), diff))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    if !urgent_tasks.is_empty() {
        summary_lines.push(format!("你有 {} 项任务进入 48 小时窗口。", urgent_tasks.len()));
        for (title, diff) in urgent_tasks.iter().take(3) {
            let text = if *diff < 0 {
                format!("任务《{}》已超期 {} 天，建议先补交。", title, diff.abs())
            } else {
                format!("任务《{}》剩余 {} 天，建议今日推进。", title, diff)
            };
            actions.push(text);
        }
    }

    let urgent_projects = projects
        .iter()
        .filter(|project| project.status != "完成")
        .filter_map(|project| {
            let ddl = project.deadline.as_ref()?;
            let d = parse_yyyy_mm_dd(ddl)?;
            let diff = (d - now).num_days();
            if diff <= 7 {
                Some((format!("{} · {}", project.school_name, project.program_name), diff))
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    if !urgent_projects.is_empty() {
        summary_lines.push(format!("有 {} 个申请项目进入 7 天预警窗口。", urgent_projects.len()));
        for (name, diff) in urgent_projects.iter().take(2) {
            let text = if *diff < 0 {
                format!("项目《{}》已过期 {} 天，先确认是否可补交。", name, diff.abs())
            } else {
                format!("项目《{}》剩余 {} 天，优先检查材料清单。", name, diff)
            };
            actions.push(text);
        }
    }

    if summary_lines.is_empty() {
        summary_lines.push("近期没有高危DDL，建议按本周计划稳步推进。".to_string());
        actions.push("安排一段 25 分钟专注时间处理文书或词汇复习。".to_string());
    }
    let fallback_summary = summary_lines.join(" ");
    let fallback_actions = actions.clone();
    let mut final_summary = fallback_summary.clone();
    let mut final_actions = fallback_actions.clone();
    let ai_provider = db::get_app_setting(&db_path, "ai_provider")
        .map_err(|error| format!("failed to read ai provider: {error}"))?
        .unwrap_or_else(|| "local".to_string());
    let gemini_key = get_secret_optional(&db_path, keys::GEMINI_API_KEY)?
        .unwrap_or_default();
    let gemini_model = db::get_app_setting(&db_path, "gemini_model")
        .map_err(|error| format!("failed to read gemini model: {error}"))?
        .unwrap_or_else(|| "gemini-1.5-flash".to_string());
    let mut provider = "local".to_string();
    let mut model = "rule-engine-v1".to_string();
    let mut input_tokens = rough_token_count(&(fallback_summary.clone() + &fallback_actions.join(" ")));
    let mut output_tokens = rough_token_count(&(fallback_summary.clone() + &fallback_actions.join(" ")));

    if ai_provider.trim().eq_ignore_ascii_case("gemini") && !gemini_key.trim().is_empty() {
        let context_lines = [
            format!("今日任务总数：{}", tasks.len()),
            format!("在申项目总数：{}", projects.len()),
            format!("任务风险摘要：{}", fallback_summary),
            format!("建议动作草案：{}", fallback_actions.join("；")),
        ];
        let prompt = format!(
            "你是个人学习与申请助手。请基于以下上下文生成简短建议，输出 JSON：{{\"summary\":\"...\",\"actions\":[\"...\",\"...\"]}}。动作不超过5条。\n上下文：\n{}",
            context_lines.join("\n")
        );
        if let Ok((text, in_tokens, out_tokens)) =
            call_gemini_generate(&gemini_key, &gemini_model, &prompt)
        {
            let (parsed_summary, parsed_actions) = parse_ai_digest_text(&text);
            final_summary = parsed_summary;
            final_actions = parsed_actions;
            provider = "gemini".to_string();
            model = gemini_model.clone();
            input_tokens = in_tokens.unwrap_or_else(|| rough_token_count(&prompt));
            output_tokens = out_tokens.unwrap_or_else(|| rough_token_count(&text));
        }
    }

    let latency_ms = start.elapsed().as_millis() as i64;
    let estimated_cost = if provider == "gemini" {
        ((input_tokens + output_tokens) as f64) * 0.0000009_f64
    } else {
        ((input_tokens + output_tokens) as f64) * 0.0000005_f64
    };
    let _ = db::create_ai_log(
        &db_path,
        &NewAiLogInput {
            module_name: "assistant".to_string(),
            action_name: "daily_digest".to_string(),
            model_name: Some(model.clone()),
            provider_name: Some(provider.clone()),
            input_tokens,
            output_tokens,
            estimated_cost,
            latency_ms: Some(latency_ms),
            success: true,
        },
    );
    Ok(AiDigestPayload {
        summary: final_summary,
        actions: final_actions,
        provider,
        model,
        input_tokens,
        output_tokens,
        estimated_cost,
        latency_ms,
    })
}

#[tauri::command]
fn generate_assistant_briefing(
    app: tauri::AppHandle,
    brief_type: String,
    auto_generated: Option<bool>,
) -> Result<AssistantBriefingPayload, String> {
    let db_path = get_database_path(&app)?;
    let normalized = normalize_brief_type(&brief_type)
        .ok_or_else(|| "unsupported brief type, expected morning/evening".to_string())?;
    let today = Local::now().date_naive();
    let built = build_assistant_briefing(&db_path, normalized, today)?;
    let payload = persist_assistant_briefing(
        &db_path,
        normalized,
        &today.format("%Y-%m-%d").to_string(),
        auto_generated.unwrap_or(false),
        built,
    )?;
    let _ = db::create_notification(
        &db_path,
        "system",
        if normalized == "morning" {
            "晨间简报已生成"
        } else {
            "晚间回顾已生成"
        },
        &payload.briefing.summary_text,
        Some("assistant_briefing"),
        Some(payload.briefing.id),
        "sent",
        Some(&Utc::now().to_rfc3339()),
    );
    Ok(payload)
}

#[tauri::command]
fn list_assistant_briefings(
    app: tauri::AppHandle,
    payload: Option<AssistantBriefingQueryInput>,
) -> Result<Vec<db::AssistantBriefingRecord>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(AssistantBriefingQueryInput {
        brief_type: None,
        date_key: None,
        limit: Some(40),
    });
    db::list_assistant_briefings(
        &db_path,
        query.brief_type.as_deref(),
        query.date_key.as_deref(),
        query.limit.unwrap_or(40).clamp(1, 200),
    )
    .map_err(|error| format!("failed to list assistant briefings: {error}"))
}

#[tauri::command]
fn list_assistant_briefing_suggestions(
    app: tauri::AppHandle,
    briefing_id: i64,
) -> Result<Vec<db::AssistantBriefingSuggestionRecord>, String> {
    let db_path = get_database_path(&app)?;
    db::list_assistant_briefing_suggestions(&db_path, briefing_id)
        .map_err(|error| format!("failed to list assistant briefing suggestions: {error}"))
}

#[tauri::command]
fn apply_assistant_briefing_suggestion(
    app: tauri::AppHandle,
    suggestion_id: i64,
) -> Result<AssistantBriefingApplyPayload, String> {
    let db_path = get_database_path(&app)?;
    let suggestion = db::get_assistant_briefing_suggestion(&db_path, suggestion_id)
        .map_err(|error| format!("failed to load suggestion: {error}"))?
        .ok_or_else(|| "suggestion not found".to_string())?;
    if suggestion.status == "applied" {
        return Ok(AssistantBriefingApplyPayload {
            suggestion_id,
            status: "applied".to_string(),
            summary: "该建议已执行。".to_string(),
            created_task_id: suggestion.created_task_id,
        });
    }

    let mut created_task_id: Option<i64> = None;
    let summary = match suggestion.action_type.as_str() {
        "create_task" => {
            let payload = suggestion
                .action_payload_json
                .as_deref()
                .ok_or_else(|| "missing action payload for create_task".to_string())?;
            let input: NewTaskInput = serde_json::from_str(payload)
                .map_err(|error| format!("invalid create_task payload: {error}"))?;
            let task_id = db::create_task(&db_path, &input)
                .map_err(|error| format!("failed to create task from suggestion: {error}"))?;
            created_task_id = Some(task_id);
            let _ = sync_task_to_feishu_calendar(&db_path, task_id);
            format!("已执行建议并创建任务 #{}。", task_id)
        }
        "postpone_task" => {
            let payload = suggestion
                .action_payload_json
                .as_deref()
                .ok_or_else(|| "missing action payload for postpone_task".to_string())?;
            let input: PostponeTaskInput = serde_json::from_str(payload)
                .map_err(|error| format!("invalid postpone payload: {error}"))?;
            db::postpone_task(&db_path, &input)
                .map_err(|error| format!("failed to postpone task from suggestion: {error}"))?;
            let _ = sync_task_to_feishu_calendar(&db_path, input.task_id);
            format!("已执行建议并顺延任务 #{}。", input.task_id)
        }
        _ => return Err("unsupported suggestion action type".to_string()),
    };

    db::mark_assistant_briefing_suggestion_status(&db_path, suggestion_id, "applied", created_task_id)
        .map_err(|error| format!("failed to update suggestion status: {error}"))?;
    let _ = db::create_notification(
        &db_path,
        "system",
        "秘书建议已应用",
        &summary,
        Some("assistant_briefing"),
        Some(suggestion.briefing_id),
        "sent",
        Some(&Utc::now().to_rfc3339()),
    );
    Ok(AssistantBriefingApplyPayload {
        suggestion_id,
        status: "applied".to_string(),
        summary,
        created_task_id,
    })
}

fn parse_scheduled_time(raw: Option<String>, default_hm: &str) -> NaiveTime {
    let text = raw.unwrap_or_else(|| default_hm.to_string());
    NaiveTime::parse_from_str(text.trim(), "%H:%M")
        .unwrap_or_else(|_| NaiveTime::parse_from_str(default_hm, "%H:%M").unwrap_or_else(|_| NaiveTime::MIN))
}

#[tauri::command]
fn run_assistant_briefing_tick(app: tauri::AppHandle) -> Result<AssistantBriefingTickPayload, String> {
    let db_path = get_database_path(&app)?;
    let enabled = bool_setting_enabled(
        db::get_app_setting(&db_path, "assistant_briefing_schedule_enabled")
            .map_err(|error| format!("failed to read assistant briefing schedule: {error}"))?,
        true,
    );
    if !enabled {
        return Ok(AssistantBriefingTickPayload {
            executed: false,
            generated_count: 0,
            pushed_count: 0,
            summary: "秘书简报定时生成已关闭。".to_string(),
            details: Vec::new(),
        });
    }

    let now = Local::now();
    let today_key = ymd(now);
    let morning_time = parse_scheduled_time(
        db::get_app_setting(&db_path, "assistant_briefing_morning_time")
            .map_err(|error| format!("failed to read morning time: {error}"))?,
        "08:00",
    );
    let evening_time = parse_scheduled_time(
        db::get_app_setting(&db_path, "assistant_briefing_evening_time")
            .map_err(|error| format!("failed to read evening time: {error}"))?,
        "22:30",
    );

    let mut due_types: Vec<&str> = Vec::new();
    let last_morning = db::get_app_setting(&db_path, "assistant_briefing_last_sent_morning")
        .map_err(|error| format!("failed to read last morning sent: {error}"))?
        .unwrap_or_default();
    if now.time() >= morning_time && last_morning != today_key {
        due_types.push("morning");
    }
    let last_evening = db::get_app_setting(&db_path, "assistant_briefing_last_sent_evening")
        .map_err(|error| format!("failed to read last evening sent: {error}"))?
        .unwrap_or_default();
    if now.time() >= evening_time && last_evening != today_key {
        due_types.push("evening");
    }

    if due_types.is_empty() {
        return Ok(AssistantBriefingTickPayload {
            executed: false,
            generated_count: 0,
            pushed_count: 0,
            summary: "未到秘书简报定时窗口。".to_string(),
            details: Vec::new(),
        });
    }

    let mut generated_count = 0_i64;
    let mut pushed_count = 0_i64;
    let mut details = Vec::new();

    for brief_type in due_types {
        let built = build_assistant_briefing(&db_path, brief_type, now.date_naive())?;
        let title = built.push_title.clone();
        let body = built.push_body.clone();
        let payload = persist_assistant_briefing(
            &db_path,
            brief_type,
            &today_key,
            true,
            built,
        )?;
        generated_count += 1;
        let push_result = push_assistant_briefing_to_feishu(
            &db_path,
            &title,
            &body,
            if brief_type == "morning" {
                "assistant_morning_brief"
            } else {
                "assistant_evening_review"
            },
        );
        let (channel, send_status, sent_at, pushed) = match push_result {
            Ok(true) => {
                pushed_count += 1;
                ("feishu", "sent", Some(Utc::now().to_rfc3339()), true)
            }
            Ok(false) => ("system", "pending", None, false),
            Err(error) => {
                details.push(format!("{} 推送失败：{}", if brief_type == "morning" { "晨间简报" } else { "晚间回顾" }, error));
                ("feishu", "failed", None, false)
            }
        };
        let _ = db::create_notification(
            &db_path,
            channel,
            if brief_type == "morning" {
                "晨间简报已生成"
            } else {
                "晚间回顾已生成"
            },
            &payload.briefing.summary_text,
            Some("assistant_briefing"),
            Some(payload.briefing.id),
            send_status,
            sent_at.as_deref(),
        );
        if brief_type == "morning" {
            let _ = db::set_app_setting(&db_path, "assistant_briefing_last_sent_morning", &today_key);
        } else {
            let _ = db::set_app_setting(&db_path, "assistant_briefing_last_sent_evening", &today_key);
        }
        details.push(format!(
            "{}：{}",
            if brief_type == "morning" { "晨间简报" } else { "晚间回顾" },
            if pushed { "已推送飞书" } else { "已本地生成（未推送）" }
        ));
    }

    Ok(AssistantBriefingTickPayload {
        executed: true,
        generated_count,
        pushed_count,
        summary: format!("秘书简报执行完成：生成 {} 份，推送 {} 份。", generated_count, pushed_count),
        details,
    })
}

#[tauri::command]
fn execute_feishu_command(app: tauri::AppHandle, command: String) -> Result<FeishuCommandPayload, String> {
    let db_path = get_database_path(&app)?;
    let started_at = std::time::Instant::now();
    let text = command.trim().to_string();
    let keyword = db::get_app_setting(&db_path, "feishu_webhook_keyword")
        .map_err(|error| format!("failed to read feishu webhook keyword: {error}"))?;
    let normalized = normalize_feishu_command_text(&text, keyword.as_deref());
    let source_once = db::get_app_setting(&db_path, "feishu_command_source_once")
        .ok()
        .flatten()
        .filter(|v| !v.trim().is_empty())
        .unwrap_or_else(|| "manual_command".to_string());
    let message_id_once = db::get_app_setting(&db_path, "feishu_command_message_id_once")
        .ok()
        .flatten()
        .filter(|v| !v.trim().is_empty());
    let high_risk_confirmed_once = matches_true(
        db::get_app_setting(&db_path, "feishu_high_risk_confirm_once")
            .ok()
            .flatten()
            .as_deref(),
    );
    let _ = db::set_app_setting(&db_path, "feishu_command_source_once", "");
    let _ = db::set_app_setting(&db_path, "feishu_command_message_id_once", "");
    let _ = db::set_app_setting(&db_path, "feishu_high_risk_confirm_once", "false");
    let mut effective_command = normalized.clone();
    let mut high_risk_confirmed = high_risk_confirmed_once;
    if effective_command.starts_with("确认执行 ") {
        effective_command = effective_command.trim_start_matches("确认执行 ").trim().to_string();
        high_risk_confirmed = true;
    } else if effective_command.starts_with("确认高风险 ") {
        effective_command = effective_command.trim_start_matches("确认高风险 ").trim().to_string();
        high_risk_confirmed = true;
    }
    let lower = effective_command.to_lowercase();
    let dedupe_key = format!("inbound|{}", stable_hash_hex(&effective_command));
    let duplicate_window_minutes = db::get_app_setting(&db_path, "feishu_inbound_dedupe_window_minutes")
        .map_err(|error| format!("failed to read inbound dedupe setting: {error}"))?
        .and_then(|raw| raw.trim().parse::<i64>().ok())
        .unwrap_or(2)
        .clamp(1, 30);
    let duplicate = db::find_recent_feishu_duplicate(&db_path, "inbound", &dedupe_key, duplicate_window_minutes)
        .map_err(|error| format!("failed to check inbound duplicate: {error}"))?;
    if duplicate.is_some() {
        let log_id = db::create_feishu_message_log(
            &db_path,
            "inbound",
            &source_once,
            message_id_once.as_deref(),
            &text,
            Some(&effective_command),
            Some("duplicate"),
            None,
            "duplicate",
            Some("DUPLICATE_COMMAND"),
            Some("短时间内收到重复指令，已去重拦截。"),
            Some(&dedupe_key),
            true,
            false,
            false,
            None,
            None,
            None,
            Some(started_at.elapsed().as_millis() as i64),
        )
        .ok();
        return Ok(FeishuCommandPayload {
            command: text,
            success: false,
            action: "duplicate".to_string(),
            summary: "检测到重复飞书指令，本次已忽略。".to_string(),
            error_code: Some("DUPLICATE_COMMAND".to_string()),
            error_message: Some("短时间内重复消息已去重。".to_string()),
            log_id,
            high_risk_required: false,
            high_risk_confirmed: false,
            created_task_id: None,
            created_session_id: None,
            matched_project_ids: Vec::new(),
        });
    }
    let log_id = db::create_feishu_message_log(
        &db_path,
        "inbound",
        &source_once,
        message_id_once.as_deref(),
        &text,
        Some(&effective_command),
        None,
        None,
        "received",
        None,
        None,
        Some(&dedupe_key),
        false,
        false,
        false,
        None,
        None,
        None,
        None,
    )
    .ok();

    if effective_command.trim().is_empty() {
        if let Some(id) = log_id {
            let _ = db::update_feishu_message_log(
                &db_path,
                id,
                Some("empty"),
                None,
                "failed",
                Some("EMPTY_COMMAND"),
                Some("未识别到有效指令文本。"),
                None,
                None,
                None,
                None,
                None,
                Some(started_at.elapsed().as_millis() as i64),
            );
        }
        return Ok(FeishuCommandPayload {
            command: text,
            success: false,
            action: "empty".to_string(),
            summary: "执行失败：指令为空。".to_string(),
            error_code: Some("EMPTY_COMMAND".to_string()),
            error_message: Some("请输入“新增任务 … / 查询今日计划 / 查询项目状态 / 开启番茄钟”等指令。".to_string()),
            log_id,
            high_risk_required: false,
            high_risk_confirmed: false,
            created_task_id: None,
            created_session_id: None,
            matched_project_ids: Vec::new(),
        });
    }

    let today = Local::now().format("%Y-%m-%d").to_string();
    let high_risk_required = lower.contains("删除任务")
        || lower.contains("批量")
        || lower.contains("清空")
        || lower.contains("全部改");
    if high_risk_required && !high_risk_confirmed {
        if let Some(id) = log_id {
            let _ = db::update_feishu_message_log(
                &db_path,
                id,
                Some("high_risk_guard"),
                None,
                "rejected",
                Some("CONFIRM_REQUIRED"),
                Some("该指令涉及高风险动作，当前版本需二次确认。"),
                Some(true),
                Some(false),
                None,
                None,
                None,
                Some(started_at.elapsed().as_millis() as i64),
            );
        }
        return Ok(FeishuCommandPayload {
            command: text,
            success: false,
            action: "high_risk_guard".to_string(),
            summary: "执行失败：高风险动作需要确认。".to_string(),
            error_code: Some("CONFIRM_REQUIRED".to_string()),
            error_message: Some("例如删除任务、批量改动等动作后续将通过确认机制执行。".to_string()),
            log_id,
            high_risk_required: true,
            high_risk_confirmed,
            created_task_id: None,
            created_session_id: None,
            matched_project_ids: Vec::new(),
        });
    }

    let normalized = effective_command.clone();
    let mut action = "unknown".to_string();
    let mut summary = "未识别指令，请使用“新增任务/查询今日计划/查询项目状态/开启番茄钟”".to_string();
    let mut success = true;
    let mut error_code: Option<String> = None;
    let mut error_message: Option<String> = None;
    let mut created_task_id = None;
    let mut created_session_id = None;
    let mut matched_project_ids: Vec<i64> = Vec::new();
    let mut parsed_payload_json: Option<String> = None;

    if lower.contains("删除任务") {
        action = "delete_task".to_string();
        let selector = normalized
            .replace("删除任务", "")
            .trim()
            .to_string();
        if selector.is_empty() {
            success = false;
            error_code = Some("MISSING_TASK_SELECTOR".to_string());
            error_message = Some("请提供任务ID或标题关键词。".to_string());
            summary = "执行失败：缺少任务定位信息。".to_string();
        } else {
            let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
            let found = if let Ok(id) = selector.parse::<i64>() {
                tasks.into_iter().find(|item| item.id == id)
            } else {
                tasks.into_iter().find(|item| item.title.contains(&selector))
            };
            if let Some(task) = found {
                db::delete_task(&db_path, task.id)
                    .map_err(|error| format!("failed to delete task: {error}"))?;
                created_task_id = Some(task.id);
                summary = format!("任务已删除：#{} {}", task.id, task.title);
            } else {
                success = false;
                error_code = Some("TASK_NOT_FOUND".to_string());
                error_message = Some("未找到匹配任务。".to_string());
                summary = "执行失败：任务不存在。".to_string();
            }
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "delete_task", "selector": selector }).to_string());
    } else if lower.contains("新增任务") || lower.contains("创建任务") || lower.contains("安排") {
        if let Some((nl_title, nl_date, nl_time_start, nl_deadline)) =
            extract_natural_task_command(&normalized, Local::now().date_naive())
        {
            action = "create_task_nl".to_string();
            let task_type = infer_task_type_from_text(&normalized, nl_time_start.as_deref());
            parsed_payload_json = Some(
                serde_json::json!({
                    "intent": "create_task_nl",
                    "title": nl_title,
                    "taskType": task_type,
                    "scheduledDate": nl_date,
                    "timeStart": nl_time_start,
                    "deadline": nl_deadline
                })
                .to_string(),
            );
            let task_id = db::create_task(
                &db_path,
                &NewTaskInput {
                    title: nl_title.clone(),
                    description: Some(format!("来源：飞书自然语言\n原文：{}", normalized)),
                    source_type: Some("feishu_command".to_string()),
                    source_id: None,
                    task_type: task_type.clone(),
                    priority: if lower.contains("紧急") || lower.contains("马上") {
                        "高".to_string()
                    } else {
                        "中".to_string()
                    },
                    status: "未开始".to_string(),
                    estimated_minutes: parse_first_number(&normalized).or(Some(60)),
                    scheduled_date: nl_date.clone().or(Some(today.clone())),
                    time_start: nl_time_start.clone(),
                    time_end: None,
                    reminder_at: None,
                    deadline: nl_deadline.clone().or_else(|| nl_date.clone()).or(Some(today.clone())),
                    parent_task_id: None,
                    recurrence_enabled: Some(false),
                    recurrence_type: None,
                    recurrence_interval: None,
                    recurrence_days_of_week: None,
                    recurrence_day_of_month: None,
                    recurrence_until: None,
                    recurrence_source_task_id: None,
                    completion_tag: None,
                    last_delay_reason_code: None,
                    last_delay_reason_note: None,
                },
            )
            .map_err(|error| format!("failed to create natural task from feishu command: {error}"))?;
            let _ = sync_task_to_feishu_calendar(&db_path, task_id);
            created_task_id = Some(task_id);
            summary = format!(
                "已创建{} #{}：{}{}{}",
                task_type,
                task_id,
                nl_title,
                nl_date
                    .as_ref()
                    .map(|d| format!(" · 日期 {d}"))
                    .unwrap_or_default(),
                nl_deadline
                    .as_ref()
                    .map(|d| format!(" · DDL {d}"))
                    .unwrap_or_default()
            );
        } else {
            let title = normalized
                .replace("新增任务", "")
                .replace("创建任务", "")
                .replace("安排", "")
                .trim()
                .to_string();
            if title.is_empty() {
                success = false;
                action = "create_task".to_string();
                error_code = Some("MISSING_TASK_TITLE".to_string());
                error_message = Some("缺少任务标题。示例：新增任务 完成GRE阅读2套".to_string());
                summary = "执行失败：缺少任务标题。".to_string();
            } else {
                let normalized_title = title;
                let task_type = infer_task_type_from_text(&normalized, None);
                parsed_payload_json = Some(
                    serde_json::json!({
                        "intent": "create_task",
                        "title": normalized_title,
                        "taskType": task_type,
                        "priority": if lower.contains("紧急") || lower.contains("马上") { "高" } else { "中" }
                    })
                    .to_string(),
                );
                let task_id = db::create_task(
                    &db_path,
                    &NewTaskInput {
                        title: normalized_title.clone(),
                        description: Some(format!("来源：飞书指令\n原文：{}", normalized)),
                        source_type: Some("feishu_command".to_string()),
                        source_id: None,
                        task_type: task_type.clone(),
                        priority: if lower.contains("紧急") || lower.contains("马上") {
                            "高".to_string()
                        } else {
                            "中".to_string()
                        },
                        status: "未开始".to_string(),
                        estimated_minutes: parse_first_number(&normalized).or(Some(45)),
                        scheduled_date: Some(today.clone()),
                        time_start: None,
                        time_end: None,
                        reminder_at: None,
                        deadline: Some(today.clone()),
                        parent_task_id: None,
                        recurrence_enabled: Some(false),
                        recurrence_type: None,
                        recurrence_interval: None,
                        recurrence_days_of_week: None,
                        recurrence_day_of_month: None,
                        recurrence_until: None,
                        recurrence_source_task_id: None,
                        completion_tag: None,
                        last_delay_reason_code: None,
                        last_delay_reason_note: None,
                    },
                )
                .map_err(|error| format!("failed to create task from feishu command: {error}"))?;
                created_task_id = Some(task_id);
                action = "create_task".to_string();
                summary = format!("已创建{} #{}：{}", task_type, task_id, normalized_title);
            }
        }
    } else if lower.contains("完成任务") || lower.starts_with("完成 ") {
        action = "complete_task".to_string();
        let selector = normalized
            .replace("完成任务", "")
            .replace("完成", "")
            .trim()
            .to_string();
        if selector.is_empty() {
            success = false;
            error_code = Some("MISSING_TASK_SELECTOR".to_string());
            error_message = Some("请提供任务ID或任务标题关键词。".to_string());
            summary = "执行失败：缺少任务定位信息。".to_string();
        } else {
            let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
            let found = if let Ok(id) = selector.parse::<i64>() {
                tasks.into_iter().find(|item| item.id == id)
            } else {
                tasks
                    .into_iter()
                    .find(|item| item.title.contains(&selector) && item.status != "已完成")
            };
            if let Some(task) = found {
                let _ = db::update_task_status(&db_path, task.id, "已完成", Some("顺利完成"))
                    .map_err(|error| format!("failed to complete task: {error}"))?;
                created_task_id = Some(task.id);
                summary = format!("任务已完成：#{} {}", task.id, task.title);
            } else {
                success = false;
                error_code = Some("TASK_NOT_FOUND".to_string());
                error_message = Some("未找到匹配任务。".to_string());
                summary = "执行失败：任务不存在或已完成。".to_string();
            }
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "complete_task", "selector": selector }).to_string());
    } else if lower.contains("延期任务") || lower.contains("推迟任务") {
        action = "postpone_task".to_string();
        let date = detect_first_date_like(&normalized);
        let reason_text = normalized
            .split("原因")
            .nth(1)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let selector_base = normalized
            .replace("延期任务", "")
            .replace("推迟任务", "")
            .replace("到", "")
            .replace("原因", "")
            .trim()
            .to_string();
        let selector = if let Some(d) = date.as_ref() {
            selector_base.replace(d, "").trim().to_string()
        } else {
            selector_base
        };
        if selector.is_empty() || date.is_none() {
            success = false;
            error_code = Some("MISSING_POSTPONE_PARAMS".to_string());
            error_message = Some("延期任务需包含任务定位与日期，例如：延期任务 GRE阅读 到 2026-04-08 原因 精力不足".to_string());
            summary = "执行失败：延期参数不完整。".to_string();
        } else {
            let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
            let found = if let Ok(id) = selector.parse::<i64>() {
                tasks.into_iter().find(|item| item.id == id)
            } else {
                tasks.into_iter().find(|item| item.title.contains(&selector))
            };
            if let Some(task) = found {
                db::postpone_task(
                    &db_path,
                    &PostponeTaskInput {
                        task_id: task.id,
                        new_scheduled_date: date.clone(),
                        new_deadline: date.clone(),
                        new_time_start: task.time_start.clone(),
                        new_time_end: task.time_end.clone(),
                        reason_code: parse_delay_reason_code(reason_text.as_deref().unwrap_or_default()),
                        reason_note: reason_text.clone(),
                    },
                )
                .map_err(|error| format!("failed to postpone task: {error}"))?;
                created_task_id = Some(task.id);
                summary = format!("任务已延期：#{} {} -> {}", task.id, task.title, date.clone().unwrap_or_default());
            } else {
                success = false;
                error_code = Some("TASK_NOT_FOUND".to_string());
                error_message = Some("未找到待延期任务。".to_string());
                summary = "执行失败：任务不存在。".to_string();
            }
        }
        parsed_payload_json = Some(
            serde_json::json!({ "intent": "postpone_task", "selector": selector, "date": date, "reason": reason_text }).to_string(),
        );
    } else if lower.contains("提醒任务") {
        action = "set_task_reminder".to_string();
        let selector = normalized.replace("提醒任务", "").trim().to_string();
        if selector.is_empty() {
            success = false;
            error_code = Some("MISSING_TASK_SELECTOR".to_string());
            error_message = Some("请提供任务ID或标题关键词。".to_string());
            summary = "执行失败：缺少任务定位信息。".to_string();
        } else {
            let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
            let found = if let Ok(id) = selector.parse::<i64>() {
                tasks.into_iter().find(|item| item.id == id)
            } else {
                tasks.into_iter().find(|item| item.title.contains(&selector))
            };
            if let Some(task) = found {
                let mut update = task_to_update_input(&task);
                update.reminder_at = Some((Local::now() + chrono::Duration::hours(1)).to_rfc3339());
                db::update_task(&db_path, &update)
                    .map_err(|error| format!("failed to set reminder: {error}"))?;
                created_task_id = Some(task.id);
                summary = format!("已为任务 #{} 设置1小时后提醒。", task.id);
            } else {
                success = false;
                error_code = Some("TASK_NOT_FOUND".to_string());
                error_message = Some("未找到任务。".to_string());
                summary = "执行失败：任务不存在。".to_string();
            }
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "set_task_reminder", "selector": selector }).to_string());
    } else if lower.contains("更新项目") && lower.contains("状态") {
        action = "update_project_status".to_string();
        let statuses = ["未开始", "材料准备中", "已递交", "录取", "拒信", "进行中", "完成"];
        let matched_status = statuses.iter().find(|s| normalized.contains(**s)).map(|s| s.to_string());
        let selector = normalized
            .replace("更新项目", "")
            .replace("项目状态", "")
            .replace("状态", "")
            .replace(matched_status.as_deref().unwrap_or_default(), "")
            .trim()
            .to_string();
        if selector.is_empty() || matched_status.is_none() {
            success = false;
            error_code = Some("MISSING_PROJECT_PARAMS".to_string());
            error_message = Some("示例：更新项目 IC CS 状态 材料准备中".to_string());
            summary = "执行失败：项目状态更新参数不完整。".to_string();
        } else {
            let projects = db::list_projects(&db_path).map_err(|error| format!("failed to list projects: {error}"))?;
            let found = if let Ok(id) = selector.parse::<i64>() {
                projects.into_iter().find(|item| item.id == id)
            } else {
                projects
                    .into_iter()
                    .find(|item| item.school_name.contains(&selector) || item.program_name.contains(&selector))
            };
            if let Some(project) = found {
                db::update_project(
                    &db_path,
                    &UpdateProjectInput {
                        id: project.id,
                        school_name: project.school_name.clone(),
                        program_name: project.program_name.clone(),
                        country: project.country.clone(),
                        degree_type: project.degree_type.clone(),
                        intake_term: project.intake_term.clone(),
                        application_round: project.application_round.clone(),
                        deadline: project.deadline.clone(),
                        status: matched_status.clone().unwrap_or_else(|| "进行中".to_string()),
                        priority: project.priority.clone(),
                        official_url: project.official_url.clone(),
                        chinese_name: project.chinese_name.clone(),
                        country_color: project.country_color.clone(),
                        requirement_url: project.requirement_url.clone(),
                        essay_url: project.essay_url.clone(),
                        recommendation_url: project.recommendation_url.clone(),
                        notes: project.notes.clone(),
                    },
                )
                .map_err(|error| format!("failed to update project status: {error}"))?;
                matched_project_ids = vec![project.id];
                summary = format!(
                    "项目状态已更新：{} · {} -> {}",
                    project.school_name,
                    project.program_name,
                    matched_status.clone().unwrap_or_default()
                );
            } else {
                success = false;
                error_code = Some("PROJECT_NOT_FOUND".to_string());
                error_message = Some("未找到匹配项目。".to_string());
                summary = "执行失败：项目不存在。".to_string();
            }
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "update_project_status", "selector": selector, "status": matched_status }).to_string());
    } else if lower.contains("记录错题") {
        action = "create_mistake_note".to_string();
        let content = normalized.replace("记录错题", "").trim().to_string();
        if content.is_empty() {
            success = false;
            error_code = Some("MISSING_MISTAKE_CONTENT".to_string());
            error_message = Some("示例：记录错题 GRE 阅读 长难句定位错误".to_string());
            summary = "执行失败：错题内容为空。".to_string();
        } else {
            let exam_type = if lower.contains("ielts") || normalized.contains("雅思") {
                "IELTS"
            } else if lower.contains("toefl") || normalized.contains("托福") {
                "TOEFL"
            } else {
                "GRE"
            };
            let subject = if normalized.contains("阅读") {
                "阅读"
            } else if normalized.contains("听力") {
                "听力"
            } else if normalized.contains("数学") {
                "数学"
            } else if normalized.contains("写作") {
                "写作"
            } else {
                "综合"
            };
            let note_id = db::create_mistake_note(
                &db_path,
                &NewMistakeNoteInput {
                    exam_type: exam_type.to_string(),
                    subject: subject.to_string(),
                    topic: None,
                    question_source: Some("飞书指令".to_string()),
                    mistake_reason: Some(content.clone()),
                    correct_method: None,
                    review_date: None,
                    linked_file_id: None,
                },
            )
            .map_err(|error| format!("failed to create mistake note: {error}"))?;
            summary = format!("已记录错题 #{}：{} {}", note_id, exam_type, subject);
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "create_mistake_note", "content": content }).to_string());
    } else if lower.contains("写日记") || lower.starts_with("日记") {
        action = "create_journal_entry".to_string();
        let content = normalized.replace("写日记", "").replace("日记", "").trim().to_string();
        if content.is_empty() {
            success = false;
            error_code = Some("MISSING_JOURNAL_CONTENT".to_string());
            error_message = Some("示例：写日记 今天GRE阅读状态不错".to_string());
            summary = "执行失败：日记内容为空。".to_string();
        } else {
            let entry_id = db::create_journal_entry(
                &db_path,
                &NewJournalEntryInput {
                    entry_type: "日记".to_string(),
                    title: Some("飞书速记".to_string()),
                    content: content.clone(),
                    mood_score: None,
                    energy_score: None,
                },
            )
            .map_err(|error| format!("failed to create journal entry: {error}"))?;
            summary = format!("已记录日记 #{}。", entry_id);
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "create_journal_entry" }).to_string());
    } else if lower.contains("记录灵感") || lower.starts_with("灵感") {
        action = "create_idea_note".to_string();
        let content = normalized.replace("记录灵感", "").replace("灵感", "").trim().to_string();
        if content.is_empty() {
            success = false;
            error_code = Some("MISSING_IDEA_CONTENT".to_string());
            error_message = Some("示例：记录灵感 PS开头改成问题驱动".to_string());
            summary = "执行失败：灵感内容为空。".to_string();
        } else {
            let idea_id = db::create_idea_note(
                &db_path,
                &NewIdeaNoteInput {
                    title: Some("飞书灵感".to_string()),
                    content: content.clone(),
                    tags_json: None,
                    source: Some("feishu".to_string()),
                },
            )
            .map_err(|error| format!("failed to create idea note: {error}"))?;
            summary = format!("已记录灵感 #{}。", idea_id);
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "create_idea_note" }).to_string());
    } else if lower.contains("打卡") {
        action = "habit_checkin".to_string();
        let raw = normalized.replace("习惯打卡", "").replace("打卡", "").trim().to_string();
        let mut parts = raw.split_whitespace().collect::<Vec<_>>();
        if parts.is_empty() {
            success = false;
            error_code = Some("MISSING_HABIT_TITLE".to_string());
            error_message = Some("示例：打卡 背单词 120".to_string());
            summary = "执行失败：缺少习惯名称。".to_string();
        } else {
            let habit_title = parts.remove(0).to_string();
            let value = parse_first_number(&raw).or(Some(1));
            let habits = db::list_habits(&db_path).map_err(|error| format!("failed to list habits: {error}"))?;
            let habit_id = if let Some(item) = habits.into_iter().find(|h| h.title == habit_title || h.title.contains(&habit_title)) {
                item.id
            } else {
                db::create_habit(
                    &db_path,
                    &NewHabitInput {
                        title: habit_title.clone(),
                        category: Some("飞书".to_string()),
                        frequency: Some("daily".to_string()),
                        target_value: None,
                        unit: None,
                    },
                )
                .map_err(|error| format!("failed to create habit: {error}"))?
            };
            let log_id = db::create_habit_log(
                &db_path,
                &NewHabitLogInput {
                    habit_id,
                    value,
                    log_date: today.clone(),
                    note: Some(format!("飞书打卡：{}", normalized)),
                },
            )
            .map_err(|error| format!("failed to create habit log: {error}"))?;
            summary = format!("已完成习惯打卡：{}（log #{log_id}）", habit_title);
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "habit_checkin", "raw": raw }).to_string());
    } else if lower.contains("今日计划") || lower.contains("今天做什么") {
        let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
        let today_tasks = tasks
            .iter()
            .filter(|item| item.status != "已完成")
            .filter(|item| {
                let scheduled = item.scheduled_date.as_deref().unwrap_or("");
                let deadline = item.deadline.as_deref().unwrap_or("");
                scheduled.starts_with(&today) || deadline.starts_with(&today)
            })
            .take(6)
            .map(|item| format!("{}（{}）", item.title, item.priority))
            .collect::<Vec<_>>();
        action = "query_today_plan".to_string();
        if today_tasks.is_empty() {
            summary = "今日暂无未完成任务。".to_string();
        } else {
            summary = format!("今日建议优先处理：{}", today_tasks.join("；"));
        }
        parsed_payload_json = Some(serde_json::json!({ "intent": "query_today_plan" }).to_string());
    } else if lower.contains("项目状态") || lower.contains("查询项目") || lower.contains("申请状态") {
        let projects = db::list_projects(&db_path).map_err(|error| format!("failed to list projects: {error}"))?;
        let keyword = text
            .replace("查询项目", "")
            .replace("项目状态", "")
            .replace("申请状态", "")
            .trim()
            .to_string();
        let matched = if keyword.is_empty() {
            projects.into_iter().take(5).collect::<Vec<_>>()
        } else {
            projects
                .into_iter()
                .filter(|item| item.school_name.contains(&keyword) || item.program_name.contains(&keyword))
                .collect::<Vec<_>>()
        };
        action = "query_project_status".to_string();
        if matched.is_empty() {
            summary = "没有匹配到项目。".to_string();
        } else {
            matched_project_ids = matched.iter().map(|item| item.id).collect();
            let lines = matched
                .iter()
                .take(5)
                .map(|item| format!("{}·{}：{}（DDL {}）", item.school_name, item.program_name, item.status, item.deadline.clone().unwrap_or_else(|| "未填".to_string())))
                .collect::<Vec<_>>();
            summary = lines.join("；");
        }
        parsed_payload_json = Some(
            serde_json::json!({ "intent": "query_project_status", "matchedProjectIds": matched_project_ids }).to_string(),
        );
    } else if lower.contains("番茄钟") || lower.contains("专注") {
        let minutes = parse_first_number(&text).unwrap_or(25).clamp(10, 120);
        let session_id = db::start_pomodoro_session(&db_path, None, minutes, 5)
            .map_err(|error| format!("failed to start pomodoro from feishu command: {error}"))?;
        action = "start_pomodoro".to_string();
        created_session_id = Some(session_id);
        summary = format!("已开启 {} 分钟番茄钟（session #{session_id}）。", minutes);
        parsed_payload_json = Some(serde_json::json!({ "intent": "start_pomodoro", "minutes": minutes }).to_string());
    } else if lower.contains("ai") || lower.contains("摘要") {
        action = "ai_digest".to_string();
        let provider = db::get_app_setting(&db_path, "ai_provider")
            .map_err(|error| format!("failed to read ai provider: {error}"))?
            .unwrap_or_default();
        let gemini_key = get_secret_optional(&db_path, keys::GEMINI_API_KEY)?
            .unwrap_or_default();
        if provider.trim().is_empty() || (provider.trim().eq_ignore_ascii_case("gemini") && gemini_key.trim().is_empty()) {
            success = false;
            error_code = Some("PROVIDER_NOT_CONFIGURED".to_string());
            error_message = Some("AI provider 或 API Key 未配置。".to_string());
            summary = "执行失败：AI provider 未配置。".to_string();
        } else {
            summary = "AI provider 已配置，可在 AI 页面生成摘要。".to_string();
        }
    } else if lower.contains("数学错题本") || lower.contains("打开错题本") {
        action = "open_math_notebook".to_string();
        let result = start_math_error_notebook();
        match result {
            Ok(payload) => {
                summary = payload.summary;
            }
            Err(error) => {
                success = false;
                error_code = Some("LOCAL_SERVICE_UNAVAILABLE".to_string());
                error_message = Some(error.clone());
                summary = "执行失败：本地服务不可用。".to_string();
            }
        }
    } else if let Some((nl_title, nl_date, nl_time_start, nl_deadline)) =
        extract_natural_task_command(&normalized, Local::now().date_naive())
    {
        action = "create_task_nl".to_string();
        let task_type = infer_task_type_from_text(&normalized, nl_time_start.as_deref());
        parsed_payload_json = Some(
            serde_json::json!({
                "intent": "create_task_nl",
                "title": nl_title,
                "taskType": task_type,
                "scheduledDate": nl_date,
                "timeStart": nl_time_start,
                "deadline": nl_deadline
            })
            .to_string(),
        );
        let task_id = db::create_task(
            &db_path,
            &NewTaskInput {
                title: nl_title.clone(),
                description: Some(format!("来源：飞书自然语言\n原文：{}", normalized)),
                source_type: Some("feishu_command".to_string()),
                source_id: None,
                task_type: task_type.clone(),
                priority: if lower.contains("紧急") || lower.contains("马上") {
                    "高".to_string()
                } else {
                    "中".to_string()
                },
                status: "未开始".to_string(),
                estimated_minutes: parse_first_number(&normalized).or(Some(60)),
                scheduled_date: nl_date.clone().or(Some(today.clone())),
                time_start: nl_time_start,
                time_end: None,
                reminder_at: None,
                deadline: nl_deadline.clone().or_else(|| nl_date.clone()).or(Some(today.clone())),
                parent_task_id: None,
                recurrence_enabled: Some(false),
                recurrence_type: None,
                recurrence_interval: None,
                recurrence_days_of_week: None,
                recurrence_day_of_month: None,
                recurrence_until: None,
                recurrence_source_task_id: None,
                completion_tag: None,
                last_delay_reason_code: None,
                last_delay_reason_note: None,
            },
        )
        .map_err(|error| format!("failed to create natural task from feishu command: {error}"))?;
        let _ = sync_task_to_feishu_calendar(&db_path, task_id);
        created_task_id = Some(task_id);
        summary = format!(
            "已按自然语言创建{} #{}：{}{}{}",
            task_type,
            task_id,
            nl_title,
            nl_date
                .as_ref()
                .map(|d| format!(" · 日期 {d}"))
                .unwrap_or_default(),
            nl_deadline
                .as_ref()
                .map(|d| format!(" · DDL {d}"))
                .unwrap_or_default()
        );
    } else {
        success = false;
        error_code = Some("UNRECOGNIZED_COMMAND".to_string());
        error_message = Some(
            "未识别命令。可用示例：新增任务 XXX / 查询今日计划 / 查询项目状态 / 开启番茄钟 25".to_string(),
        );
        summary = "执行失败：未识别命令。".to_string();
    }

    let related_id = created_task_id.or(created_session_id);
    let status_text = if success { "sent" } else { "failed" };
    let sent_at = if success { Some(Utc::now().to_rfc3339()) } else { None };
    let _ = db::create_notification(
        &db_path,
        "feishu",
        "飞书指令执行",
        &format!(
            "指令：{}\n动作：{}\n结果：{}\n状态：{}{}",
            normalized,
            action,
            summary,
            if success { "成功" } else { "失败" },
            error_message
                .as_ref()
                .map(|v| format!("\n原因：{v}"))
                .unwrap_or_default()
        ),
        Some("feishu_command"),
        related_id,
        status_text,
        sent_at.as_deref(),
    );
    if let Some(id) = log_id {
        let _ = db::update_feishu_message_log(
            &db_path,
            id,
            Some(&action),
            parsed_payload_json.as_deref(),
            if success { "success" } else { "failed" },
            error_code.as_deref(),
            error_message.as_deref(),
            Some(false),
            Some(false),
            created_task_id,
            created_session_id,
            None,
            Some(started_at.elapsed().as_millis() as i64),
        );
    }
    let _ = db::create_ai_log(
        &db_path,
        &NewAiLogInput {
            module_name: "feishu".to_string(),
            action_name: action.clone(),
            model_name: Some("router-v1".to_string()),
            provider_name: Some("local".to_string()),
            input_tokens: rough_token_count(&normalized),
            output_tokens: rough_token_count(&summary),
            estimated_cost: (rough_token_count(&normalized) + rough_token_count(&summary)) as f64 * 0.0000003_f64,
            latency_ms: Some(20),
            success,
        },
    );
    Ok(FeishuCommandPayload {
        command: normalized,
        success,
        action,
        summary,
        error_code,
        error_message,
        log_id,
        high_risk_required,
        high_risk_confirmed,
        created_task_id,
        created_session_id,
        matched_project_ids,
    })
}

#[tauri::command]
fn list_feishu_message_logs(
    app: tauri::AppHandle,
    payload: Option<FeishuMessageLogQueryInput>,
) -> Result<Vec<db::FeishuMessageLogRecord>, String> {
    let db_path = get_database_path(&app)?;
    let query = payload.unwrap_or(FeishuMessageLogQueryInput {
        direction: None,
        execution_status: None,
        limit: Some(80),
    });
    db::list_feishu_message_logs(&db_path, &query)
        .map_err(|error| format!("failed to list feishu message logs: {error}"))
}

#[tauri::command]
fn retry_failed_feishu_messages(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<FeishuRetryPayload, String> {
    let db_path = get_database_path(&app)?;
    let rows = db::list_feishu_message_logs(
        &db_path,
        &FeishuMessageLogQueryInput {
            direction: Some("outbound".to_string()),
            execution_status: Some("failed".to_string()),
            limit: Some(limit.unwrap_or(12).clamp(1, 50)),
        },
    )
    .map_err(|error| format!("failed to load failed feishu logs: {error}"))?;
    if rows.is_empty() {
        return Ok(FeishuRetryPayload {
            attempted: 0,
            succeeded: 0,
            failed: 0,
            summary: "当前没有可重试的飞书失败记录。".to_string(),
            retried_log_ids: Vec::new(),
        });
    }
    let mut succeeded = 0_i64;
    let mut failed = 0_i64;
    let mut retried_log_ids = Vec::new();
    for item in rows.iter() {
        match retry_single_feishu_delivery(&db_path, item) {
            Ok(()) => {
                succeeded += 1;
                retried_log_ids.push(item.id);
            }
            Err(error) => {
                failed += 1;
                let _ = db::create_notification(
                    &db_path,
                    "feishu",
                    "飞书失败补偿未成功",
                    &format!("日志 #{} 重试失败：{}", item.id, error),
                    Some("feishu_delivery"),
                    None,
                    "failed",
                    None,
                );
            }
        }
    }
    Ok(FeishuRetryPayload {
        attempted: rows.len() as i64,
        succeeded,
        failed,
        summary: if failed > 0 {
            format!("已尝试重试 {} 条飞书失败消息：成功 {} 条，失败 {} 条。", rows.len(), succeeded, failed)
        } else {
            format!("已成功重试 {} 条飞书失败消息。", succeeded)
        },
        retried_log_ids,
    })
}

#[tauri::command]
fn generate_task_suggestions_from_notifications(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<NotificationSuggestionBatchPayload, String> {
    let db_path = get_database_path(&app)?;
    generate_task_suggestions_from_notifications_with_db(&db_path, limit.unwrap_or(30))
}

fn notification_task_match_score(task: &db::Task, notification: &db::NotificationRecord) -> i64 {
    let task_text = format!(
        "{} {}",
        task.title.to_lowercase(),
        task.description.clone().unwrap_or_default().to_lowercase()
    );
    let title = notification.title.to_lowercase();
    let content = notification.content.to_lowercase();
    let short_title = title.chars().take(10).collect::<String>();
    let direct_hit = (!title.is_empty() && task_text.contains(&title))
        || (!short_title.is_empty() && short_title.chars().count() >= 4 && task_text.contains(&short_title));
    let content_hit = content
        .split(|ch: char| !ch.is_alphanumeric() && !('\u{4e00}' <= ch && ch <= '\u{9fff}'))
        .filter(|token| token.chars().count() >= 4)
        .take(6)
        .any(|token| task_text.contains(token));
    if direct_hit {
        4
    } else if content_hit {
        2
    } else {
        0
    }
}

fn task_urgency_score(task: &db::Task, today: chrono::NaiveDate) -> i64 {
    let mut score = match task.priority.as_str() {
        "高" => 4,
        "中" => 2,
        _ => 1,
    };
    if let Some(deadline) = task.deadline.as_deref().and_then(parse_yyyy_mm_dd) {
        let days = deadline.signed_duration_since(today).num_days();
        if days <= 0 {
            score += 6;
        } else if days <= 2 {
            score += 5;
        } else if days <= 7 {
            score += 3;
        }
    }
    if task.scheduled_date.as_deref().and_then(parse_yyyy_mm_dd) == Some(today) {
        score += 2;
    }
    score
}

#[tauri::command]
fn rebalance_task_priority_from_notifications(
    app: tauri::AppHandle,
    limit: Option<i64>,
) -> Result<NotificationPriorityRebalancePayload, String> {
    let db_path = get_database_path(&app)?;
    let rows = db::list_notifications_with_filters(
        &db_path,
        &NotificationQueryInput {
            source_types: None,
            priorities: Some(vec!["critical".to_string(), "warning".to_string()]),
            unread_only: Some(true),
            include_ignored: Some(false),
            include_snoozed: Some(false),
            start_at: None,
            end_at: None,
            limit: Some(limit.unwrap_or(60).clamp(1, 200)),
        },
    )
    .map_err(|error| format!("failed to list notifications for rebalance: {error}"))?;
    let today = Local::now().date_naive();
    let tasks = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let candidates = tasks
        .into_iter()
        .filter(|task| task.status != "已完成")
        .collect::<Vec<_>>();
    if rows.is_empty() || candidates.is_empty() {
        return Ok(NotificationPriorityRebalancePayload {
            scanned_notifications: rows.len() as i64,
            candidate_tasks: candidates.len() as i64,
            promoted_high: 0,
            promoted_medium: 0,
            touched_task_ids: vec![],
            summary: "当前没有可用于优先级重排的通知或任务。".to_string(),
        });
    }
    let mut scored = candidates
        .iter()
        .map(|task| {
            let mut score = task_urgency_score(task, today);
            for item in &rows {
                let match_score = notification_task_match_score(task, item);
                let priority_boost = if item.priority == "critical" { 4 } else { 2 };
                score += match_score * priority_boost;
            }
            (task.id, task.priority.clone(), score)
        })
        .collect::<Vec<_>>();
    scored.sort_by(|a, b| b.2.cmp(&a.2));

    let mut promoted_high = 0_i64;
    let mut promoted_medium = 0_i64;
    let mut touched_task_ids: Vec<i64> = Vec::new();
    for (index, (task_id, current_priority, _score)) in scored.iter().enumerate() {
        let target_priority = if index < 3 {
            Some("高")
        } else if index < 7 {
            Some("中")
        } else {
            None
        };
        let Some(target) = target_priority else {
            continue;
        };
        if current_priority == target {
            continue;
        }
        if current_priority == "高" {
            continue;
        }
        db::update_task_priority(&db_path, *task_id, target)
            .map_err(|error| format!("failed to update task priority: {error}"))?;
        let detail = serde_json::json!({
            "fromPriority": current_priority,
            "toPriority": target,
            "reason": "notification_rebalance"
        })
        .to_string();
        let _ = db::create_task_event_log(
            &db_path,
            *task_id,
            "priority_rebalance",
            Some(detail.as_str()),
            Some("notification_rebalance"),
            Some("基于未读关键通知自动重排建议"),
        );
        touched_task_ids.push(*task_id);
        if target == "高" {
            promoted_high += 1;
        } else {
            promoted_medium += 1;
        }
    }
    Ok(NotificationPriorityRebalancePayload {
        scanned_notifications: rows.len() as i64,
        candidate_tasks: candidates.len() as i64,
        promoted_high,
        promoted_medium,
        touched_task_ids: touched_task_ids.clone(),
        summary: if touched_task_ids.is_empty() {
            format!(
                "已评估 {} 条关键通知与 {} 条任务，当前无需调整优先级。",
                rows.len(),
                candidates.len()
            )
        } else {
            format!(
                "已评估 {} 条关键通知，重排 {} 条任务优先级（高 {} / 中 {}）。",
                rows.len(),
                touched_task_ids.len(),
                promoted_high,
                promoted_medium
            )
        },
    })
}

fn split_feishu_command_steps(command: &str) -> Vec<String> {
    command
        .replace("；", ";")
        .replace("。", ".")
        .replace("，然后", ";然后")
        .replace("然后", ";然后")
        .replace("并且", ";并且")
        .replace("并 ", ";并 ")
        .replace('\n', ";")
        .split(';')
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(|item| {
            item.trim_start_matches("然后")
                .trim_start_matches("并且")
                .trim()
                .to_string()
        })
        .filter(|item| !item.is_empty())
        .collect::<Vec<_>>()
}

#[tauri::command]
fn execute_feishu_command_batch(
    app: tauri::AppHandle,
    command: String,
) -> Result<FeishuBatchPayload, String> {
    let steps = split_feishu_command_steps(command.trim());
    if steps.is_empty() {
        return Ok(FeishuBatchPayload {
            command,
            total_steps: 0,
            succeeded_steps: 0,
            failed_steps: 0,
            summary: "未识别到可执行步骤。".to_string(),
            results: Vec::new(),
        });
    }
    let mut results = Vec::new();
    let mut succeeded = 0_i64;
    let mut failed = 0_i64;
    for step in &steps {
        let result = execute_feishu_command(app.clone(), step.clone())?;
        if result.success {
            succeeded += 1;
        } else {
            failed += 1;
        }
        results.push(result);
    }
    Ok(FeishuBatchPayload {
        command,
        total_steps: steps.len() as i64,
        succeeded_steps: succeeded,
        failed_steps: failed,
        summary: format!("共 {} 步：成功 {}，失败 {}。", steps.len(), succeeded, failed),
        results,
    })
}

fn extract_feishu_webhook_text_and_meta(
    value: &serde_json::Value,
) -> (Option<String>, Option<String>, Option<String>) {
    if let Some(challenge) = value.get("challenge").and_then(|v| v.as_str()) {
        return (Some(challenge.to_string()), None, None);
    }
    let event_id = value
        .pointer("/header/event_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            value
                .pointer("/event_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });
    let message_id = value
        .pointer("/event/message/message_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            value
                .pointer("/event/message_id")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .or_else(|| event_id.clone());
    let raw_text = value
        .pointer("/event/text")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            value
                .pointer("/event/message/text")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        })
        .or_else(|| {
            value
                .pointer("/event/content")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        });
    if raw_text.is_some() {
        return (None, message_id, raw_text);
    }
    let content_text = value
        .pointer("/event/message/content")
        .and_then(|v| v.as_str())
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok())
        .and_then(|inner| extract_text_from_value(&inner));
    (None, message_id, content_text)
}

fn parse_simple_http_request(
    stream: &mut std::net::TcpStream,
) -> Result<(String, HashMap<String, String>, String), String> {
    use std::io::{Read, Write};
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| format!("set read timeout failed: {error}"))?;
    let mut buffer = Vec::new();
    let mut temp = [0_u8; 1024];
    loop {
        let read = stream
            .read(&mut temp)
            .map_err(|error| format!("read http request failed: {error}"))?;
        if read == 0 {
            break;
        }
        buffer.extend_from_slice(&temp[..read]);
        if buffer.windows(4).any(|w| w == b"\r\n\r\n") {
            break;
        }
        if buffer.len() > 1024 * 1024 {
            return Err("http headers too large".to_string());
        }
    }
    let header_end = buffer
        .windows(4)
        .position(|w| w == b"\r\n\r\n")
        .map(|idx| idx + 4)
        .ok_or_else(|| "invalid http request: header terminator missing".to_string())?;
    let header_text = String::from_utf8_lossy(&buffer[..header_end]).to_string();
    let mut lines = header_text.split("\r\n").filter(|line| !line.is_empty());
    let request_line = lines
        .next()
        .ok_or_else(|| "invalid http request: missing request line".to_string())?
        .to_string();
    let mut headers = HashMap::new();
    for line in lines {
        if let Some((k, v)) = line.split_once(':') {
            headers.insert(k.trim().to_ascii_lowercase(), v.trim().to_string());
        }
    }
    let content_length = headers
        .get("content-length")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(0);
    let mut body_bytes = buffer[header_end..].to_vec();
    while body_bytes.len() < content_length {
        let read = stream
            .read(&mut temp)
            .map_err(|error| format!("read http body failed: {error}"))?;
        if read == 0 {
            break;
        }
        body_bytes.extend_from_slice(&temp[..read]);
    }
    let body = String::from_utf8_lossy(&body_bytes[..content_length.min(body_bytes.len())]).to_string();
    let _ = stream.write_all(b"");
    Ok((request_line, headers, body))
}

fn write_simple_http_response(
    stream: &mut std::net::TcpStream,
    status: &str,
    body_json: &str,
) -> Result<(), String> {
    use std::io::Write;
    let response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body_json.as_bytes().len(),
        body_json
    );
    stream
        .write_all(response.as_bytes())
        .map_err(|error| format!("write http response failed: {error}"))
}

fn verify_inbound_webhook_security(
    db_path: &std::path::Path,
    headers: &HashMap<String, String>,
    body: &str,
) -> Result<(), String> {
    let token = db::get_app_setting(db_path, "feishu_local_webhook_verify_token")
        .map_err(|error| format!("failed to read webhook verify token: {error}"))?
        .unwrap_or_default();
    if !token.trim().is_empty() {
        let body_token = serde_json::from_str::<serde_json::Value>(body)
            .ok()
            .and_then(|v| v.get("token").and_then(|v| v.as_str()).map(|s| s.to_string()))
            .unwrap_or_default();
        let header_token = headers
            .get("x-feishu-token")
            .cloned()
            .unwrap_or_default();
        if body_token != token && header_token != token {
            return Err("webhook token 校验失败".to_string());
        }
    }
    let signature_secret = db::get_app_setting(db_path, "feishu_local_webhook_signature_secret")
        .map_err(|error| format!("failed to read webhook signature secret: {error}"))?
        .unwrap_or_default();
    if !signature_secret.trim().is_empty() {
        // Compatibility note:
        // - internal custom bridge: x-psa-timestamp + x-psa-signature
        // - Feishu official callbacks: x-lark-request-timestamp + x-lark-signature
        let has_psa_headers = headers.contains_key("x-psa-timestamp")
            || headers.contains_key("x-psa-signature");
        if has_psa_headers {
            let timestamp = headers
                .get("x-psa-timestamp")
                .cloned()
                .ok_or_else(|| "缺少 x-psa-timestamp".to_string())?;
            let signature = headers
                .get("x-psa-signature")
                .cloned()
                .ok_or_else(|| "缺少 x-psa-signature".to_string())?;
            let ts = timestamp
                .parse::<i64>()
                .map_err(|_| "x-psa-timestamp 非法".to_string())?;
            let now = Utc::now().timestamp();
            if (now - ts).abs() > 300 {
                return Err("签名时间戳已过期（>5分钟）".to_string());
            }
            let expected = stable_hash_hex(&format!("{}|{}|{}", signature_secret.trim(), timestamp, body));
            if signature.trim() != expected {
                return Err("签名校验失败".to_string());
            }
        } else if let Some(ts_raw) = headers
            .get("x-lark-request-timestamp")
            .or_else(|| headers.get("x-feishu-request-timestamp"))
        {
            let ts = ts_raw
                .parse::<i64>()
                .map_err(|_| "x-lark-request-timestamp 非法".to_string())?;
            let now = Utc::now().timestamp();
            if (now - ts).abs() > 3600 {
                return Err("飞书请求时间戳已过期（>60分钟）".to_string());
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn process_feishu_inbound_message(
    app: tauri::AppHandle,
    payload: FeishuInboundInput,
) -> Result<FeishuCommandPayload, String> {
    let db_path = get_database_path(&app)?;
    let source = payload
        .source
        .unwrap_or_else(|| "feishu_webhook".to_string());
    db::set_app_setting(&db_path, "feishu_command_source_once", &source)
        .map_err(|error| format!("failed to save source hint: {error}"))?;
    db::set_app_setting(
        &db_path,
        "feishu_command_message_id_once",
        payload.message_id.as_deref().unwrap_or(""),
    )
    .map_err(|error| format!("failed to save message id hint: {error}"))?;
    db::set_app_setting(
        &db_path,
        "feishu_high_risk_confirm_once",
        if payload.high_risk_confirmed.unwrap_or(false) {
            "true"
        } else {
            "false"
        },
    )
    .map_err(|error| format!("failed to save high risk hint: {error}"))?;
    execute_feishu_command(app, payload.raw_text)
}

#[tauri::command]
fn process_feishu_webhook_payload(
    app: tauri::AppHandle,
    raw_json: String,
) -> Result<FeishuWebhookPayload, String> {
    process_feishu_webhook_payload_impl(&app, raw_json)
}

fn process_feishu_webhook_payload_impl(
    app: &tauri::AppHandle,
    raw_json: String,
) -> Result<FeishuWebhookPayload, String> {
    let db_path = get_database_path(app)?;
    let parsed: serde_json::Value =
        serde_json::from_str(&raw_json).map_err(|error| format!("invalid webhook json: {error}"))?;
    let (challenge, message_id, extracted_text) = extract_feishu_webhook_text_and_meta(&parsed);
    if let Some(challenge_text) = challenge {
        return Ok(FeishuWebhookPayload {
            handled: true,
            challenge: Some(challenge_text),
            message_id,
            extracted_text: None,
            result: None,
            error_code: None,
            error_message: None,
        });
    }
    let Some(text) = extracted_text.clone() else {
        let _ = db::create_feishu_message_log(
            &db_path,
            "inbound",
            "feishu_webhook",
            message_id.as_deref(),
            &raw_json,
            None,
            Some("webhook_parse"),
            None,
            "failed",
            Some("UNSUPPORTED_WEBHOOK_PAYLOAD"),
            Some("未提取到可执行文本字段。"),
            None,
            false,
            false,
            false,
            None,
            None,
            None,
            None,
        );
        return Ok(FeishuWebhookPayload {
            handled: false,
            challenge: None,
            message_id,
            extracted_text: None,
            result: None,
            error_code: Some("UNSUPPORTED_WEBHOOK_PAYLOAD".to_string()),
            error_message: Some("未提取到可执行文本字段。".to_string()),
        });
    };
    let result = process_feishu_inbound_message(
        app.clone(),
        FeishuInboundInput {
            raw_text: text.clone(),
            source: Some("feishu_webhook".to_string()),
            message_id: message_id.clone(),
            high_risk_confirmed: Some(false),
        },
    )?;
    let _ = maybe_send_feishu_inbound_reply(&db_path, &result, message_id.as_deref());
    Ok(FeishuWebhookPayload {
        handled: true,
        challenge: None,
        message_id,
        extracted_text: Some(text),
        result: Some(result.clone()),
        error_code: result.error_code,
        error_message: result.error_message,
    })
}

pub fn handle_feishu_webhook_request(
    app: &tauri::AppHandle,
    headers: std::collections::HashMap<String, String>,
    body: String,
) -> Result<FeishuWebhookPayload, String> {
    let db_path = get_database_path(app)?;
    if let Err(error) = verify_inbound_webhook_security(&db_path, &headers, &body) {
        let _ = db::create_feishu_message_log(
            &db_path,
            "inbound",
            "feishu_webhook_http",
            headers.get("x-request-id").map(|s| s.as_str()),
            &body,
            None,
            Some("webhook_security"),
            None,
            "failed",
            Some("WEBHOOK_SECURITY_FAILED"),
            Some(&error),
            None,
            false,
            false,
            false,
            None,
            None,
            None,
            None,
        );
        return Err(error);
    }
    process_feishu_webhook_payload_impl(app, body)
}

#[tauri::command]
async fn reply_feishu_message(
    app: tauri::AppHandle,
    open_id: String,
    content: String,
) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let app_id = db::get_app_setting(&db_path, "feishu_app_id")
        .ok()
        .flatten()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| get_secret_optional(&db_path, keys::FEISHU_APP_ID).ok().flatten())
        .ok_or_else(|| "missing feishu_app_id".to_string())?;
    let app_secret = db::get_app_setting(&db_path, "feishu_app_secret")
        .ok()
        .flatten()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| get_secret_optional(&db_path, keys::FEISHU_APP_SECRET).ok().flatten())
        .ok_or_else(|| "missing feishu_app_secret".to_string())?;

    let token = feishu_tenant_access_token(app_id.trim(), app_secret.trim())?;
    let content_payload = serde_json::json!({ "text": content }).to_string();
    let body = serde_json::json!({
        "receive_id": open_id,
        "msg_type": "text",
        "content": content_payload
    })
    .to_string();

    let output = Command::new("curl")
        .args([
            "-sS",
            "-X",
            "POST",
            "-H",
            "Content-Type: application/json",
            "-H",
            &format!("Authorization: Bearer {token}"),
            "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
            "-d",
            &body,
        ])
        .output()
        .map_err(|error| format!("failed to send feishu message: {error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let response_text = String::from_utf8_lossy(&output.stdout).to_string();
    let value: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|error| format!("invalid feishu send response: {error}"))?;
    let code = value.get("code").and_then(|item| item.as_i64()).unwrap_or(-1);
    if code != 0 {
        let msg = value
            .get("msg")
            .and_then(|item| item.as_str())
            .unwrap_or("unknown feishu send error");
        return Err(format!("feishu send error: {msg}"));
    }
    Ok(())
}

fn try_auto_start_background_services(app: &tauri::AppHandle) {
    let Ok(db_path) = get_database_path(app) else {
        return;
    };

    let app_handle = app.clone();
    let _ = std::thread::Builder::new()
        .name("psa-feishu-retry-loop".to_string())
        .spawn(move || loop {
            let Ok(db_path) = get_database_path(&app_handle) else {
                std::thread::sleep(std::time::Duration::from_secs(15 * 60));
                continue;
            };
            let retry_enabled = db::get_app_setting(&db_path, "feishu_retry_loop_enabled")
                .ok()
                .flatten()
                .map(|raw| matches_true(Some(raw.as_str())))
                .unwrap_or(true);
            let retry_interval_minutes = db::get_app_setting(&db_path, "feishu_retry_interval_minutes")
                .ok()
                .flatten()
                .and_then(|raw| raw.trim().parse::<u64>().ok())
                .unwrap_or(15)
                .clamp(2, 180);
            let retry_batch_size = db::get_app_setting(&db_path, "feishu_retry_batch_size")
                .ok()
                .flatten()
                .and_then(|raw| raw.trim().parse::<usize>().ok())
                .unwrap_or(5)
                .clamp(1, 30);
            if !retry_enabled {
                std::thread::sleep(std::time::Duration::from_secs(retry_interval_minutes * 60));
                continue;
            }
            if let Ok(rows) = db::list_feishu_message_logs(
                &db_path,
                &FeishuMessageLogQueryInput {
                    direction: Some("outbound".to_string()),
                    execution_status: Some("failed".to_string()),
                    limit: Some((retry_batch_size as i64).clamp(1, 50)),
                },
            ) {
                for row in rows.iter().take(retry_batch_size) {
                    let _ = retry_single_feishu_delivery(&db_path, row);
                }
            }
            std::thread::sleep(std::time::Duration::from_secs(retry_interval_minutes * 60));
        });
}

#[tauri::command]
fn start_math_error_notebook() -> Result<MathNotebookPayload, String> {
    let home = std::env::var("HOME").map_err(|error| format!("failed to read HOME: {error}"))?;
    let dir = std::path::PathBuf::from(home).join("GRE_Error_Log");
    let app_file = dir.join("web_app.py");
    let url = "http://127.0.0.1:8514".to_string();
    if !dir.exists() || !app_file.exists() {
        return Err(format!(
            "未找到错题本目录或入口文件：{}",
            dir.display()
        ));
    }
    if is_http_url_ready(&url) {
        return Ok(MathNotebookPayload {
            started: false,
            running: true,
            url,
            summary: "数学错题本已在运行。".to_string(),
        });
    }
    let mut command = Command::new("python3");
    command
        .arg("-m")
        .arg("streamlit")
        .arg("run")
        .arg("web_app.py")
        .arg("--server.headless")
        .arg("true")
        .arg("--server.address")
        .arg("127.0.0.1")
        .arg("--server.port")
        .arg("8514")
        .current_dir(&dir)
        .env("PYTHONUNBUFFERED", "1");
    let spawn_result = command.spawn().map_err(|error| format!("failed to start streamlit: {error}"))?;
    let _pid = spawn_result.id();
    std::thread::sleep(std::time::Duration::from_millis(1400));
    let running = is_http_url_ready(&url);
    Ok(MathNotebookPayload {
        started: true,
        running,
        url: url.clone(),
        summary: if running {
            format!("数学错题本已启动：{}", url)
        } else {
            "已发起启动，请等待 2-5 秒后再次打开。".to_string()
        },
    })
}

#[tauri::command]
fn open_math_error_notebook() -> Result<MathNotebookPayload, String> {
    let started = start_math_error_notebook()?;
    let url = started.url.clone();
    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open").arg(&url).status();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("xdg-open").arg(&url).status();
    }
    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd").args(["/C", "start", "", &url]).status();
    }
    Ok(MathNotebookPayload {
        started: started.started,
        running: started.running,
        url: started.url,
        summary: if started.running {
            "已打开智能数学错题本。".to_string()
        } else {
            "已尝试打开，若未显示请稍后重试。".to_string()
        },
    })
}

#[tauri::command]
fn list_task_suggestions(
    app: tauri::AppHandle,
    status: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<db::TaskSuggestion>, String> {
    let db_path = get_database_path(&app)?;
    db::list_task_suggestions(&db_path, status.as_deref(), limit.unwrap_or(50).clamp(1, 300))
        .map_err(|error| format!("failed to list task suggestions: {error}"))
}

fn apply_task_suggestion_with_db(db_path: &Path, suggestion_id: i64) -> Result<SuggestionApplyPayload, String> {
    let suggestion = db::get_task_suggestion(db_path, suggestion_id)
        .map_err(|error| format!("failed to read task suggestion: {error}"))?
        .ok_or_else(|| "task suggestion not found".to_string())?;
    if suggestion.status != "pending" {
        return Err("该建议已处理，不能重复应用。".to_string());
    }
    let fallback_date = Local::now().format("%Y-%m-%d").to_string();
    let normalized_deadline = suggestion.suggested_deadline.clone().or(Some(fallback_date));
    let task_id = db::create_task(
        db_path,
        &NewTaskInput {
            title: suggestion.title.clone(),
            description: suggestion.description.clone(),
            source_type: Some("suggestion".to_string()),
            source_id: Some(suggestion.id),
            task_type: "官网更新".to_string(),
            priority: suggestion.priority.clone(),
            status: "未开始".to_string(),
            estimated_minutes: Some(45),
            scheduled_date: normalized_deadline.clone(),
            time_start: None,
            time_end: None,
            reminder_at: None,
            deadline: normalized_deadline,
            parent_task_id: None,
            recurrence_enabled: Some(false),
            recurrence_type: None,
            recurrence_interval: None,
            recurrence_days_of_week: None,
            recurrence_day_of_month: None,
            recurrence_until: None,
            recurrence_source_task_id: None,
            completion_tag: None,
            last_delay_reason_code: None,
            last_delay_reason_note: None,
        },
    )
    .map_err(|error| format!("failed to create task from suggestion: {error}"))?;
    if let Err(error) = sync_task_to_feishu_calendar(db_path, task_id) {
        let _ = db::set_app_setting(db_path, &make_task_sync_error_key(task_id), &error);
    }
    db::mark_task_suggestion_status(db_path, suggestion.id, "applied")
        .map_err(|error| format!("failed to mark suggestion status: {error}"))?;
    Ok(SuggestionApplyPayload {
        suggestion_id,
        task_id,
        summary: format!("建议 {} 已转为任务 {}", suggestion_id, task_id),
    })
}

#[tauri::command]
fn apply_task_suggestion(app: tauri::AppHandle, suggestion_id: i64) -> Result<SuggestionApplyPayload, String> {
    let db_path = get_database_path(&app)?;
    apply_task_suggestion_with_db(&db_path, suggestion_id)
}

#[tauri::command]
fn dismiss_task_suggestion(app: tauri::AppHandle, suggestion_id: i64) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    db::mark_task_suggestion_status(&db_path, suggestion_id, "dismissed")
        .map_err(|error| format!("failed to dismiss task suggestion: {error}"))
}

#[tauri::command]
fn send_feishu_test_message(app: tauri::AppHandle, content: Option<String>) -> Result<(), String> {
    let db_path = get_database_path(&app)?;
    let webhook = get_secret_optional(&db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();
    if webhook.trim().is_empty() {
        return Err("请先在设置中填写飞书机器人 Webhook URL。".to_string());
    }

    let text = content.unwrap_or_else(|| {
        format!(
            "Personal Secretary App 测试消息\n发送时间（UTC）: {}\n状态：飞书接入成功",
            Utc::now().to_rfc3339()
        )
    });
    let decorated = decorate_feishu_webhook_text(&db_path, &text)?;
    match send_feishu_webhook_message_with_dedupe(&db_path, &webhook, &decorated, "test") {
        Ok(_) => {
            db::create_notification(
                &db_path,
                "feishu",
                "飞书测试消息",
                &decorated,
                Some("integration"),
                None,
                "sent",
                Some(&Utc::now().to_rfc3339()),
            )
            .map_err(|error| format!("failed to record notification: {error}"))?;
            Ok(())
        }
        Err(error) => {
            let _ = db::create_notification(
                &db_path,
                "feishu",
                "飞书测试消息失败",
                &decorated,
                Some("integration"),
                None,
                "failed",
                None,
            );
            Err(error)
        }
    }
}

#[tauri::command]
fn run_deadline_notification_scan(app: tauri::AppHandle) -> Result<DeadlineScanPayload, String> {
    let db_path = get_database_path(&app)?;
    let lines = collect_deadline_lines(&db_path)?;
    let generated_count = lines.len() as i64;
    if lines.is_empty() {
        let summary = "当前没有需要提醒的近截止任务/项目。".to_string();
        db::create_notification(
            &db_path,
            "system",
            "DDL 扫描结果",
            &summary,
            Some("scan"),
            None,
            "sent",
            Some(&Utc::now().to_rfc3339()),
        )
        .map_err(|error| format!("failed to record notification: {error}"))?;
        return Ok(DeadlineScanPayload {
            pushed: false,
            sent_count: 0,
            failed_count: 0,
            generated_count: 0,
            summary,
        });
    }

    let title = format!("DDL 提醒（{} 条）", generated_count);
    let body = format!(
        "{title}\n{}\n生成时间：{}",
        lines.join("\n"),
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
    );
    let enabled = db::get_app_setting(&db_path, "feishu_enabled")
        .map_err(|error| format!("failed to read feishu enabled: {error}"))?
        .unwrap_or_else(|| "false".to_string());
    let webhook = get_secret_optional(&db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();

    let should_push = matches!(enabled.as_str(), "1" | "true" | "TRUE" | "True") && !webhook.trim().is_empty();
    if should_push {
        let decorated = decorate_feishu_webhook_text(&db_path, &body)?;
        match send_feishu_webhook_message_with_dedupe(&db_path, &webhook, &decorated, "deadline_scan") {
            Ok(_) => {
                db::create_notification(
                    &db_path,
                    "feishu",
                    &title,
                    &decorated,
                    Some("scan"),
                    None,
                    "sent",
                    Some(&Utc::now().to_rfc3339()),
                )
                .map_err(|error| format!("failed to record notification: {error}"))?;
                Ok(DeadlineScanPayload {
                    pushed: true,
                    sent_count: generated_count,
                    failed_count: 0,
                    generated_count,
                    summary: format!("已推送到飞书：{} 条提醒。", generated_count),
                })
            }
            Err(error) => {
                db::create_notification(
                    &db_path,
                    "feishu",
                    &title,
                    &decorated,
                    Some("scan"),
                    None,
                    "failed",
                    None,
                )
                .map_err(|record_error| format!("failed to record notification: {record_error}"))?;
                Ok(DeadlineScanPayload {
                    pushed: false,
                    sent_count: 0,
                    failed_count: generated_count,
                    generated_count,
                    summary: format!("推送失败：{error}"),
                })
            }
        }
    } else {
        db::create_notification(
            &db_path,
            "system",
            &title,
            &body,
            Some("scan"),
            None,
            "pending",
            None,
        )
        .map_err(|error| format!("failed to record notification: {error}"))?;
        Ok(DeadlineScanPayload {
            pushed: false,
            sent_count: 0,
            failed_count: 0,
            generated_count,
            summary: "已生成提醒记录（未推送：请检查飞书开关和 webhook）。".to_string(),
        })
    }
}

#[tauri::command]
fn run_scheduled_notification_tick(app: tauri::AppHandle) -> Result<SchedulerTickPayload, String> {
    let db_path = get_database_path(&app)?;
    let enabled = db::get_app_setting(&db_path, "feishu_auto_schedule_enabled")
        .map_err(|error| format!("failed to read scheduler setting: {error}"))?
        .unwrap_or_else(|| "true".to_string());
    let auto_enabled = matches!(enabled.as_str(), "1" | "true" | "TRUE" | "True");
    if !auto_enabled {
        return Ok(SchedulerTickPayload {
            executed: false,
            pushed: false,
            buffered: false,
            generated_count: 0,
            pending_count: 0,
            summary: "自动调度已关闭。".to_string(),
        });
    }

    let now = chrono::Local::now();
    let auto_suggestion_enabled = db::get_app_setting(&db_path, "notification_auto_task_suggestion_enabled")
        .map_err(|error| format!("failed to read notification auto suggestion setting: {error}"))?
        .map(|raw| matches_true(Some(raw.as_str())))
        .unwrap_or(true);
    let auto_rebalance_enabled = db::get_app_setting(&db_path, "notification_auto_priority_rebalance_enabled")
        .map_err(|error| format!("failed to read notification auto rebalance setting: {error}"))?
        .map(|raw| matches_true(Some(raw.as_str())))
        .unwrap_or(true);
    let auto_apply_top_suggestion_enabled =
        db::get_app_setting(&db_path, "notification_auto_apply_top_suggestion_enabled")
            .map_err(|error| format!("failed to read notification auto apply setting: {error}"))?
            .map(|raw| matches_true(Some(raw.as_str())))
            .unwrap_or(false);
    let auto_suggestion_note = if auto_suggestion_enabled {
        match generate_task_suggestions_from_notifications_with_db(&db_path, 20) {
            Ok(batch) if batch.created > 0 => Some(format!("并自动生成 {} 条通知建议任务。", batch.created)),
            Ok(_) => None,
            Err(error) => {
                let _ = db::create_notification(
                    &db_path,
                    "system",
                    "通知建议任务自动编排失败",
                    &error,
                    Some("notification"),
                    None,
                    "failed",
                    None,
                );
                Some("通知建议任务自动编排失败（可在设置中手动执行）。".to_string())
            }
        }
    } else {
        None
    };
    let auto_rebalance_note = if auto_rebalance_enabled {
        match rebalance_task_priority_from_notifications(app.clone(), Some(80)) {
            Ok(result) if !result.touched_task_ids.is_empty() => {
                Some(format!("并自动重排 {} 条任务优先级。", result.touched_task_ids.len()))
            }
            Ok(_) => None,
            Err(error) => {
                let _ = db::create_notification(
                    &db_path,
                    "system",
                    "通知优先级自动重排失败",
                    &error,
                    Some("notification"),
                    None,
                    "failed",
                    None,
                );
                Some("通知优先级自动重排失败（可在设置中手动执行）。".to_string())
            }
        }
    } else {
        None
    };
    let auto_apply_top_note = if auto_apply_top_suggestion_enabled {
        match db::list_task_suggestions(&db_path, Some("pending"), 1) {
            Ok(rows) if rows.is_empty() => None,
            Ok(rows) => match apply_task_suggestion_with_db(&db_path, rows[0].id) {
                Ok(payload) => Some(format!("并自动应用首条建议（任务 {}）。", payload.task_id)),
                Err(error) => {
                    let _ = db::create_notification(
                        &db_path,
                        "system",
                        "通知建议自动应用失败",
                        &error,
                        Some("notification"),
                        None,
                        "failed",
                        None,
                    );
                    Some("通知建议自动应用失败（可在建议池手动应用）。".to_string())
                }
            },
            Err(error) => {
                let _ = db::create_notification(
                    &db_path,
                    "system",
                    "读取通知建议失败",
                    &error.to_string(),
                    Some("notification"),
                    None,
                    "failed",
                    None,
                );
                Some("通知建议读取失败（可在建议池手动刷新）。".to_string())
            }
        }
    } else {
        None
    };
    let auto_policy_note = format!(
        "{}{}{}",
        auto_suggestion_note.clone().unwrap_or_default(),
        auto_rebalance_note.clone().unwrap_or_default(),
        auto_apply_top_note.clone().unwrap_or_default()
    );
    let last_scan = db::get_app_setting(&db_path, "notification_last_scan_at")
        .map_err(|error| format!("failed to read last scan time: {error}"))?
        .and_then(|raw| chrono::DateTime::parse_from_rfc3339(&raw).ok())
        .map(|dt| dt.with_timezone(&chrono::Local));
    let due = last_scan
        .map(|time| now.signed_duration_since(time).num_hours() >= 8)
        .unwrap_or(true);
    if !due {
        return Ok(SchedulerTickPayload {
            executed: false,
            pushed: false,
            buffered: false,
            generated_count: 0,
            pending_count: 0,
            summary: "未到下一次 8 小时扫描窗口。".to_string(),
        });
    }

    db::set_app_setting(&db_path, "notification_last_scan_at", &now.to_rfc3339())
        .map_err(|error| format!("failed to write last scan time: {error}"))?;

    let new_lines = collect_deadline_lines(&db_path)?;
    let pending_lines: Vec<String> = db::get_app_setting(&db_path, "notification_pending_lines")
        .map_err(|error| format!("failed to read pending lines: {error}"))?
        .and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok())
        .unwrap_or_default();

    let mut merged = pending_lines;
    merged.extend(new_lines.clone());
    merged.sort();
    merged.dedup();

    let hour = now.hour();
    let in_quiet_window = hour >= 23 || hour < 7;
    if in_quiet_window {
        let serialized = serde_json::to_string(&merged)
            .map_err(|error| format!("failed to serialize pending lines: {error}"))?;
        db::set_app_setting(&db_path, "notification_pending_lines", &serialized)
            .map_err(|error| format!("failed to save pending lines: {error}"))?;
        return Ok(SchedulerTickPayload {
            executed: true,
            pushed: false,
            buffered: true,
            generated_count: new_lines.len() as i64,
            pending_count: merged.len() as i64,
            summary: format!(
                "夜间静默窗口，提醒已缓存，将在 07:00 后统一推送。{}",
                auto_policy_note.clone()
            )
            .trim()
            .to_string(),
        });
    }

    if merged.is_empty() {
        db::set_app_setting(&db_path, "notification_pending_lines", "[]")
            .map_err(|error| format!("failed to clear pending lines: {error}"))?;
        return Ok(SchedulerTickPayload {
            executed: true,
            pushed: false,
            buffered: false,
            generated_count: 0,
            pending_count: 0,
            summary: format!(
                "本轮扫描无需要推送的提醒。{}",
                auto_policy_note.clone()
            )
            .trim()
            .to_string(),
        });
    }

    let feishu_enabled = db::get_app_setting(&db_path, "feishu_enabled")
        .map_err(|error| format!("failed to read feishu enabled: {error}"))?
        .unwrap_or_else(|| "false".to_string());
    let webhook = get_secret_optional(&db_path, keys::FEISHU_WEBHOOK_URL)?
        .unwrap_or_default();
    let can_push = matches!(feishu_enabled.as_str(), "1" | "true" | "TRUE" | "True")
        && !webhook.trim().is_empty();

    let title = format!("定时 DDL 提醒（{} 条）", merged.len());
    let body = format!(
        "{title}\n{}\n生成时间：{}",
        merged.join("\n"),
        now.format("%Y-%m-%d %H:%M:%S")
    );
    if can_push {
        let decorated = decorate_feishu_webhook_text(&db_path, &body)?;
        match send_feishu_webhook_message_with_dedupe(&db_path, &webhook, &decorated, "scheduled_tick") {
            Ok(_) => {
                db::set_app_setting(&db_path, "notification_pending_lines", "[]")
                    .map_err(|error| format!("failed to clear pending lines: {error}"))?;
                db::set_app_setting(&db_path, "notification_last_push_at", &now.to_rfc3339())
                    .map_err(|error| format!("failed to write last push time: {error}"))?;
                db::create_notification(
                    &db_path,
                    "feishu",
                    &title,
                    &decorated,
                    Some("scheduler"),
                    None,
                    "sent",
                    Some(&Utc::now().to_rfc3339()),
                )
                .map_err(|error| format!("failed to record notification: {error}"))?;
                Ok(SchedulerTickPayload {
                    executed: true,
                    pushed: true,
                    buffered: false,
                    generated_count: new_lines.len() as i64,
                    pending_count: 0,
                    summary: format!(
                        "已按定时策略推送 {} 条提醒。{}",
                        merged.len(),
                        auto_policy_note.clone()
                    )
                    .trim()
                    .to_string(),
                })
            }
            Err(error) => {
                let serialized = serde_json::to_string(&merged)
                    .map_err(|ser_error| format!("failed to serialize pending lines: {ser_error}"))?;
                db::set_app_setting(&db_path, "notification_pending_lines", &serialized)
                    .map_err(|save_error| format!("failed to persist pending lines: {save_error}"))?;
                let _ = db::create_notification(
                    &db_path,
                    "feishu",
                    &title,
                    &decorated,
                    Some("scheduler"),
                    None,
                    "failed",
                    None,
                );
                Ok(SchedulerTickPayload {
                    executed: true,
                    pushed: false,
                    buffered: true,
                    generated_count: new_lines.len() as i64,
                    pending_count: merged.len() as i64,
                    summary: format!(
                        "推送失败，已缓存待下轮重试：{error} {}",
                        auto_policy_note.clone()
                    )
                    .trim()
                    .to_string(),
                })
            }
        }
    } else {
        let serialized = serde_json::to_string(&merged)
            .map_err(|error| format!("failed to serialize pending lines: {error}"))?;
        db::set_app_setting(&db_path, "notification_pending_lines", &serialized)
            .map_err(|error| format!("failed to save pending lines: {error}"))?;
        Ok(SchedulerTickPayload {
            executed: true,
            pushed: false,
            buffered: true,
            generated_count: new_lines.len() as i64,
            pending_count: merged.len() as i64,
            summary: format!(
                "已完成定时扫描，但飞书未启用或 webhook 为空，提醒已缓存。{}",
                auto_policy_note.clone()
            )
            .trim()
            .to_string(),
        })
    }
}

#[tauri::command]
fn sync_all_tasks_to_feishu_calendar(app: tauri::AppHandle) -> Result<CalendarSyncPayload, String> {
    let db_path = get_database_path(&app)?;
    let rows = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let mut synced = 0_i64;
    let mut failed = 0_i64;
    let mut skipped = 0_i64;
    for task in rows {
        if task.status == "已完成" {
            skipped += 1;
            continue;
        }
        if task.deadline.is_none() {
            skipped += 1;
            continue;
        }
        match sync_task_to_feishu_calendar(&db_path, task.id) {
            Ok(_) => synced += 1,
            Err(error) => {
                failed += 1;
                let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(task.id), &error);
                let _ = db::create_notification(
                    &db_path,
                    "system",
                    "飞书日历同步失败",
                    &format!("任务ID {}：{}", task.id, error),
                    Some("task"),
                    Some(task.id),
                    "failed",
                    None,
                );
            }
        }
    }
    Ok(CalendarSyncPayload {
        synced,
        failed,
        skipped,
        summary: format!("全量同步完成：成功 {synced}，失败 {failed}，跳过 {skipped}。"),
    })
}

#[tauri::command]
fn pull_all_tasks_from_feishu_calendar(app: tauri::AppHandle) -> Result<CalendarPullPayload, String> {
    let db_path = get_database_path(&app)?;
    let rows = db::list_tasks(&db_path).map_err(|error| format!("failed to list tasks: {error}"))?;
    let mut updated = 0_i64;
    let mut failed = 0_i64;
    let mut skipped = 0_i64;
    for task in rows {
        match pull_task_from_feishu_calendar(&db_path, task.id) {
            Ok(changed) => {
                if changed {
                    updated += 1;
                } else {
                    skipped += 1;
                }
            }
            Err(error) => {
                failed += 1;
                let _ = db::set_app_setting(&db_path, &make_task_sync_error_key(task.id), &error);
                let _ = db::create_notification(
                    &db_path,
                    "system",
                    "飞书回写同步失败",
                    &format!("任务ID {}：{}", task.id, error),
                    Some("task"),
                    Some(task.id),
                    "failed",
                    None,
                );
            }
        }
    }
    Ok(CalendarPullPayload {
        executed: true,
        updated,
        failed,
        skipped,
        summary: format!("飞书回写完成：更新 {updated}，失败 {failed}，跳过 {skipped}。"),
    })
}

#[tauri::command]
fn run_feishu_calendar_pull_tick(app: tauri::AppHandle) -> Result<CalendarPullPayload, String> {
    let db_path = get_database_path(&app)?;
    let pull_enabled = db::get_app_setting(&db_path, "feishu_calendar_pull_enabled")
        .map_err(|error| format!("failed to read calendar pull setting: {error}"))?
        .unwrap_or_else(|| "false".to_string());
    if !matches_true(Some(pull_enabled.as_str())) {
        return Ok(CalendarPullPayload {
            executed: false,
            updated: 0,
            failed: 0,
            skipped: 0,
            summary: "飞书反向同步已关闭。".to_string(),
        });
    }
    let now = Local::now();
    let last_pull = db::get_app_setting(&db_path, "feishu_calendar_last_pull_at")
        .map_err(|error| format!("failed to read last pull time: {error}"))?
        .and_then(|raw| chrono::DateTime::parse_from_rfc3339(&raw).ok())
        .map(|dt| dt.with_timezone(&Local));
    let due = last_pull
        .map(|time| now.signed_duration_since(time).num_minutes() >= 30)
        .unwrap_or(true);
    if !due {
        return Ok(CalendarPullPayload {
            executed: false,
            updated: 0,
            failed: 0,
            skipped: 0,
            summary: "未到下一次飞书回写窗口。".to_string(),
        });
    }
    db::set_app_setting(&db_path, "feishu_calendar_last_pull_at", &now.to_rfc3339())
        .map_err(|error| format!("failed to save last pull time: {error}"))?;
    pull_all_tasks_from_feishu_calendar(app)
}

#[tauri::command]
fn read_library_file_excerpt(file_path: String, max_chars: Option<usize>) -> Result<String, String> {
    read_library_excerpt_from_path(&file_path, max_chars.unwrap_or(4000))
}

#[tauri::command]
fn health_check() -> &'static str {
    "ok"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .setup(|app| {
            try_auto_start_background_services(&app.handle().clone());
            let bridge_state = app.state::<AppState>().bridge.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_bridge_server(bridge_state).await {
                    eprintln!("Bridge server error: {e}");
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            initialize_database,
            health_check,
            list_projects,
            list_school_profiles,
            create_project,
            update_project,
            delete_project,
            list_project_requirements,
            create_project_requirement,
            update_project_requirement,
            delete_project_requirement,
            list_project_documents,
            create_project_document,
            delete_project_document,
            list_recommendation_letters,
            create_recommendation_letter,
            update_recommendation_letter,
            delete_recommendation_letter,
            seed_application_demo_data,
            list_tasks,
            get_tasks_by_date,
            get_tasks_by_date_range,
            get_goals,
            log_goal_progress,
            get_goal_log_by_date,
            get_today_goal_logs,
            batch_insert_goals,
            batch_insert_tasks,
            get_daily_completion_stats,
            create_task,
            update_task,
            update_task_status,
            update_task_status_with_tag,
            preview_task_conflicts,
            postpone_task,
            list_task_event_logs,
            delete_task,
            seed_task_demo_data,
            update_task_words,
            get_accuracy_logs,
            get_library_directories,
            set_library_directory,
            scan_library,
            import_library_files,
            resolve_library_inbox_file,
            list_library_files,
            refresh_library_file_summary,
            refresh_library_search_index,
            refresh_library_file_ocr_summary,
            refresh_library_ocr_index,
            list_library_import_logs,
            toggle_library_file_favorite,
            open_library_file,
            open_external_url,
            send_to_provider,
            read_from_provider,
            get_provider_status,
            list_library_file_links,
            replace_library_file_links,
            batch_set_library_file_tags,
            batch_append_library_file_links,
            delete_library_file,
            rename_library_file,
            move_library_file,
            toggle_favorite,
            create_category,
            delete_category,
            rename_category,
            set_library_file_school,
            import_library_files_to_documents,
            get_app_setting,
            set_app_setting,
            run_secure_ai_prompt,
            list_notifications,
            list_notifications_with_filters,
            mark_notification_read,
            ignore_notification,
            snooze_notification,
            create_task_from_notification,
            log_notification_action,
            list_web_presets,
            list_web_sources,
            update_web_source_links,
            list_web_watchers,
            list_web_change_logs,
            list_web_clippings,
            create_web_watcher,
            set_web_watcher_active,
            delete_web_watcher,
            capture_web_url,
            run_web_watchers_scan,
            run_web_watcher_check,
            run_web_watchers_scan_tick,
            create_task_from_web_change,
            apply_study_web_change_suggestions,
            mark_web_change_processed,
            save_web_clipping_as_note,
            save_web_clipping_as_library_item,
            list_watch_targets,
            create_watch_target,
            delete_watch_target,
            set_watch_target_active,
            run_watch_targets_scan,
            run_watch_targets_scan_tick,
            list_pomodoro_sessions,
            start_pomodoro_session,
            finish_pomodoro_session,
            get_focus_stats,
            list_habits,
            create_habit,
            delete_habit,
            list_habit_logs,
            create_habit_log,
            list_journal_entries,
            create_journal_entry,
            list_idea_notes,
            create_idea_note,
            list_mistake_notes,
            create_mistake_note,
            delete_mistake_note,
            extract_pdf_text,
            save_passages,
            get_question_banks,
            import_answers,
            get_passages,
            get_passage_detail,
            submit_answer,
            submit_self_evaluation,
            add_question_annotation,
            get_question_annotations,
            get_question_bank_stats,
            add_mistake_from_question,
            add_mistake_from_exam,
            list_mistakes_from_exam,
            list_ai_logs,
            create_ai_log,
            list_study_analysis_logs,
            create_study_analysis_log,
            list_weekly_growth_reviews,
            generate_weekly_growth_review,
            list_plan_drafts,
            list_plan_draft_items,
            list_plan_draft_audit_logs,
            create_plan_draft,
            update_plan_draft_status,
            apply_plan_draft,
            apply_plan_draft_commit,
            rollback_plan_draft_apply,
            list_daily_plan_versions,
            list_daily_plan_items,
            create_daily_plan_version,
            update_daily_plan_version_status,
            delete_daily_plan_version,
            update_daily_plan_item,
            generate_daily_plan_version_draft,
            generate_tomorrow_plan_draft,
            generate_weekly_focus_plan_draft,
            generate_ai_digest,
            generate_assistant_briefing,
            list_assistant_briefings,
            list_assistant_briefing_suggestions,
            apply_assistant_briefing_suggestion,
            run_assistant_briefing_tick,
            execute_feishu_command,
            execute_feishu_command_batch,
            process_feishu_inbound_message,
            process_feishu_webhook_payload,
            list_feishu_message_logs,
            retry_failed_feishu_messages,
            reply_feishu_message,
            start_math_error_notebook,
            open_math_error_notebook,
            list_task_suggestions,
            apply_task_suggestion,
            dismiss_task_suggestion,
            generate_task_suggestions_from_notifications,
            rebalance_task_priority_from_notifications,
            send_feishu_test_message,
            run_deadline_notification_scan,
            run_scheduled_notification_tick,
            sync_all_tasks_to_feishu_calendar,
            pull_all_tasks_from_feishu_calendar,
            run_feishu_calendar_pull_tick,
            read_library_file_excerpt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
