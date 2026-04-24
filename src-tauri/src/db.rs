use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use chrono::{DateTime, Datelike, Duration, NaiveDate, NaiveDateTime, Utc, Weekday};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub school_name: String,
    pub program_name: String,
    pub country: Option<String>,
    pub degree_type: Option<String>,
    pub intake_term: Option<String>,
    pub application_round: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub priority: String,
    pub official_url: Option<String>,
    pub chinese_name: Option<String>,
    pub country_color: Option<String>,
    pub requirement_url: Option<String>,
    pub essay_url: Option<String>,
    pub recommendation_url: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRequirement {
    pub id: i64,
    pub project_id: i64,
    pub requirement_type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub due_date: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchoolProfile {
    pub id: i64,
    pub school_name: String,
    pub country: Option<String>,
    pub official_url: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDocument {
    pub id: i64,
    pub project_id: i64,
    pub requirement_id: Option<i64>,
    pub document_type: String,
    pub title: String,
    pub version_label: String,
    pub file_path: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationLetter {
    pub id: i64,
    pub project_id: i64,
    pub recommender_name: String,
    pub recommender_email: Option<String>,
    pub relationship: Option<String>,
    pub status: String,
    pub requested_at: Option<String>,
    pub due_date: Option<String>,
    pub submitted_at: Option<String>,
    pub last_followup_at: Option<String>,
    pub portal_link: Option<String>,
    pub linked_task_id: Option<i64>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProjectDocumentInput {
    pub project_id: i64,
    pub requirement_id: Option<i64>,
    pub document_type: String,
    pub title: String,
    pub version_label: String,
    pub file_path: Option<String>,
    pub status: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewRecommendationLetterInput {
    pub project_id: i64,
    pub recommender_name: String,
    pub recommender_email: Option<String>,
    pub relationship: Option<String>,
    pub status: String,
    pub requested_at: Option<String>,
    pub due_date: Option<String>,
    pub submitted_at: Option<String>,
    pub last_followup_at: Option<String>,
    pub portal_link: Option<String>,
    pub linked_task_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProjectInput {
    pub school_name: String,
    pub program_name: String,
    pub country: Option<String>,
    pub degree_type: Option<String>,
    pub intake_term: Option<String>,
    pub application_round: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub priority: String,
    pub official_url: Option<String>,
    pub chinese_name: Option<String>,
    pub country_color: Option<String>,
    pub requirement_url: Option<String>,
    pub essay_url: Option<String>,
    pub recommendation_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub id: i64,
    pub school_name: String,
    pub program_name: String,
    pub country: Option<String>,
    pub degree_type: Option<String>,
    pub intake_term: Option<String>,
    pub application_round: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub priority: String,
    pub official_url: Option<String>,
    pub chinese_name: Option<String>,
    pub country_color: Option<String>,
    pub requirement_url: Option<String>,
    pub essay_url: Option<String>,
    pub recommendation_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRecommendationLetterInput {
    pub id: i64,
    pub recommender_name: String,
    pub recommender_email: Option<String>,
    pub relationship: Option<String>,
    pub status: String,
    pub requested_at: Option<String>,
    pub due_date: Option<String>,
    pub submitted_at: Option<String>,
    pub last_followup_at: Option<String>,
    pub portal_link: Option<String>,
    pub linked_task_id: Option<i64>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewRequirementInput {
    pub project_id: i64,
    pub requirement_type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRequirementInput {
    pub id: i64,
    pub requirement_type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Habit {
    pub id: i64,
    pub title: String,
    pub category: Option<String>,
    pub frequency: Option<String>,
    pub target_value: Option<i64>,
    pub unit: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewHabitInput {
    pub title: String,
    pub category: Option<String>,
    pub frequency: Option<String>,
    pub target_value: Option<i64>,
    pub unit: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitLog {
    pub id: i64,
    pub habit_id: i64,
    pub value: Option<i64>,
    pub log_date: String,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewHabitLogInput {
    pub habit_id: i64,
    pub value: Option<i64>,
    pub log_date: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub id: i64,
    pub entry_type: String,
    pub title: Option<String>,
    pub content: String,
    pub mood_score: Option<i64>,
    pub energy_score: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewJournalEntryInput {
    pub entry_type: String,
    pub title: Option<String>,
    pub content: String,
    pub mood_score: Option<i64>,
    pub energy_score: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaNote {
    pub id: i64,
    pub title: Option<String>,
    pub content: String,
    pub tags_json: Option<String>,
    pub source: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewIdeaNoteInput {
    pub title: Option<String>,
    pub content: String,
    pub tags_json: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MistakeNote {
    pub id: i64,
    pub exam_type: String,
    pub subject: String,
    pub topic: Option<String>,
    pub question_source: Option<String>,
    pub mistake_reason: Option<String>,
    pub correct_method: Option<String>,
    pub review_date: Option<String>,
    pub linked_file_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewMistakeNoteInput {
    pub exam_type: String,
    pub subject: String,
    pub topic: Option<String>,
    pub question_source: Option<String>,
    pub mistake_reason: Option<String>,
    pub correct_method: Option<String>,
    pub review_date: Option<String>,
    pub linked_file_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MistakeFromExamRecord {
    pub id: i64,
    pub question_id: i64,
    pub bank_name: String,
    pub passage_num: i64,
    pub q_type: Option<String>,
    pub q_text: String,
    pub my_answer: Option<String>,
    pub correct_answer: Option<String>,
    pub ai_analysis: Option<String>,
    pub error_type: Option<String>,
    pub passage_text: Option<String>,
    pub time_spent: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewMistakeFromExamInput {
    pub question_id: i64,
    pub my_answer: Option<String>,
    pub ai_analysis: Option<String>,
    pub error_type: Option<String>,
    pub time_spent: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionBank {
    pub id: i64,
    pub name: String,
    pub subject: Option<String>,
    pub file_path: Option<String>,
    pub total_passages: i64,
    pub parsed_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassageSummary {
    pub id: i64,
    pub bank_id: i64,
    pub passage_num: i64,
    pub question_count: i64,
    pub question_types: Option<String>,
    pub attempted_questions: i64,
    pub correct_questions: i64,
    pub wrong_questions: i64,
    pub last_attempted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionDetail {
    pub id: i64,
    pub passage_id: i64,
    pub q_num: i64,
    pub q_type: Option<String>,
    pub q_text: String,
    pub option_a: Option<String>,
    pub option_b: Option<String>,
    pub option_c: Option<String>,
    pub option_d: Option<String>,
    pub option_e: Option<String>,
    pub correct_answer: Option<String>,
    pub has_answer: i64,
    pub highlighted_text: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassageDetail {
    pub id: i64,
    pub bank_id: i64,
    pub passage_num: i64,
    pub passage_text: String,
    pub question_count: i64,
    pub question_types: Option<String>,
    pub questions: Vec<QuestionDetail>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerResult {
    pub is_correct: bool,
    pub correct_answer: Option<String>,
    pub has_answer: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportAnswerResult {
    pub matched: i64,
    pub updated: i64,
    pub unmatched: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportAnswerEntry {
    pub passage_num: Option<i64>,
    pub q_num: i64,
    pub correct_answer: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionAttemptInput {
    pub question_id: i64,
    pub my_answer: Option<String>,
    pub self_eval_result: Option<bool>,
    pub time_spent_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionAnnotation {
    pub id: i64,
    pub question_id: Option<i64>,
    pub passage_id: i64,
    pub annotation_type: String,
    pub quote_text: Option<String>,
    pub color: Option<String>,
    pub note_text: Option<String>,
    pub start_offset: Option<i64>,
    pub end_offset: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewQuestionAnnotationInput {
    pub question_id: Option<i64>,
    pub passage_id: i64,
    pub annotation_type: String,
    pub quote_text: Option<String>,
    pub color: Option<String>,
    pub note_text: Option<String>,
    pub start_offset: Option<i64>,
    pub end_offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccuracyTrendPoint {
    pub date_key: String,
    pub gre_reading: f64,
    pub gre_math: f64,
    pub ielts_reading: f64,
    pub overall: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionTypeMetric {
    pub q_type: String,
    pub total: i64,
    pub correct: i64,
    pub wrong: i64,
    pub accuracy: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeTrendPoint {
    pub date_key: String,
    pub avg_seconds: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassageTimeMetric {
    pub passage_num: i64,
    pub avg_seconds: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WrongHeatmapPoint {
    pub date_key: String,
    pub q_type: String,
    pub wrong_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassageCompletionMetric {
    pub passage_id: i64,
    pub passage_num: i64,
    pub status: String,
    pub wrong_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuestionBankStats {
    pub total_questions: i64,
    pub total_attempts: i64,
    pub total_correct: i64,
    pub overall_accuracy: f64,
    pub total_time_seconds: i64,
    pub mastered_mistakes: i64,
    pub mistake_total: i64,
    pub trend: Vec<AccuracyTrendPoint>,
    pub type_metrics: Vec<QuestionTypeMetric>,
    pub time_trend: Vec<TimeTrendPoint>,
    pub passage_time: Vec<PassageTimeMetric>,
    pub wrong_heatmap: Vec<WrongHeatmapPoint>,
    pub passage_completion: Vec<PassageCompletionMetric>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedQuestionInput {
    pub question_id: String,
    pub question_text: String,
    pub q_type: Option<String>,
    pub options: Option<Vec<String>>,
    pub answer: Option<String>,
    pub explanation: Option<String>,
    pub highlighted_text: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedPassageInput {
    pub passage_id: String,
    pub passage_text: String,
    pub questions: Vec<ParsedQuestionInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiLogRecord {
    pub id: i64,
    pub module_name: String,
    pub action_name: String,
    pub model_name: Option<String>,
    pub provider_name: Option<String>,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub estimated_cost: f64,
    pub latency_ms: Option<i64>,
    pub success: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewAiLogInput {
    pub module_name: String,
    pub action_name: String,
    pub model_name: Option<String>,
    pub provider_name: Option<String>,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub estimated_cost: f64,
    pub latency_ms: Option<i64>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<i64>,
    pub source_label: Option<String>,
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub estimated_minutes: Option<i64>,
    pub scheduled_date: Option<String>,
    pub reminder_at: Option<String>,
    pub deadline: Option<String>,
    pub parent_task_id: Option<i64>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub recurrence_enabled: bool,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i64>,
    pub recurrence_days_of_week: Option<String>,
    pub recurrence_day_of_month: Option<i64>,
    pub recurrence_until: Option<String>,
    pub recurrence_source_task_id: Option<i64>,
    pub completion_tag: Option<String>,
    pub last_delay_reason_code: Option<String>,
    pub last_delay_reason_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: i64,
    pub title: String,
    pub subject: String,
    pub total_amount: i64,
    pub unit: String,
    pub daily_target: i64,
    pub start_date: String,
    pub end_date: String,
    pub completed_amount: i64,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalLog {
    pub id: i64,
    pub goal_id: i64,
    pub log_date: String,
    pub amount: i64,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalInput {
    pub title: String,
    pub subject: String,
    pub total_amount: i64,
    pub unit: String,
    pub daily_target: i64,
    pub start_date: String,
    pub end_date: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchTaskInput {
    pub title: String,
    pub task_type: String,
    pub scheduled_date: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyStats {
    pub date: String,
    pub count: i32,
    pub minutes: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewTaskInput {
    pub title: String,
    pub description: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<i64>,
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub estimated_minutes: Option<i64>,
    pub scheduled_date: Option<String>,
    pub reminder_at: Option<String>,
    pub deadline: Option<String>,
    pub parent_task_id: Option<i64>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub recurrence_enabled: Option<bool>,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i64>,
    pub recurrence_days_of_week: Option<String>,
    pub recurrence_day_of_month: Option<i64>,
    pub recurrence_until: Option<String>,
    pub recurrence_source_task_id: Option<i64>,
    pub completion_tag: Option<String>,
    pub last_delay_reason_code: Option<String>,
    pub last_delay_reason_note: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<i64>,
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub estimated_minutes: Option<i64>,
    pub scheduled_date: Option<String>,
    pub reminder_at: Option<String>,
    pub deadline: Option<String>,
    pub parent_task_id: Option<i64>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub recurrence_enabled: Option<bool>,
    pub recurrence_type: Option<String>,
    pub recurrence_interval: Option<i64>,
    pub recurrence_days_of_week: Option<String>,
    pub recurrence_day_of_month: Option<i64>,
    pub recurrence_until: Option<String>,
    pub recurrence_source_task_id: Option<i64>,
    pub completion_tag: Option<String>,
    pub last_delay_reason_code: Option<String>,
    pub last_delay_reason_note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskEventLog {
    pub id: i64,
    pub task_id: i64,
    pub event_type: String,
    pub detail_json: Option<String>,
    pub reason_code: Option<String>,
    pub reason_note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostponeTaskInput {
    pub task_id: i64,
    pub new_scheduled_date: Option<String>,
    pub new_deadline: Option<String>,
    pub new_time_start: Option<String>,
    pub new_time_end: Option<String>,
    pub reason_code: Option<String>,
    pub reason_note: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskConflictCheckInput {
    pub task_id: Option<i64>,
    pub scheduled_date: Option<String>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub priority: Option<String>,
    pub estimated_minutes: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskConflictCheckResult {
    pub has_time_conflict: bool,
    pub has_daily_load_risk: bool,
    pub has_priority_risk: bool,
    pub risk_level: String,
    pub messages: Vec<String>,
    pub conflicted_task_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryDirectory {
    pub key: String,
    pub label: String,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRecord {
    pub id: i64,
    pub file_path: String,
    pub file_name: String,
    pub file_type: Option<String>,
    pub file_size: Option<i64>,
    pub category: String,
    pub summary: Option<String>,
    pub tags_json: Option<String>,
    pub last_opened_at: Option<String>,
    pub is_favorite: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileLinkView {
    pub id: i64,
    pub file_id: i64,
    pub link_type: String,
    pub link_id: i64,
    pub relation_note: Option<String>,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileLinkInput {
    pub link_type: String,
    pub link_id: i64,
    pub relation_note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryImportLogRecord {
    pub id: i64,
    pub source_path: String,
    pub stored_path: Option<String>,
    pub original_name: Option<String>,
    pub target_key: String,
    pub category: String,
    pub import_status: String,
    pub reason: Option<String>,
    pub file_id: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationRecord {
    pub id: i64,
    pub channel: String,
    pub source_type: String,
    pub priority: String,
    pub title: String,
    pub content: String,
    pub related_type: Option<String>,
    pub related_id: Option<i64>,
    pub send_status: String,
    pub is_read: bool,
    pub is_ignored: bool,
    pub snoozed_until: Option<String>,
    pub dedupe_key: Option<String>,
    pub aggregate_count: i64,
    pub first_seen_at: Option<String>,
    pub last_seen_at: Option<String>,
    pub updated_at: Option<String>,
    pub action_payload_json: Option<String>,
    pub sent_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationQueryInput {
    pub source_types: Option<Vec<String>>,
    pub priorities: Option<Vec<String>>,
    pub unread_only: Option<bool>,
    pub include_ignored: Option<bool>,
    pub include_snoozed: Option<bool>,
    pub start_at: Option<String>,
    pub end_at: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationActionLogRecord {
    pub id: i64,
    pub notification_id: i64,
    pub action_name: String,
    pub action_payload_json: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeishuMessageLogRecord {
    pub id: i64,
    pub direction: String,
    pub source: String,
    pub message_id: Option<String>,
    pub raw_text: String,
    pub normalized_text: Option<String>,
    pub parsed_action: Option<String>,
    pub parsed_payload_json: Option<String>,
    pub execution_status: String,
    pub failure_code: Option<String>,
    pub failure_reason: Option<String>,
    pub dedupe_key: Option<String>,
    pub is_duplicate: bool,
    pub high_risk_required: bool,
    pub high_risk_confirmed: bool,
    pub created_task_id: Option<i64>,
    pub created_session_id: Option<i64>,
    pub related_notification_id: Option<i64>,
    pub latency_ms: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeishuMessageLogQueryInput {
    pub direction: Option<String>,
    pub execution_status: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchTarget {
    pub id: i64,
    pub school_name: String,
    pub page_label: String,
    pub target_url: String,
    pub is_active: bool,
    pub last_hash: Option<String>,
    pub last_checked_at: Option<String>,
    pub last_changed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWatchTargetInput {
    pub school_name: String,
    pub page_label: String,
    pub target_url: String,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSource {
    pub id: i64,
    pub title: String,
    pub url: String,
    pub source_type: String,
    pub category: String,
    pub tags_json: Option<String>,
    pub linked_project_id: Option<i64>,
    pub linked_task_id: Option<i64>,
    pub linked_file_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWebSourceInput {
    pub title: String,
    pub url: String,
    pub source_type: Option<String>,
    pub category: Option<String>,
    pub tags_json: Option<String>,
    pub linked_project_id: Option<i64>,
    pub linked_task_id: Option<i64>,
    pub linked_file_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebSourceQueryInput {
    pub query: Option<String>,
    pub category: Option<String>,
    pub linked_project_id: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebWatcher {
    pub id: i64,
    pub source_id: i64,
    pub source_title: Option<String>,
    pub source_url: Option<String>,
    pub source_category: Option<String>,
    pub watcher_name: String,
    pub target_url: String,
    pub watch_type: String,
    pub selector_rule: Option<String>,
    pub check_frequency: String,
    pub is_active: bool,
    pub last_checked_at: Option<String>,
    pub last_hash: Option<String>,
    pub last_status: String,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWebWatcherInput {
    pub source_id: i64,
    pub watcher_name: String,
    pub target_url: String,
    pub watch_type: String,
    pub selector_rule: Option<String>,
    pub check_frequency: String,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebWatcherQueryInput {
    pub source_id: Option<i64>,
    pub linked_project_id: Option<i64>,
    pub active_only: Option<bool>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebChangeLog {
    pub id: i64,
    pub watcher_id: i64,
    pub source_id: Option<i64>,
    pub source_title: Option<String>,
    pub target_url: Option<String>,
    pub old_snapshot: String,
    pub new_snapshot: String,
    pub diff_summary: String,
    pub ai_summary: Option<String>,
    pub change_direction: Option<String>,
    pub processed_at: Option<String>,
    pub processed_task_id: Option<i64>,
    pub changed_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebChangeLogQueryInput {
    pub watcher_id: Option<i64>,
    pub source_id: Option<i64>,
    pub linked_project_id: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebClipping {
    pub id: i64,
    pub source_id: i64,
    pub clipped_title: String,
    pub clipped_text: String,
    pub clipped_html: Option<String>,
    pub saved_as_note: bool,
    pub saved_as_library_item: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WebPreset {
    pub id: i64,
    pub preset_name: String,
    pub preset_type: String,
    pub default_watch_type: String,
    pub default_selector_rule: Option<String>,
    pub default_check_frequency: String,
    pub default_category: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSessionRecord {
    pub id: i64,
    pub task_id: Option<i64>,
    pub task_title: Option<String>,
    pub duration_minutes: i64,
    pub break_minutes: i64,
    pub status: String,
    pub interrupted_count: i64,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusStats {
    pub today_minutes: i64,
    pub week_minutes: i64,
    pub interrupted_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskSuggestion {
    pub id: i64,
    pub source_type: String,
    pub source_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub suggested_deadline: Option<String>,
    pub status: String,
    pub created_at: String,
    pub applied_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssistantBriefingRecord {
    pub id: i64,
    pub brief_type: String,
    pub date_key: String,
    pub summary_text: String,
    pub detail_json: String,
    pub risk_level: String,
    pub auto_generated: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssistantBriefingSuggestionRecord {
    pub id: i64,
    pub briefing_id: i64,
    pub suggestion_order: i64,
    pub title: String,
    pub action_type: String,
    pub action_payload_json: Option<String>,
    pub status: String,
    pub created_task_id: Option<i64>,
    pub applied_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyAnalysisLogRecord {
    pub id: i64,
    pub date_key: String,
    pub exam_type: String,
    pub subject: String,
    pub module: Option<String>,
    pub material: Option<String>,
    pub input_summary: Option<String>,
    pub performance_summary: String,
    pub analysis_summary: Option<String>,
    pub weakest_module: Option<String>,
    pub key_errors_json: Option<String>,
    pub suggested_adjustment: Option<String>,
    pub tomorrow_adjustment: Option<String>,
    pub intensity_change: Option<String>,
    pub notes: Option<String>,
    pub adoption_status: String,
    pub source_type: String,
    pub source_ref_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewStudyAnalysisLogInput {
    pub date_key: String,
    pub exam_type: String,
    pub subject: String,
    pub module: Option<String>,
    pub material: Option<String>,
    pub input_summary: Option<String>,
    pub performance_summary: String,
    pub analysis_summary: Option<String>,
    pub weakest_module: Option<String>,
    pub key_errors_json: Option<String>,
    pub suggested_adjustment: Option<String>,
    pub tomorrow_adjustment: Option<String>,
    pub intensity_change: Option<String>,
    pub notes: Option<String>,
    pub adoption_status: Option<String>,
    pub source_type: Option<String>,
    pub source_ref_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WeeklyGrowthReviewRecord {
    pub id: i64,
    pub week_key: String,
    pub week_range: Option<String>,
    pub linked_log_ids_json: Option<String>,
    pub summary_text: String,
    pub weekly_summary: Option<String>,
    pub strengths_json: Option<String>,
    pub growth_points_json: Option<String>,
    pub weaknesses_json: Option<String>,
    pub persistent_weakness_json: Option<String>,
    pub focus_json: Option<String>,
    pub next_week_focus_json: Option<String>,
    pub schedule_adjustment_rules_json: Option<String>,
    pub stats_json: Option<String>,
    pub generated_by: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewWeeklyGrowthReviewInput {
    pub week_key: String,
    pub week_range: Option<String>,
    pub linked_log_ids_json: Option<String>,
    pub summary_text: String,
    pub weekly_summary: Option<String>,
    pub strengths_json: Option<String>,
    pub growth_points_json: Option<String>,
    pub weaknesses_json: Option<String>,
    pub persistent_weakness_json: Option<String>,
    pub focus_json: Option<String>,
    pub next_week_focus_json: Option<String>,
    pub schedule_adjustment_rules_json: Option<String>,
    pub stats_json: Option<String>,
    pub generated_by: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanDraftRecord {
    pub id: i64,
    pub draft_type: String,
    pub title: String,
    pub target_date: Option<String>,
    pub week_key: Option<String>,
    pub source_context_json: Option<String>,
    pub suggestion_text: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanDraftItemRecord {
    pub id: i64,
    pub draft_id: i64,
    pub item_order: i64,
    pub item_type: String,
    pub title: String,
    pub description: Option<String>,
    pub priority: String,
    pub estimated_minutes: Option<i64>,
    pub scheduled_date: Option<String>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub deadline: Option<String>,
    pub linked_project_id: Option<i64>,
    pub action_payload_json: Option<String>,
    pub apply_status: String,
    pub created_task_id: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanDraftAuditLogRecord {
    pub id: i64,
    pub draft_id: i64,
    pub action: String,
    pub status: String,
    pub operator_name: String,
    pub reason_code: Option<String>,
    pub reason_note: Option<String>,
    pub affected_task_ids_json: Option<String>,
    pub item_count: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPlanDraftAuditLogInput {
    pub draft_id: i64,
    pub action: String,
    pub status: String,
    pub operator_name: Option<String>,
    pub reason_code: Option<String>,
    pub reason_note: Option<String>,
    pub affected_task_ids_json: Option<String>,
    pub item_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyPlanVersionRecord {
    pub id: i64,
    pub date_key: String,
    pub title: String,
    pub status: String,
    pub source_reason: Option<String>,
    pub created_from_type: String,
    pub base_version_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyPlanItemRecord {
    pub id: i64,
    pub version_id: i64,
    pub item_order: i64,
    pub title: String,
    pub module: Option<String>,
    pub estimated_minutes: Option<i64>,
    pub priority: String,
    pub source_reason: Option<String>,
    pub suggested_time_block: Option<String>,
    pub task_id: Option<i64>,
    pub is_completed: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewDailyPlanVersionInput {
    pub date_key: String,
    pub title: String,
    pub status: Option<String>,
    pub source_reason: Option<String>,
    pub created_from_type: Option<String>,
    pub base_version_id: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewDailyPlanItemInput {
    pub item_order: Option<i64>,
    pub title: String,
    pub module: Option<String>,
    pub estimated_minutes: Option<i64>,
    pub priority: Option<String>,
    pub source_reason: Option<String>,
    pub suggested_time_block: Option<String>,
    pub task_id: Option<i64>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDailyPlanItemInput {
    pub title: Option<String>,
    pub module: Option<String>,
    pub estimated_minutes: Option<i64>,
    pub priority: Option<String>,
    pub source_reason: Option<String>,
    pub suggested_time_block: Option<String>,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPlanDraftInput {
    pub draft_type: String,
    pub title: String,
    pub target_date: Option<String>,
    pub week_key: Option<String>,
    pub source_context_json: Option<String>,
    pub suggestion_text: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewPlanDraftItemInput {
    pub item_order: Option<i64>,
    pub item_type: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub estimated_minutes: Option<i64>,
    pub scheduled_date: Option<String>,
    pub time_start: Option<String>,
    pub time_end: Option<String>,
    pub deadline: Option<String>,
    pub linked_project_id: Option<i64>,
    pub action_payload_json: Option<String>,
}

pub fn initialize_schema(path: &Path) -> Result<()> {
    let connection = Connection::open(path)?;

    connection.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            program_name TEXT NOT NULL,
            country TEXT,
            degree_type TEXT,
            intake_term TEXT,
            application_round TEXT,
            deadline TEXT,
            status TEXT NOT NULL DEFAULT '待准备',
            priority TEXT NOT NULL DEFAULT '中',
            official_url TEXT,
            chinese_name TEXT,
            country_color TEXT,
            requirement_url TEXT,
            essay_url TEXT,
            recommendation_url TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS project_requirements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            requirement_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT '未开始',
            due_date TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS project_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            requirement_id INTEGER,
            document_type TEXT NOT NULL,
            title TEXT NOT NULL,
            version_label TEXT NOT NULL,
            file_path TEXT,
            status TEXT NOT NULL DEFAULT '草稿',
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (requirement_id) REFERENCES project_requirements(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS recommendation_letters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            recommender_name TEXT NOT NULL,
            recommender_email TEXT,
            relationship TEXT,
            status TEXT NOT NULL DEFAULT '未请求',
            requested_at TEXT,
            due_date TEXT,
            submitted_at TEXT,
            last_followup_at TEXT,
            portal_link TEXT,
            linked_task_id INTEGER,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS school_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL UNIQUE,
            country TEXT,
            official_url TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            source_type TEXT,
            source_id INTEGER,
            task_type TEXT NOT NULL DEFAULT '通用',
            priority TEXT NOT NULL DEFAULT '中',
            status TEXT NOT NULL DEFAULT '未开始',
            estimated_minutes INTEGER,
            scheduled_date TEXT,
            time_start TEXT,
            time_end TEXT,
            deadline TEXT,
            parent_task_id INTEGER,
            recurrence_enabled INTEGER NOT NULL DEFAULT 0,
            recurrence_type TEXT,
            recurrence_interval INTEGER,
            recurrence_days_of_week TEXT,
            recurrence_day_of_month INTEGER,
            recurrence_until TEXT,
            recurrence_source_task_id INTEGER,
            completion_tag TEXT,
            last_delay_reason_code TEXT,
            last_delay_reason_note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            total_amount INTEGER NOT NULL,
            unit TEXT NOT NULL,
            daily_target INTEGER NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            completed_amount INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS goal_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            goal_id INTEGER NOT NULL,
            log_date TEXT NOT NULL,
            amount INTEGER NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (goal_id) REFERENCES goals(id)
        );

        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            start_time TEXT,
            end_time TEXT,
            calendar_type TEXT,
            reminder_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            category TEXT NOT NULL,
            summary TEXT,
            tags_json TEXT,
            last_opened_at TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS file_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            link_type TEXT NOT NULL,
            link_id INTEGER NOT NULL,
            relation_note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS question_banks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subject TEXT,
            file_path TEXT,
            total_passages INTEGER NOT NULL DEFAULT 0,
            parsed_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS passages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_id INTEGER NOT NULL,
            passage_num INTEGER NOT NULL,
            passage_text TEXT NOT NULL,
            question_count INTEGER NOT NULL DEFAULT 0,
            question_types TEXT,
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            passage_id INTEGER NOT NULL,
            q_num INTEGER NOT NULL,
            q_type TEXT,
            q_text TEXT NOT NULL,
            option_a TEXT,
            option_b TEXT,
            option_c TEXT,
            option_d TEXT,
            option_e TEXT,
            correct_answer TEXT,
            has_answer INTEGER NOT NULL DEFAULT 0,
            highlighted_text TEXT,
            FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS question_attempt_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_id INTEGER NOT NULL,
            passage_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            q_type TEXT,
            my_answer TEXT,
            correct_answer TEXT,
            answer_source INTEGER NOT NULL DEFAULT 0,
            is_correct INTEGER,
            time_spent_seconds INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE,
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS question_annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            passage_id INTEGER NOT NULL,
            annotation_type TEXT NOT NULL DEFAULT 'highlight',
            quote_text TEXT,
            color TEXT,
            note_text TEXT,
            start_offset INTEGER,
            end_offset INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS library_import_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_path TEXT NOT NULL,
            stored_path TEXT,
            original_name TEXT,
            target_key TEXT NOT NULL,
            category TEXT NOT NULL,
            import_status TEXT NOT NULL DEFAULT 'imported',
            reason TEXT,
            file_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            duration_minutes INTEGER NOT NULL DEFAULT 25,
            break_minutes INTEGER NOT NULL DEFAULT 5,
            status TEXT NOT NULL DEFAULT 'idle',
            interrupted_count INTEGER NOT NULL DEFAULT 0,
            started_at TEXT,
            ended_at TEXT
        );

        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            frequency TEXT,
            target_value INTEGER,
            unit TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            value INTEGER,
            log_date TEXT NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS journal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_type TEXT NOT NULL DEFAULT '日记',
            title TEXT,
            content TEXT NOT NULL,
            mood_score INTEGER,
            energy_score INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS idea_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT NOT NULL,
            tags_json TEXT,
            source TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mistake_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exam_type TEXT NOT NULL,
            subject TEXT NOT NULL,
            topic TEXT,
            question_source TEXT,
            mistake_reason TEXT,
            correct_method TEXT,
            review_date TEXT,
            linked_file_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS mistake_exam_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            bank_name TEXT NOT NULL,
            passage_num INTEGER NOT NULL DEFAULT 0,
            q_type TEXT,
            q_text TEXT NOT NULL,
            my_answer TEXT,
            correct_answer TEXT,
            ai_analysis TEXT,
            error_type TEXT,
            passage_text TEXT,
            time_spent INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ai_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_name TEXT NOT NULL,
            action_name TEXT NOT NULL,
            model_name TEXT,
            provider_name TEXT,
            input_tokens INTEGER NOT NULL DEFAULT 0,
            output_tokens INTEGER NOT NULL DEFAULT 0,
            estimated_cost REAL NOT NULL DEFAULT 0,
            latency_ms INTEGER,
            success INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel TEXT NOT NULL,
            source_type TEXT NOT NULL DEFAULT 'system',
            priority TEXT NOT NULL DEFAULT 'info',
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            related_type TEXT,
            related_id INTEGER,
            send_status TEXT NOT NULL DEFAULT 'pending',
            is_read INTEGER NOT NULL DEFAULT 0,
            is_ignored INTEGER NOT NULL DEFAULT 0,
            snoozed_until TEXT,
            dedupe_key TEXT,
            aggregate_count INTEGER NOT NULL DEFAULT 1,
            first_seen_at TEXT,
            last_seen_at TEXT,
            updated_at TEXT,
            action_payload_json TEXT,
            sent_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notification_action_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            notification_id INTEGER NOT NULL,
            action_name TEXT NOT NULL,
            action_payload_json TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS feishu_message_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            direction TEXT NOT NULL DEFAULT 'inbound',
            source TEXT NOT NULL DEFAULT 'unknown',
            message_id TEXT,
            raw_text TEXT NOT NULL,
            normalized_text TEXT,
            parsed_action TEXT,
            parsed_payload_json TEXT,
            execution_status TEXT NOT NULL DEFAULT 'received',
            failure_code TEXT,
            failure_reason TEXT,
            dedupe_key TEXT,
            is_duplicate INTEGER NOT NULL DEFAULT 0,
            high_risk_required INTEGER NOT NULL DEFAULT 0,
            high_risk_confirmed INTEGER NOT NULL DEFAULT 0,
            created_task_id INTEGER,
            created_session_id INTEGER,
            related_notification_id INTEGER,
            latency_ms INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS school_watch_targets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_name TEXT NOT NULL,
            page_label TEXT NOT NULL,
            target_url TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_hash TEXT,
            last_checked_at TEXT,
            last_changed_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS web_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            source_type TEXT NOT NULL DEFAULT 'page',
            category TEXT NOT NULL DEFAULT 'other',
            tags_json TEXT,
            linked_project_id INTEGER,
            linked_task_id INTEGER,
            linked_file_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (linked_project_id) REFERENCES projects(id) ON DELETE SET NULL,
            FOREIGN KEY (linked_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
            FOREIGN KEY (linked_file_id) REFERENCES files(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS web_watchers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            watcher_name TEXT NOT NULL,
            target_url TEXT NOT NULL,
            watch_type TEXT NOT NULL DEFAULT 'full_page_text',
            selector_rule TEXT,
            check_frequency TEXT NOT NULL DEFAULT 'daily',
            is_active INTEGER NOT NULL DEFAULT 1,
            last_checked_at TEXT,
            last_hash TEXT,
            last_status TEXT NOT NULL DEFAULT 'ok',
            error_message TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_id) REFERENCES web_sources(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS web_change_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            watcher_id INTEGER NOT NULL,
            source_id INTEGER,
            old_snapshot TEXT NOT NULL,
            new_snapshot TEXT NOT NULL,
            diff_summary TEXT NOT NULL,
            ai_summary TEXT,
            change_direction TEXT,
            processed_at TEXT,
            processed_task_id INTEGER,
            changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (watcher_id) REFERENCES web_watchers(id) ON DELETE CASCADE,
            FOREIGN KEY (source_id) REFERENCES web_sources(id) ON DELETE SET NULL,
            FOREIGN KEY (processed_task_id) REFERENCES tasks(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS web_clippings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id INTEGER NOT NULL,
            clipped_title TEXT NOT NULL,
            clipped_text TEXT NOT NULL,
            clipped_html TEXT,
            saved_as_note INTEGER NOT NULL DEFAULT 0,
            saved_as_library_item INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (source_id) REFERENCES web_sources(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS web_presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preset_name TEXT NOT NULL,
            preset_type TEXT NOT NULL,
            default_watch_type TEXT NOT NULL,
            default_selector_rule TEXT,
            default_check_frequency TEXT NOT NULL,
            default_category TEXT NOT NULL DEFAULT 'other',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS study_analysis_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date_key TEXT NOT NULL,
            exam_type TEXT NOT NULL,
            subject TEXT NOT NULL,
            module TEXT,
            material TEXT,
            input_summary TEXT,
            performance_summary TEXT NOT NULL,
            analysis_summary TEXT,
            weakest_module TEXT,
            key_errors_json TEXT,
            suggested_adjustment TEXT,
            tomorrow_adjustment TEXT,
            intensity_change TEXT,
            notes TEXT,
            adoption_status TEXT NOT NULL DEFAULT 'pending',
            source_type TEXT NOT NULL DEFAULT 'manual',
            source_ref_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS weekly_growth_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            week_key TEXT NOT NULL,
            week_range TEXT,
            linked_log_ids_json TEXT,
            summary_text TEXT NOT NULL,
            weekly_summary TEXT,
            strengths_json TEXT,
            growth_points_json TEXT,
            weaknesses_json TEXT,
            persistent_weakness_json TEXT,
            focus_json TEXT,
            next_week_focus_json TEXT,
            schedule_adjustment_rules_json TEXT,
            stats_json TEXT,
            generated_by TEXT NOT NULL DEFAULT 'rule-engine',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS plan_drafts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            draft_type TEXT NOT NULL,
            title TEXT NOT NULL,
            target_date TEXT,
            week_key TEXT,
            source_context_json TEXT,
            suggestion_text TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS plan_draft_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            draft_id INTEGER NOT NULL,
            item_order INTEGER NOT NULL DEFAULT 1,
            item_type TEXT NOT NULL DEFAULT 'task',
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT NOT NULL DEFAULT '中',
            estimated_minutes INTEGER,
            scheduled_date TEXT,
            time_start TEXT,
            time_end TEXT,
            deadline TEXT,
            linked_project_id INTEGER,
            action_payload_json TEXT,
            apply_status TEXT NOT NULL DEFAULT 'pending',
            created_task_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (draft_id) REFERENCES plan_drafts(id) ON DELETE CASCADE,
            FOREIGN KEY (linked_project_id) REFERENCES projects(id) ON DELETE SET NULL,
            FOREIGN KEY (created_task_id) REFERENCES tasks(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS plan_draft_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            draft_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            status TEXT NOT NULL,
            operator_name TEXT NOT NULL DEFAULT 'system',
            reason_code TEXT,
            reason_note TEXT,
            affected_task_ids_json TEXT,
            item_count INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (draft_id) REFERENCES plan_drafts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS daily_plan_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date_key TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            source_reason TEXT,
            created_from_type TEXT NOT NULL DEFAULT 'manual',
            base_version_id INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (base_version_id) REFERENCES daily_plan_versions(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS daily_plan_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version_id INTEGER NOT NULL,
            item_order INTEGER NOT NULL DEFAULT 1,
            title TEXT NOT NULL,
            module TEXT,
            estimated_minutes INTEGER,
            priority TEXT NOT NULL DEFAULT '中',
            source_reason TEXT,
            suggested_time_block TEXT,
            task_id INTEGER,
            is_completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (version_id) REFERENCES daily_plan_versions(id) ON DELETE CASCADE,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT NOT NULL UNIQUE,
            setting_value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS task_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_type TEXT NOT NULL,
            source_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT NOT NULL DEFAULT '中',
            suggested_deadline TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            applied_at TEXT
        );

        CREATE TABLE IF NOT EXISTS assistant_briefings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brief_type TEXT NOT NULL,
            date_key TEXT NOT NULL,
            summary_text TEXT NOT NULL,
            detail_json TEXT NOT NULL,
            risk_level TEXT NOT NULL DEFAULT 'low',
            auto_generated INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS assistant_briefing_suggestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            briefing_id INTEGER NOT NULL,
            suggestion_order INTEGER NOT NULL DEFAULT 0,
            title TEXT NOT NULL,
            action_type TEXT NOT NULL,
            action_payload_json TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            created_task_id INTEGER,
            applied_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (briefing_id) REFERENCES assistant_briefings(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS task_event_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            event_type TEXT NOT NULL,
            detail_json TEXT,
            reason_code TEXT,
            reason_note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path_unique ON files(file_path);
        CREATE INDEX IF NOT EXISTS idx_passages_bank_num ON passages(bank_id, passage_num);
        CREATE INDEX IF NOT EXISTS idx_questions_passage_num ON questions(passage_id, q_num);
        CREATE INDEX IF NOT EXISTS idx_question_attempt_logs_bank_date ON question_attempt_logs(bank_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_question_attempt_logs_question_date ON question_attempt_logs(question_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_question_annotations_passage ON question_annotations(passage_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_mistake_exam_records_question ON mistake_exam_records(question_id, created_at DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_target_url_unique ON school_watch_targets(target_url);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_web_sources_url_unique ON web_sources(url);
        CREATE INDEX IF NOT EXISTS idx_web_sources_category_project ON web_sources(category, linked_project_id, updated_at);
        CREATE INDEX IF NOT EXISTS idx_web_watchers_source_active ON web_watchers(source_id, is_active, updated_at);
        CREATE INDEX IF NOT EXISTS idx_web_watchers_frequency_checked ON web_watchers(check_frequency, last_checked_at);
        CREATE INDEX IF NOT EXISTS idx_web_change_logs_watcher_changed_at ON web_change_logs(watcher_id, changed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_web_change_logs_source_changed_at ON web_change_logs(source_id, changed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_web_change_logs_processed_at ON web_change_logs(processed_at, changed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_web_clippings_source ON web_clippings(source_id, created_at DESC);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_school_profiles_name_unique ON school_profiles(school_name);
        CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
        CREATE INDEX IF NOT EXISTS idx_recommendation_letters_project_id ON recommendation_letters(project_id);
        CREATE INDEX IF NOT EXISTS idx_recommendation_letters_status_due ON recommendation_letters(status, due_date);
        CREATE INDEX IF NOT EXISTS idx_task_event_logs_task_id ON task_event_logs(task_id);
        CREATE INDEX IF NOT EXISTS idx_library_import_logs_created_at ON library_import_logs(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_assistant_briefings_type_date ON assistant_briefings(brief_type, date_key, id DESC);
        CREATE INDEX IF NOT EXISTS idx_assistant_briefing_suggestions_briefing_id ON assistant_briefing_suggestions(briefing_id, suggestion_order);
        CREATE INDEX IF NOT EXISTS idx_study_analysis_logs_date_exam ON study_analysis_logs(date_key DESC, exam_type, subject);
        CREATE INDEX IF NOT EXISTS idx_weekly_growth_reviews_week ON weekly_growth_reviews(week_key, id DESC);
        CREATE INDEX IF NOT EXISTS idx_weekly_growth_reviews_week_range ON weekly_growth_reviews(week_range, id DESC);
        CREATE INDEX IF NOT EXISTS idx_plan_drafts_status_created ON plan_drafts(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_plan_draft_items_draft_order ON plan_draft_items(draft_id, item_order, id);
        CREATE INDEX IF NOT EXISTS idx_plan_draft_audit_logs_draft_created ON plan_draft_audit_logs(draft_id, id DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_plan_versions_date_status ON daily_plan_versions(date_key, status, id DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_plan_items_version_order ON daily_plan_items(version_id, item_order, id);
        CREATE INDEX IF NOT EXISTS idx_study_analysis_logs_adoption_status ON study_analysis_logs(adoption_status, date_key DESC);
        "#,
    )?;

    migrate_tasks_schema(&connection)?;
    migrate_question_bank_schema(&connection)?;
    migrate_notifications_schema(&connection)?;
    migrate_feishu_logs_schema(&connection)?;
    migrate_web_monitor_schema(&connection)?;
    migrate_study_analysis_schema(&connection)?;
    migrate_daily_plan_schema(&connection)?;
    migrate_recommendation_letters_schema(&connection)?;
    migrate_projects_schema(&connection)?;
    migrate_library_search_schema(&connection)?;

    Ok(())
}

fn migrate_projects_schema(connection: &Connection) -> Result<()> {
    let migrations = [
        ("official_url", "ALTER TABLE projects ADD COLUMN official_url TEXT"),
        ("chinese_name", "ALTER TABLE projects ADD COLUMN chinese_name TEXT"),
        ("country", "ALTER TABLE projects ADD COLUMN country TEXT"),
        ("country_color", "ALTER TABLE projects ADD COLUMN country_color TEXT"),
    ];
    for (column, ddl) in migrations {
        if !column_exists(connection, "projects", column)? {
            connection.execute(ddl, [])?;
        }
    }
    Ok(())
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool> {
    let mut statement = connection.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    )?;
    let value = statement
        .query_row(params![table_name], |row| row.get::<_, i64>(0))
        .optional()?;
    Ok(value.is_some())
}

fn column_exists(connection: &Connection, table_name: &str, column_name: &str) -> Result<bool> {
    let mut statement = connection.prepare(&format!("PRAGMA table_info({table_name})"))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(1))?;
    for name in rows {
        if name? == column_name {
            return Ok(true);
        }
    }
    Ok(false)
}

fn migrate_library_search_schema(connection: &Connection) -> Result<()> {
    // FTS5 may be unavailable on some sqlite builds; keep startup resilient.
    if connection
        .execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(file_id UNINDEXED, file_name, file_path, category, file_type, tags_json, summary, tokenize='unicode61')",
            [],
        )
        .is_err()
    {
        return Ok(());
    }
    let file_count: i64 = connection
        .query_row("SELECT COUNT(1) FROM files", [], |row| row.get(0))
        .unwrap_or(0);
    let fts_count: i64 = connection
        .query_row("SELECT COUNT(1) FROM files_fts", [], |row| row.get(0))
        .unwrap_or(0);
    if file_count != fts_count {
        rebuild_files_fts(connection)?;
    }
    Ok(())
}

fn has_files_fts(connection: &Connection) -> bool {
    table_exists(connection, "files_fts").unwrap_or(false)
}

fn rebuild_files_fts(connection: &Connection) -> Result<()> {
    if !has_files_fts(connection) {
        return Ok(());
    }
    connection.execute("DELETE FROM files_fts", [])?;
    connection.execute(
        r#"
        INSERT INTO files_fts (file_id, file_name, file_path, category, file_type, tags_json, summary)
        SELECT
            id,
            COALESCE(file_name, ''),
            COALESCE(file_path, ''),
            COALESCE(category, ''),
            COALESCE(file_type, ''),
            COALESCE(tags_json, ''),
            COALESCE(summary, '')
        FROM files
        "#,
        [],
    )?;
    Ok(())
}

fn sync_file_fts_entry(connection: &Connection, file_id: i64) -> Result<()> {
    if !has_files_fts(connection) {
        return Ok(());
    }
    connection.execute("DELETE FROM files_fts WHERE file_id = ?", params![file_id])?;
    connection.execute(
        r#"
        INSERT INTO files_fts (file_id, file_name, file_path, category, file_type, tags_json, summary)
        SELECT
            id,
            COALESCE(file_name, ''),
            COALESCE(file_path, ''),
            COALESCE(category, ''),
            COALESCE(file_type, ''),
            COALESCE(tags_json, ''),
            COALESCE(summary, '')
        FROM files
        WHERE id = ?
        "#,
        params![file_id],
    )?;
    Ok(())
}

fn build_files_fts_query(raw_query: &str, tokens: &[String], match_any: bool) -> Option<String> {
    let mut terms = if tokens.is_empty() {
        vec![raw_query.trim().to_string()]
    } else {
        tokens.to_vec()
    };
    terms.retain(|token| !token.trim().is_empty());
    if terms.is_empty() {
        return None;
    }
    let quoted = terms
        .into_iter()
        .map(|token| format!("\"{}\"*", token.replace('"', "\"\"")))
        .collect::<Vec<_>>();
    let separator = if match_any { " OR " } else { " " };
    Some(quoted.join(separator))
}

fn search_files_by_fts(
    connection: &Connection,
    raw_query: &str,
    tokens: &[String],
    match_any: bool,
) -> Result<Option<Vec<(i64, f64)>>> {
    if !has_files_fts(connection) {
        return Ok(None);
    }
    let Some(fts_query) = build_files_fts_query(raw_query, tokens, match_any) else {
        return Ok(None);
    };
    let mut statement = match connection.prepare(
        "SELECT file_id, bm25(files_fts) AS rank FROM files_fts WHERE files_fts MATCH ? ORDER BY rank ASC LIMIT 400",
    ) {
        Ok(stmt) => stmt,
        Err(_) => return Ok(None),
    };
    let rows = match statement.query_map(params![fts_query], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(1).unwrap_or(0.0)))
    }) {
        Ok(rows) => rows,
        Err(_) => return Ok(None),
    };
    let mut results = Vec::new();
    for item in rows {
        if let Ok(row) = item {
            results.push(row);
        }
    }
    if results.is_empty() {
        return Ok(Some(Vec::new()));
    }
    Ok(Some(results))
}

fn migrate_tasks_schema(connection: &Connection) -> Result<()> {
    let migrations = [
        ("time_start", "ALTER TABLE tasks ADD COLUMN time_start TEXT"),
        ("time_end", "ALTER TABLE tasks ADD COLUMN time_end TEXT"),
        ("recurrence_enabled", "ALTER TABLE tasks ADD COLUMN recurrence_enabled INTEGER NOT NULL DEFAULT 0"),
        ("recurrence_type", "ALTER TABLE tasks ADD COLUMN recurrence_type TEXT"),
        ("recurrence_interval", "ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER"),
        ("recurrence_days_of_week", "ALTER TABLE tasks ADD COLUMN recurrence_days_of_week TEXT"),
        ("recurrence_day_of_month", "ALTER TABLE tasks ADD COLUMN recurrence_day_of_month INTEGER"),
        ("recurrence_until", "ALTER TABLE tasks ADD COLUMN recurrence_until TEXT"),
        ("recurrence_source_task_id", "ALTER TABLE tasks ADD COLUMN recurrence_source_task_id INTEGER"),
        ("completion_tag", "ALTER TABLE tasks ADD COLUMN completion_tag TEXT"),
        ("last_delay_reason_code", "ALTER TABLE tasks ADD COLUMN last_delay_reason_code TEXT"),
        ("last_delay_reason_note", "ALTER TABLE tasks ADD COLUMN last_delay_reason_note TEXT"),
    ];
    for (column, ddl) in migrations {
        if !column_exists(connection, "tasks", column)? {
            connection.execute(ddl, [])?;
        }
    }
    Ok(())
}

fn migrate_question_bank_schema(connection: &Connection) -> Result<()> {
    if table_exists(connection, "questions")? && !column_exists(connection, "questions", "has_answer")? {
        connection.execute(
            "ALTER TABLE questions ADD COLUMN has_answer INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }
    if table_exists(connection, "questions")? {
        connection.execute(
            "UPDATE questions SET has_answer = CASE WHEN correct_answer IS NOT NULL AND TRIM(correct_answer) <> '' THEN 1 ELSE COALESCE(has_answer, 0) END",
            [],
        )?;
    }
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS question_attempt_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_id INTEGER NOT NULL,
            passage_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            q_type TEXT,
            my_answer TEXT,
            correct_answer TEXT,
            answer_source INTEGER NOT NULL DEFAULT 0,
            is_correct INTEGER,
            time_spent_seconds INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE,
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
        )
        "#,
        [],
    )?;
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS question_annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            passage_id INTEGER NOT NULL,
            annotation_type TEXT NOT NULL DEFAULT 'highlight',
            quote_text TEXT,
            color TEXT,
            note_text TEXT,
            start_offset INTEGER,
            end_offset INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE
        )
        "#,
        [],
    )?;
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS mistake_exam_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            bank_name TEXT NOT NULL,
            passage_num INTEGER NOT NULL DEFAULT 0,
            q_type TEXT,
            q_text TEXT NOT NULL,
            my_answer TEXT,
            correct_answer TEXT,
            ai_analysis TEXT,
            error_type TEXT,
            passage_text TEXT,
            time_spent INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        )
        "#,
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_question_attempt_logs_bank_date ON question_attempt_logs(bank_id, created_at DESC)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_question_attempt_logs_question_date ON question_attempt_logs(question_id, created_at DESC)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_question_annotations_passage ON question_annotations(passage_id, created_at DESC)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_mistake_exam_records_question ON mistake_exam_records(question_id, created_at DESC)",
        [],
    )?;
    Ok(())
}

fn migrate_notifications_schema(connection: &Connection) -> Result<()> {
    let migrations = [
        ("source_type", "ALTER TABLE notifications ADD COLUMN source_type TEXT NOT NULL DEFAULT 'system'"),
        ("priority", "ALTER TABLE notifications ADD COLUMN priority TEXT NOT NULL DEFAULT 'info'"),
        ("is_read", "ALTER TABLE notifications ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0"),
        ("is_ignored", "ALTER TABLE notifications ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0"),
        ("snoozed_until", "ALTER TABLE notifications ADD COLUMN snoozed_until TEXT"),
        ("dedupe_key", "ALTER TABLE notifications ADD COLUMN dedupe_key TEXT"),
        ("aggregate_count", "ALTER TABLE notifications ADD COLUMN aggregate_count INTEGER NOT NULL DEFAULT 1"),
        ("first_seen_at", "ALTER TABLE notifications ADD COLUMN first_seen_at TEXT"),
        ("last_seen_at", "ALTER TABLE notifications ADD COLUMN last_seen_at TEXT"),
        ("updated_at", "ALTER TABLE notifications ADD COLUMN updated_at TEXT"),
        ("action_payload_json", "ALTER TABLE notifications ADD COLUMN action_payload_json TEXT"),
    ];
    for (column, ddl) in migrations {
        if !column_exists(connection, "notifications", column)? {
            connection.execute(ddl, [])?;
        }
    }
    connection.execute(
        "UPDATE notifications SET first_seen_at = COALESCE(first_seen_at, created_at), last_seen_at = COALESCE(last_seen_at, created_at), updated_at = COALESCE(updated_at, created_at)",
        [],
    )?;
    connection.execute(
        "UPDATE notifications SET source_type = CASE WHEN channel = 'watch' OR related_type = 'watch_target' THEN 'watch' WHEN title LIKE '%DDL%' THEN 'ddl' WHEN channel = 'feishu' THEN 'feishu' ELSE 'system' END WHERE source_type IS NULL OR source_type = ''",
        [],
    )?;
    connection.execute(
        "CREATE TABLE IF NOT EXISTS notification_action_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, notification_id INTEGER NOT NULL, action_name TEXT NOT NULL, action_payload_json TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE)",
        [],
    )?;
    // Guard against legacy DBs where the column add may not have happened yet.
    // (e.g. the user launched an older build once, then upgraded; we must never hard-fail init.)
    if column_exists(connection, "notifications", "dedupe_key")? {
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key ON notifications(dedupe_key)",
            [],
        )?;
    }
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_notifications_priority_read ON notifications(priority, is_read, created_at)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_notification_actions_notification_id ON notification_action_logs(notification_id)",
        [],
    )?;
    Ok(())
}

fn migrate_feishu_logs_schema(connection: &Connection) -> Result<()> {
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS feishu_message_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            direction TEXT NOT NULL DEFAULT 'inbound',
            source TEXT NOT NULL DEFAULT 'unknown',
            message_id TEXT,
            raw_text TEXT NOT NULL,
            normalized_text TEXT,
            parsed_action TEXT,
            parsed_payload_json TEXT,
            execution_status TEXT NOT NULL DEFAULT 'received',
            failure_code TEXT,
            failure_reason TEXT,
            dedupe_key TEXT,
            is_duplicate INTEGER NOT NULL DEFAULT 0,
            high_risk_required INTEGER NOT NULL DEFAULT 0,
            high_risk_confirmed INTEGER NOT NULL DEFAULT 0,
            created_task_id INTEGER,
            created_session_id INTEGER,
            related_notification_id INTEGER,
            latency_ms INTEGER,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#,
        [],
    )?;
    let migrations = [
        ("direction", "ALTER TABLE feishu_message_logs ADD COLUMN direction TEXT NOT NULL DEFAULT 'inbound'"),
        ("source", "ALTER TABLE feishu_message_logs ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown'"),
        ("message_id", "ALTER TABLE feishu_message_logs ADD COLUMN message_id TEXT"),
        ("raw_text", "ALTER TABLE feishu_message_logs ADD COLUMN raw_text TEXT NOT NULL DEFAULT ''"),
        ("normalized_text", "ALTER TABLE feishu_message_logs ADD COLUMN normalized_text TEXT"),
        ("parsed_action", "ALTER TABLE feishu_message_logs ADD COLUMN parsed_action TEXT"),
        ("parsed_payload_json", "ALTER TABLE feishu_message_logs ADD COLUMN parsed_payload_json TEXT"),
        ("execution_status", "ALTER TABLE feishu_message_logs ADD COLUMN execution_status TEXT NOT NULL DEFAULT 'received'"),
        ("failure_code", "ALTER TABLE feishu_message_logs ADD COLUMN failure_code TEXT"),
        ("failure_reason", "ALTER TABLE feishu_message_logs ADD COLUMN failure_reason TEXT"),
        ("dedupe_key", "ALTER TABLE feishu_message_logs ADD COLUMN dedupe_key TEXT"),
        ("is_duplicate", "ALTER TABLE feishu_message_logs ADD COLUMN is_duplicate INTEGER NOT NULL DEFAULT 0"),
        ("high_risk_required", "ALTER TABLE feishu_message_logs ADD COLUMN high_risk_required INTEGER NOT NULL DEFAULT 0"),
        ("high_risk_confirmed", "ALTER TABLE feishu_message_logs ADD COLUMN high_risk_confirmed INTEGER NOT NULL DEFAULT 0"),
        ("created_task_id", "ALTER TABLE feishu_message_logs ADD COLUMN created_task_id INTEGER"),
        ("created_session_id", "ALTER TABLE feishu_message_logs ADD COLUMN created_session_id INTEGER"),
        ("related_notification_id", "ALTER TABLE feishu_message_logs ADD COLUMN related_notification_id INTEGER"),
        ("latency_ms", "ALTER TABLE feishu_message_logs ADD COLUMN latency_ms INTEGER"),
        ("created_at", "ALTER TABLE feishu_message_logs ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ("updated_at", "ALTER TABLE feishu_message_logs ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
    ];
    for (column, ddl) in migrations {
        if !column_exists(connection, "feishu_message_logs", column)? {
            connection.execute(ddl, [])?;
        }
    }
    if column_exists(connection, "feishu_message_logs", "direction")?
        && column_exists(connection, "feishu_message_logs", "execution_status")?
        && column_exists(connection, "feishu_message_logs", "created_at")?
    {
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_feishu_logs_direction_status ON feishu_message_logs(direction, execution_status, created_at)",
            [],
        )?;
    }
    if column_exists(connection, "feishu_message_logs", "dedupe_key")? {
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_feishu_logs_dedupe_key ON feishu_message_logs(dedupe_key)",
            [],
        )?;
    }
    Ok(())
}

fn migrate_web_monitor_schema(connection: &Connection) -> Result<()> {
    if table_exists(connection, "web_sources")? {
        let source_migrations = [
            ("source_type", "ALTER TABLE web_sources ADD COLUMN source_type TEXT NOT NULL DEFAULT 'page'"),
            ("category", "ALTER TABLE web_sources ADD COLUMN category TEXT NOT NULL DEFAULT 'other'"),
            ("tags_json", "ALTER TABLE web_sources ADD COLUMN tags_json TEXT"),
            ("linked_project_id", "ALTER TABLE web_sources ADD COLUMN linked_project_id INTEGER"),
            ("linked_task_id", "ALTER TABLE web_sources ADD COLUMN linked_task_id INTEGER"),
            ("linked_file_id", "ALTER TABLE web_sources ADD COLUMN linked_file_id INTEGER"),
            ("updated_at", "ALTER TABLE web_sources ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ];
        for (column, ddl) in source_migrations {
            if !column_exists(connection, "web_sources", column)? {
                connection.execute(ddl, [])?;
            }
        }
    }
    if table_exists(connection, "web_watchers")? {
        let watcher_migrations = [
            ("watch_type", "ALTER TABLE web_watchers ADD COLUMN watch_type TEXT NOT NULL DEFAULT 'full_page_text'"),
            ("selector_rule", "ALTER TABLE web_watchers ADD COLUMN selector_rule TEXT"),
            ("check_frequency", "ALTER TABLE web_watchers ADD COLUMN check_frequency TEXT NOT NULL DEFAULT 'daily'"),
            ("last_status", "ALTER TABLE web_watchers ADD COLUMN last_status TEXT NOT NULL DEFAULT 'ok'"),
            ("error_message", "ALTER TABLE web_watchers ADD COLUMN error_message TEXT"),
            ("updated_at", "ALTER TABLE web_watchers ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ];
        for (column, ddl) in watcher_migrations {
            if !column_exists(connection, "web_watchers", column)? {
                connection.execute(ddl, [])?;
            }
        }
    }
    if table_exists(connection, "web_change_logs")? {
        let change_migrations = [
            ("source_id", "ALTER TABLE web_change_logs ADD COLUMN source_id INTEGER"),
            ("ai_summary", "ALTER TABLE web_change_logs ADD COLUMN ai_summary TEXT"),
            ("change_direction", "ALTER TABLE web_change_logs ADD COLUMN change_direction TEXT"),
            ("processed_at", "ALTER TABLE web_change_logs ADD COLUMN processed_at TEXT"),
            ("processed_task_id", "ALTER TABLE web_change_logs ADD COLUMN processed_task_id INTEGER"),
        ];
        for (column, ddl) in change_migrations {
            if !column_exists(connection, "web_change_logs", column)? {
                connection.execute(ddl, [])?;
            }
        }
    }
    if table_exists(connection, "web_clippings")? {
        let clipping_migrations = [
            ("saved_as_note", "ALTER TABLE web_clippings ADD COLUMN saved_as_note INTEGER NOT NULL DEFAULT 0"),
            (
                "saved_as_library_item",
                "ALTER TABLE web_clippings ADD COLUMN saved_as_library_item INTEGER NOT NULL DEFAULT 0",
            ),
        ];
        for (column, ddl) in clipping_migrations {
            if !column_exists(connection, "web_clippings", column)? {
                connection.execute(ddl, [])?;
            }
        }
    }
    if table_exists(connection, "web_presets")? {
        if !column_exists(connection, "web_presets", "default_category")? {
            connection.execute(
                "ALTER TABLE web_presets ADD COLUMN default_category TEXT NOT NULL DEFAULT 'other'",
                [],
            )?;
        }
    }

    connection.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_web_sources_url_unique ON web_sources(url)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_sources_category_project ON web_sources(category, linked_project_id, updated_at)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_watchers_source_active ON web_watchers(source_id, is_active, updated_at)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_watchers_frequency_checked ON web_watchers(check_frequency, last_checked_at)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_change_logs_watcher_changed_at ON web_change_logs(watcher_id, changed_at DESC)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_change_logs_source_changed_at ON web_change_logs(source_id, changed_at DESC)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_change_logs_processed_at ON web_change_logs(processed_at, changed_at DESC)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_web_clippings_source ON web_clippings(source_id, created_at DESC)",
        [],
    )?;

    // Backward-compatible migration: old school_watch_targets => new web_sources/web_watchers
    if table_exists(connection, "school_watch_targets")? {
        connection.execute_batch(
            r#"
            INSERT INTO web_sources (title, url, source_type, category, tags_json, created_at, updated_at)
            SELECT
                COALESCE(NULLIF(TRIM(swt.page_label), ''), 'Web Page') || ' · ' || COALESCE(NULLIF(TRIM(swt.school_name), ''), 'Source'),
                swt.target_url,
                'page',
                'application',
                NULL,
                COALESCE(swt.created_at, CURRENT_TIMESTAMP),
                COALESCE(swt.updated_at, CURRENT_TIMESTAMP)
            FROM school_watch_targets swt
            WHERE swt.target_url IS NOT NULL
              AND TRIM(swt.target_url) <> ''
              AND NOT EXISTS (
                SELECT 1 FROM web_sources ws WHERE ws.url = swt.target_url
              );

            INSERT INTO web_watchers (
                source_id, watcher_name, target_url, watch_type, selector_rule, check_frequency,
                is_active, last_checked_at, last_hash, last_status, error_message, created_at, updated_at
            )
            SELECT
                ws.id,
                COALESCE(NULLIF(TRIM(swt.page_label), ''), 'Legacy Watcher'),
                swt.target_url,
                'full_page_text',
                NULL,
                'daily',
                COALESCE(swt.is_active, 1),
                swt.last_checked_at,
                swt.last_hash,
                CASE WHEN swt.last_checked_at IS NULL THEN 'ok' ELSE 'ok' END,
                NULL,
                COALESCE(swt.created_at, CURRENT_TIMESTAMP),
                COALESCE(swt.updated_at, CURRENT_TIMESTAMP)
            FROM school_watch_targets swt
            JOIN web_sources ws ON ws.url = swt.target_url
            WHERE NOT EXISTS (
                SELECT 1 FROM web_watchers ww WHERE ww.target_url = swt.target_url
            );
            "#,
        )?;
    }

    let preset_count = connection
        .query_row("SELECT COUNT(1) FROM web_presets", [], |row| row.get::<_, i64>(0))
        .unwrap_or(0);
    let presets = [
            ("Programme / Official Page", "programme_official", "full_page_text", Some("main"), "weekly", "application"),
            ("Admissions / Apply Page", "admissions_apply", "selector_text", Some("main"), "daily", "application"),
            ("Deadline / Requirement Page", "deadline_requirement", "full_page_text", Some("main"), "daily", "application"),
            ("Scholarship / Fees Page", "scholarship_fees", "full_page_text", Some("main"), "weekly", "application"),
            ("Custom School Page", "custom_school_page", "full_page_text", None::<&str>, "manual", "application"),
            ("Study Resource Page", "study_resource", "full_page_text", None::<&str>, "weekly", "study"),
            ("Course Announcement Page", "course_announcement", "selector_text", Some("main"), "daily", "study"),
            ("Exam Info Page", "exam_info", "full_page_text", Some("main"), "daily", "study"),
            ("Blog / Article Tracking", "blog_article_tracking", "full_page_text", None::<&str>, "weekly", "study"),
            ("Documentation Page", "documentation_page", "full_page_text", None::<&str>, "weekly", "study"),
            ("Custom Learning Page", "custom_learning_page", "full_page_text", None::<&str>, "manual", "study"),
            ("Product / Price Page", "price_watch", "full_page_text", None::<&str>, "daily", "work"),
            ("Custom", "custom", "full_page_text", None::<&str>, "manual", "other"),
        ];
    if preset_count == 0 {
        for (name, preset_type, watch_type, selector, freq, category) in presets {
            connection.execute(
                r#"
                INSERT INTO web_presets (
                    preset_name, preset_type, default_watch_type, default_selector_rule,
                    default_check_frequency, default_category, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                "#,
                params![name, preset_type, watch_type, selector, freq, category],
            )?;
        }
    } else {
        connection.execute(
            "UPDATE web_presets SET default_category = CASE
                WHEN preset_type LIKE '%admission%' OR preset_type LIKE '%deadline%' OR preset_type LIKE '%scholarship%' OR preset_type LIKE '%school%' THEN 'application'
                WHEN preset_type LIKE '%study%' OR preset_type LIKE '%course%' OR preset_type LIKE '%exam%' OR preset_type LIKE '%blog%' OR preset_type LIKE '%doc%' OR preset_type LIKE '%learning%' THEN 'study'
                WHEN preset_type LIKE '%price%' THEN 'work'
                ELSE COALESCE(default_category, 'other')
             END
             WHERE default_category IS NULL OR TRIM(default_category) = ''",
            [],
        )?;
        for (name, preset_type, watch_type, selector, freq, category) in presets {
            connection.execute(
                r#"
                INSERT INTO web_presets (
                    preset_name, preset_type, default_watch_type, default_selector_rule,
                    default_check_frequency, default_category, created_at
                )
                SELECT ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
                WHERE NOT EXISTS (
                    SELECT 1 FROM web_presets WHERE preset_type = ?
                )
                "#,
                params![name, preset_type, watch_type, selector, freq, category, preset_type],
            )?;
        }
    }

    Ok(())
}

fn migrate_study_analysis_schema(connection: &Connection) -> Result<()> {
    if !table_exists(connection, "study_analysis_logs")? {
        return Ok(());
    }
    let migrations = [
        ("module", "ALTER TABLE study_analysis_logs ADD COLUMN module TEXT"),
        ("input_summary", "ALTER TABLE study_analysis_logs ADD COLUMN input_summary TEXT"),
        ("analysis_summary", "ALTER TABLE study_analysis_logs ADD COLUMN analysis_summary TEXT"),
        ("tomorrow_adjustment", "ALTER TABLE study_analysis_logs ADD COLUMN tomorrow_adjustment TEXT"),
        (
            "adoption_status",
            "ALTER TABLE study_analysis_logs ADD COLUMN adoption_status TEXT NOT NULL DEFAULT 'pending'",
        ),
        ("updated_at", "ALTER TABLE study_analysis_logs ADD COLUMN updated_at TEXT"),
    ];
    for (column, ddl) in migrations {
        if !column_exists(connection, "study_analysis_logs", column)? {
            connection.execute(ddl, [])?;
        }
    }
    connection.execute(
        r#"
        UPDATE study_analysis_logs
        SET
            input_summary = COALESCE(input_summary, material, performance_summary),
            analysis_summary = COALESCE(analysis_summary, performance_summary),
            tomorrow_adjustment = COALESCE(tomorrow_adjustment, suggested_adjustment),
            adoption_status = COALESCE(NULLIF(TRIM(adoption_status), ''), 'pending'),
            updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
        "#,
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_study_analysis_logs_adoption_status ON study_analysis_logs(adoption_status, date_key DESC)",
        [],
    )?;
    if table_exists(connection, "weekly_growth_reviews")? {
        let weekly_migrations = [
            ("week_range", "ALTER TABLE weekly_growth_reviews ADD COLUMN week_range TEXT"),
            (
                "linked_log_ids_json",
                "ALTER TABLE weekly_growth_reviews ADD COLUMN linked_log_ids_json TEXT",
            ),
            ("weekly_summary", "ALTER TABLE weekly_growth_reviews ADD COLUMN weekly_summary TEXT"),
            (
                "growth_points_json",
                "ALTER TABLE weekly_growth_reviews ADD COLUMN growth_points_json TEXT",
            ),
            (
                "persistent_weakness_json",
                "ALTER TABLE weekly_growth_reviews ADD COLUMN persistent_weakness_json TEXT",
            ),
            (
                "next_week_focus_json",
                "ALTER TABLE weekly_growth_reviews ADD COLUMN next_week_focus_json TEXT",
            ),
            (
                "schedule_adjustment_rules_json",
                "ALTER TABLE weekly_growth_reviews ADD COLUMN schedule_adjustment_rules_json TEXT",
            ),
            ("updated_at", "ALTER TABLE weekly_growth_reviews ADD COLUMN updated_at TEXT"),
        ];
        for (column, ddl) in weekly_migrations {
            if !column_exists(connection, "weekly_growth_reviews", column)? {
                connection.execute(ddl, [])?;
            }
        }
        connection.execute(
            r#"
            UPDATE weekly_growth_reviews
            SET
                week_range = COALESCE(week_range, week_key),
                weekly_summary = COALESCE(weekly_summary, summary_text),
                growth_points_json = COALESCE(growth_points_json, strengths_json),
                persistent_weakness_json = COALESCE(persistent_weakness_json, weaknesses_json),
                next_week_focus_json = COALESCE(next_week_focus_json, focus_json),
                updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
            "#,
            [],
        )?;
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_weekly_growth_reviews_week_range ON weekly_growth_reviews(week_range, id DESC)",
            [],
        )?;
    }
    Ok(())
}

fn migrate_daily_plan_schema(connection: &Connection) -> Result<()> {
    if !table_exists(connection, "daily_plan_versions")? {
        connection.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS daily_plan_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date_key TEXT NOT NULL,
                title TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                source_reason TEXT,
                created_from_type TEXT NOT NULL DEFAULT 'manual',
                base_version_id INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (base_version_id) REFERENCES daily_plan_versions(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_daily_plan_versions_date_status ON daily_plan_versions(date_key, status, id DESC);
            "#,
        )?;
    }
    if !table_exists(connection, "daily_plan_items")? {
        connection.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS daily_plan_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                version_id INTEGER NOT NULL,
                item_order INTEGER NOT NULL DEFAULT 1,
                title TEXT NOT NULL,
                module TEXT,
                estimated_minutes INTEGER,
                priority TEXT NOT NULL DEFAULT '中',
                source_reason TEXT,
                suggested_time_block TEXT,
                task_id INTEGER,
                is_completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (version_id) REFERENCES daily_plan_versions(id) ON DELETE CASCADE,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_daily_plan_items_version_order ON daily_plan_items(version_id, item_order, id);
            "#,
        )?;
    }
    connection.execute(
        "UPDATE daily_plan_versions SET status = CASE WHEN status IN ('accepted','superseded','draft') THEN status ELSE 'draft' END, updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)",
        [],
    )?;
    connection.execute(
        "UPDATE daily_plan_items SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)",
        [],
    )?;
    Ok(())
}

fn migrate_recommendation_letters_schema(connection: &Connection) -> Result<()> {
    connection.execute(
        r#"
        CREATE TABLE IF NOT EXISTS recommendation_letters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            recommender_name TEXT NOT NULL,
            recommender_email TEXT,
            relationship TEXT,
            status TEXT NOT NULL DEFAULT '未请求',
            requested_at TEXT,
            due_date TEXT,
            submitted_at TEXT,
            last_followup_at TEXT,
            portal_link TEXT,
            linked_task_id INTEGER,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
        "#,
        [],
    )?;
    let migrations = [
        ("recommender_name", "ALTER TABLE recommendation_letters ADD COLUMN recommender_name TEXT NOT NULL DEFAULT ''"),
        ("recommender_email", "ALTER TABLE recommendation_letters ADD COLUMN recommender_email TEXT"),
        ("relationship", "ALTER TABLE recommendation_letters ADD COLUMN relationship TEXT"),
        ("status", "ALTER TABLE recommendation_letters ADD COLUMN status TEXT NOT NULL DEFAULT '未请求'"),
        ("requested_at", "ALTER TABLE recommendation_letters ADD COLUMN requested_at TEXT"),
        ("due_date", "ALTER TABLE recommendation_letters ADD COLUMN due_date TEXT"),
        ("submitted_at", "ALTER TABLE recommendation_letters ADD COLUMN submitted_at TEXT"),
        ("last_followup_at", "ALTER TABLE recommendation_letters ADD COLUMN last_followup_at TEXT"),
        ("portal_link", "ALTER TABLE recommendation_letters ADD COLUMN portal_link TEXT"),
        ("linked_task_id", "ALTER TABLE recommendation_letters ADD COLUMN linked_task_id INTEGER"),
        ("notes", "ALTER TABLE recommendation_letters ADD COLUMN notes TEXT"),
        ("created_at", "ALTER TABLE recommendation_letters ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
        ("updated_at", "ALTER TABLE recommendation_letters ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP"),
    ];
    for (column, ddl) in migrations {
        if !column_exists(connection, "recommendation_letters", column)? {
            connection.execute(ddl, [])?;
        }
    }
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_recommendation_letters_project_id ON recommendation_letters(project_id)",
        [],
    )?;
    connection.execute(
        "CREATE INDEX IF NOT EXISTS idx_recommendation_letters_status_due ON recommendation_letters(status, due_date)",
        [],
    )?;
    Ok(())
}

pub fn list_projects(path: &Path) -> Result<Vec<Project>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, school_name, program_name, country, degree_type, intake_term, application_round,
            deadline, status, priority, official_url, chinese_name, country_color, requirement_url, essay_url, recommendation_url,
            notes, created_at, updated_at
        FROM projects
        ORDER BY deadline IS NULL, deadline ASC, updated_at DESC
        "#,
    )?;

    let rows = statement.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            school_name: row.get(1)?,
            program_name: row.get(2)?,
            country: row.get(3)?,
            degree_type: row.get(4)?,
            intake_term: row.get(5)?,
            application_round: row.get(6)?,
            deadline: row.get(7)?,
            status: row.get(8)?,
            priority: row.get(9)?,
            official_url: row.get(10)?,
            chinese_name: row.get(11)?,
            country_color: row.get(12)?,
            requirement_url: row.get(13)?,
            essay_url: row.get(14)?,
            recommendation_url: row.get(15)?,
            notes: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    })?;

    rows.collect()
}

pub fn create_project(path: &Path, input: &NewProjectInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO projects (
            school_name, program_name, country, degree_type, intake_term, application_round,
            deadline, status, priority, official_url, chinese_name, country_color, requirement_url, essay_url, recommendation_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
            input.school_name,
            input.program_name,
            input.country,
            input.degree_type,
            input.intake_term,
            input.application_round,
            input.deadline,
            input.status,
            input.priority,
            input.official_url,
            input.chinese_name,
            input.country_color,
            input.requirement_url,
            input.essay_url,
            input.recommendation_url,
            input.notes,
        ],
    )?;
    ensure_school_profile(
        &connection,
        &input.school_name,
        input.country.as_deref(),
        input.official_url.as_deref(),
        input.notes.as_deref(),
    )?;

    Ok(connection.last_insert_rowid())
}

pub fn update_project(path: &Path, input: &UpdateProjectInput) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE projects SET
            school_name = ?,
            program_name = ?,
            country = ?,
            degree_type = ?,
            intake_term = ?,
            application_round = ?,
            deadline = ?,
            status = ?,
            priority = ?,
            official_url = ?,
            chinese_name = ?,
            country_color = ?,
            requirement_url = ?,
            essay_url = ?,
            recommendation_url = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            input.school_name,
            input.program_name,
            input.country,
            input.degree_type,
            input.intake_term,
            input.application_round,
            input.deadline,
            input.status,
            input.priority,
            input.official_url,
            input.chinese_name,
            input.country_color,
            input.requirement_url,
            input.essay_url,
            input.recommendation_url,
            input.notes,
            input.id,
        ],
    )?;
    ensure_school_profile(
        &connection,
        &input.school_name,
        input.country.as_deref(),
        input.official_url.as_deref(),
        input.notes.as_deref(),
    )?;

    Ok(())
}

fn ensure_school_profile(
    connection: &Connection,
    school_name: &str,
    country: Option<&str>,
    official_url: Option<&str>,
    notes: Option<&str>,
) -> Result<()> {
    let normalized = school_name.trim();
    if normalized.is_empty() {
        return Ok(());
    }
    connection.execute(
        r#"
        INSERT INTO school_profiles (school_name, country, official_url, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(school_name) DO UPDATE SET
            country = COALESCE(excluded.country, school_profiles.country),
            official_url = COALESCE(excluded.official_url, school_profiles.official_url),
            notes = COALESCE(excluded.notes, school_profiles.notes),
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![normalized, country, official_url, notes],
    )?;
    Ok(())
}

pub fn list_school_profiles(path: &Path) -> Result<Vec<SchoolProfile>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, school_name, country, official_url, notes, created_at, updated_at
        FROM school_profiles
        ORDER BY updated_at DESC, school_name ASC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(SchoolProfile {
            id: row.get(0)?,
            school_name: row.get(1)?,
            country: row.get(2)?,
            official_url: row.get(3)?,
            notes: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn delete_project(path: &Path, project_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    let school_name: Option<String> = connection
        .query_row(
            "SELECT school_name FROM projects WHERE id = ? LIMIT 1",
            params![project_id],
            |row| row.get(0),
        )
        .optional()?;

    // Clear soft links and task bindings first, then delete project-owned rows.
    if table_exists(&connection, "tasks")? {
        connection.execute(
            "UPDATE tasks SET source_type = NULL, source_id = NULL WHERE source_type = 'project' AND source_id = ?",
            params![project_id],
        )?;
    }
    if table_exists(&connection, "file_links")? {
        connection.execute(
            "DELETE FROM file_links WHERE link_type = 'project' AND link_id = ?",
            params![project_id],
        )?;
    }
    if table_exists(&connection, "task_suggestions")? {
        connection.execute(
            "UPDATE task_suggestions SET status = 'dismissed' WHERE source_type = 'project' AND source_id = ?",
            params![project_id],
        )?;
    }
    connection.execute(
        "DELETE FROM project_requirements WHERE project_id = ?",
        params![project_id],
    )?;
    connection.execute("DELETE FROM projects WHERE id = ?", params![project_id])?;
    if let Some(name) = school_name {
        let remain: i64 = connection
            .query_row(
                "SELECT COUNT(1) FROM projects WHERE school_name = ?",
                params![name],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if remain == 0 && table_exists(&connection, "school_profiles")? {
            connection.execute("DELETE FROM school_profiles WHERE school_name = ?", params![name])?;
        }
    }
    Ok(())
}

pub fn list_requirements(path: &Path, project_id: i64) -> Result<Vec<ProjectRequirement>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, project_id, requirement_type, title, description, status, due_date, created_at, updated_at
        FROM project_requirements
        WHERE project_id = ?
        ORDER BY due_date IS NULL, due_date ASC, updated_at DESC
        "#,
    )?;
    let rows = statement.query_map(params![project_id], |row| {
        Ok(ProjectRequirement {
            id: row.get(0)?,
            project_id: row.get(1)?,
            requirement_type: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            status: row.get(5)?,
            due_date: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;

    rows.collect()
}

pub fn create_requirement(path: &Path, input: &NewRequirementInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO project_requirements (
            project_id, requirement_type, title, description, status, due_date
        ) VALUES (?, ?, ?, ?, ?, ?)
        "#,
        params![
            input.project_id,
            input.requirement_type,
            input.title,
            input.description,
            input.status,
            input.due_date
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn update_requirement(path: &Path, input: &UpdateRequirementInput) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE project_requirements SET
            requirement_type = ?,
            title = ?,
            description = ?,
            status = ?,
            due_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            input.requirement_type,
            input.title,
            input.description,
            input.status,
            input.due_date,
            input.id,
        ],
    )?;
    Ok(())
}

pub fn delete_requirement(path: &Path, requirement_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    if table_exists(&connection, "project_documents")? {
        connection.execute(
            "UPDATE project_documents SET requirement_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE requirement_id = ?",
            params![requirement_id],
        )?;
    }
    connection.execute(
        "DELETE FROM project_requirements WHERE id = ?",
        params![requirement_id],
    )?;
    Ok(())
}

pub fn list_project_documents(path: &Path, project_id: i64) -> Result<Vec<ProjectDocument>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, project_id, requirement_id, document_type, title, version_label,
            file_path, status, notes, created_at, updated_at
        FROM project_documents
        WHERE project_id = ?
        ORDER BY updated_at DESC, id DESC
        "#,
    )?;
    let rows = statement.query_map(params![project_id], |row| {
        Ok(ProjectDocument {
            id: row.get(0)?,
            project_id: row.get(1)?,
            requirement_id: row.get(2)?,
            document_type: row.get(3)?,
            title: row.get(4)?,
            version_label: row.get(5)?,
            file_path: row.get(6)?,
            status: row.get(7)?,
            notes: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    rows.collect()
}

pub fn create_project_document(path: &Path, input: &NewProjectDocumentInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO project_documents (
            project_id, requirement_id, document_type, title, version_label, file_path, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
            input.project_id,
            input.requirement_id,
            input.document_type,
            input.title,
            input.version_label,
            input.file_path,
            input.status,
            input.notes
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn delete_project_document(path: &Path, document_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM project_documents WHERE id = ?", params![document_id])?;
    Ok(())
}

pub fn list_recommendation_letters(path: &Path, project_id: i64) -> Result<Vec<RecommendationLetter>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id,
            project_id,
            recommender_name,
            recommender_email,
            relationship,
            status,
            requested_at,
            due_date,
            submitted_at,
            last_followup_at,
            portal_link,
            linked_task_id,
            notes,
            created_at,
            updated_at
        FROM recommendation_letters
        WHERE project_id = ?
        ORDER BY
            CASE status
                WHEN '已提交' THEN 3
                WHEN '已完成' THEN 3
                WHEN '跟进中' THEN 2
                WHEN '已请求' THEN 1
                WHEN '未请求' THEN 0
                ELSE 1
            END ASC,
            due_date IS NULL,
            due_date ASC,
            updated_at DESC,
            id DESC
        "#,
    )?;
    let rows = statement.query_map(params![project_id], |row| {
        Ok(RecommendationLetter {
            id: row.get(0)?,
            project_id: row.get(1)?,
            recommender_name: row.get(2)?,
            recommender_email: row.get(3)?,
            relationship: row.get(4)?,
            status: row.get(5)?,
            requested_at: row.get(6)?,
            due_date: row.get(7)?,
            submitted_at: row.get(8)?,
            last_followup_at: row.get(9)?,
            portal_link: row.get(10)?,
            linked_task_id: row.get(11)?,
            notes: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    })?;
    rows.collect()
}

pub fn create_recommendation_letter(path: &Path, input: &NewRecommendationLetterInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO recommendation_letters (
            project_id,
            recommender_name,
            recommender_email,
            relationship,
            status,
            requested_at,
            due_date,
            submitted_at,
            last_followup_at,
            portal_link,
            linked_task_id,
            notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
            input.project_id,
            input.recommender_name,
            input.recommender_email,
            input.relationship,
            input.status,
            input.requested_at,
            input.due_date,
            input.submitted_at,
            input.last_followup_at,
            input.portal_link,
            input.linked_task_id,
            input.notes,
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn update_recommendation_letter(path: &Path, input: &UpdateRecommendationLetterInput) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE recommendation_letters SET
            recommender_name = ?,
            recommender_email = ?,
            relationship = ?,
            status = ?,
            requested_at = ?,
            due_date = ?,
            submitted_at = ?,
            last_followup_at = ?,
            portal_link = ?,
            linked_task_id = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            input.recommender_name,
            input.recommender_email,
            input.relationship,
            input.status,
            input.requested_at,
            input.due_date,
            input.submitted_at,
            input.last_followup_at,
            input.portal_link,
            input.linked_task_id,
            input.notes,
            input.id,
        ],
    )?;
    Ok(())
}

pub fn delete_recommendation_letter(path: &Path, letter_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        "DELETE FROM recommendation_letters WHERE id = ?",
        params![letter_id],
    )?;
    Ok(())
}

pub fn list_projects_by_school(path: &Path, school_name: &str) -> Result<Vec<Project>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, school_name, program_name, country, degree_type, intake_term, application_round,
            deadline, status, priority, official_url, chinese_name, country_color, requirement_url, essay_url, recommendation_url,
            notes, created_at, updated_at
        FROM projects
        WHERE school_name = ?
        ORDER BY updated_at DESC, id DESC
        "#,
    )?;
    let rows = statement.query_map(params![school_name], |row| {
        Ok(Project {
            id: row.get(0)?,
            school_name: row.get(1)?,
            program_name: row.get(2)?,
            country: row.get(3)?,
            degree_type: row.get(4)?,
            intake_term: row.get(5)?,
            application_round: row.get(6)?,
            deadline: row.get(7)?,
            status: row.get(8)?,
            priority: row.get(9)?,
            official_url: row.get(10)?,
            chinese_name: row.get(11)?,
            country_color: row.get(12)?,
            requirement_url: row.get(13)?,
            essay_url: row.get(14)?,
            recommendation_url: row.get(15)?,
            notes: row.get(16)?,
            created_at: row.get(17)?,
            updated_at: row.get(18)?,
        })
    })?;
    rows.collect()
}

pub fn seed_demo_data(path: &Path) -> Result<()> {
    let connection = Connection::open(path)?;
    let existing: Option<i64> = connection
        .query_row("SELECT id FROM projects LIMIT 1", [], |row| row.get(0))
        .optional()?;
    if existing.is_some() {
        return Ok(());
    }

    connection.execute(
        r#"
        INSERT INTO projects (
            school_name, program_name, country, degree_type, intake_term,
            application_round, deadline, status, priority, notes
        ) VALUES
        ('University College London', 'MSc Human-Computer Interaction', 'UK', 'Master', '2027 Fall', 'Round 1', '2026-12-15', '申请中', '高', '关注作品集与用户研究背景。'),
        ('Imperial College London', 'MSc Computing', 'UK', 'Master', '2027 Fall', 'Round 2', '2026-11-30', '待准备', '高', '强化算法与系统相关经历。'),
        ('HKUST', 'MSc Information Technology', 'Hong Kong', 'Master', '2027 Fall', 'Main', '2026-10-21', '待准备', '中', '提前准备成绩认证材料。')
        "#,
        [],
    )?;

    connection.execute(
        r#"
        INSERT INTO project_requirements (project_id, requirement_type, title, description, status, due_date)
        SELECT id, '文书', '个人陈述（SOP）', '完成第一版并进行导师反馈修订', '进行中', '2026-09-20'
        FROM projects WHERE school_name = 'University College London'
        "#,
        [],
    )?;
    connection.execute(
        r#"
        INSERT INTO project_requirements (project_id, requirement_type, title, description, status, due_date)
        SELECT id, '推荐信', '推荐信 2 封', '确认两位推荐老师并发送材料包', '未开始', '2026-09-25'
        FROM projects WHERE school_name = 'Imperial College London'
        "#,
        [],
    )?;
    connection.execute(
        r#"
        INSERT INTO project_requirements (project_id, requirement_type, title, description, status, due_date)
        SELECT id, '成绩', '语言成绩提交', 'IELTS 成绩达到目标后上传', '未开始', '2026-08-20'
        FROM projects WHERE school_name = 'HKUST'
        "#,
        [],
    )?;

    connection.execute(
        r#"
        INSERT INTO recommendation_letters (
            project_id,
            recommender_name,
            recommender_email,
            relationship,
            status,
            requested_at,
            due_date,
            last_followup_at,
            portal_link,
            notes
        )
        SELECT
            id,
            '导师 A',
            'prof.a@example.com',
            '课程项目导师',
            '已请求',
            '2026-08-10',
            '2026-09-25',
            '2026-09-01',
            NULL,
            '已发送材料包，等待确认上传。'
        FROM projects WHERE school_name = 'Imperial College London'
        "#,
        [],
    )?;
    connection.execute(
        r#"
        INSERT INTO recommendation_letters (
            project_id,
            recommender_name,
            recommender_email,
            relationship,
            status,
            requested_at,
            due_date,
            portal_link,
            notes
        )
        SELECT
            id,
            '导师 B',
            NULL,
            '实习主管',
            '未请求',
            NULL,
            '2026-09-25',
            NULL,
            '待确认是否愿意出推荐信；建议先约一次沟通。'
        FROM projects WHERE school_name = 'Imperial College London'
        "#,
        [],
    )?;

    Ok(())
}

pub fn list_tasks(path: &Path) -> Result<Vec<Task>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            t.id,
            t.title,
            t.description,
            t.source_type,
            t.source_id,
            CASE
                WHEN t.source_type = 'project' AND t.source_id IS NOT NULL THEN
                    (SELECT p.school_name || ' · ' || p.program_name FROM projects p WHERE p.id = t.source_id)
                ELSE NULL
            END AS source_label,
            t.task_type,
            t.priority,
            t.status,
            t.estimated_minutes,
            t.scheduled_date,
            t.time_start,
            t.time_end,
            (
                SELECT s.reminder_at
                FROM schedules s
                WHERE s.task_id = t.id
                ORDER BY s.updated_at DESC, s.id DESC
                LIMIT 1
            ) AS reminder_at,
            t.deadline,
            t.parent_task_id,
            t.recurrence_enabled,
            t.recurrence_type,
            t.recurrence_interval,
            t.recurrence_days_of_week,
            t.recurrence_day_of_month,
            t.recurrence_until,
            t.recurrence_source_task_id,
            t.completion_tag,
            t.last_delay_reason_code,
            t.last_delay_reason_note,
            t.created_at,
            t.updated_at
        FROM tasks t
        ORDER BY t.deadline IS NULL, t.deadline ASC, t.scheduled_date IS NULL, t.scheduled_date ASC, t.updated_at DESC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            source_type: row.get(3)?,
            source_id: row.get(4)?,
            source_label: row.get(5)?,
            task_type: row.get(6)?,
            priority: row.get(7)?,
            status: row.get(8)?,
            estimated_minutes: row.get(9)?,
            scheduled_date: row.get(10)?,
            time_start: row.get(11)?,
            time_end: row.get(12)?,
            reminder_at: row.get(13)?,
            deadline: row.get(14)?,
            parent_task_id: row.get(15)?,
            recurrence_enabled: row.get::<_, i64>(16)? == 1,
            recurrence_type: row.get(17)?,
            recurrence_interval: row.get(18)?,
            recurrence_days_of_week: row.get(19)?,
            recurrence_day_of_month: row.get(20)?,
            recurrence_until: row.get(21)?,
            recurrence_source_task_id: row.get(22)?,
            completion_tag: row.get(23)?,
            last_delay_reason_code: row.get(24)?,
            last_delay_reason_note: row.get(25)?,
            created_at: row.get(26)?,
            updated_at: row.get(27)?,
        })
    })?;
    rows.collect()
}

pub fn get_tasks_by_date(path: &Path, date: &str) -> Result<Vec<Task>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            t.id,
            t.title,
            t.description,
            t.source_type,
            t.source_id,
            CASE
                WHEN t.source_type = 'project' AND t.source_id IS NOT NULL THEN
                    (SELECT p.school_name || ' · ' || p.program_name FROM projects p WHERE p.id = t.source_id)
                ELSE NULL
            END AS source_label,
            t.task_type,
            t.priority,
            t.status,
            t.estimated_minutes,
            t.scheduled_date,
            t.time_start,
            t.time_end,
            (
                SELECT s.reminder_at
                FROM schedules s
                WHERE s.task_id = t.id
                ORDER BY s.updated_at DESC, s.id DESC
                LIMIT 1
            ) AS reminder_at,
            t.deadline,
            t.parent_task_id,
            t.recurrence_enabled,
            t.recurrence_type,
            t.recurrence_interval,
            t.recurrence_days_of_week,
            t.recurrence_day_of_month,
            t.recurrence_until,
            t.recurrence_source_task_id,
            t.completion_tag,
            t.last_delay_reason_code,
            t.last_delay_reason_note,
            t.created_at,
            t.updated_at
        FROM tasks t
        WHERE t.scheduled_date = ?
        ORDER BY t.time_start IS NULL, t.time_start ASC, t.deadline ASC, t.updated_at DESC
        "#,
    )?;
    let rows = statement.query_map(params![date], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            source_type: row.get(3)?,
            source_id: row.get(4)?,
            source_label: row.get(5)?,
            task_type: row.get(6)?,
            priority: row.get(7)?,
            status: row.get(8)?,
            estimated_minutes: row.get(9)?,
            scheduled_date: row.get(10)?,
            time_start: row.get(11)?,
            time_end: row.get(12)?,
            reminder_at: row.get(13)?,
            deadline: row.get(14)?,
            parent_task_id: row.get(15)?,
            recurrence_enabled: row.get::<_, i64>(16)? == 1,
            recurrence_type: row.get(17)?,
            recurrence_interval: row.get(18)?,
            recurrence_days_of_week: row.get(19)?,
            recurrence_day_of_month: row.get(20)?,
            recurrence_until: row.get(21)?,
            recurrence_source_task_id: row.get(22)?,
            completion_tag: row.get(23)?,
            last_delay_reason_code: row.get(24)?,
            last_delay_reason_note: row.get(25)?,
            created_at: row.get(26)?,
            updated_at: row.get(27)?,
        })
    })?;
    rows.collect()
}

pub fn get_tasks_by_date_range(path: &Path, start_date: &str, end_date: &str) -> Result<Vec<Task>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            t.id,
            t.title,
            t.description,
            t.source_type,
            t.source_id,
            CASE
                WHEN t.source_type = 'project' AND t.source_id IS NOT NULL THEN
                    (SELECT p.school_name || ' · ' || p.program_name FROM projects p WHERE p.id = t.source_id)
                ELSE NULL
            END AS source_label,
            t.task_type,
            t.priority,
            t.status,
            t.estimated_minutes,
            t.scheduled_date,
            t.time_start,
            t.time_end,
            (
                SELECT s.reminder_at
                FROM schedules s
                WHERE s.task_id = t.id
                ORDER BY s.updated_at DESC, s.id DESC
                LIMIT 1
            ) AS reminder_at,
            t.deadline,
            t.parent_task_id,
            t.recurrence_enabled,
            t.recurrence_type,
            t.recurrence_interval,
            t.recurrence_days_of_week,
            t.recurrence_day_of_month,
            t.recurrence_until,
            t.recurrence_source_task_id,
            t.completion_tag,
            t.last_delay_reason_code,
            t.last_delay_reason_note,
            t.created_at,
            t.updated_at
        FROM tasks t
        WHERE t.scheduled_date BETWEEN ? AND ?
        ORDER BY t.scheduled_date ASC, t.time_start IS NULL, t.time_start ASC, t.created_at ASC
        "#,
    )?;
    let rows = statement.query_map(params![start_date, end_date], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            source_type: row.get(3)?,
            source_id: row.get(4)?,
            source_label: row.get(5)?,
            task_type: row.get(6)?,
            priority: row.get(7)?,
            status: row.get(8)?,
            estimated_minutes: row.get(9)?,
            scheduled_date: row.get(10)?,
            time_start: row.get(11)?,
            time_end: row.get(12)?,
            reminder_at: row.get(13)?,
            deadline: row.get(14)?,
            parent_task_id: row.get(15)?,
            recurrence_enabled: row.get::<_, i64>(16)? == 1,
            recurrence_type: row.get(17)?,
            recurrence_interval: row.get(18)?,
            recurrence_days_of_week: row.get(19)?,
            recurrence_day_of_month: row.get(20)?,
            recurrence_until: row.get(21)?,
            recurrence_source_task_id: row.get(22)?,
            completion_tag: row.get(23)?,
            last_delay_reason_code: row.get(24)?,
            last_delay_reason_note: row.get(25)?,
            created_at: row.get(26)?,
            updated_at: row.get(27)?,
        })
    })?;
    rows.collect()
}

pub fn get_goals(path: &Path) -> Result<Vec<Goal>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, title, subject, total_amount, unit, daily_target, start_date, end_date,
               completed_amount, status, notes, created_at
        FROM goals
        ORDER BY start_date ASC, id ASC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Goal {
            id: row.get(0)?,
            title: row.get(1)?,
            subject: row.get(2)?,
            total_amount: row.get(3)?,
            unit: row.get(4)?,
            daily_target: row.get(5)?,
            start_date: row.get(6)?,
            end_date: row.get(7)?,
            completed_amount: row.get(8)?,
            status: row.get(9)?,
            notes: row.get(10)?,
            created_at: row.get(11)?,
        })
    })?;
    rows.collect()
}

pub fn log_goal_progress(path: &Path, goal_id: i64, date: &str, amount: i32) -> Result<()> {
    let mut connection = Connection::open(path)?;
    let transaction = connection.transaction()?;

    transaction.execute(
        r#"
        INSERT INTO goal_logs (goal_id, log_date, amount)
        VALUES (?, ?, ?)
        "#,
        params![goal_id, date, amount],
    )?;

    transaction.execute(
        r#"
        UPDATE goals
        SET completed_amount = COALESCE((
              SELECT SUM(gl.amount) FROM goal_logs gl WHERE gl.goal_id = goals.id
            ), 0),
            status = CASE
              WHEN COALESCE((
                SELECT SUM(gl.amount) FROM goal_logs gl WHERE gl.goal_id = goals.id
              ), 0) >= total_amount THEN 'completed'
              ELSE status
            END
        WHERE id = ?
        "#,
        params![goal_id],
    )?;

    transaction.commit()?;
    Ok(())
}

pub fn get_goal_log_by_date(path: &Path, date: &str) -> Result<Vec<GoalLog>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, goal_id, log_date, amount, notes, created_at
        FROM goal_logs
        WHERE log_date = ?
        ORDER BY id DESC
        "#,
    )?;
    let rows = statement.query_map(params![date], |row| {
        Ok(GoalLog {
            id: row.get(0)?,
            goal_id: row.get(1)?,
            log_date: row.get(2)?,
            amount: row.get(3)?,
            notes: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn get_today_goal_logs(path: &Path, date: &str) -> Result<Vec<GoalLog>> {
    get_goal_log_by_date(path, date)
}

pub fn batch_insert_goals(path: &Path, goals: &[GoalInput]) -> Result<()> {
    if goals.is_empty() {
        return Ok(());
    }
    let mut connection = Connection::open(path)?;
    let transaction = connection.transaction()?;
    for goal in goals {
        transaction.execute(
            r#"
            INSERT INTO goals (
                title, subject, total_amount, unit, daily_target, start_date, end_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                goal.title,
                goal.subject,
                goal.total_amount,
                goal.unit,
                goal.daily_target,
                goal.start_date,
                goal.end_date,
                goal.notes,
            ],
        )?;
    }
    transaction.commit()?;
    Ok(())
}

pub fn batch_insert_tasks(path: &Path, tasks: &[BatchTaskInput]) -> Result<()> {
    if tasks.is_empty() {
        return Ok(());
    }
    let mut connection = Connection::open(path)?;
    let transaction = connection.transaction()?;
    for task in tasks {
        transaction.execute(
            r#"
            INSERT INTO tasks (
                title, description, source_type, task_type, priority, status, estimated_minutes,
                scheduled_date, deadline
            ) VALUES (?, ?, 'ai_batch_import', ?, '中', '未开始', NULL, ?, ?)
            "#,
            params![task.title, task.notes, task.task_type, task.scheduled_date, task.scheduled_date],
        )?;
    }
    transaction.commit()?;
    Ok(())
}

pub fn get_daily_completion_stats(path: &Path, days: i32) -> Result<Vec<DailyStats>> {
    let connection = Connection::open(path)?;
    let days = days.max(1);
    let mut statement = connection.prepare(
        r#"
        WITH RECURSIVE day_series(d) AS (
          SELECT date('now', '-' || (?1 - 1) || ' day')
          UNION ALL
          SELECT date(d, '+1 day') FROM day_series WHERE d < date('now')
        ),
        task_agg AS (
          SELECT
            COALESCE(scheduled_date, deadline) AS d,
            COUNT(*) AS completed_count,
            COALESCE(SUM(COALESCE(estimated_minutes, 0)), 0) AS total_minutes
          FROM tasks
          WHERE status = '已完成'
          GROUP BY COALESCE(scheduled_date, deadline)
        ),
        goal_agg AS (
          SELECT
            log_date AS d,
            COUNT(*) AS goal_count
          FROM goal_logs
          GROUP BY log_date
        )
        SELECT
          day_series.d,
          COALESCE(task_agg.completed_count, 0) + COALESCE(goal_agg.goal_count, 0) AS count_value,
          COALESCE(task_agg.total_minutes, 0) AS minutes_value
        FROM day_series
        LEFT JOIN task_agg ON task_agg.d = day_series.d
        LEFT JOIN goal_agg ON goal_agg.d = day_series.d
        ORDER BY day_series.d ASC
        "#,
    )?;

    let rows = statement.query_map(params![days], |row| {
        Ok(DailyStats {
            date: row.get(0)?,
            count: row.get(1)?,
            minutes: row.get(2)?,
        })
    })?;
    rows.collect()
}

fn sync_task_schedule(connection: &Connection, task_id: i64, scheduled_date: Option<&String>, reminder_at: Option<&String>) -> Result<()> {
    connection.execute("DELETE FROM schedules WHERE task_id = ?", params![task_id])?;
    if scheduled_date.is_none() && reminder_at.is_none() {
        return Ok(());
    }

    connection.execute(
        r#"
        INSERT INTO schedules (task_id, start_time, end_time, calendar_type, reminder_at)
        VALUES (?, ?, NULL, 'local', ?)
        "#,
        params![task_id, scheduled_date, reminder_at],
    )?;
    Ok(())
}

pub fn create_task(path: &Path, input: &NewTaskInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO tasks (
            title, description, source_type, source_id, task_type,
            priority, status, estimated_minutes, scheduled_date, time_start, time_end, deadline, parent_task_id,
            recurrence_enabled, recurrence_type, recurrence_interval, recurrence_days_of_week,
            recurrence_day_of_month, recurrence_until, recurrence_source_task_id, completion_tag,
            last_delay_reason_code, last_delay_reason_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
            input.title,
            input.description,
            input.source_type,
            input.source_id,
            input.task_type,
            input.priority,
            input.status,
            input.estimated_minutes,
            input.scheduled_date,
            input.time_start,
            input.time_end,
            input.deadline,
            input.parent_task_id,
            if input.recurrence_enabled.unwrap_or(false) { 1 } else { 0 },
            input.recurrence_type,
            input.recurrence_interval,
            input.recurrence_days_of_week,
            input.recurrence_day_of_month,
            input.recurrence_until,
            input.recurrence_source_task_id,
            input.completion_tag,
            input.last_delay_reason_code,
            input.last_delay_reason_note,
        ],
    )?;
    let task_id = connection.last_insert_rowid();
    sync_task_schedule(&connection, task_id, input.scheduled_date.as_ref(), input.reminder_at.as_ref())?;
    Ok(task_id)
}

pub fn update_task(path: &Path, input: &UpdateTaskInput) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE tasks SET
            title = ?,
            description = ?,
            source_type = ?,
            source_id = ?,
            task_type = ?,
            priority = ?,
            status = ?,
            estimated_minutes = ?,
            scheduled_date = ?,
            time_start = ?,
            time_end = ?,
            deadline = ?,
            parent_task_id = ?,
            recurrence_enabled = ?,
            recurrence_type = ?,
            recurrence_interval = ?,
            recurrence_days_of_week = ?,
            recurrence_day_of_month = ?,
            recurrence_until = ?,
            recurrence_source_task_id = ?,
            completion_tag = ?,
            last_delay_reason_code = ?,
            last_delay_reason_note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            input.title,
            input.description,
            input.source_type,
            input.source_id,
            input.task_type,
            input.priority,
            input.status,
            input.estimated_minutes,
            input.scheduled_date,
            input.time_start,
            input.time_end,
            input.deadline,
            input.parent_task_id,
            if input.recurrence_enabled.unwrap_or(false) { 1 } else { 0 },
            input.recurrence_type,
            input.recurrence_interval,
            input.recurrence_days_of_week,
            input.recurrence_day_of_month,
            input.recurrence_until,
            input.recurrence_source_task_id,
            input.completion_tag,
            input.last_delay_reason_code,
            input.last_delay_reason_note,
            input.id
        ],
    )?;
    sync_task_schedule(&connection, input.id, input.scheduled_date.as_ref(), input.reminder_at.as_ref())?;
    Ok(())
}

pub fn update_task_priority(path: &Path, task_id: i64, priority: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE tasks
        SET priority = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![priority, task_id],
    )?;
    Ok(())
}

fn parse_date_only(value: &str) -> Option<NaiveDate> {
    let text = value.get(0..10).unwrap_or(value);
    NaiveDate::parse_from_str(text, "%Y-%m-%d").ok()
}

fn parse_hhmm_to_minutes(value: &str) -> Option<i64> {
    let mut parts = value.split(':');
    let hour = parts.next()?.trim().parse::<i64>().ok()?;
    let minute = parts.next()?.trim().parse::<i64>().ok()?;
    if !(0..=23).contains(&hour) || !(0..=59).contains(&minute) {
        return None;
    }
    Some(hour * 60 + minute)
}

fn compute_next_recurrence_date(task: &Task) -> Option<String> {
    if !task.recurrence_enabled {
        return None;
    }
    let recurrence_type = task.recurrence_type.as_deref().unwrap_or("none");
    if recurrence_type == "none" {
        return None;
    }
    let base = task
        .scheduled_date
        .as_deref()
        .and_then(parse_date_only)
        .or_else(|| task.deadline.as_deref().and_then(parse_date_only))?;
    let interval = task.recurrence_interval.unwrap_or(1).max(1);
    let mut next = base;
    match recurrence_type {
        "daily" => {
            next = base + Duration::days(interval);
        }
        "weekly" => {
            let days = task
                .recurrence_days_of_week
                .clone()
                .unwrap_or_else(|| "1".to_string());
            let selected = days
                .split(',')
                .filter_map(|v| v.trim().parse::<u32>().ok())
                .collect::<Vec<_>>();
            if selected.is_empty() {
                next = base + Duration::weeks(interval);
            } else {
                let mut found = None;
                for add in 1..=(14 * interval) {
                    let candidate = base + Duration::days(add as i64);
                    let weekday = match candidate.weekday() {
                        Weekday::Mon => 1_u32,
                        Weekday::Tue => 2_u32,
                        Weekday::Wed => 3_u32,
                        Weekday::Thu => 4_u32,
                        Weekday::Fri => 5_u32,
                        Weekday::Sat => 6_u32,
                        Weekday::Sun => 7_u32,
                    };
                    if selected.contains(&weekday) {
                        found = Some(candidate);
                        break;
                    }
                }
                next = found.unwrap_or(base + Duration::weeks(interval));
            }
        }
        "monthly" => {
            let day = task.recurrence_day_of_month.unwrap_or(base.day() as i64).clamp(1, 28) as u32;
            let mut year = base.year();
            let mut month = base.month() as i32 + interval as i32;
            while month > 12 {
                month -= 12;
                year += 1;
            }
            next = NaiveDate::from_ymd_opt(year, month as u32, day)?;
        }
        "custom_days" => {
            next = base + Duration::days(interval);
        }
        _ => return None,
    }
    if let Some(until) = task.recurrence_until.as_deref().and_then(parse_date_only) {
        if next > until {
            return None;
        }
    }
    Some(next.format("%Y-%m-%d").to_string())
}

pub fn create_task_event_log(
    path: &Path,
    task_id: i64,
    event_type: &str,
    detail_json: Option<&str>,
    reason_code: Option<&str>,
    reason_note: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO task_event_logs (task_id, event_type, detail_json, reason_code, reason_note, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![task_id, event_type, detail_json, reason_code, reason_note],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_task_event_logs(path: &Path, task_id: i64, limit: i64) -> Result<Vec<TaskEventLog>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, task_id, event_type, detail_json, reason_code, reason_note, created_at
        FROM task_event_logs
        WHERE task_id = ?
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![task_id, limit], |row| {
        Ok(TaskEventLog {
            id: row.get(0)?,
            task_id: row.get(1)?,
            event_type: row.get(2)?,
            detail_json: row.get(3)?,
            reason_code: row.get(4)?,
            reason_note: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn preview_task_conflicts(path: &Path, input: &TaskConflictCheckInput) -> Result<TaskConflictCheckResult> {
    let connection = Connection::open(path)?;
    let date = input.scheduled_date.as_deref().and_then(parse_date_only);
    if date.is_none() {
        return Ok(TaskConflictCheckResult {
            has_time_conflict: false,
            has_daily_load_risk: false,
            has_priority_risk: false,
            risk_level: "low".to_string(),
            messages: Vec::new(),
            conflicted_task_ids: Vec::new(),
        });
    }
    let date_text = date.unwrap().format("%Y-%m-%d").to_string();
    let mut statement = connection.prepare(
        r#"
        SELECT id, title, priority, estimated_minutes, scheduled_date, time_start, time_end
        FROM tasks
        WHERE status <> '已完成'
          AND (scheduled_date = ? OR deadline = ?)
        ORDER BY id DESC
        "#,
    )?;
    let mut rows = statement.query(params![date_text, date_text])?;
    let mut total_minutes = input.estimated_minutes.unwrap_or(0);
    let mut high_priority_count = if input.priority.as_deref() == Some("高") { 1 } else { 0 };
    let draft_start = input.time_start.as_deref().and_then(parse_hhmm_to_minutes);
    let draft_end = input.time_end.as_deref().and_then(parse_hhmm_to_minutes);
    let mut conflict_ids: Vec<i64> = Vec::new();
    while let Some(row) = rows.next()? {
        let id: i64 = row.get(0)?;
        if let Some(skip_id) = input.task_id {
            if id == skip_id {
                continue;
            }
        }
        let priority: String = row.get(2)?;
        let estimated: Option<i64> = row.get(3)?;
        let start: Option<String> = row.get(5)?;
        let end: Option<String> = row.get(6)?;
        total_minutes += estimated.unwrap_or(0);
        if priority == "高" {
            high_priority_count += 1;
        }
        if let (Some(ds), Some(de), Some(es), Some(ee)) = (
            draft_start,
            draft_end,
            start.as_deref().and_then(parse_hhmm_to_minutes),
            end.as_deref().and_then(parse_hhmm_to_minutes),
        ) {
            if ds < ee && de > es {
                conflict_ids.push(id);
            }
        }
    }
    let has_time_conflict = !conflict_ids.is_empty();
    let has_daily_load_risk = total_minutes > 8 * 60;
    let has_priority_risk = high_priority_count > 3;
    let mut messages = Vec::new();
    if has_time_conflict {
        messages.push("存在同时间段任务冲突，请调整开始/结束时间。".to_string());
    }
    if has_daily_load_risk {
        messages.push(format!("当天预计总负荷约 {} 分钟，超过 8 小时。", total_minutes));
    }
    if has_priority_risk {
        messages.push(format!("当天高优先级任务达到 {} 项，建议重新分配。", high_priority_count));
    }
    let risk_level = if has_time_conflict || (has_daily_load_risk && has_priority_risk) {
        "high"
    } else if has_daily_load_risk || has_priority_risk {
        "medium"
    } else {
        "low"
    }
    .to_string();
    Ok(TaskConflictCheckResult {
        has_time_conflict,
        has_daily_load_risk,
        has_priority_risk,
        risk_level,
        messages,
        conflicted_task_ids: conflict_ids,
    })
}

pub fn postpone_task(path: &Path, input: &PostponeTaskInput) -> Result<()> {
    let connection = Connection::open(path)?;
    let reminder_at: Option<String> = connection
        .query_row(
            r#"
            SELECT reminder_at
            FROM schedules
            WHERE task_id = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            "#,
            params![input.task_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();
    let current: Option<(Option<String>, Option<String>, Option<String>, Option<String>)> = connection
        .query_row(
            "SELECT scheduled_date, deadline, time_start, time_end FROM tasks WHERE id = ? LIMIT 1",
            params![input.task_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .optional()?;
    connection.execute(
        r#"
        UPDATE tasks
        SET scheduled_date = ?,
            deadline = ?,
            time_start = ?,
            time_end = ?,
            last_delay_reason_code = ?,
            last_delay_reason_note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            input.new_scheduled_date,
            input.new_deadline,
            input.new_time_start,
            input.new_time_end,
            input.reason_code,
            input.reason_note,
            input.task_id
        ],
    )?;
    let detail = serde_json::json!({
        "fromScheduledDate": current.as_ref().and_then(|v| v.0.clone()),
        "fromDeadline": current.as_ref().and_then(|v| v.1.clone()),
        "toScheduledDate": input.new_scheduled_date,
        "toDeadline": input.new_deadline,
        "fromTimeStart": current.as_ref().and_then(|v| v.2.clone()),
        "fromTimeEnd": current.as_ref().and_then(|v| v.3.clone()),
        "toTimeStart": input.new_time_start,
        "toTimeEnd": input.new_time_end
    })
    .to_string();
    connection.execute(
        r#"
        INSERT INTO task_event_logs (task_id, event_type, detail_json, reason_code, reason_note, created_at)
        VALUES (?, 'postpone', ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![input.task_id, detail, input.reason_code, input.reason_note],
    )?;
    sync_task_schedule(
        &connection,
        input.task_id,
        input.new_scheduled_date.as_ref(),
        reminder_at.as_ref(),
    )?;
    Ok(())
}

pub fn update_task_status(path: &Path, task_id: i64, status: &str, completion_tag: Option<&str>) -> Result<Option<i64>> {
    let connection = Connection::open(path)?;
    let task: Option<Task> = list_tasks(path)?.into_iter().find(|item| item.id == task_id);
    connection.execute(
        "UPDATE tasks SET status = ?, completion_tag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![status, completion_tag, task_id],
    )?;
    if status == "已完成" {
        let detail = serde_json::json!({ "status": status, "completionTag": completion_tag }).to_string();
        connection.execute(
            r#"
            INSERT INTO task_event_logs (task_id, event_type, detail_json, reason_code, reason_note, created_at)
            VALUES (?, 'complete', ?, NULL, NULL, CURRENT_TIMESTAMP)
            "#,
            params![task_id, detail],
        )?;
    }
    if status != "已完成" {
        return Ok(None);
    }
    let Some(current) = task else {
        return Ok(None);
    };
    if !current.recurrence_enabled {
        return Ok(None);
    }
    let Some(next_date) = compute_next_recurrence_date(&current) else {
        return Ok(None);
    };
    let exists: Option<i64> = connection
        .query_row(
            r#"
            SELECT id FROM tasks
            WHERE recurrence_source_task_id = ?
              AND COALESCE(scheduled_date, deadline) = ?
            LIMIT 1
            "#,
            params![current.recurrence_source_task_id.unwrap_or(current.id), next_date],
            |row| row.get(0),
        )
        .optional()?;
    if exists.is_some() {
        return Ok(None);
    }
    connection.execute(
        r#"
        INSERT INTO tasks (
            title, description, source_type, source_id, task_type,
            priority, status, estimated_minutes, scheduled_date, time_start, time_end, deadline, parent_task_id,
            recurrence_enabled, recurrence_type, recurrence_interval, recurrence_days_of_week,
            recurrence_day_of_month, recurrence_until, recurrence_source_task_id, completion_tag,
            last_delay_reason_code, last_delay_reason_note
        ) VALUES (?, ?, ?, ?, ?, ?, '未开始', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
        "#,
        params![
            current.title,
            current.description,
            current.source_type,
            current.source_id,
            current.task_type,
            current.priority,
            current.estimated_minutes,
            Some(next_date.clone()),
            current.time_start,
            current.time_end,
            Some(next_date.clone()),
            current.parent_task_id,
            1,
            current.recurrence_type,
            current.recurrence_interval,
            current.recurrence_days_of_week,
            current.recurrence_day_of_month,
            current.recurrence_until,
            current.recurrence_source_task_id.or(Some(current.id)),
        ],
    )?;
    let new_task_id = connection.last_insert_rowid();
    let next_schedule = Some(next_date.clone());
    sync_task_schedule(&connection, new_task_id, next_schedule.as_ref(), None)?;
    Ok(Some(new_task_id))
}

pub fn update_task_from_calendar(
    path: &Path,
    task_id: i64,
    title: &str,
    scheduled_date: Option<&str>,
    deadline: Option<&str>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE tasks
        SET title = ?,
            scheduled_date = ?,
            deadline = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![title, scheduled_date, deadline, task_id],
    )?;
    Ok(())
}

pub fn delete_task(path: &Path, task_id: i64) -> Result<()> {
    let mut connection = Connection::open(path)?;
    let transaction = connection.transaction()?;
    transaction.execute("DELETE FROM schedules WHERE task_id = ?", params![task_id])?;
    if table_exists(&transaction, "task_event_logs")? {
        transaction.execute("DELETE FROM task_event_logs WHERE task_id = ?", params![task_id])?;
    }
    transaction.execute("UPDATE pomodoro_sessions SET task_id = NULL WHERE task_id = ?", params![task_id])?;
    transaction.execute(
        "DELETE FROM file_links WHERE link_type = 'task' AND link_id = ?",
        params![task_id],
    )?;
    if table_exists(&transaction, "notifications")? && column_exists(&transaction, "notifications", "related_type")? {
        transaction.execute(
            "UPDATE notifications SET related_id = NULL WHERE related_type = 'task' AND related_id = ?",
            params![task_id],
        )?;
    }
    if table_exists(&transaction, "feishu_message_logs")? && column_exists(&transaction, "feishu_message_logs", "created_task_id")? {
        transaction.execute(
            "UPDATE feishu_message_logs SET created_task_id = NULL WHERE created_task_id = ?",
            params![task_id],
        )?;
    }
    if table_exists(&transaction, "assistant_briefing_suggestions")?
        && column_exists(&transaction, "assistant_briefing_suggestions", "created_task_id")?
    {
        transaction.execute(
            "UPDATE assistant_briefing_suggestions SET created_task_id = NULL WHERE created_task_id = ?",
            params![task_id],
        )?;
    }

    let event_key = format!("feishu_calendar_event_task_{task_id}");
    let sync_error_key = format!("feishu_calendar_sync_error_task_{task_id}");
    if table_exists(&transaction, "app_settings")? && column_exists(&transaction, "app_settings", "setting_key")? {
        transaction.execute(
            "DELETE FROM app_settings WHERE setting_key IN (?, ?)",
            params![event_key, sync_error_key],
        )?;
    }

    transaction.execute("DELETE FROM tasks WHERE id = ?", params![task_id])?;
    transaction.commit()?;
    Ok(())
}

pub fn seed_task_demo_data(path: &Path) -> Result<()> {
    let connection = Connection::open(path)?;
    let existing: Option<i64> = connection
        .query_row("SELECT id FROM tasks LIMIT 1", [], |row| row.get(0))
        .optional()?;
    if existing.is_some() {
        return Ok(());
    }

    connection.execute(
        r#"
        INSERT INTO tasks (
            title, description, source_type, source_id, task_type,
            priority, status, estimated_minutes, scheduled_date, deadline
        )
        VALUES
            ('完成 UCL SOP 第一版', '先写结构，再补案例支撑', 'project', (SELECT id FROM projects ORDER BY id LIMIT 1), '申请', '高', '未开始', 120, date('now'), date('now', '+2 day')),
            ('GRE 阅读 2 套限时训练', '记录错因并回顾长难句', NULL, NULL, '备考', '中', '进行中', 90, date('now'), date('now', '+1 day')),
            ('整理作品集视频清单', '将素材分类并命名统一', 'project', (SELECT id FROM projects ORDER BY id DESC LIMIT 1), '作品集', '中', '已完成', 45, date('now', '+3 day'), date('now', '+5 day')),
            ('推荐信材料包发送', '给两位推荐人发送简历和项目摘要', 'project', (SELECT id FROM projects ORDER BY id LIMIT 1 OFFSET 1), '申请', '高', '未开始', 30, date('now', '+1 day'), date('now', '+4 day'))
        "#,
        [],
    )?;
    connection.execute(
        r#"
        INSERT INTO schedules (task_id, start_time, end_time, calendar_type, reminder_at)
        SELECT id, scheduled_date, NULL, 'local', datetime(scheduled_date || ' 20:00:00')
        FROM tasks
        WHERE scheduled_date IS NOT NULL
        "#,
        [],
    )?;
    Ok(())
}

pub fn seed_real_study_data(path: &Path) -> Result<()> {
    let connection = Connection::open(path)?;
    let already_seeded: Option<String> = connection
        .query_row(
            "SELECT setting_value FROM app_settings WHERE setting_key = 'real_seed_version' LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?;
    if already_seeded.as_deref() == Some("2026-04-19-v4") {
        return Ok(());
    }

    connection.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS vocab_phases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exam TEXT NOT NULL,
          phase_name TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          words_per_day INTEGER NOT NULL,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          school_name TEXT NOT NULL,
          program TEXT NOT NULL,
          country TEXT NOT NULL,
          status TEXT DEFAULT '追踪中',
          deadline TEXT,
          official_url TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES
          ('ielts_exam_date', '2026-06-03', CURRENT_TIMESTAMP),
          ('ielts_target_score', '7.5', CURRENT_TIMESTAMP),
          ('ielts_current_score', '6.5', CURRENT_TIMESTAMP),
          ('gre_exam_date', '2026-07-17', CURRENT_TIMESTAMP),
          ('gre_target_score', '325', CURRENT_TIMESTAMP),
          ('daily_study_limit_minutes', '600', CURRENT_TIMESTAMP),
          ('start_date', '2026-04-19', CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = CURRENT_TIMESTAMP;

        DELETE FROM vocab_phases;
        INSERT INTO vocab_phases (exam, phase_name, start_date, end_date, words_per_day, notes) VALUES
          ('雅思', '第1遍', '2026-04-19', '2026-05-04', 160, '上午100词+下午60词，跟读+听写，10词一组'),
          ('雅思', '第2遍', '2026-05-05', '2026-05-20', 160, '上午100词+下午60词，标注难词'),
          ('雅思', '第3遍速刷', '2026-05-21', '2026-06-02', 192, '纯确认，3秒/词，标红不认识的'),
          ('雅思', '考前最后一天', '2026-06-03', '2026-06-03', 0, '轻量复习，睡眠优先'),
          ('GRE', '第1遍', '2026-04-19', '2026-05-23', 100, '上午60词+下午40词，看例句理解'),
          ('GRE', '第2遍', '2026-05-24', '2026-06-20', 125, '雅思后提速，配合Verbal刷题'),
          ('GRE', '第3遍速刷', '2026-06-21', '2026-07-16', 135, '纯确认，下午错词精讲'),
          ('GRE', '考前收尾', '2026-07-17', '2026-07-17', 0, '仅高频难词30分钟，睡眠优先');

        DELETE FROM applications;
        INSERT INTO applications (school_name, program, country, status, deadline, official_url, notes) VALUES
          ('HKU', 'MSc Marketing', '香港', '追踪中', '2026-12-01', 'https://masters.hkubs.hku.hk', '滚动录取，越早越好，主轮约12月'),
          ('CUHK', 'MSc Marketing', '香港', '追踪中', '2026-12-01', 'https://www.gs.cuhk.edu.hk', '主轮12月1日，清仓轮2027年3月31日'),
          ('HKUST', 'MSc Global Marketing', '香港', '追踪中', '2026-08-15', 'https://mscmark.hkust.edu.hk', '优先轮2026年7-8月，GRE考完立即申请'),
          ('NUS', 'MSc Marketing Analytics & Insights', '新加坡', '追踪中', '2027-02-15', 'https://mscmarketing.nus.edu.sg', '第一轮约11月，最终截止2月，滚动录取'),
          ('NTU', 'MSc Marketing Science', '新加坡', '追踪中', '2027-01-31', 'https://www.ntu.edu.sg/business/admissions/graduate-studies/msc-marketing-science', '三个轮次：11月30日/1月31日/3月31日'),
          ('LSE', 'MSc Marketing', '英国', '追踪中', '2027-04-01', 'https://www.lse.ac.uk', '滚动录取，早申有优势，约2027年初截止'),
          ('Imperial College London', 'MSc Marketing', '英国', '追踪中', '2027-03-01', 'https://www.imperial.ac.uk', '滚动录取，建议2027年初提交'),
          ('University of Melbourne', 'Master of Marketing', '澳大利亚', '追踪中', '2026-08-31', 'https://study.unimelb.edu.au', '27年入学截止2026年8月31日，较早，注意'),
          ('University of Sydney', 'Master of Marketing', '澳大利亚', '追踪中', '2026-12-01', 'https://www.sydney.edu.au', '参考其他项目，约2026年底截止');

        DELETE FROM goals;
        INSERT INTO goals (title, subject, total_amount, unit, daily_target, start_date, end_date, notes) VALUES
          ('雅思单词第1遍', '雅思', 2500, '词', 160, '2026-04-19', '2026-05-04', '上午100词+下午60词，跟读+听写'),
          ('雅思单词第2遍', '雅思', 2500, '词', 160, '2026-05-05', '2026-05-20', '上午100词+下午60词，标注难词'),
          ('雅思单词第3遍速刷', '雅思', 2500, '词', 192, '2026-05-21', '2026-06-02', '纯确认，3秒/词'),
          ('GRE单词第1遍', 'GRE', 3500, '词', 100, '2026-04-19', '2026-05-23', '上午60词+下午40词，看例句'),
          ('GRE单词第2遍', 'GRE', 3500, '词', 125, '2026-05-24', '2026-06-20', '配合Verbal刷题'),
          ('GRE单词第3遍速刷', 'GRE', 3500, '词', 135, '2026-06-21', '2026-07-16', '纯确认，错词精讲');

        DELETE FROM goal_logs;

        DELETE FROM projects
        WHERE notes = 'real-seed-2026-04-18';
        INSERT INTO projects (
          school_name, program_name, country, deadline, status, priority, official_url, notes
        ) VALUES
          ('HKU', 'MSc Marketing', '香港', '2026-12-01', '追踪中', '中', 'https://masters.hkubs.hku.hk', 'real-seed-2026-04-18'),
          ('CUHK', 'MSc Marketing', '香港', '2026-12-01', '追踪中', '中', 'https://www.gs.cuhk.edu.hk', 'real-seed-2026-04-18'),
          ('HKUST', 'MSc Global Marketing', '香港', '2026-08-15', '追踪中', '高', 'https://mscmark.hkust.edu.hk', 'real-seed-2026-04-18'),
          ('NUS', 'MSc Marketing Analytics & Insights', '新加坡', '2027-02-15', '追踪中', '中', 'https://mscmarketing.nus.edu.sg', 'real-seed-2026-04-18'),
          ('NTU', 'MSc Marketing Science', '新加坡', '2027-01-31', '追踪中', '中', 'https://www.ntu.edu.sg/business/admissions/graduate-studies/msc-marketing-science', 'real-seed-2026-04-18'),
          ('LSE', 'MSc Marketing', '英国', '2027-04-01', '追踪中', '中', 'https://www.lse.ac.uk', 'real-seed-2026-04-18'),
          ('Imperial College London', 'MSc Marketing', '英国', '2027-03-01', '追踪中', '中', 'https://www.imperial.ac.uk', 'real-seed-2026-04-18'),
          ('University of Melbourne', 'Master of Marketing', '澳大利亚', '2026-08-31', '追踪中', '高', 'https://study.unimelb.edu.au', 'real-seed-2026-04-18'),
          ('University of Sydney', 'Master of Marketing', '澳大利亚', '2026-12-01', '追踪中', '中', 'https://www.sydney.edu.au', 'real-seed-2026-04-18');

        UPDATE projects SET official_url = 'https://mscmark.hkust.edu.hk', chinese_name = '香港科技大学', country = '香港', country_color = '#EF4444' WHERE school_name LIKE '%HKUST%';
        UPDATE projects SET official_url = 'https://masters.hkubs.hku.hk', chinese_name = '香港大学', country = '香港', country_color = '#EF4444' WHERE school_name LIKE '%HKU%' AND school_name NOT LIKE '%HKUST%';
        UPDATE projects SET official_url = 'https://www.gs.cuhk.edu.hk', chinese_name = '香港中文大学', country = '香港', country_color = '#EF4444' WHERE school_name LIKE '%CUHK%';
        UPDATE projects SET official_url = 'https://mscmarketing.nus.edu.sg', chinese_name = '新加坡国立大学', country = '新加坡', country_color = '#F59E0B' WHERE school_name LIKE '%NUS%';
        UPDATE projects SET official_url = 'https://www.ntu.edu.sg/business/admissions/graduate-studies/msc-marketing-science', chinese_name = '南洋理工大学', country = '新加坡', country_color = '#F59E0B' WHERE school_name LIKE '%NTU%';
        UPDATE projects SET official_url = 'https://www.lse.ac.uk/study-at-lse/Graduate/Available-programmes', chinese_name = '伦敦政治经济学院', country = '英国', country_color = '#6366F1' WHERE school_name LIKE '%LSE%';
        UPDATE projects SET official_url = 'https://www.imperial.ac.uk/business-school/programmes/masters', chinese_name = '帝国理工学院', country = '英国', country_color = '#6366F1' WHERE school_name LIKE '%Imperial%';
        UPDATE projects SET official_url = 'https://study.unimelb.edu.au/find/courses/graduate/master-of-management-marketing', chinese_name = '墨尔本大学', country = '澳大利亚', country_color = '#10B981' WHERE school_name LIKE '%Melbourne%';
        UPDATE projects SET official_url = 'https://www.sydney.edu.au/courses/courses/pc/master-of-marketing.html', chinese_name = '悉尼大学', country = '澳大利亚', country_color = '#10B981' WHERE school_name LIKE '%Sydney%';
        "#,
    )?;

    let task_count: i64 = connection.query_row("SELECT COUNT(1) FROM tasks", [], |row| row.get(0))?;
    if task_count == 0 {
        let short_tasks: Vec<(&str, &str, &str, &str)> = vec![
            ("雅思练习·APP间隔复习", "雅思", "2026-04-19", "看剧日，通勤时完成"),
            ("当日复盘记录", "其他", "2026-04-19", "记录词数和正确率"),
            ("雅思练习·听力全套+阅读2篇", "雅思", "2026-04-20", "严格计时，模拟考场"),
            ("雅思写作Task1+Task2全套", "雅思", "2026-04-20", "计时90分钟"),
            ("口语专题·话题积累+录音", "雅思", "2026-04-20", "录音留存"),
            ("APP间隔复习", "词汇", "2026-04-20", ""),
            ("当日复盘记录", "其他", "2026-04-20", ""),
            ("雅思练习·阅读精读", "雅思", "2026-04-21", ""),
            ("【雅思阅读课】", "雅思", "2026-04-21", "额外课程"),
            ("课后阅读专项练习", "雅思", "2026-04-21", "课后2小时内完成"),
            ("APP间隔复习", "词汇", "2026-04-21", ""),
            ("当日复盘记录", "其他", "2026-04-21", ""),
            ("雅思练习·听力2节", "雅思", "2026-04-22", ""),
            ("【雅思写作课】", "雅思", "2026-04-22", "额外课程"),
            ("课后写作Task练习", "雅思", "2026-04-22", "课后完成"),
            ("APP间隔复习", "词汇", "2026-04-22", ""),
            ("当日复盘记录", "其他", "2026-04-22", ""),
            ("雅思练习·阅读+听力", "雅思", "2026-04-23", ""),
            ("雅思写作Task1", "雅思", "2026-04-23", ""),
            ("【周四固定课 15:00-16:40】", "其他", "2026-04-23", "固定课"),
            ("APP间隔复习", "词汇", "2026-04-23", ""),
            ("当日复盘记录", "其他", "2026-04-23", ""),
            ("雅思练习·阅读精读1篇+听力2节", "雅思", "2026-04-24", ""),
            ("雅思写作Task2计时", "雅思", "2026-04-24", ""),
            ("口语Part2+3录音", "雅思", "2026-04-24", ""),
            ("APP间隔复习", "词汇", "2026-04-24", ""),
            ("当日复盘记录", "其他", "2026-04-24", ""),
            ("【周五早课 08:00-09:40】", "其他", "2026-04-25", "固定课"),
            ("【周五晚课 18:00-19:40】", "其他", "2026-04-25", "固定课"),
            ("APP复习+当日复盘", "词汇", "2026-04-25", ""),
            ("晚间补练写作或口语", "雅思", "2026-04-26", "看剧日补练60分钟"),
            ("APP间隔复习", "词汇", "2026-04-26", ""),
            ("当日复盘记录", "其他", "2026-04-26", ""),
            ("雅思练习·阅读精读1篇+听力2节", "雅思", "2026-04-27", ""),
            ("雅思写作Task2计时", "雅思", "2026-04-27", ""),
            ("APP间隔复习", "词汇", "2026-04-27", ""),
            ("当日复盘记录", "其他", "2026-04-27", ""),
            ("雅思练习·听力精听", "雅思", "2026-04-28", ""),
            ("口语Part2+3录音", "雅思", "2026-04-28", ""),
            ("APP间隔复习", "词汇", "2026-04-28", ""),
            ("当日复盘记录", "其他", "2026-04-28", ""),
            ("雅思练习·阅读精读1篇", "雅思", "2026-04-29", ""),
            ("雅思写作Task1", "雅思", "2026-04-29", ""),
            ("APP间隔复习", "词汇", "2026-04-29", ""),
            ("当日复盘记录", "其他", "2026-04-29", ""),
            ("雅思练习·阅读+听力", "雅思", "2026-04-30", ""),
            ("【雅思填空课】", "雅思", "2026-04-30", "额外课程"),
            ("【周四固定课 15:00-16:40】", "其他", "2026-04-30", "固定课"),
            ("APP间隔复习", "词汇", "2026-04-30", ""),
            ("当日复盘记录", "其他", "2026-04-30", ""),
            ("雅思练习·阅读+听力", "雅思", "2026-05-01", ""),
            ("雅思写作Task1+分析", "雅思", "2026-05-01", ""),
            ("APP间隔复习", "词汇", "2026-05-01", ""),
            ("当日复盘记录", "其他", "2026-05-01", ""),
            ("雅思模拟半套·听力全套+阅读2篇", "雅思", "2026-05-02", "严格计时"),
            ("写作Task1+Task2全套", "雅思", "2026-05-02", "计时90分钟"),
            ("本周总复盘", "其他", "2026-05-02", "记录产出+制定次周计划"),
            ("当日复盘记录", "其他", "2026-05-02", ""),
        ];

        for (title, task_type, date, description) in short_tasks {
            connection.execute(
                r#"
                INSERT INTO tasks (
                    title, description, source_type, task_type, priority, status, estimated_minutes,
                    scheduled_date, time_start, time_end, deadline
                ) VALUES (?, ?, 'real_plan_seed_v3', ?, '中', '未开始', NULL, ?, NULL, NULL, ?)
                "#,
                params![title, description, task_type, date, date],
            )?;
        }
    }

    connection.execute(
        r#"
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES ('real_seed_version', '2026-04-19-v4', CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = CURRENT_TIMESTAMP
        "#,
        [],
    )?;

    Ok(())
}

pub fn library_directory_definitions() -> Vec<(&'static str, &'static str)> {
    vec![
        ("ielts", "IELTS"),
        ("gre", "GRE"),
        ("toefl", "TOEFL"),
        ("documents", "申请个人资料"),
        ("essays", "文书"),
        ("portfolio", "作品集"),
        ("videos", "视频资料"),
        ("other", "其他文档"),
    ]
}

fn library_setting_key(key: &str) -> String {
    format!("library_dir_{key}")
}

fn category_from_key(key: &str) -> String {
    match key {
        "ielts" => "IELTS".to_string(),
        "gre" => "GRE".to_string(),
        "toefl" => "TOEFL".to_string(),
        "documents" => "申请个人资料".to_string(),
        "essays" => "文书".to_string(),
        "portfolio" => "作品集".to_string(),
        "videos" => "视频资料".to_string(),
        _ => "其他文档".to_string(),
    }
}

fn file_type_from_path(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_ascii_lowercase())
}

fn walk_all_files(base: &Path, output: &mut Vec<PathBuf>) {
    if let Ok(entries) = std::fs::read_dir(base) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk_all_files(&path, output);
            } else if path.is_file() {
                output.push(path);
            }
        }
    }
}

pub fn get_library_directories(path: &Path) -> Result<Vec<LibraryDirectory>> {
    let connection = Connection::open(path)?;
    let mut directories = Vec::new();
    for (key, label) in library_directory_definitions() {
        let setting_key = library_setting_key(key);
        let value: Option<String> = connection
            .query_row(
                "SELECT setting_value FROM app_settings WHERE setting_key = ?",
                params![setting_key],
                |row| row.get(0),
            )
            .optional()?;
        directories.push(LibraryDirectory {
            key: key.to_string(),
            label: label.to_string(),
            path: value,
        });
    }
    Ok(directories)
}

pub fn set_library_directory(path: &Path, key: &str, directory_path: Option<&str>) -> Result<()> {
    let connection = Connection::open(path)?;
    let setting_key = library_setting_key(key);
    match directory_path {
        Some(raw) if !raw.trim().is_empty() => {
            connection.execute(
                r#"
                INSERT INTO app_settings (setting_key, setting_value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(setting_key) DO UPDATE SET
                    setting_value = excluded.setting_value,
                    updated_at = CURRENT_TIMESTAMP
                "#,
                params![setting_key, raw.trim()],
            )?;
        }
        _ => {
            connection.execute("DELETE FROM app_settings WHERE setting_key = ?", params![setting_key])?;
        }
    }
    Ok(())
}

pub fn scan_library(path: &Path) -> Result<i64> {
    let connection = Connection::open(path)?;
    let directories = get_library_directories(path)?;
    let mut scanned_count: i64 = 0;

    for item in directories {
        let Some(dir_path) = item.path else {
            continue;
        };
        let base = PathBuf::from(dir_path);
        if !base.exists() || !base.is_dir() {
            continue;
        }

        let mut files = Vec::new();
        walk_all_files(&base, &mut files);
        let category = category_from_key(&item.key);

        for file_path in files {
            let metadata = match std::fs::metadata(&file_path) {
                Ok(value) => value,
                Err(_) => continue,
            };
            let file_name = file_path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string();
            if file_name.is_empty() {
                continue;
            }
            let file_type = file_type_from_path(&file_path);
            connection.execute(
                r#"
                INSERT INTO files (
                    file_path, file_name, file_type, file_size, category,
                    summary, tags_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, NULL, NULL, CURRENT_TIMESTAMP)
                ON CONFLICT(file_path) DO UPDATE SET
                    file_name = excluded.file_name,
                    file_type = excluded.file_type,
                    file_size = excluded.file_size,
                    category = excluded.category,
                    updated_at = CURRENT_TIMESTAMP
                "#,
                params![
                    file_path.display().to_string(),
                    file_name,
                    file_type,
                    metadata.len() as i64,
                    category,
                ],
            )?;
            scanned_count += 1;
        }
    }

    rebuild_files_fts(&connection)?;
    Ok(scanned_count)
}

pub fn upsert_file_record(
    path: &Path,
    file_path: &str,
    file_name: &str,
    file_type: Option<&str>,
    file_size: Option<i64>,
    category: &str,
    summary: Option<&str>,
    tags_json: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO files (
            file_path, file_name, file_type, file_size, category, summary, tags_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(file_path) DO UPDATE SET
            file_name = excluded.file_name,
            file_type = excluded.file_type,
            file_size = excluded.file_size,
            category = excluded.category,
            summary = COALESCE(excluded.summary, files.summary),
            tags_json = COALESCE(excluded.tags_json, files.tags_json),
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![file_path, file_name, file_type, file_size, category, summary, tags_json],
    )?;
    let file_id = connection.query_row(
        "SELECT id FROM files WHERE file_path = ? LIMIT 1",
        params![file_path],
        |row| row.get::<_, i64>(0),
    )?;
    sync_file_fts_entry(&connection, file_id)?;
    Ok(file_id)
}

pub fn create_library_import_log(
    path: &Path,
    source_path: &str,
    stored_path: Option<&str>,
    original_name: Option<&str>,
    target_key: &str,
    category: &str,
    import_status: &str,
    reason: Option<&str>,
    file_id: Option<i64>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO library_import_logs (
            source_path,
            stored_path,
            original_name,
            target_key,
            category,
            import_status,
            reason,
            file_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
            source_path,
            stored_path,
            original_name,
            target_key,
            category,
            import_status,
            reason,
            file_id
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_library_import_logs(path: &Path, limit: i64) -> Result<Vec<LibraryImportLogRecord>> {
    let connection = Connection::open(path)?;
    let safe_limit = limit.max(1).min(200);
    let mut statement = connection.prepare(
        r#"
        SELECT
            id,
            source_path,
            stored_path,
            original_name,
            target_key,
            category,
            import_status,
            reason,
            file_id,
            created_at
        FROM library_import_logs
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![safe_limit], |row| {
        Ok(LibraryImportLogRecord {
            id: row.get(0)?,
            source_path: row.get(1)?,
            stored_path: row.get(2)?,
            original_name: row.get(3)?,
            target_key: row.get(4)?,
            category: row.get(5)?,
            import_status: row.get(6)?,
            reason: row.get(7)?,
            file_id: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn list_files(
    path: &Path,
    query: Option<&str>,
    category: Option<&str>,
    favorites_only: bool,
    match_mode: Option<&str>,
) -> Result<Vec<FileRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, file_path, file_name, file_type, file_size, category, summary, tags_json,
            last_opened_at, is_favorite, created_at, updated_at
        FROM files
        ORDER BY
            is_favorite DESC,
            last_opened_at IS NULL,
            last_opened_at DESC,
            updated_at DESC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(FileRecord {
            id: row.get(0)?,
            file_path: row.get(1)?,
            file_name: row.get(2)?,
            file_type: row.get(3)?,
            file_size: row.get(4)?,
            category: row.get(5)?,
            summary: row.get(6)?,
            tags_json: row.get(7)?,
            last_opened_at: row.get(8)?,
            is_favorite: row.get::<_, i64>(9)? == 1,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    })?;

    let mut items: Vec<FileRecord> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(raw) = query {
        let search = raw.trim();
        if !search.is_empty() {
            let tokens = tokenize_search_tokens(search);
            let semantic_tokens = expand_semantic_search_tokens(&tokens);
            let match_any = matches!(
                match_mode
                    .map(|value| value.trim().to_lowercase())
                    .unwrap_or_else(|| "all".to_string())
                    .as_str(),
                "any" | "or"
            );
            if let Some(fts_hits) =
                search_files_by_fts(&connection, search, &semantic_tokens, match_any)?
            {
                if !fts_hits.is_empty() {
                    let mut rank_map = std::collections::HashMap::<i64, f64>::new();
                    for (file_id, rank) in fts_hits {
                        rank_map.insert(file_id, rank);
                    }
                    let mut filtered = items
                        .into_iter()
                        .filter(|item| rank_map.contains_key(&item.id))
                        .collect::<Vec<_>>();
                    filtered.sort_by(|a, b| {
                        let ar = rank_map.get(&a.id).copied().unwrap_or(0.0);
                        let br = rank_map.get(&b.id).copied().unwrap_or(0.0);
                        ar.partial_cmp(&br).unwrap_or(std::cmp::Ordering::Equal)
                    });
                    items = filtered;
                } else {
                    items = Vec::new();
                }
            } else {
                let mut scored: Vec<(i64, FileRecord)> = Vec::new();
                for item in items {
                    let score = file_search_score(&item, search, &semantic_tokens, match_any);
                    if score > 0 {
                        scored.push((score, item));
                    }
                }
                scored.sort_by(|a, b| b.0.cmp(&a.0));
                items = scored.into_iter().map(|(_, item)| item).collect::<Vec<_>>();
            }
        }
    }
    if let Some(raw) = category {
        let needle = raw.trim();
        if !needle.is_empty() && needle != "全部" {
            items.retain(|item| item.category == needle);
        }
    }
    if favorites_only {
        items.retain(|item| item.is_favorite);
    }
    Ok(items)
}

fn normalize_search_text(text: &str) -> String {
    text.to_lowercase()
}

fn tokenize_search_tokens(query: &str) -> Vec<String> {
    query
        .split(|ch: char| ch.is_whitespace() || ch == ',' || ch == '，' || ch == ';' || ch == '；')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .map(normalize_search_text)
        .collect::<Vec<_>>()
}

fn expand_semantic_search_tokens(tokens: &[String]) -> Vec<String> {
    if tokens.is_empty() {
        return Vec::new();
    }
    let mut expanded = tokens.to_vec();
    for token in tokens {
        let t = token.trim();
        if t.is_empty() {
            continue;
        }
        let aliases: &[&str] = match t {
            "ielts" | "雅思" => &["ielts", "雅思", "writing", "reading", "listening", "speaking"],
            "toefl" | "托福" => &["toefl", "托福", "writing", "reading", "listening", "speaking"],
            "gre" => &["gre", "verbal", "quant", "awa", "填空", "阅读"],
            "gmat" => &["gmat", "quant", "verbal", "ir", "awa"],
            "ps" | "sop" | "文书" => &["ps", "sop", "statement", "personal statement", "文书"],
            "portfolio" | "作品集" => &["portfolio", "作品集", "video", "demo reel"],
            "cv" | "resume" | "简历" => &["cv", "resume", "简历"],
            "deadline" | "ddl" => &["deadline", "ddl", "截止", "due"],
            "scholarship" | "奖学金" => &["scholarship", "奖学金", "funding", "fees"],
            "reading" | "阅读" => &["reading", "阅读", "文章", "长难句"],
            "writing" | "写作" => &["writing", "写作", "task2", "argument"],
            "vocab" | "vocabulary" | "词汇" => &["vocab", "vocabulary", "词汇", "单词"],
            _ => &[],
        };
        for alias in aliases {
            let normalized = normalize_search_text(alias);
            if !normalized.is_empty() {
                expanded.push(normalized);
            }
        }
    }
    expanded.sort();
    expanded.dedup();
    expanded
}

fn file_search_score(item: &FileRecord, raw_query: &str, tokens: &[String], match_any: bool) -> i64 {
    let query = normalize_search_text(raw_query.trim());
    let file_name = normalize_search_text(&item.file_name);
    let file_path = normalize_search_text(&item.file_path);
    let category = normalize_search_text(&item.category);
    let tags = item
        .tags_json
        .as_deref()
        .map(normalize_search_text)
        .unwrap_or_default();
    let summary = item
        .summary
        .as_deref()
        .map(normalize_search_text)
        .unwrap_or_default();
    let file_type = item
        .file_type
        .as_deref()
        .map(normalize_search_text)
        .unwrap_or_default();

    if !tokens.is_empty() {
        let token_match_count = tokens
            .iter()
            .filter(|token| {
                file_name.contains(*token)
                    || file_path.contains(*token)
                    || category.contains(*token)
                    || tags.contains(*token)
                    || summary.contains(*token)
                    || file_type.contains(*token)
            })
            .count();
        if match_any {
            if token_match_count == 0 {
                return 0;
            }
        } else if token_match_count < tokens.len() {
            return 0;
        }
    }

    let mut score = 10_i64;
    if !query.is_empty() && file_name == query {
        score += 300;
    } else if !query.is_empty() && file_name.contains(&query) {
        score += 140;
    }
    if !query.is_empty() && file_path.contains(&query) {
        score += 80;
    }
    if !query.is_empty() && category.contains(&query) {
        score += 90;
    }
    if !query.is_empty() && tags.contains(&query) {
        score += 110;
    }
    if !query.is_empty() && summary.contains(&query) {
        score += 70;
    }
    if !query.is_empty() && file_type.contains(&query) {
        score += 40;
    }

    for token in tokens {
        if file_name.contains(token) {
            score += 65;
        }
        if category.contains(token) {
            score += 35;
        }
        if tags.contains(token) {
            score += 45;
        }
        if summary.contains(token) {
            score += 28;
        }
        if file_path.contains(token) {
            score += 20;
        }
        if file_type.contains(token) {
            score += 15;
        }
    }
    if item.is_favorite {
        score += 6;
    }
    if item.last_opened_at.is_some() {
        score += 4;
    }
    score
}

pub fn toggle_file_favorite(path: &Path, file_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE files
        SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![file_id],
    )?;
    Ok(())
}

pub fn toggle_file_favorite_with_state(path: &Path, file_id: i64) -> Result<bool> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE files
        SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![file_id],
    )?;
    let state = connection
        .query_row(
            "SELECT is_favorite FROM files WHERE id = ? LIMIT 1",
            params![file_id],
            |row| row.get::<_, i64>(0),
        )
        .optional()?
        .unwrap_or(0);
    if state != 0 {
        sync_file_fts_entry(&connection, file_id)?;
    }
    Ok(state == 1)
}

pub fn rename_file(path: &Path, file_id: i64, new_name: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE files
        SET file_name = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![new_name, file_id],
    )?;
    sync_file_fts_entry(&connection, file_id)?;
    Ok(())
}

pub fn move_file_category(path: &Path, file_id: i64, new_category: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE files
        SET category = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![new_category, file_id],
    )?;
    sync_file_fts_entry(&connection, file_id)?;
    Ok(())
}

pub fn delete_file(path: &Path, file_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM file_links WHERE file_id = ?", params![file_id])?;
    connection.execute("DELETE FROM files_fts WHERE file_id = ?", params![file_id])?;
    connection.execute("DELETE FROM files WHERE id = ?", params![file_id])?;
    Ok(())
}

pub fn get_file_by_id(path: &Path, file_id: i64) -> Result<Option<FileRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, file_path, file_name, file_type, file_size, category, summary, tags_json,
            last_opened_at, is_favorite, created_at, updated_at
        FROM files
        WHERE id = ?
        LIMIT 1
        "#,
    )?;
    let mut rows = statement.query(params![file_id])?;
    if let Some(row) = rows.next()? {
        return Ok(Some(FileRecord {
            id: row.get(0)?,
            file_path: row.get(1)?,
            file_name: row.get(2)?,
            file_type: row.get(3)?,
            file_size: row.get(4)?,
            category: row.get(5)?,
            summary: row.get(6)?,
            tags_json: row.get(7)?,
            last_opened_at: row.get(8)?,
            is_favorite: row.get::<_, i64>(9)? == 1,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        }));
    }
    Ok(None)
}

pub fn update_file_category_and_tags(
    path: &Path,
    file_id: i64,
    category: &str,
    tags_json: Option<&str>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    let updated = connection.execute(
        r#"
        UPDATE files
        SET category = ?,
            tags_json = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![category, tags_json, file_id],
    )?;
    if updated == 0 {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }
    sync_file_fts_entry(&connection, file_id)?;
    Ok(())
}

pub fn mark_file_opened(path: &Path, file_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE files
        SET last_opened_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![file_id],
    )?;
    Ok(())
}

pub fn update_file_summary(path: &Path, file_id: i64, summary: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    let updated = connection.execute(
        r#"
        UPDATE files
        SET summary = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![summary, file_id],
    )?;
    if updated == 0 {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    }
    sync_file_fts_entry(&connection, file_id)?;
    Ok(())
}

pub fn list_files_for_summary_refresh(path: &Path, limit: i64, only_empty: bool) -> Result<Vec<FileRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, file_path, file_name, file_type, file_size, category, summary, tags_json,
            last_opened_at, is_favorite, created_at, updated_at
        FROM files
        ORDER BY
            CASE WHEN COALESCE(summary, '') = '' THEN 0 ELSE 1 END ASC,
            updated_at DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
        Ok(FileRecord {
            id: row.get(0)?,
            file_path: row.get(1)?,
            file_name: row.get(2)?,
            file_type: row.get(3)?,
            file_size: row.get(4)?,
            category: row.get(5)?,
            summary: row.get(6)?,
            tags_json: row.get(7)?,
            last_opened_at: row.get(8)?,
            is_favorite: row.get::<_, i64>(9)? == 1,
            created_at: row.get(10)?,
            updated_at: row.get(11)?,
        })
    })?;
    let mut items: Vec<FileRecord> = rows.collect::<Result<Vec<_>>>()?;
    if only_empty {
        items.retain(|item| item.summary.as_deref().unwrap_or("").trim().is_empty());
    }
    Ok(items)
}

pub fn list_file_links(path: &Path, file_id: i64) -> Result<Vec<FileLinkView>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            fl.id,
            fl.file_id,
            fl.link_type,
            fl.link_id,
            fl.relation_note,
            CASE
                WHEN fl.link_type = 'project' THEN
                    (SELECT p.school_name || ' · ' || p.program_name FROM projects p WHERE p.id = fl.link_id)
                WHEN fl.link_type = 'task' THEN
                    (SELECT t.title FROM tasks t WHERE t.id = fl.link_id)
                ELSE NULL
            END AS label
        FROM file_links fl
        WHERE fl.file_id = ?
        ORDER BY fl.id DESC
        "#,
    )?;
    let rows = statement.query_map(params![file_id], |row| {
        Ok(FileLinkView {
            id: row.get(0)?,
            file_id: row.get(1)?,
            link_type: row.get(2)?,
            link_id: row.get(3)?,
            relation_note: row.get(4)?,
            label: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn replace_file_links(path: &Path, file_id: i64, links: &[FileLinkInput]) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM file_links WHERE file_id = ?", params![file_id])?;
    for link in links {
        connection.execute(
            r#"
            INSERT INTO file_links (file_id, link_type, link_id, relation_note)
            VALUES (?, ?, ?, ?)
            "#,
            params![file_id, link.link_type, link.link_id, link.relation_note],
        )?;
    }
    Ok(())
}

pub fn batch_set_file_tags(path: &Path, file_ids: &[i64], tags_json: Option<&str>) -> Result<()> {
    let connection = Connection::open(path)?;
    for file_id in file_ids {
        connection.execute(
            r#"
            UPDATE files
            SET tags_json = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            params![tags_json, file_id],
        )?;
        sync_file_fts_entry(&connection, *file_id)?;
    }
    Ok(())
}

pub fn append_file_links(path: &Path, file_ids: &[i64], links: &[FileLinkInput]) -> Result<()> {
    let connection = Connection::open(path)?;
    for file_id in file_ids {
        for link in links {
            let existing = connection
                .query_row(
                    r#"
                    SELECT id FROM file_links
                    WHERE file_id = ? AND link_type = ? AND link_id = ?
                    LIMIT 1
                    "#,
                    params![file_id, link.link_type, link.link_id],
                    |row| row.get::<_, i64>(0),
                )
                .optional()?;
            if existing.is_some() {
                continue;
            }
            connection.execute(
                r#"
                INSERT INTO file_links (file_id, link_type, link_id, relation_note)
                VALUES (?, ?, ?, ?)
                "#,
                params![file_id, link.link_type, link.link_id, link.relation_note],
            )?;
        }
    }
    Ok(())
}

pub fn get_app_setting(path: &Path, key: &str) -> Result<Option<String>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
            params![key],
            |row| row.get(0),
        )
        .optional()
}

pub fn set_app_setting(path: &Path, key: &str, value: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO app_settings (setting_key, setting_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(setting_key) DO UPDATE SET
            setting_value = excluded.setting_value,
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![key, value],
    )?;
    Ok(())
}

pub fn create_notification(
    path: &Path,
    channel: &str,
    title: &str,
    content: &str,
    related_type: Option<&str>,
    related_id: Option<i64>,
    send_status: &str,
    sent_at: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    let source_type = resolve_notification_source_type(channel, title, related_type);
    let priority = resolve_notification_priority(&source_type, title, content, send_status);
    let dedupe_key = make_notification_dedupe_key(&source_type, title, related_type, related_id);
    let dedupe_minutes = notification_dedupe_window_minutes(&source_type);
    let existing_id: Option<i64> = connection
        .query_row(
            r#"
            SELECT id
            FROM notifications
            WHERE dedupe_key = ?
              AND is_ignored = 0
              AND ((julianday('now') - julianday(COALESCE(last_seen_at, created_at))) * 24 * 60) <= ?
            ORDER BY id DESC
            LIMIT 1
            "#,
            params![dedupe_key, dedupe_minutes],
            |row| row.get(0),
        )
        .optional()?;
    if let Some(existing_id) = existing_id {
        connection.execute(
            r#"
            UPDATE notifications
            SET channel = ?,
                source_type = ?,
                priority = ?,
                title = ?,
                content = ?,
                related_type = ?,
                related_id = ?,
                send_status = ?,
                sent_at = ?,
                is_read = 0,
                aggregate_count = aggregate_count + 1,
                last_seen_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            params![
                channel,
                source_type,
                priority,
                title,
                content,
                related_type,
                related_id,
                send_status,
                sent_at,
                existing_id
            ],
        )?;
        record_notification_action_with_conn(
            &connection,
            existing_id,
            "aggregate",
            Some(&serde_json::json!({
                "channel": channel,
                "priority": priority,
                "sendStatus": send_status
            }).to_string()),
        )?;
        return Ok(existing_id);
    }
    connection.execute(
        r#"
        INSERT INTO notifications (
            channel, source_type, priority, title, content, related_type, related_id, send_status,
            is_read, is_ignored, snoozed_until, dedupe_key, aggregate_count, first_seen_at, last_seen_at, updated_at,
            action_payload_json, sent_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            channel,
            source_type,
            priority,
            title,
            content,
            related_type,
            related_id,
            send_status,
            dedupe_key,
            sent_at
        ],
    )?;
    let id = connection.last_insert_rowid();
    record_notification_action_with_conn(
        &connection,
        id,
        "create",
        Some(&serde_json::json!({
            "channel": channel,
            "sourceType": source_type,
            "priority": priority,
            "sendStatus": send_status
        }).to_string()),
    )?;
    Ok(id)
}

pub fn list_notifications(path: &Path, limit: i64) -> Result<Vec<NotificationRecord>> {
    list_notifications_with_filters(
        path,
        &NotificationQueryInput {
            source_types: None,
            priorities: None,
            unread_only: None,
            include_ignored: Some(false),
            include_snoozed: Some(false),
            start_at: None,
            end_at: None,
            limit: Some(limit),
        },
    )
}

fn parse_notification_datetime(value: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(naive) = NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S") {
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc));
    }
    if let Ok(date) = NaiveDate::parse_from_str(value, "%Y-%m-%d") {
        let naive = date.and_hms_opt(0, 0, 0)?;
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc));
    }
    None
}

fn resolve_notification_source_type(channel: &str, title: &str, related_type: Option<&str>) -> String {
    let title_lower = title.to_lowercase();
    let related = related_type.unwrap_or_default().to_lowercase();
    if related == "school_web_change" {
        return "school_web_change".to_string();
    }
    if related == "study_web_change" {
        return "study_web_change".to_string();
    }
    if related == "watch_target" || channel == "watch" {
        return "watch".to_string();
    }
    if title_lower.contains("ddl") || related == "scan" {
        return "ddl".to_string();
    }
    if title_lower.contains("建议") || related.contains("suggestion") {
        return "ai_suggestion".to_string();
    }
    if title_lower.contains("ai") || related == "ai" {
        return "ai".to_string();
    }
    if channel == "feishu" {
        return "feishu".to_string();
    }
    if related == "task" {
        return "task".to_string();
    }
    "system".to_string()
}

fn resolve_notification_priority(source_type: &str, title: &str, content: &str, send_status: &str) -> String {
    let title_lower = title.to_lowercase();
    let content_lower = content.to_lowercase();
    if send_status == "failed" || title_lower.contains("失败") || content_lower.contains("失败") {
        return "critical".to_string();
    }
    match source_type {
        "ddl" => {
            if content_lower.contains("超期") || content_lower.contains("已超期") {
                "critical".to_string()
            } else {
                "warning".to_string()
            }
        }
        "school_web_change" => "warning".to_string(),
        "study_web_change" => "info".to_string(),
        "watch" => "warning".to_string(),
        "task" => "warning".to_string(),
        "feishu" => "info".to_string(),
        "ai" | "ai_suggestion" => "info".to_string(),
        _ => "info".to_string(),
    }
}

fn make_notification_dedupe_key(
    source_type: &str,
    title: &str,
    related_type: Option<&str>,
    related_id: Option<i64>,
) -> String {
    if source_type == "ddl" {
        return "ddl|scan|summary".to_string();
    }
    if (source_type == "watch" || source_type == "school_web_change" || source_type == "study_web_change")
        && related_id.is_some()
    {
        return format!("watch|target|{}", related_id.unwrap_or_default());
    }
    let related = related_type.unwrap_or_default();
    let title_key = title.trim().to_lowercase();
    format!(
        "{}|{}|{}|{}",
        source_type,
        related,
        related_id.unwrap_or_default(),
        title_key
    )
}

fn notification_dedupe_window_minutes(source_type: &str) -> i64 {
    match source_type {
        "ddl" | "watch" | "school_web_change" | "study_web_change" => 24 * 60,
        "feishu" => 180,
        _ => 90,
    }
}

fn record_notification_action_with_conn(
    connection: &Connection,
    notification_id: i64,
    action_name: &str,
    action_payload_json: Option<&str>,
) -> Result<()> {
    connection.execute(
        r#"
        INSERT INTO notification_action_logs (notification_id, action_name, action_payload_json, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![notification_id, action_name, action_payload_json],
    )?;
    Ok(())
}

pub fn record_notification_action(
    path: &Path,
    notification_id: i64,
    action_name: &str,
    action_payload_json: Option<&str>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    record_notification_action_with_conn(&connection, notification_id, action_name, action_payload_json)
}

pub fn list_notifications_with_filters(
    path: &Path,
    query: &NotificationQueryInput,
) -> Result<Vec<NotificationRecord>> {
    let connection = Connection::open(path)?;
    let limit = query.limit.unwrap_or(80).clamp(1, 400);
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, channel, source_type, priority, title, content, related_type, related_id, send_status,
            is_read, is_ignored, snoozed_until, dedupe_key, aggregate_count, first_seen_at, last_seen_at, updated_at,
            action_payload_json, sent_at, created_at
        FROM notifications
        ORDER BY
            CASE priority WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END ASC,
            is_read ASC,
            id DESC
        LIMIT ?
        "#,
    )?;
    let mut rows = statement.query(params![limit])?;
    let source_set = query
        .source_types
        .as_ref()
        .map(|items| items.iter().map(|v| v.trim().to_lowercase()).collect::<Vec<_>>())
        .unwrap_or_default();
    let priority_set = query
        .priorities
        .as_ref()
        .map(|items| items.iter().map(|v| v.trim().to_lowercase()).collect::<Vec<_>>())
        .unwrap_or_default();
    let unread_only = query.unread_only.unwrap_or(false);
    let include_ignored = query.include_ignored.unwrap_or(false);
    let include_snoozed = query.include_snoozed.unwrap_or(false);
    let start_at = query
        .start_at
        .as_deref()
        .and_then(parse_notification_datetime);
    let end_at = query
        .end_at
        .as_deref()
        .and_then(parse_notification_datetime);
    let now = Utc::now();
    let mut output: Vec<NotificationRecord> = Vec::new();
    while let Some(row) = rows.next()? {
        let item = NotificationRecord {
            id: row.get(0)?,
            channel: row.get(1)?,
            source_type: row.get(2)?,
            priority: row.get(3)?,
            title: row.get(4)?,
            content: row.get(5)?,
            related_type: row.get(6)?,
            related_id: row.get(7)?,
            send_status: row.get(8)?,
            is_read: row.get::<_, i64>(9)? == 1,
            is_ignored: row.get::<_, i64>(10)? == 1,
            snoozed_until: row.get(11)?,
            dedupe_key: row.get(12)?,
            aggregate_count: row.get(13)?,
            first_seen_at: row.get(14)?,
            last_seen_at: row.get(15)?,
            updated_at: row.get(16)?,
            action_payload_json: row.get(17)?,
            sent_at: row.get(18)?,
            created_at: row.get(19)?,
        };
        if !include_ignored && item.is_ignored {
            continue;
        }
        if unread_only && item.is_read {
            continue;
        }
        if !source_set.is_empty() && !source_set.contains(&item.source_type.to_lowercase()) {
            continue;
        }
        if !priority_set.is_empty() && !priority_set.contains(&item.priority.to_lowercase()) {
            continue;
        }
        if !include_snoozed {
            if let Some(until) = item
                .snoozed_until
                .as_deref()
                .and_then(parse_notification_datetime)
            {
                if until > now {
                    continue;
                }
            }
        }
        if let Some(start) = start_at {
            if let Some(created) = parse_notification_datetime(&item.created_at) {
                if created < start {
                    continue;
                }
            }
        }
        if let Some(end) = end_at {
            if let Some(created) = parse_notification_datetime(&item.created_at) {
                if created > end {
                    continue;
                }
            }
        }
        output.push(item);
    }
    Ok(output)
}

pub fn get_notification_by_id(path: &Path, notification_id: i64) -> Result<Option<NotificationRecord>> {
    let rows = list_notifications_with_filters(
        path,
        &NotificationQueryInput {
            source_types: None,
            priorities: None,
            unread_only: None,
            include_ignored: Some(true),
            include_snoozed: Some(true),
            start_at: None,
            end_at: None,
            limit: Some(400),
        },
    )?;
    Ok(rows.into_iter().find(|item| item.id == notification_id))
}

pub fn mark_notification_read(path: &Path, notification_id: i64, is_read: bool) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE notifications
        SET is_read = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![if is_read { 1 } else { 0 }, notification_id],
    )?;
    record_notification_action_with_conn(
        &connection,
        notification_id,
        if is_read { "mark_read" } else { "mark_unread" },
        None,
    )?;
    Ok(())
}

pub fn ignore_notification(path: &Path, notification_id: i64, reason: Option<&str>) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE notifications
        SET is_ignored = 1,
            is_read = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![notification_id],
    )?;
    let payload = reason.map(|value| serde_json::json!({ "reason": value }).to_string());
    record_notification_action_with_conn(
        &connection,
        notification_id,
        "ignore",
        payload.as_deref(),
    )?;
    Ok(())
}

pub fn snooze_notification(path: &Path, notification_id: i64, snoozed_until: &str, preset: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE notifications
        SET snoozed_until = ?,
            is_read = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![snoozed_until, notification_id],
    )?;
    record_notification_action_with_conn(
        &connection,
        notification_id,
        "snooze",
        Some(&serde_json::json!({
            "preset": preset,
            "snoozedUntil": snoozed_until
        }).to_string()),
    )?;
    Ok(())
}

pub fn list_notification_action_logs(
    path: &Path,
    notification_id: i64,
    limit: i64,
) -> Result<Vec<NotificationActionLogRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, notification_id, action_name, action_payload_json, created_at
        FROM notification_action_logs
        WHERE notification_id = ?
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![notification_id, limit.clamp(1, 200)], |row| {
        Ok(NotificationActionLogRecord {
            id: row.get(0)?,
            notification_id: row.get(1)?,
            action_name: row.get(2)?,
            action_payload_json: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

#[allow(clippy::too_many_arguments)]
pub fn create_feishu_message_log(
    path: &Path,
    direction: &str,
    source: &str,
    message_id: Option<&str>,
    raw_text: &str,
    normalized_text: Option<&str>,
    parsed_action: Option<&str>,
    parsed_payload_json: Option<&str>,
    execution_status: &str,
    failure_code: Option<&str>,
    failure_reason: Option<&str>,
    dedupe_key: Option<&str>,
    is_duplicate: bool,
    high_risk_required: bool,
    high_risk_confirmed: bool,
    created_task_id: Option<i64>,
    created_session_id: Option<i64>,
    related_notification_id: Option<i64>,
    latency_ms: Option<i64>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO feishu_message_logs (
            direction, source, message_id, raw_text, normalized_text, parsed_action, parsed_payload_json,
            execution_status, failure_code, failure_reason, dedupe_key, is_duplicate,
            high_risk_required, high_risk_confirmed, created_task_id, created_session_id, related_notification_id, latency_ms,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![
            direction,
            source,
            message_id,
            raw_text,
            normalized_text,
            parsed_action,
            parsed_payload_json,
            execution_status,
            failure_code,
            failure_reason,
            dedupe_key,
            if is_duplicate { 1 } else { 0 },
            if high_risk_required { 1 } else { 0 },
            if high_risk_confirmed { 1 } else { 0 },
            created_task_id,
            created_session_id,
            related_notification_id,
            latency_ms
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

#[allow(clippy::too_many_arguments)]
pub fn update_feishu_message_log(
    path: &Path,
    log_id: i64,
    parsed_action: Option<&str>,
    parsed_payload_json: Option<&str>,
    execution_status: &str,
    failure_code: Option<&str>,
    failure_reason: Option<&str>,
    high_risk_required: Option<bool>,
    high_risk_confirmed: Option<bool>,
    created_task_id: Option<i64>,
    created_session_id: Option<i64>,
    related_notification_id: Option<i64>,
    latency_ms: Option<i64>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE feishu_message_logs
        SET parsed_action = COALESCE(?, parsed_action),
            parsed_payload_json = COALESCE(?, parsed_payload_json),
            execution_status = ?,
            failure_code = ?,
            failure_reason = ?,
            high_risk_required = COALESCE(?, high_risk_required),
            high_risk_confirmed = COALESCE(?, high_risk_confirmed),
            created_task_id = COALESCE(?, created_task_id),
            created_session_id = COALESCE(?, created_session_id),
            related_notification_id = COALESCE(?, related_notification_id),
            latency_ms = COALESCE(?, latency_ms),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            parsed_action,
            parsed_payload_json,
            execution_status,
            failure_code,
            failure_reason,
            high_risk_required.map(|v| if v { 1 } else { 0 }),
            high_risk_confirmed.map(|v| if v { 1 } else { 0 }),
            created_task_id,
            created_session_id,
            related_notification_id,
            latency_ms,
            log_id
        ],
    )?;
    Ok(())
}

pub fn find_recent_feishu_duplicate(
    path: &Path,
    direction: &str,
    dedupe_key: &str,
    window_minutes: i64,
) -> Result<Option<i64>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT id
            FROM feishu_message_logs
            WHERE direction = ?
              AND dedupe_key = ?
              AND is_duplicate = 0
              AND execution_status IN ('received', 'success')
              AND ((julianday('now') - julianday(created_at)) * 24 * 60) <= ?
            ORDER BY id DESC
            LIMIT 1
            "#,
            params![direction, dedupe_key, window_minutes.max(1)],
            |row| row.get(0),
        )
        .optional()
}

pub fn list_feishu_message_logs(
    path: &Path,
    query: &FeishuMessageLogQueryInput,
) -> Result<Vec<FeishuMessageLogRecord>> {
    let connection = Connection::open(path)?;
    let limit = query.limit.unwrap_or(60).clamp(1, 400);
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, direction, source, message_id, raw_text, normalized_text, parsed_action, parsed_payload_json,
            execution_status, failure_code, failure_reason, dedupe_key, is_duplicate,
            high_risk_required, high_risk_confirmed, created_task_id, created_session_id, related_notification_id,
            latency_ms, created_at, updated_at
        FROM feishu_message_logs
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let mut rows = statement.query(params![limit])?;
    let direction_filter = query.direction.as_ref().map(|s| s.trim().to_lowercase());
    let status_filter = query
        .execution_status
        .as_ref()
        .map(|s| s.trim().to_lowercase());
    let mut output = Vec::new();
    while let Some(row) = rows.next()? {
        let item = FeishuMessageLogRecord {
            id: row.get(0)?,
            direction: row.get(1)?,
            source: row.get(2)?,
            message_id: row.get(3)?,
            raw_text: row.get(4)?,
            normalized_text: row.get(5)?,
            parsed_action: row.get(6)?,
            parsed_payload_json: row.get(7)?,
            execution_status: row.get(8)?,
            failure_code: row.get(9)?,
            failure_reason: row.get(10)?,
            dedupe_key: row.get(11)?,
            is_duplicate: row.get::<_, i64>(12)? == 1,
            high_risk_required: row.get::<_, i64>(13)? == 1,
            high_risk_confirmed: row.get::<_, i64>(14)? == 1,
            created_task_id: row.get(15)?,
            created_session_id: row.get(16)?,
            related_notification_id: row.get(17)?,
            latency_ms: row.get(18)?,
            created_at: row.get(19)?,
            updated_at: row.get(20)?,
        };
        if let Some(direction) = direction_filter.as_ref() {
            if item.direction.to_lowercase() != *direction {
                continue;
            }
        }
        if let Some(status) = status_filter.as_ref() {
            if item.execution_status.to_lowercase() != *status {
                continue;
            }
        }
        output.push(item);
    }
    Ok(output)
}

pub fn list_watch_targets(path: &Path) -> Result<Vec<WatchTarget>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, school_name, page_label, target_url, is_active, last_hash,
            last_checked_at, last_changed_at, created_at, updated_at
        FROM school_watch_targets
        ORDER BY updated_at DESC, id DESC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(WatchTarget {
            id: row.get(0)?,
            school_name: row.get(1)?,
            page_label: row.get(2)?,
            target_url: row.get(3)?,
            is_active: row.get::<_, i64>(4)? == 1,
            last_hash: row.get(5)?,
            last_checked_at: row.get(6)?,
            last_changed_at: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn create_watch_target(path: &Path, input: &NewWatchTargetInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO school_watch_targets (school_name, page_label, target_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![
            input.school_name,
            input.page_label,
            input.target_url,
            if input.is_active { 1 } else { 0 },
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn delete_watch_target(path: &Path, target_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM school_watch_targets WHERE id = ?", params![target_id])?;
    Ok(())
}

pub fn set_watch_target_active(path: &Path, target_id: i64, is_active: bool) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE school_watch_targets
        SET is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![if is_active { 1 } else { 0 }, target_id],
    )?;
    Ok(())
}

pub fn update_watch_target_hash(path: &Path, target_id: i64, hash: &str, changed: bool) -> Result<()> {
    let connection = Connection::open(path)?;
    if changed {
        connection.execute(
            r#"
            UPDATE school_watch_targets
            SET last_hash = ?, last_checked_at = CURRENT_TIMESTAMP, last_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            params![hash, target_id],
        )?;
    } else {
        connection.execute(
            r#"
            UPDATE school_watch_targets
            SET last_hash = ?, last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            params![hash, target_id],
        )?;
    }
    Ok(())
}

pub fn list_web_presets(path: &Path) -> Result<Vec<WebPreset>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, preset_name, preset_type, default_watch_type, default_selector_rule, default_check_frequency, default_category, created_at
        FROM web_presets
        ORDER BY id ASC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(WebPreset {
            id: row.get(0)?,
            preset_name: row.get(1)?,
            preset_type: row.get(2)?,
            default_watch_type: row.get(3)?,
            default_selector_rule: row.get(4)?,
            default_check_frequency: row.get(5)?,
            default_category: row.get(6)?,
            created_at: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn get_web_source(path: &Path, source_id: i64) -> Result<Option<WebSource>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                id, title, url, source_type, category, tags_json,
                linked_project_id, linked_task_id, linked_file_id, created_at, updated_at
            FROM web_sources
            WHERE id = ?
            LIMIT 1
            "#,
            params![source_id],
            |row| {
                Ok(WebSource {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    url: row.get(2)?,
                    source_type: row.get(3)?,
                    category: row.get(4)?,
                    tags_json: row.get(5)?,
                    linked_project_id: row.get(6)?,
                    linked_task_id: row.get(7)?,
                    linked_file_id: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            },
        )
        .optional()
}

pub fn list_web_sources(path: &Path, query: &WebSourceQueryInput) -> Result<Vec<WebSource>> {
    let connection = Connection::open(path)?;
    let limit = query.limit.unwrap_or(200).clamp(1, 1000);
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, title, url, source_type, category, tags_json,
            linked_project_id, linked_task_id, linked_file_id, created_at, updated_at
        FROM web_sources
        ORDER BY updated_at DESC, id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(WebSource {
            id: row.get(0)?,
            title: row.get(1)?,
            url: row.get(2)?,
            source_type: row.get(3)?,
            category: row.get(4)?,
            tags_json: row.get(5)?,
            linked_project_id: row.get(6)?,
            linked_task_id: row.get(7)?,
            linked_file_id: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    let mut items: Vec<WebSource> = rows.collect::<Result<Vec<_>>>()?;

    if let Some(raw) = query.query.as_ref() {
        let needle = raw.trim().to_lowercase();
        if !needle.is_empty() {
            items.retain(|item| {
                item.title.to_lowercase().contains(&needle)
                    || item.url.to_lowercase().contains(&needle)
                    || item.category.to_lowercase().contains(&needle)
            });
        }
    }
    if let Some(category) = query.category.as_ref() {
        let normalized = category.trim();
        if !normalized.is_empty() && normalized != "all" && normalized != "全部" {
            items.retain(|item| item.category.eq_ignore_ascii_case(normalized));
        }
    }
    if let Some(project_id) = query.linked_project_id {
        items.retain(|item| item.linked_project_id == Some(project_id));
    }
    Ok(items)
}

pub fn upsert_web_source(path: &Path, input: &NewWebSourceInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    let title = input.title.trim();
    let title = if title.is_empty() { "Untitled Web Source" } else { title };
    let url = input.url.trim();
    let source_type = input
        .source_type
        .as_deref()
        .map(|v| v.trim())
        .filter(|v| !v.is_empty())
        .unwrap_or("page");
    let category = input
        .category
        .as_deref()
        .map(|v| v.trim())
        .filter(|v| !v.is_empty())
        .unwrap_or("other");
    connection.execute(
        r#"
        INSERT INTO web_sources (
            title, url, source_type, category, tags_json, linked_project_id, linked_task_id, linked_file_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(url) DO UPDATE SET
            title = CASE WHEN excluded.title IS NOT NULL AND TRIM(excluded.title) <> '' THEN excluded.title ELSE web_sources.title END,
            source_type = CASE WHEN excluded.source_type IS NOT NULL AND TRIM(excluded.source_type) <> '' THEN excluded.source_type ELSE web_sources.source_type END,
            category = CASE WHEN excluded.category IS NOT NULL AND TRIM(excluded.category) <> '' THEN excluded.category ELSE web_sources.category END,
            tags_json = COALESCE(excluded.tags_json, web_sources.tags_json),
            linked_project_id = COALESCE(excluded.linked_project_id, web_sources.linked_project_id),
            linked_task_id = COALESCE(excluded.linked_task_id, web_sources.linked_task_id),
            linked_file_id = COALESCE(excluded.linked_file_id, web_sources.linked_file_id),
            updated_at = CURRENT_TIMESTAMP
        "#,
        params![
            title,
            url,
            source_type,
            category,
            input.tags_json,
            input.linked_project_id,
            input.linked_task_id,
            input.linked_file_id
        ],
    )?;
    let id = connection.query_row(
        "SELECT id FROM web_sources WHERE url = ? LIMIT 1",
        params![url],
        |row| row.get::<_, i64>(0),
    )?;
    Ok(id)
}

pub fn update_web_source_links(
    path: &Path,
    source_id: i64,
    linked_project_id: Option<i64>,
    linked_task_id: Option<i64>,
    linked_file_id: Option<i64>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE web_sources
        SET linked_project_id = ?,
            linked_task_id = ?,
            linked_file_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![linked_project_id, linked_task_id, linked_file_id, source_id],
    )?;
    Ok(())
}

pub fn create_web_watcher(path: &Path, input: &NewWebWatcherInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    let watch_type = if input.watch_type.trim().is_empty() {
        "full_page_text".to_string()
    } else {
        input.watch_type.trim().to_string()
    };
    let check_frequency = if input.check_frequency.trim().is_empty() {
        "daily".to_string()
    } else {
        input.check_frequency.trim().to_string()
    };
    let watcher_name = if input.watcher_name.trim().is_empty() {
        "Watcher".to_string()
    } else {
        input.watcher_name.trim().to_string()
    };
    connection.execute(
        r#"
        INSERT INTO web_watchers (
            source_id, watcher_name, target_url, watch_type, selector_rule, check_frequency, is_active,
            last_checked_at, last_hash, last_status, error_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'ok', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![
            input.source_id,
            watcher_name,
            input.target_url.trim(),
            watch_type,
            input.selector_rule.as_deref().map(|s| s.trim()).filter(|s| !s.is_empty()),
            check_frequency,
            if input.is_active.unwrap_or(true) { 1 } else { 0 }
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_web_watchers(path: &Path, query: &WebWatcherQueryInput) -> Result<Vec<WebWatcher>> {
    let connection = Connection::open(path)?;
    let limit = query.limit.unwrap_or(300).clamp(1, 1000);
    let mut statement = connection.prepare(
        r#"
        SELECT
            ww.id,
            ww.source_id,
            ws.title,
            ws.url,
            ws.category,
            ww.watcher_name,
            ww.target_url,
            ww.watch_type,
            ww.selector_rule,
            ww.check_frequency,
            ww.is_active,
            ww.last_checked_at,
            ww.last_hash,
            ww.last_status,
            ww.error_message,
            ww.created_at,
            ww.updated_at
        FROM web_watchers ww
        JOIN web_sources ws ON ws.id = ww.source_id
        ORDER BY ww.updated_at DESC, ww.id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(WebWatcher {
            id: row.get(0)?,
            source_id: row.get(1)?,
            source_title: row.get(2)?,
            source_url: row.get(3)?,
            source_category: row.get(4)?,
            watcher_name: row.get(5)?,
            target_url: row.get(6)?,
            watch_type: row.get(7)?,
            selector_rule: row.get(8)?,
            check_frequency: row.get(9)?,
            is_active: row.get::<_, i64>(10)? == 1,
            last_checked_at: row.get(11)?,
            last_hash: row.get(12)?,
            last_status: row.get(13)?,
            error_message: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    })?;
    let mut items: Vec<WebWatcher> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(source_id) = query.source_id {
        items.retain(|item| item.source_id == source_id);
    }
    if let Some(project_id) = query.linked_project_id {
        let source_ids: Vec<i64> = connection
            .prepare("SELECT id FROM web_sources WHERE linked_project_id = ?")?
            .query_map(params![project_id], |row| row.get::<_, i64>(0))?
            .collect::<Result<Vec<_>>>()?;
        items.retain(|item| source_ids.contains(&item.source_id));
    }
    if query.active_only.unwrap_or(false) {
        items.retain(|item| item.is_active);
    }
    Ok(items)
}

pub fn get_web_watcher(path: &Path, watcher_id: i64) -> Result<Option<WebWatcher>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                ww.id, ww.source_id, ws.title, ws.url, ws.category,
                ww.watcher_name, ww.target_url, ww.watch_type, ww.selector_rule, ww.check_frequency,
                ww.is_active, ww.last_checked_at, ww.last_hash, ww.last_status, ww.error_message, ww.created_at, ww.updated_at
            FROM web_watchers ww
            JOIN web_sources ws ON ws.id = ww.source_id
            WHERE ww.id = ?
            LIMIT 1
            "#,
            params![watcher_id],
            |row| {
                Ok(WebWatcher {
                    id: row.get(0)?,
                    source_id: row.get(1)?,
                    source_title: row.get(2)?,
                    source_url: row.get(3)?,
                    source_category: row.get(4)?,
                    watcher_name: row.get(5)?,
                    target_url: row.get(6)?,
                    watch_type: row.get(7)?,
                    selector_rule: row.get(8)?,
                    check_frequency: row.get(9)?,
                    is_active: row.get::<_, i64>(10)? == 1,
                    last_checked_at: row.get(11)?,
                    last_hash: row.get(12)?,
                    last_status: row.get(13)?,
                    error_message: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            },
        )
        .optional()
}

pub fn update_web_watcher_active(path: &Path, watcher_id: i64, is_active: bool) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        "UPDATE web_watchers SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![if is_active { 1 } else { 0 }, watcher_id],
    )?;
    Ok(())
}

pub fn delete_web_watcher(path: &Path, watcher_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM web_watchers WHERE id = ?", params![watcher_id])?;
    Ok(())
}

pub fn update_web_watcher_scan_state(
    path: &Path,
    watcher_id: i64,
    last_hash: Option<&str>,
    last_status: &str,
    error_message: Option<&str>,
    changed: bool,
) -> Result<()> {
    let connection = Connection::open(path)?;
    let _ = changed;
    connection.execute(
        r#"
        UPDATE web_watchers
        SET last_hash = COALESCE(?, last_hash),
            last_checked_at = CURRENT_TIMESTAMP,
            last_status = ?,
            error_message = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![last_hash, last_status, error_message, watcher_id],
    )?;
    Ok(())
}

pub fn create_web_change_log(
    path: &Path,
    watcher_id: i64,
    source_id: Option<i64>,
    old_snapshot: &str,
    new_snapshot: &str,
    diff_summary: &str,
    ai_summary: Option<&str>,
    change_direction: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO web_change_logs (
            watcher_id, source_id, old_snapshot, new_snapshot, diff_summary, ai_summary, change_direction, changed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            watcher_id,
            source_id,
            old_snapshot,
            new_snapshot,
            diff_summary,
            ai_summary,
            change_direction
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_web_change_logs(path: &Path, query: &WebChangeLogQueryInput) -> Result<Vec<WebChangeLog>> {
    let connection = Connection::open(path)?;
    let limit = query.limit.unwrap_or(120).clamp(1, 1000);
    let mut statement = connection.prepare(
        r#"
        SELECT
            wcl.id,
            wcl.watcher_id,
            wcl.source_id,
            ws.title,
            ww.target_url,
            wcl.old_snapshot,
            wcl.new_snapshot,
            wcl.diff_summary,
            wcl.ai_summary,
            wcl.change_direction,
            wcl.processed_at,
            wcl.processed_task_id,
            wcl.changed_at
        FROM web_change_logs wcl
        LEFT JOIN web_sources ws ON ws.id = wcl.source_id
        LEFT JOIN web_watchers ww ON ww.id = wcl.watcher_id
        ORDER BY wcl.changed_at DESC, wcl.id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(WebChangeLog {
            id: row.get(0)?,
            watcher_id: row.get(1)?,
            source_id: row.get(2)?,
            source_title: row.get(3)?,
            target_url: row.get(4)?,
            old_snapshot: row.get(5)?,
            new_snapshot: row.get(6)?,
            diff_summary: row.get(7)?,
            ai_summary: row.get(8)?,
            change_direction: row.get(9)?,
            processed_at: row.get(10)?,
            processed_task_id: row.get(11)?,
            changed_at: row.get(12)?,
        })
    })?;
    let mut items: Vec<WebChangeLog> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(watcher_id) = query.watcher_id {
        items.retain(|item| item.watcher_id == watcher_id);
    }
    if let Some(source_id) = query.source_id {
        items.retain(|item| item.source_id == Some(source_id));
    }
    if let Some(project_id) = query.linked_project_id {
        let source_ids: Vec<i64> = connection
            .prepare("SELECT id FROM web_sources WHERE linked_project_id = ?")?
            .query_map(params![project_id], |row| row.get::<_, i64>(0))?
            .collect::<Result<Vec<_>>>()?;
        items.retain(|item| item.source_id.is_some() && source_ids.contains(&item.source_id.unwrap_or_default()));
    }
    Ok(items)
}

pub fn get_web_change_log(path: &Path, change_id: i64) -> Result<Option<WebChangeLog>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                wcl.id, wcl.watcher_id, wcl.source_id, ws.title, ww.target_url,
                wcl.old_snapshot, wcl.new_snapshot, wcl.diff_summary, wcl.ai_summary, wcl.change_direction,
                wcl.processed_at, wcl.processed_task_id, wcl.changed_at
            FROM web_change_logs wcl
            LEFT JOIN web_sources ws ON ws.id = wcl.source_id
            LEFT JOIN web_watchers ww ON ww.id = wcl.watcher_id
            WHERE wcl.id = ?
            LIMIT 1
            "#,
            params![change_id],
            |row| {
                Ok(WebChangeLog {
                    id: row.get(0)?,
                    watcher_id: row.get(1)?,
                    source_id: row.get(2)?,
                    source_title: row.get(3)?,
                    target_url: row.get(4)?,
                    old_snapshot: row.get(5)?,
                    new_snapshot: row.get(6)?,
                    diff_summary: row.get(7)?,
                    ai_summary: row.get(8)?,
                    change_direction: row.get(9)?,
                    processed_at: row.get(10)?,
                    processed_task_id: row.get(11)?,
                    changed_at: row.get(12)?,
                })
            },
        )
        .optional()
}

pub fn set_web_change_processed(
    path: &Path,
    change_id: i64,
    processed: bool,
    processed_task_id: Option<i64>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    if processed {
        connection.execute(
            "UPDATE web_change_logs SET processed_at = CURRENT_TIMESTAMP, processed_task_id = COALESCE(?, processed_task_id) WHERE id = ?",
            params![processed_task_id, change_id],
        )?;
    } else {
        connection.execute(
            "UPDATE web_change_logs SET processed_at = NULL, processed_task_id = NULL WHERE id = ?",
            params![change_id],
        )?;
    }
    Ok(())
}

pub fn create_web_clipping(
    path: &Path,
    source_id: i64,
    clipped_title: &str,
    clipped_text: &str,
    clipped_html: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO web_clippings (
            source_id, clipped_title, clipped_text, clipped_html, saved_as_note, saved_as_library_item, created_at
        ) VALUES (?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)
        "#,
        params![source_id, clipped_title, clipped_text, clipped_html],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn get_web_clipping(path: &Path, clipping_id: i64) -> Result<Option<WebClipping>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT id, source_id, clipped_title, clipped_text, clipped_html, saved_as_note, saved_as_library_item, created_at
            FROM web_clippings
            WHERE id = ?
            LIMIT 1
            "#,
            params![clipping_id],
            |row| {
                Ok(WebClipping {
                    id: row.get(0)?,
                    source_id: row.get(1)?,
                    clipped_title: row.get(2)?,
                    clipped_text: row.get(3)?,
                    clipped_html: row.get(4)?,
                    saved_as_note: row.get::<_, i64>(5)? == 1,
                    saved_as_library_item: row.get::<_, i64>(6)? == 1,
                    created_at: row.get(7)?,
                })
            },
        )
        .optional()
}

pub fn list_web_clippings(path: &Path, source_id: Option<i64>, limit: i64) -> Result<Vec<WebClipping>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, source_id, clipped_title, clipped_text, clipped_html, saved_as_note, saved_as_library_item, created_at
        FROM web_clippings
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
        Ok(WebClipping {
            id: row.get(0)?,
            source_id: row.get(1)?,
            clipped_title: row.get(2)?,
            clipped_text: row.get(3)?,
            clipped_html: row.get(4)?,
            saved_as_note: row.get::<_, i64>(5)? == 1,
            saved_as_library_item: row.get::<_, i64>(6)? == 1,
            created_at: row.get(7)?,
        })
    })?;
    let mut items: Vec<WebClipping> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(source_id) = source_id {
        items.retain(|item| item.source_id == source_id);
    }
    Ok(items)
}

pub fn mark_web_clipping_saved_as_note(path: &Path, clipping_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        "UPDATE web_clippings SET saved_as_note = 1 WHERE id = ?",
        params![clipping_id],
    )?;
    Ok(())
}

pub fn mark_web_clipping_saved_as_library_item(path: &Path, clipping_id: i64, linked_file_id: Option<i64>) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        "UPDATE web_clippings SET saved_as_library_item = 1 WHERE id = ?",
        params![clipping_id],
    )?;
    if let Some(file_id) = linked_file_id {
        connection.execute(
            "UPDATE web_sources SET linked_file_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT source_id FROM web_clippings WHERE id = ? LIMIT 1)",
            params![file_id, clipping_id],
        )?;
    }
    Ok(())
}

pub fn list_pomodoro_sessions(path: &Path, limit: i64) -> Result<Vec<PomodoroSessionRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            ps.id,
            ps.task_id,
            CASE
                WHEN ps.task_id IS NOT NULL THEN (SELECT t.title FROM tasks t WHERE t.id = ps.task_id)
                ELSE NULL
            END AS task_title,
            ps.duration_minutes,
            ps.break_minutes,
            ps.status,
            ps.interrupted_count,
            ps.started_at,
            ps.ended_at
        FROM pomodoro_sessions ps
        ORDER BY ps.id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(PomodoroSessionRecord {
            id: row.get(0)?,
            task_id: row.get(1)?,
            task_title: row.get(2)?,
            duration_minutes: row.get(3)?,
            break_minutes: row.get(4)?,
            status: row.get(5)?,
            interrupted_count: row.get(6)?,
            started_at: row.get(7)?,
            ended_at: row.get(8)?,
        })
    })?;
    rows.collect()
}

pub fn start_pomodoro_session(
    path: &Path,
    task_id: Option<i64>,
    duration_minutes: i64,
    break_minutes: i64,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO pomodoro_sessions (
            task_id, duration_minutes, break_minutes, status, interrupted_count, started_at, ended_at
        ) VALUES (?, ?, ?, 'running', 0, CURRENT_TIMESTAMP, NULL)
        "#,
        params![task_id, duration_minutes, break_minutes],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn finish_pomodoro_session(
    path: &Path,
    session_id: i64,
    status: &str,
    interrupted_count: i64,
) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE pomodoro_sessions
        SET status = ?,
            interrupted_count = ?,
            ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![status, interrupted_count, session_id],
    )?;
    Ok(())
}

pub fn get_focus_stats(path: &Path) -> Result<FocusStats> {
    let connection = Connection::open(path)?;
    let today_minutes = connection
        .query_row(
            r#"
            SELECT COALESCE(SUM(duration_minutes), 0)
            FROM pomodoro_sessions
            WHERE status = 'completed'
              AND started_at >= date('now', 'localtime')
            "#,
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0);
    let week_minutes = connection
        .query_row(
            r#"
            SELECT COALESCE(SUM(duration_minutes), 0)
            FROM pomodoro_sessions
            WHERE status = 'completed'
              AND started_at >= datetime('now', '-7 day', 'localtime')
            "#,
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0);
    let interrupted_count = connection
        .query_row(
            r#"
            SELECT COALESCE(SUM(interrupted_count), 0)
            FROM pomodoro_sessions
            WHERE started_at >= datetime('now', '-7 day', 'localtime')
            "#,
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0);
    Ok(FocusStats {
        today_minutes,
        week_minutes,
        interrupted_count,
    })
}

pub fn list_habits(path: &Path) -> Result<Vec<Habit>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, title, category, frequency, target_value, unit, created_at, updated_at
        FROM habits
        ORDER BY updated_at DESC, id DESC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Habit {
            id: row.get(0)?,
            title: row.get(1)?,
            category: row.get(2)?,
            frequency: row.get(3)?,
            target_value: row.get(4)?,
            unit: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn create_habit(path: &Path, input: &NewHabitInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO habits (title, category, frequency, target_value, unit)
        VALUES (?, ?, ?, ?, ?)
        "#,
        params![input.title, input.category, input.frequency, input.target_value, input.unit],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn delete_habit(path: &Path, habit_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    if table_exists(&connection, "habit_logs")? {
        connection.execute("DELETE FROM habit_logs WHERE habit_id = ?", params![habit_id])?;
    }
    connection.execute("DELETE FROM habits WHERE id = ?", params![habit_id])?;
    Ok(())
}

pub fn list_habit_logs(path: &Path, habit_id: i64, limit: i64) -> Result<Vec<HabitLog>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, habit_id, value, log_date, note, created_at
        FROM habit_logs
        WHERE habit_id = ?
        ORDER BY log_date DESC, id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![habit_id, limit], |row| {
        Ok(HabitLog {
            id: row.get(0)?,
            habit_id: row.get(1)?,
            value: row.get(2)?,
            log_date: row.get(3)?,
            note: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn create_habit_log(path: &Path, input: &NewHabitLogInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO habit_logs (habit_id, value, log_date, note)
        VALUES (?, ?, ?, ?)
        "#,
        params![input.habit_id, input.value, input.log_date, input.note],
    )?;
    connection.execute(
        "UPDATE habits SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![input.habit_id],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_journal_entries(path: &Path, limit: i64) -> Result<Vec<JournalEntry>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, entry_type, title, content, mood_score, energy_score, created_at, updated_at
        FROM journal_entries
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(JournalEntry {
            id: row.get(0)?,
            entry_type: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            mood_score: row.get(4)?,
            energy_score: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect()
}

pub fn create_journal_entry(path: &Path, input: &NewJournalEntryInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO journal_entries (entry_type, title, content, mood_score, energy_score)
        VALUES (?, ?, ?, ?, ?)
        "#,
        params![
            input.entry_type,
            input.title,
            input.content,
            input.mood_score,
            input.energy_score
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_idea_notes(path: &Path, limit: i64) -> Result<Vec<IdeaNote>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, title, content, tags_json, source, created_at, updated_at
        FROM idea_notes
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(IdeaNote {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            tags_json: row.get(3)?,
            source: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn create_idea_note(path: &Path, input: &NewIdeaNoteInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO idea_notes (title, content, tags_json, source)
        VALUES (?, ?, ?, ?)
        "#,
        params![input.title, input.content, input.tags_json, input.source],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_mistake_notes(path: &Path, exam_type: Option<&str>, limit: i64) -> Result<Vec<MistakeNote>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, exam_type, subject, topic, question_source, mistake_reason,
            correct_method, review_date, linked_file_id, created_at, updated_at
        FROM mistake_notes
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(MistakeNote {
            id: row.get(0)?,
            exam_type: row.get(1)?,
            subject: row.get(2)?,
            topic: row.get(3)?,
            question_source: row.get(4)?,
            mistake_reason: row.get(5)?,
            correct_method: row.get(6)?,
            review_date: row.get(7)?,
            linked_file_id: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    let mut items: Vec<MistakeNote> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(value) = exam_type {
        let normalized = value.trim();
        if !normalized.is_empty() && normalized != "all" && normalized != "全部" {
            items.retain(|item| item.exam_type == normalized);
        }
    }
    Ok(items)
}

pub fn create_mistake_note(path: &Path, input: &NewMistakeNoteInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO mistake_notes (
            exam_type, subject, topic, question_source, mistake_reason,
            correct_method, review_date, linked_file_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        params![
            input.exam_type,
            input.subject,
            input.topic,
            input.question_source,
            input.mistake_reason,
            input.correct_method,
            input.review_date,
            input.linked_file_id
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn delete_mistake_note(path: &Path, mistake_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM mistake_notes WHERE id = ?", params![mistake_id])?;
    Ok(())
}

pub fn save_question_bank(
    path: &Path,
    bank_name: &str,
    subject: Option<&str>,
    file_path: Option<&str>,
    passages: &[ParsedPassageInput],
) -> Result<i64> {
    let mut connection = Connection::open(path)?;
    let tx = connection.transaction()?;

    tx.execute(
        "INSERT INTO question_banks (name, subject, file_path, total_passages, parsed_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
        params![bank_name, subject, file_path, passages.len() as i64],
    )?;
    let bank_id = tx.last_insert_rowid();

    for (idx, passage) in passages.iter().enumerate() {
        let passage_num = passage
            .passage_id
            .trim()
            .parse::<i64>()
            .ok()
            .filter(|value| *value > 0)
            .unwrap_or((idx as i64) + 1);
        let mut kinds: Vec<String> = Vec::new();
        for q in &passage.questions {
            if let Some(kind) = q.q_type.as_ref() {
                let k = kind.trim();
                if !k.is_empty() && !kinds.iter().any(|it| it == k) {
                    kinds.push(k.to_string());
                }
            }
        }
        let question_types = if kinds.is_empty() {
            None
        } else {
            Some(kinds.join(","))
        };
        tx.execute(
            "INSERT INTO passages (bank_id, passage_num, passage_text, question_count, question_types) VALUES (?, ?, ?, ?, ?)",
            params![
                bank_id,
                passage_num,
                passage.passage_text,
                passage.questions.len() as i64,
                question_types
            ],
        )?;
        let passage_id = tx.last_insert_rowid();

        for (q_idx, q) in passage.questions.iter().enumerate() {
            let q_num = q
                .question_id
                .trim()
                .parse::<i64>()
                .ok()
                .filter(|value| *value > 0)
                .unwrap_or((q_idx as i64) + 1);

            let mut option_a: Option<String> = None;
            let mut option_b: Option<String> = None;
            let mut option_c: Option<String> = None;
            let mut option_d: Option<String> = None;
            let mut option_e: Option<String> = None;
            if let Some(options) = q.options.as_ref() {
                option_a = options.get(0).cloned().and_then(|value| {
                    let trimmed = value.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                });
                option_b = options.get(1).cloned().and_then(|value| {
                    let trimmed = value.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                });
                option_c = options.get(2).cloned().and_then(|value| {
                    let trimmed = value.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                });
                option_d = options.get(3).cloned().and_then(|value| {
                    let trimmed = value.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                });
                option_e = options.get(4).cloned().and_then(|value| {
                    let trimmed = value.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                });
            }
            let normalized_answer = q.answer.as_ref().and_then(|value| {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            });
            let has_answer = if normalized_answer.is_some() { 1 } else { 0 };
            tx.execute(
                "INSERT INTO questions (passage_id, q_num, q_type, q_text, option_a, option_b, option_c, option_d, option_e, correct_answer, has_answer, highlighted_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    passage_id,
                    q_num,
                    q.q_type,
                    q.question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d,
                    option_e,
                    normalized_answer,
                    has_answer,
                    q.highlighted_text
                ],
            )?;
        }
    }

    tx.commit()?;
    Ok(bank_id)
}

pub fn list_question_banks(path: &Path) -> Result<Vec<QuestionBank>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, name, subject, file_path, total_passages, parsed_at, created_at
        FROM question_banks
        ORDER BY created_at DESC, id DESC
        "#,
    )?;
    let rows = statement.query_map([], |row| {
        Ok(QuestionBank {
            id: row.get(0)?,
            name: row.get(1)?,
            subject: row.get(2)?,
            file_path: row.get(3)?,
            total_passages: row.get(4)?,
            parsed_at: row.get(5)?,
            created_at: row.get(6)?,
        })
    })?;
    rows.collect()
}

pub fn list_passages(path: &Path, bank_id: i64, q_type_filter: Option<&str>) -> Result<Vec<PassageSummary>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            p.id,
            p.bank_id,
            p.passage_num,
            p.question_count,
            p.question_types,
            COALESCE(stats.attempted_questions, 0) AS attempted_questions,
            COALESCE(stats.correct_questions, 0) AS correct_questions,
            COALESCE(stats.wrong_questions, 0) AS wrong_questions,
            stats.last_attempted_at
        FROM passages p
        LEFT JOIN (
            WITH latest AS (
                SELECT question_id, MAX(id) AS last_id
                FROM question_attempt_logs
                GROUP BY question_id
            )
            SELECT
                l.passage_id,
                COUNT(*) AS attempted_questions,
                SUM(CASE WHEN l.is_correct = 1 THEN 1 ELSE 0 END) AS correct_questions,
                SUM(CASE WHEN l.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_questions,
                MAX(l.created_at) AS last_attempted_at
            FROM question_attempt_logs l
            JOIN latest ON latest.last_id = l.id
            GROUP BY l.passage_id
        ) stats ON stats.passage_id = p.id
        WHERE p.bank_id = ?
        ORDER BY passage_num ASC
        "#,
    )?;
    let rows = statement.query_map(params![bank_id], |row| {
        Ok(PassageSummary {
            id: row.get(0)?,
            bank_id: row.get(1)?,
            passage_num: row.get(2)?,
            question_count: row.get(3)?,
            question_types: row.get(4)?,
            attempted_questions: row.get(5)?,
            correct_questions: row.get(6)?,
            wrong_questions: row.get(7)?,
            last_attempted_at: row.get(8)?,
        })
    })?;
    let mut items: Vec<PassageSummary> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(filter) = q_type_filter {
        let key = filter.trim();
        if !key.is_empty() {
            items.retain(|it| it.question_types.as_ref().map(|v| v.contains(key)).unwrap_or(false));
        }
    }
    Ok(items)
}

pub fn get_passage_detail(path: &Path, passage_id: i64) -> Result<Option<PassageDetail>> {
    let connection = Connection::open(path)?;
    let passage = connection
        .query_row(
            "SELECT id, bank_id, passage_num, passage_text, question_count, question_types FROM passages WHERE id = ? LIMIT 1",
            params![passage_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, Option<String>>(5)?,
                ))
            },
        )
        .optional()?;

    let Some((id, bank_id, passage_num, passage_text, question_count, question_types)) = passage else {
        return Ok(None);
    };

    let mut statement = connection.prepare(
        r#"
        SELECT id, passage_id, q_num, q_type, q_text, option_a, option_b, option_c, option_d, option_e, correct_answer, has_answer, highlighted_text
        FROM questions
        WHERE passage_id = ?
        ORDER BY q_num ASC
        "#,
    )?;
    let rows = statement.query_map(params![id], |row| {
        Ok(QuestionDetail {
            id: row.get(0)?,
            passage_id: row.get(1)?,
            q_num: row.get(2)?,
            q_type: row.get(3)?,
            q_text: row.get(4)?,
            option_a: row.get(5)?,
            option_b: row.get(6)?,
            option_c: row.get(7)?,
            option_d: row.get(8)?,
            option_e: row.get(9)?,
            correct_answer: row.get(10)?,
            has_answer: row.get(11)?,
            highlighted_text: row.get(12)?,
        })
    })?;
    let questions = rows.collect::<Result<Vec<_>>>()?;

    Ok(Some(PassageDetail {
        id,
        bank_id,
        passage_num,
        passage_text,
        question_count,
        question_types,
        questions,
    }))
}

fn normalize_answer_for_compare(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let upper = trimmed.to_uppercase();
    if upper.chars().all(|ch| ch.is_ascii_uppercase()) && upper.len() <= 5 {
        let mut chars: Vec<String> = upper.chars().map(|ch| ch.to_string()).collect();
        chars.sort();
        chars.dedup();
        return chars.join(",");
    }
    if upper.contains(',') || upper.contains('/') || upper.contains('|') || upper.contains(';') {
        let mut tokens: Vec<String> = upper
            .split(|ch: char| ch == ',' || ch == '/' || ch == '|' || ch == ';' || ch.is_whitespace())
            .filter(|token| !token.trim().is_empty())
            .map(|token| token.trim().to_string())
            .collect();
        if tokens
            .iter()
            .all(|token| token.len() == 1 && token.chars().all(|ch| ch.is_ascii_uppercase()))
        {
            tokens.sort();
            tokens.dedup();
        }
        return tokens.join(",");
    }
    upper
}

fn answers_match(my_answer: &str, correct_answer: &str) -> bool {
    let left = normalize_answer_for_compare(my_answer);
    let right = normalize_answer_for_compare(correct_answer);
    if !left.is_empty() && !right.is_empty() {
        return left == right;
    }
    my_answer.trim().eq_ignore_ascii_case(correct_answer.trim())
}

fn insert_question_attempt_log(
    connection: &Connection,
    question_id: i64,
    my_answer: Option<&str>,
    answer_source: i64,
    is_correct: Option<bool>,
    time_spent_seconds: Option<i64>,
) -> Result<()> {
    let context = connection
        .query_row(
            r#"
            SELECT p.bank_id, q.passage_id, q.q_type, q.correct_answer
            FROM questions q
            JOIN passages p ON p.id = q.passage_id
            WHERE q.id = ?
            LIMIT 1
            "#,
            params![question_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            },
        )
        .optional()?;
    let Some((bank_id, passage_id, q_type, correct_answer)) = context else {
        return Ok(());
    };
    let normalized_my_answer = my_answer.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    });
    connection.execute(
        r#"
        INSERT INTO question_attempt_logs (
            bank_id, passage_id, question_id, q_type, my_answer, correct_answer, answer_source, is_correct, time_spent_seconds, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            bank_id,
            passage_id,
            question_id,
            q_type,
            normalized_my_answer,
            correct_answer,
            answer_source,
            is_correct.map(|value| if value { 1 } else { 0 }),
            time_spent_seconds.unwrap_or(0).max(0)
        ],
    )?;
    Ok(())
}

pub fn submit_question_answer(
    path: &Path,
    question_id: i64,
    my_answer: &str,
    time_spent_seconds: Option<i64>,
) -> Result<AnswerResult> {
    let connection = Connection::open(path)?;
    let row = connection
        .query_row(
            "SELECT correct_answer, has_answer FROM questions WHERE id = ? LIMIT 1",
            params![question_id],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, i64>(1)?)),
        )
        .optional()?;
    let Some((correct_answer, has_answer)) = row else {
        return Ok(AnswerResult {
            is_correct: false,
            correct_answer: None,
            has_answer: 0,
        });
    };
    let is_correct = if has_answer == 1 {
        correct_answer
            .as_ref()
            .map(|value| answers_match(my_answer, value))
            .unwrap_or(false)
    } else {
        false
    };
    insert_question_attempt_log(
        &connection,
        question_id,
        Some(my_answer),
        if has_answer == 1 { 1 } else { 0 },
        if has_answer == 1 { Some(is_correct) } else { None },
        time_spent_seconds,
    )?;
    Ok(AnswerResult {
        is_correct,
        correct_answer,
        has_answer,
    })
}

pub fn submit_self_evaluation(path: &Path, payload: &QuestionAttemptInput) -> Result<AnswerResult> {
    let connection = Connection::open(path)?;
    connection.execute(
        "UPDATE questions SET has_answer = 2 WHERE id = ?",
        params![payload.question_id],
    )?;
    insert_question_attempt_log(
        &connection,
        payload.question_id,
        payload.my_answer.as_deref(),
        2,
        payload.self_eval_result,
        payload.time_spent_seconds,
    )?;
    Ok(AnswerResult {
        is_correct: payload.self_eval_result.unwrap_or(false),
        correct_answer: None,
        has_answer: 2,
    })
}

pub fn import_answer_key(path: &Path, bank_id: i64, entries: &[ImportAnswerEntry]) -> Result<ImportAnswerResult> {
    let mut connection = Connection::open(path)?;
    let tx = connection.transaction()?;
    let mut matched = 0_i64;
    let mut updated = 0_i64;
    let mut unmatched = 0_i64;

    for entry in entries {
        if entry.q_num <= 0 {
            unmatched += 1;
            continue;
        }
        let normalized_answer = entry.correct_answer.trim();
        if normalized_answer.is_empty() {
            unmatched += 1;
            continue;
        }
        let found = if let Some(passage_num) = entry.passage_num {
            tx.query_row(
                r#"
                SELECT q.id
                FROM questions q
                JOIN passages p ON p.id = q.passage_id
                WHERE p.bank_id = ? AND p.passage_num = ? AND q.q_num = ?
                LIMIT 1
                "#,
                params![bank_id, passage_num, entry.q_num],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
        } else {
            tx.query_row(
                r#"
                SELECT q.id
                FROM questions q
                JOIN passages p ON p.id = q.passage_id
                WHERE p.bank_id = ? AND q.q_num = ?
                ORDER BY p.passage_num ASC, q.q_num ASC
                LIMIT 1
                "#,
                params![bank_id, entry.q_num],
                |row| row.get::<_, i64>(0),
            )
            .optional()?
        };
        let Some(question_id) = found else {
            unmatched += 1;
            continue;
        };
        matched += 1;
        let rows = tx.execute(
            "UPDATE questions SET correct_answer = ?, has_answer = 1 WHERE id = ?",
            params![normalized_answer, question_id],
        )?;
        updated += rows as i64;
    }

    tx.commit()?;
    Ok(ImportAnswerResult {
        matched,
        updated,
        unmatched,
    })
}

pub fn create_question_annotation(path: &Path, payload: &NewQuestionAnnotationInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO question_annotations (
            question_id, passage_id, annotation_type, quote_text, color, note_text, start_offset, end_offset, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![
            payload.question_id,
            payload.passage_id,
            payload.annotation_type,
            payload.quote_text,
            payload.color,
            payload.note_text,
            payload.start_offset,
            payload.end_offset
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_question_annotations(path: &Path, passage_id: i64) -> Result<Vec<QuestionAnnotation>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, question_id, passage_id, annotation_type, quote_text, color, note_text, start_offset, end_offset, created_at, updated_at
        FROM question_annotations
        WHERE passage_id = ?
        ORDER BY id DESC
        "#,
    )?;
    let rows = statement.query_map(params![passage_id], |row| {
        Ok(QuestionAnnotation {
            id: row.get(0)?,
            question_id: row.get(1)?,
            passage_id: row.get(2)?,
            annotation_type: row.get(3)?,
            quote_text: row.get(4)?,
            color: row.get(5)?,
            note_text: row.get(6)?,
            start_offset: row.get(7)?,
            end_offset: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    rows.collect()
}

pub fn get_question_bank_stats(path: &Path, bank_id: Option<i64>, range_days: i64) -> Result<QuestionBankStats> {
    let connection = Connection::open(path)?;
    let days = range_days.clamp(7, 365);
    let since_date = (Utc::now().date_naive() - Duration::days(days - 1))
        .format("%Y-%m-%d")
        .to_string();

    let total_questions: i64 = if let Some(id) = bank_id {
        connection.query_row(
            "SELECT COUNT(1) FROM questions q JOIN passages p ON p.id = q.passage_id WHERE p.bank_id = ?",
            params![id],
            |row| row.get(0),
        )?
    } else {
        connection.query_row("SELECT COUNT(1) FROM questions", [], |row| row.get(0))?
    };

    let (total_attempts, total_correct, total_time_seconds, mistake_total) = if let Some(id) = bank_id {
        connection.query_row(
            r#"
            SELECT
                COUNT(1),
                COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(COALESCE(time_spent_seconds, 0)), 0),
                COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0)
            FROM question_attempt_logs
            WHERE bank_id = ?
            "#,
            params![id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )?
    } else {
        connection.query_row(
            r#"
            SELECT
                COUNT(1),
                COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(COALESCE(time_spent_seconds, 0)), 0),
                COALESCE(SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END), 0)
            FROM question_attempt_logs
            "#,
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )?
    };

    let overall_accuracy = if total_attempts > 0 {
        ((total_correct as f64) / (total_attempts as f64) * 1000.0).round() / 10.0
    } else {
        0.0
    };

    let mut trend_statement = connection.prepare(
        r#"
        SELECT
            substr(l.created_at, 1, 10) AS date_key,
            SUM(CASE WHEN l.is_correct = 1 THEN 1 ELSE 0 END) AS overall_correct,
            COUNT(1) AS overall_total,
            SUM(CASE WHEN (COALESCE(qb.subject, '') LIKE '%GRE%' OR COALESCE(qb.name, '') LIKE '%GRE%')
                        AND (COALESCE(q.q_type, '') LIKE '%阅读%' OR COALESCE(qb.name, '') LIKE '%阅读%')
                        AND l.is_correct = 1 THEN 1 ELSE 0 END) AS gre_reading_correct,
            SUM(CASE WHEN (COALESCE(qb.subject, '') LIKE '%GRE%' OR COALESCE(qb.name, '') LIKE '%GRE%')
                        AND (COALESCE(q.q_type, '') LIKE '%阅读%' OR COALESCE(qb.name, '') LIKE '%阅读%')
                     THEN 1 ELSE 0 END) AS gre_reading_total,
            SUM(CASE WHEN (COALESCE(qb.subject, '') LIKE '%GRE%' OR COALESCE(qb.name, '') LIKE '%GRE%')
                        AND (COALESCE(q.q_type, '') LIKE '%数学%' OR COALESCE(qb.name, '') LIKE '%数学%')
                        AND l.is_correct = 1 THEN 1 ELSE 0 END) AS gre_math_correct,
            SUM(CASE WHEN (COALESCE(qb.subject, '') LIKE '%GRE%' OR COALESCE(qb.name, '') LIKE '%GRE%')
                        AND (COALESCE(q.q_type, '') LIKE '%数学%' OR COALESCE(qb.name, '') LIKE '%数学%')
                     THEN 1 ELSE 0 END) AS gre_math_total,
            SUM(CASE WHEN (COALESCE(qb.subject, '') LIKE '%雅思%' OR COALESCE(qb.name, '') LIKE '%雅思%')
                        AND (COALESCE(q.q_type, '') LIKE '%阅读%' OR COALESCE(qb.name, '') LIKE '%阅读%')
                        AND l.is_correct = 1 THEN 1 ELSE 0 END) AS ielts_reading_correct,
            SUM(CASE WHEN (COALESCE(qb.subject, '') LIKE '%雅思%' OR COALESCE(qb.name, '') LIKE '%雅思%')
                        AND (COALESCE(q.q_type, '') LIKE '%阅读%' OR COALESCE(qb.name, '') LIKE '%阅读%')
                     THEN 1 ELSE 0 END) AS ielts_reading_total
        FROM question_attempt_logs l
        JOIN question_banks qb ON qb.id = l.bank_id
        JOIN questions q ON q.id = l.question_id
        WHERE date(l.created_at) >= date(?)
          AND (? IS NULL OR l.bank_id = ?)
        GROUP BY substr(l.created_at, 1, 10)
        ORDER BY date_key ASC
        "#,
    )?;
    let trend_rows = trend_statement.query_map(params![since_date, bank_id, bank_id], |row| {
        let overall_total: i64 = row.get(2)?;
        let gre_read_total: i64 = row.get(4)?;
        let gre_math_total: i64 = row.get(6)?;
        let ielts_read_total: i64 = row.get(8)?;
        let to_rate = |correct: i64, total: i64| -> f64 {
            if total <= 0 {
                0.0
            } else {
                ((correct as f64) / (total as f64) * 1000.0).round() / 10.0
            }
        };
        Ok(AccuracyTrendPoint {
            date_key: row.get(0)?,
            overall: to_rate(row.get(1)?, overall_total),
            gre_reading: to_rate(row.get(3)?, gre_read_total),
            gre_math: to_rate(row.get(5)?, gre_math_total),
            ielts_reading: to_rate(row.get(7)?, ielts_read_total),
        })
    })?;
    let trend = trend_rows.collect::<Result<Vec<_>>>()?;

    let mut type_statement = connection.prepare(
        r#"
        SELECT
            COALESCE(NULLIF(TRIM(q.q_type), ''), '未分类') AS q_type,
            COUNT(1) AS total,
            COALESCE(SUM(CASE WHEN l.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct,
            COALESCE(SUM(CASE WHEN l.is_correct = 0 THEN 1 ELSE 0 END), 0) AS wrong
        FROM question_attempt_logs l
        JOIN questions q ON q.id = l.question_id
        WHERE (? IS NULL OR l.bank_id = ?)
          AND l.is_correct IS NOT NULL
        GROUP BY COALESCE(NULLIF(TRIM(q.q_type), ''), '未分类')
        ORDER BY total DESC
        LIMIT 24
        "#,
    )?;
    let type_rows = type_statement.query_map(params![bank_id, bank_id], |row| {
        let total: i64 = row.get(1)?;
        let correct: i64 = row.get(2)?;
        let accuracy = if total <= 0 {
            0.0
        } else {
            ((correct as f64) / (total as f64) * 1000.0).round() / 10.0
        };
        Ok(QuestionTypeMetric {
            q_type: row.get(0)?,
            total,
            correct,
            wrong: row.get(3)?,
            accuracy,
        })
    })?;
    let type_metrics = type_rows.collect::<Result<Vec<_>>>()?;

    let mut time_statement = connection.prepare(
        r#"
        SELECT
            substr(created_at, 1, 10) AS date_key,
            AVG(CASE WHEN time_spent_seconds > 0 THEN time_spent_seconds ELSE NULL END) AS avg_seconds
        FROM question_attempt_logs
        WHERE date(created_at) >= date(?)
          AND (? IS NULL OR bank_id = ?)
        GROUP BY substr(created_at, 1, 10)
        ORDER BY date_key ASC
        "#,
    )?;
    let time_rows = time_statement.query_map(params![since_date, bank_id, bank_id], |row| {
        Ok(TimeTrendPoint {
            date_key: row.get(0)?,
            avg_seconds: row.get::<_, Option<f64>>(1)?.unwrap_or(0.0),
        })
    })?;
    let time_trend = time_rows.collect::<Result<Vec<_>>>()?;

    let mut passage_time_statement = connection.prepare(
        r#"
        SELECT
            p.passage_num,
            AVG(CASE WHEN l.time_spent_seconds > 0 THEN l.time_spent_seconds ELSE NULL END) AS avg_seconds
        FROM question_attempt_logs l
        JOIN passages p ON p.id = l.passage_id
        WHERE (? IS NULL OR l.bank_id = ?)
        GROUP BY p.id, p.passage_num
        ORDER BY avg_seconds DESC
        LIMIT 60
        "#,
    )?;
    let passage_time_rows = passage_time_statement.query_map(params![bank_id, bank_id], |row| {
        Ok(PassageTimeMetric {
            passage_num: row.get(0)?,
            avg_seconds: row.get::<_, Option<f64>>(1)?.unwrap_or(0.0),
        })
    })?;
    let passage_time = passage_time_rows.collect::<Result<Vec<_>>>()?;

    let mut heatmap_statement = connection.prepare(
        r#"
        SELECT
            substr(l.created_at, 1, 10) AS date_key,
            COALESCE(NULLIF(TRIM(q.q_type), ''), '未分类') AS q_type,
            SUM(CASE WHEN l.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count
        FROM question_attempt_logs l
        JOIN questions q ON q.id = l.question_id
        WHERE date(l.created_at) >= date(?)
          AND (? IS NULL OR l.bank_id = ?)
        GROUP BY substr(l.created_at, 1, 10), COALESCE(NULLIF(TRIM(q.q_type), ''), '未分类')
        HAVING wrong_count > 0
        ORDER BY date_key ASC, q_type ASC
        "#,
    )?;
    let heatmap_rows = heatmap_statement.query_map(params![since_date, bank_id, bank_id], |row| {
        Ok(WrongHeatmapPoint {
            date_key: row.get(0)?,
            q_type: row.get(1)?,
            wrong_count: row.get(2)?,
        })
    })?;
    let wrong_heatmap = heatmap_rows.collect::<Result<Vec<_>>>()?;

    let mut completion_statement = connection.prepare(
        r#"
        SELECT
            p.id,
            p.passage_num,
            COALESCE(SUM(CASE WHEN l.is_correct = 0 THEN 1 ELSE 0 END), 0) AS wrong_count,
            COUNT(l.id) AS attempted
        FROM passages p
        LEFT JOIN question_attempt_logs l ON l.passage_id = p.id
        WHERE (? IS NULL OR p.bank_id = ?)
        GROUP BY p.id, p.passage_num
        ORDER BY p.passage_num ASC
        LIMIT 1000
        "#,
    )?;
    let completion_rows = completion_statement.query_map(params![bank_id, bank_id], |row| {
        let wrong_count: i64 = row.get(2)?;
        let attempted: i64 = row.get(3)?;
        let status = if attempted <= 0 {
            "未做".to_string()
        } else if wrong_count <= 0 {
            "全对".to_string()
        } else {
            "有错".to_string()
        };
        Ok(PassageCompletionMetric {
            passage_id: row.get(0)?,
            passage_num: row.get(1)?,
            status,
            wrong_count,
        })
    })?;
    let passage_completion = completion_rows.collect::<Result<Vec<_>>>()?;

    Ok(QuestionBankStats {
        total_questions,
        total_attempts,
        total_correct,
        overall_accuracy,
        total_time_seconds,
        mastered_mistakes: 0,
        mistake_total,
        trend,
        type_metrics,
        time_trend,
        passage_time,
        wrong_heatmap,
        passage_completion,
    })
}

pub fn get_question_snapshot_for_mistake(
    path: &Path,
    question_id: i64,
) -> Result<Option<(String, String, Option<String>, Option<String>)>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT q.q_text, COALESCE(p.passage_num, 0), q.correct_answer, qb.subject
            FROM questions q
            JOIN passages p ON p.id = q.passage_id
            JOIN question_banks qb ON qb.id = p.bank_id
            WHERE q.id = ?
            LIMIT 1
            "#,
            params![question_id],
            |row| {
                let q_text: String = row.get(0)?;
                let passage_num: i64 = row.get(1)?;
                let answer: Option<String> = row.get(2)?;
                let subject: Option<String> = row.get(3)?;
                Ok((q_text, format!("Passage {}", passage_num), answer, subject))
            },
        )
        .optional()
}

pub fn create_mistake_from_exam(path: &Path, payload: &NewMistakeFromExamInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    let snapshot = connection
        .query_row(
            r#"
            SELECT
                q.id,
                q.q_text,
                q.q_type,
                q.correct_answer,
                p.passage_num,
                p.passage_text,
                qb.name
            FROM questions q
            JOIN passages p ON p.id = q.passage_id
            JOIN question_banks qb ON qb.id = p.bank_id
            WHERE q.id = ?
            LIMIT 1
            "#,
            params![payload.question_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .optional()?;
    let Some((question_id, q_text, q_type, correct_answer, passage_num, passage_text, bank_name)) = snapshot else {
        return Err(rusqlite::Error::QueryReturnedNoRows);
    };
    connection.execute(
        r#"
        INSERT INTO mistake_exam_records (
            question_id, bank_name, passage_num, q_type, q_text, my_answer, correct_answer, ai_analysis, error_type, passage_text, time_spent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            question_id,
            bank_name,
            passage_num,
            q_type,
            q_text,
            payload.my_answer,
            correct_answer,
            payload.ai_analysis,
            payload.error_type,
            passage_text,
            payload.time_spent
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_mistakes_from_exam(path: &Path, limit: i64) -> Result<Vec<MistakeFromExamRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, question_id, bank_name, passage_num, q_type, q_text, my_answer, correct_answer, ai_analysis, error_type, passage_text, time_spent, created_at
        FROM mistake_exam_records
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 2000)], |row| {
        Ok(MistakeFromExamRecord {
            id: row.get(0)?,
            question_id: row.get(1)?,
            bank_name: row.get(2)?,
            passage_num: row.get(3)?,
            q_type: row.get(4)?,
            q_text: row.get(5)?,
            my_answer: row.get(6)?,
            correct_answer: row.get(7)?,
            ai_analysis: row.get(8)?,
            error_type: row.get(9)?,
            passage_text: row.get(10)?,
            time_spent: row.get(11)?,
            created_at: row.get(12)?,
        })
    })?;
    rows.collect()
}

pub fn list_ai_logs(path: &Path, limit: i64) -> Result<Vec<AiLogRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, module_name, action_name, model_name, provider_name, input_tokens, output_tokens,
            estimated_cost, latency_ms, success, created_at
        FROM ai_logs
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(AiLogRecord {
            id: row.get(0)?,
            module_name: row.get(1)?,
            action_name: row.get(2)?,
            model_name: row.get(3)?,
            provider_name: row.get(4)?,
            input_tokens: row.get(5)?,
            output_tokens: row.get(6)?,
            estimated_cost: row.get(7)?,
            latency_ms: row.get(8)?,
            success: row.get::<_, i64>(9)? == 1,
            created_at: row.get(10)?,
        })
    })?;
    rows.collect()
}

pub fn create_ai_log(path: &Path, input: &NewAiLogInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO ai_logs (
            module_name, action_name, model_name, provider_name, input_tokens, output_tokens,
            estimated_cost, latency_ms, success, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            input.module_name,
            input.action_name,
            input.model_name,
            input.provider_name,
            input.input_tokens,
            input.output_tokens,
            input.estimated_cost,
            input.latency_ms,
            if input.success { 1 } else { 0 }
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_study_analysis_logs(path: &Path, limit: i64) -> Result<Vec<StudyAnalysisLogRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, date_key, exam_type, subject, module, material, input_summary, performance_summary, analysis_summary,
            weakest_module, key_errors_json, suggested_adjustment, tomorrow_adjustment, intensity_change, notes,
            adoption_status, source_type, source_ref_id, created_at, updated_at
        FROM study_analysis_logs
        ORDER BY date_key DESC, id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 1000)], |row| {
        Ok(StudyAnalysisLogRecord {
            id: row.get(0)?,
            date_key: row.get(1)?,
            exam_type: row.get(2)?,
            subject: row.get(3)?,
            module: row.get(4)?,
            material: row.get(5)?,
            input_summary: row.get(6)?,
            performance_summary: row.get(7)?,
            analysis_summary: row.get(8)?,
            weakest_module: row.get(9)?,
            key_errors_json: row.get(10)?,
            suggested_adjustment: row.get(11)?,
            tomorrow_adjustment: row.get(12)?,
            intensity_change: row.get(13)?,
            notes: row.get(14)?,
            adoption_status: row.get(15)?,
            source_type: row.get(16)?,
            source_ref_id: row.get(17)?,
            created_at: row.get(18)?,
            updated_at: row.get(19)?,
        })
    })?;
    rows.collect()
}

pub fn create_study_analysis_log(path: &Path, input: &NewStudyAnalysisLogInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    let input_summary = input
        .input_summary
        .clone()
        .or_else(|| input.material.clone())
        .or_else(|| Some(input.performance_summary.clone()));
    let analysis_summary = input
        .analysis_summary
        .clone()
        .or_else(|| Some(input.performance_summary.clone()));
    let tomorrow_adjustment = input
        .tomorrow_adjustment
        .clone()
        .or_else(|| input.suggested_adjustment.clone());
    connection.execute(
        r#"
        INSERT INTO study_analysis_logs (
            date_key, exam_type, subject, module, material, input_summary, performance_summary, analysis_summary,
            weakest_module, key_errors_json, suggested_adjustment, tomorrow_adjustment, intensity_change, notes,
            adoption_status, source_type, source_ref_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            input.date_key,
            input.exam_type,
            input.subject,
            input.module,
            input.material,
            input_summary,
            input.performance_summary,
            analysis_summary,
            input.weakest_module,
            input.key_errors_json,
            input.suggested_adjustment,
            tomorrow_adjustment,
            input.intensity_change,
            input.notes,
            input
                .adoption_status
                .clone()
                .unwrap_or_else(|| "pending".to_string()),
            input.source_type.clone().unwrap_or_else(|| "manual".to_string()),
            input.source_ref_id
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_weekly_growth_reviews(path: &Path, limit: i64) -> Result<Vec<WeeklyGrowthReviewRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, week_key, week_range, linked_log_ids_json, summary_text, weekly_summary, strengths_json,
            growth_points_json, weaknesses_json, persistent_weakness_json, focus_json, next_week_focus_json,
            schedule_adjustment_rules_json, stats_json, generated_by, created_at, updated_at
        FROM weekly_growth_reviews
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
        Ok(WeeklyGrowthReviewRecord {
            id: row.get(0)?,
            week_key: row.get(1)?,
            week_range: row.get(2)?,
            linked_log_ids_json: row.get(3)?,
            summary_text: row.get(4)?,
            weekly_summary: row.get(5)?,
            strengths_json: row.get(6)?,
            growth_points_json: row.get(7)?,
            weaknesses_json: row.get(8)?,
            persistent_weakness_json: row.get(9)?,
            focus_json: row.get(10)?,
            next_week_focus_json: row.get(11)?,
            schedule_adjustment_rules_json: row.get(12)?,
            stats_json: row.get(13)?,
            generated_by: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    })?;
    rows.collect()
}

pub fn create_weekly_growth_review(path: &Path, input: &NewWeeklyGrowthReviewInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    let weekly_summary = input
        .weekly_summary
        .clone()
        .or_else(|| Some(input.summary_text.clone()));
    let growth_points_json = input
        .growth_points_json
        .clone()
        .or_else(|| input.strengths_json.clone());
    let persistent_weakness_json = input
        .persistent_weakness_json
        .clone()
        .or_else(|| input.weaknesses_json.clone());
    let next_week_focus_json = input
        .next_week_focus_json
        .clone()
        .or_else(|| input.focus_json.clone());
    connection.execute(
        r#"
        INSERT INTO weekly_growth_reviews (
            week_key, week_range, linked_log_ids_json, summary_text, weekly_summary, strengths_json, growth_points_json,
            weaknesses_json, persistent_weakness_json, focus_json, next_week_focus_json, schedule_adjustment_rules_json,
            stats_json, generated_by, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            input.week_key,
            input.week_range.clone().or_else(|| Some(input.week_key.clone())),
            input.linked_log_ids_json,
            input.summary_text,
            weekly_summary,
            input.strengths_json,
            growth_points_json,
            input.weaknesses_json,
            persistent_weakness_json,
            input.focus_json,
            next_week_focus_json,
            input.schedule_adjustment_rules_json,
            input.stats_json,
            input.generated_by.clone().unwrap_or_else(|| "rule-engine".to_string())
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_plan_drafts(path: &Path, status: Option<&str>, limit: i64) -> Result<Vec<PlanDraftRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, draft_type, title, target_date, week_key, source_context_json, suggestion_text, status, created_at, updated_at
        FROM plan_drafts
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
        Ok(PlanDraftRecord {
            id: row.get(0)?,
            draft_type: row.get(1)?,
            title: row.get(2)?,
            target_date: row.get(3)?,
            week_key: row.get(4)?,
            source_context_json: row.get(5)?,
            suggestion_text: row.get(6)?,
            status: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    let mut items: Vec<PlanDraftRecord> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(needle) = status {
        let value = needle.trim();
        if !value.is_empty() && value != "all" {
            items.retain(|item| item.status == value);
        }
    }
    Ok(items)
}

pub fn get_plan_draft(path: &Path, draft_id: i64) -> Result<Option<PlanDraftRecord>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                id, draft_type, title, target_date, week_key, source_context_json, suggestion_text, status, created_at, updated_at
            FROM plan_drafts
            WHERE id = ?
            LIMIT 1
            "#,
            params![draft_id],
            |row| {
                Ok(PlanDraftRecord {
                    id: row.get(0)?,
                    draft_type: row.get(1)?,
                    title: row.get(2)?,
                    target_date: row.get(3)?,
                    week_key: row.get(4)?,
                    source_context_json: row.get(5)?,
                    suggestion_text: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            },
        )
        .optional()
}

pub fn list_plan_draft_items(path: &Path, draft_id: i64) -> Result<Vec<PlanDraftItemRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, draft_id, item_order, item_type, title, description, priority, estimated_minutes,
            scheduled_date, time_start, time_end, deadline, linked_project_id, action_payload_json,
            apply_status, created_task_id, created_at
        FROM plan_draft_items
        WHERE draft_id = ?
        ORDER BY item_order ASC, id ASC
        "#,
    )?;
    let rows = statement.query_map(params![draft_id], |row| {
        Ok(PlanDraftItemRecord {
            id: row.get(0)?,
            draft_id: row.get(1)?,
            item_order: row.get(2)?,
            item_type: row.get(3)?,
            title: row.get(4)?,
            description: row.get(5)?,
            priority: row.get(6)?,
            estimated_minutes: row.get(7)?,
            scheduled_date: row.get(8)?,
            time_start: row.get(9)?,
            time_end: row.get(10)?,
            deadline: row.get(11)?,
            linked_project_id: row.get(12)?,
            action_payload_json: row.get(13)?,
            apply_status: row.get(14)?,
            created_task_id: row.get(15)?,
            created_at: row.get(16)?,
        })
    })?;
    rows.collect()
}

pub fn list_plan_draft_audit_logs(
    path: &Path,
    draft_id: Option<i64>,
    limit: i64,
) -> Result<Vec<PlanDraftAuditLogRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, draft_id, action, status, operator_name, reason_code, reason_note,
            affected_task_ids_json, item_count, created_at
        FROM plan_draft_audit_logs
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
        Ok(PlanDraftAuditLogRecord {
            id: row.get(0)?,
            draft_id: row.get(1)?,
            action: row.get(2)?,
            status: row.get(3)?,
            operator_name: row.get(4)?,
            reason_code: row.get(5)?,
            reason_note: row.get(6)?,
            affected_task_ids_json: row.get(7)?,
            item_count: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    let mut logs = rows.collect::<Result<Vec<_>>>()?;
    if let Some(id) = draft_id {
        logs.retain(|item| item.draft_id == id);
    }
    Ok(logs)
}

pub fn create_plan_draft_audit_log(path: &Path, input: &NewPlanDraftAuditLogInput) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO plan_draft_audit_logs (
            draft_id, action, status, operator_name, reason_code, reason_note, affected_task_ids_json, item_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            input.draft_id,
            input.action,
            input.status,
            input
                .operator_name
                .clone()
                .unwrap_or_else(|| "system".to_string()),
            input.reason_code,
            input.reason_note,
            input.affected_task_ids_json,
            input.item_count.unwrap_or(0),
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn create_plan_draft_with_items(
    path: &Path,
    draft: &NewPlanDraftInput,
    items: &[NewPlanDraftItemInput],
) -> Result<i64> {
    let mut connection = Connection::open(path)?;
    let tx = connection.transaction()?;
    tx.execute(
        r#"
        INSERT INTO plan_drafts (
            draft_type, title, target_date, week_key, source_context_json, suggestion_text, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![
            draft.draft_type,
            draft.title,
            draft.target_date,
            draft.week_key,
            draft.source_context_json,
            draft.suggestion_text,
            draft.status.clone().unwrap_or_else(|| "pending".to_string())
        ],
    )?;
    let draft_id = tx.last_insert_rowid();
    for (index, item) in items.iter().enumerate() {
        tx.execute(
            r#"
            INSERT INTO plan_draft_items (
                draft_id, item_order, item_type, title, description, priority, estimated_minutes,
                scheduled_date, time_start, time_end, deadline, linked_project_id, action_payload_json,
                apply_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
            "#,
            params![
                draft_id,
                item.item_order.unwrap_or((index + 1) as i64),
                item.item_type.clone().unwrap_or_else(|| "task".to_string()),
                item.title,
                item.description,
                item.priority.clone().unwrap_or_else(|| "中".to_string()),
                item.estimated_minutes,
                item.scheduled_date,
                item.time_start,
                item.time_end,
                item.deadline,
                item.linked_project_id,
                item.action_payload_json
            ],
        )?;
    }
    tx.commit()?;
    Ok(draft_id)
}

pub fn set_plan_draft_status(path: &Path, draft_id: i64, status: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE plan_drafts
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![status, draft_id],
    )?;
    Ok(())
}

pub fn mark_plan_draft_item_applied(path: &Path, item_id: i64, created_task_id: Option<i64>) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE plan_draft_items
        SET apply_status = 'applied', created_task_id = COALESCE(?, created_task_id)
        WHERE id = ?
        "#,
        params![created_task_id, item_id],
    )?;
    Ok(())
}

pub fn reset_plan_draft_item_pending(path: &Path, item_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE plan_draft_items
        SET apply_status = 'pending',
            created_task_id = NULL
        WHERE id = ?
        "#,
        params![item_id],
    )?;
    Ok(())
}

pub fn list_daily_plan_versions(
    path: &Path,
    date_key: Option<&str>,
    status: Option<&str>,
    limit: i64,
) -> Result<Vec<DailyPlanVersionRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, date_key, title, status, source_reason, created_from_type, base_version_id, created_at, updated_at
        FROM daily_plan_versions
        ORDER BY date_key DESC, id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 500)], |row| {
        Ok(DailyPlanVersionRecord {
            id: row.get(0)?,
            date_key: row.get(1)?,
            title: row.get(2)?,
            status: row.get(3)?,
            source_reason: row.get(4)?,
            created_from_type: row.get(5)?,
            base_version_id: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    })?;
    let mut items = rows.collect::<Result<Vec<_>>>()?;
    if let Some(needle) = date_key.map(str::trim).filter(|v| !v.is_empty()) {
        items.retain(|item| item.date_key == needle);
    }
    if let Some(needle) = status.map(str::trim).filter(|v| !v.is_empty() && *v != "all") {
        items.retain(|item| item.status == needle);
    }
    Ok(items)
}

pub fn get_daily_plan_version(path: &Path, version_id: i64) -> Result<Option<DailyPlanVersionRecord>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                id, date_key, title, status, source_reason, created_from_type, base_version_id, created_at, updated_at
            FROM daily_plan_versions
            WHERE id = ?
            LIMIT 1
            "#,
            params![version_id],
            |row| {
                Ok(DailyPlanVersionRecord {
                    id: row.get(0)?,
                    date_key: row.get(1)?,
                    title: row.get(2)?,
                    status: row.get(3)?,
                    source_reason: row.get(4)?,
                    created_from_type: row.get(5)?,
                    base_version_id: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                })
            },
        )
        .optional()
}

pub fn list_daily_plan_items(path: &Path, version_id: i64) -> Result<Vec<DailyPlanItemRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, version_id, item_order, title, module, estimated_minutes, priority, source_reason,
            suggested_time_block, task_id, is_completed, created_at, updated_at
        FROM daily_plan_items
        WHERE version_id = ?
        ORDER BY item_order ASC, id ASC
        "#,
    )?;
    let rows = statement.query_map(params![version_id], |row| {
        Ok(DailyPlanItemRecord {
            id: row.get(0)?,
            version_id: row.get(1)?,
            item_order: row.get(2)?,
            title: row.get(3)?,
            module: row.get(4)?,
            estimated_minutes: row.get(5)?,
            priority: row.get(6)?,
            source_reason: row.get(7)?,
            suggested_time_block: row.get(8)?,
            task_id: row.get(9)?,
            is_completed: row.get::<_, i64>(10)? == 1,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
        })
    })?;
    rows.collect()
}

pub fn create_daily_plan_version_with_items(
    path: &Path,
    version: &NewDailyPlanVersionInput,
    items: &[NewDailyPlanItemInput],
) -> Result<i64> {
    let mut connection = Connection::open(path)?;
    let tx = connection.transaction()?;
    if version.status.as_deref() == Some("accepted") {
        tx.execute(
            "UPDATE daily_plan_versions SET status = 'superseded', updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND status = 'accepted'",
            params![version.date_key],
        )?;
    }
    tx.execute(
        r#"
        INSERT INTO daily_plan_versions (
            date_key, title, status, source_reason, created_from_type, base_version_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        "#,
        params![
            version.date_key,
            version.title,
            version.status.clone().unwrap_or_else(|| "draft".to_string()),
            version.source_reason,
            version
                .created_from_type
                .clone()
                .unwrap_or_else(|| "manual".to_string()),
            version.base_version_id
        ],
    )?;
    let version_id = tx.last_insert_rowid();
    for (index, item) in items.iter().enumerate() {
        tx.execute(
            r#"
            INSERT INTO daily_plan_items (
                version_id, item_order, title, module, estimated_minutes, priority, source_reason, suggested_time_block,
                task_id, is_completed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            "#,
            params![
                version_id,
                item.item_order.unwrap_or((index + 1) as i64),
                item.title,
                item.module,
                item.estimated_minutes,
                item.priority.clone().unwrap_or_else(|| "中".to_string()),
                item.source_reason,
                item.suggested_time_block,
                item.task_id,
                if item.is_completed.unwrap_or(false) { 1 } else { 0 }
            ],
        )?;
    }
    tx.commit()?;
    Ok(version_id)
}

pub fn set_daily_plan_version_status(path: &Path, version_id: i64, status: &str) -> Result<()> {
    let mut connection = Connection::open(path)?;
    let tx = connection.transaction()?;
    if status == "accepted" {
        let date_key: Option<String> = tx
            .query_row(
                "SELECT date_key FROM daily_plan_versions WHERE id = ? LIMIT 1",
                params![version_id],
                |row| row.get(0),
            )
            .optional()?;
        if let Some(date_key) = date_key {
            tx.execute(
                "UPDATE daily_plan_versions SET status = 'superseded', updated_at = CURRENT_TIMESTAMP WHERE date_key = ? AND status = 'accepted' AND id <> ?",
                params![date_key, version_id],
            )?;
        }
    }
    tx.execute(
        "UPDATE daily_plan_versions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![status, version_id],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn delete_daily_plan_version(path: &Path, version_id: i64) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute("DELETE FROM daily_plan_versions WHERE id = ?", params![version_id])?;
    Ok(())
}

pub fn update_daily_plan_item(path: &Path, item_id: i64, payload: &UpdateDailyPlanItemInput) -> Result<()> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        UPDATE daily_plan_items
        SET
            title = COALESCE(?, title),
            module = COALESCE(?, module),
            estimated_minutes = COALESCE(?, estimated_minutes),
            priority = COALESCE(?, priority),
            source_reason = COALESCE(?, source_reason),
            suggested_time_block = COALESCE(?, suggested_time_block),
            is_completed = COALESCE(?, is_completed),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
        params![
            payload.title,
            payload.module,
            payload.estimated_minutes,
            payload.priority,
            payload.source_reason,
            payload.suggested_time_block,
            payload.is_completed.map(|value| if value { 1 } else { 0 }),
            item_id
        ],
    )?;
    Ok(())
}

pub fn create_task_suggestion(
    path: &Path,
    source_type: &str,
    source_id: Option<i64>,
    title: &str,
    description: Option<&str>,
    priority: &str,
    suggested_deadline: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO task_suggestions (
            source_type, source_id, title, description, priority, suggested_deadline, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        "#,
        params![
            source_type,
            source_id,
            title,
            description,
            priority,
            suggested_deadline
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_task_suggestions(path: &Path, status: Option<&str>, limit: i64) -> Result<Vec<TaskSuggestion>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, source_type, source_id, title, description, priority,
            suggested_deadline, status, created_at, applied_at
        FROM task_suggestions
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit], |row| {
        Ok(TaskSuggestion {
            id: row.get(0)?,
            source_type: row.get(1)?,
            source_id: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            priority: row.get(5)?,
            suggested_deadline: row.get(6)?,
            status: row.get(7)?,
            created_at: row.get(8)?,
            applied_at: row.get(9)?,
        })
    })?;
    let mut items: Vec<TaskSuggestion> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(needle) = status {
        let normalized = needle.trim();
        if !normalized.is_empty() && normalized != "all" {
            items.retain(|item| item.status == normalized);
        }
    }
    Ok(items)
}

pub fn get_task_suggestion(path: &Path, suggestion_id: i64) -> Result<Option<TaskSuggestion>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                id, source_type, source_id, title, description, priority,
                suggested_deadline, status, created_at, applied_at
            FROM task_suggestions
            WHERE id = ?
            LIMIT 1
            "#,
            params![suggestion_id],
            |row| {
                Ok(TaskSuggestion {
                    id: row.get(0)?,
                    source_type: row.get(1)?,
                    source_id: row.get(2)?,
                    title: row.get(3)?,
                    description: row.get(4)?,
                    priority: row.get(5)?,
                    suggested_deadline: row.get(6)?,
                    status: row.get(7)?,
                    created_at: row.get(8)?,
                    applied_at: row.get(9)?,
                })
            },
        )
        .optional()
}

pub fn mark_task_suggestion_status(path: &Path, suggestion_id: i64, status: &str) -> Result<()> {
    let connection = Connection::open(path)?;
    if status == "applied" {
        connection.execute(
            r#"
            UPDATE task_suggestions
            SET status = ?, applied_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            params![status, suggestion_id],
        )?;
    } else {
        connection.execute(
            "UPDATE task_suggestions SET status = ? WHERE id = ?",
            params![status, suggestion_id],
        )?;
    }
    Ok(())
}

pub fn find_pending_task_suggestion(
    path: &Path,
    source_type: &str,
    source_id: Option<i64>,
    title: &str,
) -> Result<Option<i64>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT id
            FROM task_suggestions
            WHERE source_type = ?
              AND (source_id IS ? OR source_id = ?)
              AND title = ?
              AND status = 'pending'
            ORDER BY id DESC
            LIMIT 1
            "#,
            params![source_type, source_id, source_id, title],
            |row| row.get(0),
        )
        .optional()
}

pub fn create_assistant_briefing(
    path: &Path,
    brief_type: &str,
    date_key: &str,
    summary_text: &str,
    detail_json: &str,
    risk_level: &str,
    auto_generated: bool,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO assistant_briefings (
            brief_type, date_key, summary_text, detail_json, risk_level, auto_generated, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        "#,
        params![
            brief_type,
            date_key,
            summary_text,
            detail_json,
            risk_level,
            if auto_generated { 1 } else { 0 }
        ],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_assistant_briefings(
    path: &Path,
    brief_type: Option<&str>,
    date_key: Option<&str>,
    limit: i64,
) -> Result<Vec<AssistantBriefingRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT id, brief_type, date_key, summary_text, detail_json, risk_level, auto_generated, created_at
        FROM assistant_briefings
        ORDER BY id DESC
        LIMIT ?
        "#,
    )?;
    let rows = statement.query_map(params![limit.clamp(1, 300)], |row| {
        Ok(AssistantBriefingRecord {
            id: row.get(0)?,
            brief_type: row.get(1)?,
            date_key: row.get(2)?,
            summary_text: row.get(3)?,
            detail_json: row.get(4)?,
            risk_level: row.get(5)?,
            auto_generated: row.get::<_, i64>(6)? == 1,
            created_at: row.get(7)?,
        })
    })?;
    let mut items: Vec<AssistantBriefingRecord> = rows.collect::<Result<Vec<_>>>()?;
    if let Some(needle) = brief_type {
        let value = needle.trim();
        if !value.is_empty() && value != "all" {
            items.retain(|item| item.brief_type == value);
        }
    }
    if let Some(needle) = date_key {
        let value = needle.trim();
        if !value.is_empty() {
            items.retain(|item| item.date_key == value);
        }
    }
    Ok(items)
}

pub fn get_latest_assistant_briefing(
    path: &Path,
    brief_type: &str,
    date_key: &str,
) -> Result<Option<AssistantBriefingRecord>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT id, brief_type, date_key, summary_text, detail_json, risk_level, auto_generated, created_at
            FROM assistant_briefings
            WHERE brief_type = ? AND date_key = ?
            ORDER BY id DESC
            LIMIT 1
            "#,
            params![brief_type, date_key],
            |row| {
                Ok(AssistantBriefingRecord {
                    id: row.get(0)?,
                    brief_type: row.get(1)?,
                    date_key: row.get(2)?,
                    summary_text: row.get(3)?,
                    detail_json: row.get(4)?,
                    risk_level: row.get(5)?,
                    auto_generated: row.get::<_, i64>(6)? == 1,
                    created_at: row.get(7)?,
                })
            },
        )
        .optional()
}

pub fn create_assistant_briefing_suggestion(
    path: &Path,
    briefing_id: i64,
    suggestion_order: i64,
    title: &str,
    action_type: &str,
    action_payload_json: Option<&str>,
) -> Result<i64> {
    let connection = Connection::open(path)?;
    connection.execute(
        r#"
        INSERT INTO assistant_briefing_suggestions (
            briefing_id, suggestion_order, title, action_type, action_payload_json, status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
        "#,
        params![briefing_id, suggestion_order, title, action_type, action_payload_json],
    )?;
    Ok(connection.last_insert_rowid())
}

pub fn list_assistant_briefing_suggestions(
    path: &Path,
    briefing_id: i64,
) -> Result<Vec<AssistantBriefingSuggestionRecord>> {
    let connection = Connection::open(path)?;
    let mut statement = connection.prepare(
        r#"
        SELECT
            id, briefing_id, suggestion_order, title, action_type,
            action_payload_json, status, created_task_id, applied_at, created_at
        FROM assistant_briefing_suggestions
        WHERE briefing_id = ?
        ORDER BY suggestion_order ASC, id ASC
        "#,
    )?;
    let rows = statement.query_map(params![briefing_id], |row| {
        Ok(AssistantBriefingSuggestionRecord {
            id: row.get(0)?,
            briefing_id: row.get(1)?,
            suggestion_order: row.get(2)?,
            title: row.get(3)?,
            action_type: row.get(4)?,
            action_payload_json: row.get(5)?,
            status: row.get(6)?,
            created_task_id: row.get(7)?,
            applied_at: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    rows.collect()
}

pub fn get_assistant_briefing_suggestion(
    path: &Path,
    suggestion_id: i64,
) -> Result<Option<AssistantBriefingSuggestionRecord>> {
    let connection = Connection::open(path)?;
    connection
        .query_row(
            r#"
            SELECT
                id, briefing_id, suggestion_order, title, action_type,
                action_payload_json, status, created_task_id, applied_at, created_at
            FROM assistant_briefing_suggestions
            WHERE id = ?
            LIMIT 1
            "#,
            params![suggestion_id],
            |row| {
                Ok(AssistantBriefingSuggestionRecord {
                    id: row.get(0)?,
                    briefing_id: row.get(1)?,
                    suggestion_order: row.get(2)?,
                    title: row.get(3)?,
                    action_type: row.get(4)?,
                    action_payload_json: row.get(5)?,
                    status: row.get(6)?,
                    created_task_id: row.get(7)?,
                    applied_at: row.get(8)?,
                    created_at: row.get(9)?,
                })
            },
        )
        .optional()
}

pub fn mark_assistant_briefing_suggestion_status(
    path: &Path,
    suggestion_id: i64,
    status: &str,
    created_task_id: Option<i64>,
) -> Result<()> {
    let connection = Connection::open(path)?;
    if status == "applied" {
        connection.execute(
            r#"
            UPDATE assistant_briefing_suggestions
            SET status = ?,
                created_task_id = COALESCE(?, created_task_id),
                applied_at = CURRENT_TIMESTAMP
            WHERE id = ?
            "#,
            params![status, created_task_id, suggestion_id],
        )?;
    } else {
        connection.execute(
            r#"
            UPDATE assistant_briefing_suggestions
            SET status = ?
            WHERE id = ?
            "#,
            params![status, suggestion_id],
        )?;
    }
    Ok(())
}
