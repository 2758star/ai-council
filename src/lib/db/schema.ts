import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
};

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  schoolName: text("school_name").notNull(),
  programName: text("program_name").notNull(),
  country: text("country"),
  degreeType: text("degree_type"),
  intakeTerm: text("intake_term"),
  applicationRound: text("application_round"),
  deadline: text("deadline"),
  status: text("status").notNull().default("待准备"),
  priority: text("priority").notNull().default("中"),
  officialUrl: text("official_url"),
  requirementUrl: text("requirement_url"),
  essayUrl: text("essay_url"),
  recommendationUrl: text("recommendation_url"),
  notes: text("notes"),
  ...timestamps,
});

export const projectRequirements = sqliteTable("project_requirements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  requirementType: text("requirement_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("未开始"),
  dueDate: text("due_date"),
  ...timestamps,
});

export const recommendationLetters = sqliteTable("recommendation_letters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id").notNull(),
  recommenderName: text("recommender_name").notNull(),
  recommenderEmail: text("recommender_email"),
  relationship: text("relationship"),
  status: text("status").notNull().default("未请求"),
  requestedAt: text("requested_at"),
  dueDate: text("due_date"),
  submittedAt: text("submitted_at"),
  lastFollowupAt: text("last_followup_at"),
  portalLink: text("portal_link"),
  linkedTaskId: integer("linked_task_id"),
  notes: text("notes"),
  ...timestamps,
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  sourceType: text("source_type"),
  sourceId: integer("source_id"),
  taskType: text("task_type").notNull().default("通用"),
  priority: text("priority").notNull().default("中"),
  status: text("status").notNull().default("未开始"),
  estimatedMinutes: integer("estimated_minutes"),
  scheduledDate: text("scheduled_date"),
  timeStart: text("time_start"),
  timeEnd: text("time_end"),
  deadline: text("deadline"),
  parentTaskId: integer("parent_task_id"),
  ...timestamps,
});

export const aiLogs = sqliteTable("ai_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  moduleName: text("module_name").notNull(),
  actionName: text("action_name").notNull(),
  modelName: text("model_name"),
  providerName: text("provider_name"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedCost: real("estimated_cost").notNull().default(0),
  latencyMs: integer("latency_ms"),
  success: integer("success", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  relatedType: text("related_type"),
  relatedId: integer("related_id"),
  sendStatus: text("send_status").notNull().default("pending"),
  sentAt: text("sent_at"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  settingKey: text("setting_key").notNull(),
  settingValue: text("setting_value").notNull(),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});
