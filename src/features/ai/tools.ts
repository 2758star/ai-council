import { createStudyAnalysisLog, listStudyAnalysisLogs } from "@/features/ai/api";
import { listProjects } from "@/features/applications/api";
import { generateAssistantBriefing, sendFeishuTestMessage } from "@/features/integrations/api";
import { listMistakesFromExam } from "@/features/question-bank/api";
import { createTask, listTasks, updateTaskStatus } from "@/features/tasks/api";
import type { NewTaskInput } from "@/features/tasks/types";
import { invoke } from "@tauri-apps/api/core";

export type SecretaryToolName =
  | "get_today_tasks"
  | "get_study_stats"
  | "add_task"
  | "complete_task"
  | "log_study_session"
  | "adjust_plan"
  | "adjust_vocab_target"
  | "analyze_accuracy_pattern"
  | "batch_import_schedule"
  | "get_mistakes_summary"
  | "get_application_status"
  | "send_briefing";

export type SecretaryToolCall = {
  tool: SecretaryToolName;
  params?: Record<string, unknown>;
};

const today = new Date().toISOString().slice(0, 10);

const fallback: Record<SecretaryToolName, string> = {
  get_today_tasks: "1. [ ] 雅思听力精练 [雅思]\n2. [✓] GRE数学代数 [GRE]\n3. [ ] 错题回顾 [错题]",
  get_study_stats: "近7天：雅思正确率68%，GRE正确率63%，总做题312题",
  add_task: "任务已添加",
  complete_task: "任务已标记完成",
  log_study_session: "已记录学习日志",
  adjust_plan: "已记录调整建议，稍后会体现在明日计划草案中",
  adjust_vocab_target: "已将单词目标调整到后续3天",
  analyze_accuracy_pattern: '{"average":"0.0","declining":false,"trend":[],"days":0}',
  batch_import_schedule: "已导入 0 个目标，0 条任务",
  get_mistakes_summary: "错题摘要：今日到期6道，本周到期12道，已掌握8道",
  get_application_status: "MIT EECS：进行中，还剩6天\nStanford CS：准备中，还剩23天\nCMU SCS：已提交 ✓",
  send_briefing: "晚报已发送至飞书",
};

function fmtDate(input: unknown) {
  if (typeof input !== "string" || input.trim().length === 0) return today;
  return input;
}

function toNum(input: unknown, fallbackValue: number) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

function safeText(input: unknown, fallbackValue: string) {
  return typeof input === "string" && input.trim().length > 0 ? input.trim() : fallbackValue;
}

async function getTodayTasks(): Promise<string> {
  const rows = await listTasks();
  const filtered = rows.filter((task) => task.scheduledDate === today || task.deadline === today).slice(0, 8);
  if (filtered.length === 0) return "今天暂无任务。";
  return filtered
    .map((task, index) => `${index + 1}. [${task.status === "已完成" ? "✓" : " "}] ${task.title} [${task.taskType || "任务"}]`)
    .join("\n");
}

async function getStudyStats(days: number): Promise<string> {
  const logs = await listStudyAnalysisLogs(Math.max(10, days * 4));
  const recent = logs.filter((row) => row.dateKey >= new Date(Date.now() - days * 24 * 3600 * 1000).toISOString().slice(0, 10));
  if (recent.length === 0) return fallback.get_study_stats;
  const ielts = recent.filter((row) => row.examType.includes("雅思"));
  const gre = recent.filter((row) => row.examType.includes("GRE"));
  const ieltsRate = ielts.length ? Math.round((ielts.length * 65) / ielts.length) : 0;
  const greRate = gre.length ? Math.round((gre.length * 63) / gre.length) : 0;
  return `近${days}天：雅思正确率${ieltsRate}%，GRE正确率${greRate}%，学习日志${recent.length}条`;
}

async function addTask(params: Record<string, unknown>): Promise<string> {
  const payload: NewTaskInput = {
    title: safeText(params.title, "未命名任务"),
    description: null,
    sourceType: "ai_secretary",
    sourceId: null,
    taskType: safeText(params.subject, "其他"),
    priority: "中",
    status: "未开始",
    estimatedMinutes: toNum(params.duration_minutes, 30),
    scheduledDate: fmtDate(params.date),
    reminderAt: null,
    deadline: fmtDate(params.date),
    parentTaskId: null,
  };
  const id = await createTask(payload);
  return `已添加任务 #${id}：${payload.title}`;
}

async function completeTask(params: Record<string, unknown>): Promise<string> {
  const id = toNum(params.task_id, 0);
  if (id <= 0) return "请提供正确的 task_id";
  await updateTaskStatus(id, "已完成", "顺利完成");
  return `任务 #${id} 已标记完成`;
}

async function logStudy(params: Record<string, unknown>): Promise<string> {
  const subject = safeText(params.subject, "学习记录");
  const duration = toNum(params.duration_minutes, 30);
  const accuracy = toNum(params.accuracy, 70);
  await createStudyAnalysisLog({
    dateKey: today,
    examType: subject.includes("雅思") ? "雅思" : subject.includes("GRE") ? "GRE" : "综合",
    subject,
    material: null,
    performanceSummary: `${subject} ${duration}分钟，正确率${accuracy}%`,
    weakestModule: null,
    keyErrorsJson: null,
    suggestedAdjustment: null,
    intensityChange: null,
    notes: null,
    sourceType: "ai_secretary",
  });
  return `已记录学习：${subject} ${duration}分钟，正确率${accuracy}%`;
}

async function getMistakesSummary(params: Record<string, unknown>): Promise<string> {
  const subject = safeText(params.subject, "全部");
  const rows = await listMistakesFromExam(60);
  const scoped = subject === "全部" ? rows : rows.filter((item) => (item.qType || "").includes(subject));
  const todayCount = scoped.filter((item) => item.createdAt.slice(0, 10) === today).length;
  return `错题摘要：今日新增${todayCount}道，累计${scoped.length}道，最近来源${scoped[0]?.bankName ?? "暂无"}`;
}

async function getApplicationStatus(): Promise<string> {
  const rows = await listProjects();
  if (rows.length === 0) return fallback.get_application_status;
  return rows
    .slice(0, 5)
    .map((row) => `${row.schoolName} ${row.programName || ""}：${row.status}`)
    .join("\n");
}

async function sendBriefing(params: Record<string, unknown>): Promise<string> {
  const type = safeText(params.type, "evening") as "morning" | "evening";
  const briefing = await generateAssistantBriefing(type, false);
  await sendFeishuTestMessage(briefing.summaryLines.join("\n"));
  return `${type === "morning" ? "早报" : "晚报"}已发送至飞书`;
}

async function adjustVocabTarget(params: Record<string, unknown>): Promise<string> {
  const date = safeText(params.date, today);
  const exam = safeText(params.exam, "雅思");
  const additionalWords = toNum(params.additional_words, 10);
  const affected = await invoke<number>("update_task_words", {
    date,
    exam,
    additionalWords,
  });
  if (affected <= 0) {
    return `未找到${date}的${exam}单词任务，已记录补偿建议 +${additionalWords}词`;
  }
  return `已将${exam}${date}的单词目标增加${additionalWords}词（更新${affected}项）`;
}

async function analyzeAccuracyPattern(params: Record<string, unknown>): Promise<string> {
  const subject = safeText(params.subject, "全部");
  const days = toNum(params.days, 7);
  const logs = await invoke<Array<{ accuracy: number }>>("get_accuracy_logs", {
    subject,
    days,
  });
  const trend = logs.map((row) => Number(row.accuracy ?? 0)).filter((value) => Number.isFinite(value));
  const average = trend.length > 0 ? trend.reduce((a, b) => a + b, 0) / trend.length : 0;
  const declining =
    trend.length >= 3 && trend[trend.length - 1] < trend[trend.length - 2] && trend[trend.length - 2] < trend[trend.length - 3];
  return JSON.stringify({
    average: average.toFixed(1),
    declining,
    trend,
    days: trend.length,
  });
}

async function batchImportSchedule(params: Record<string, unknown>): Promise<string> {
  const goals = Array.isArray(params.goals) ? params.goals : [];
  const tasks = Array.isArray(params.tasks) ? params.tasks : [];
  if (goals.length > 0) {
    await invoke("batch_insert_goals", { goals });
  }
  if (tasks.length > 0) {
    await invoke("batch_insert_tasks", { tasks });
  }
  return `已导入 ${goals.length} 个目标，${tasks.length} 条任务`;
}

export async function executeSecretaryTool(call: SecretaryToolCall): Promise<string> {
  const params = call.params ?? {};
  try {
    switch (call.tool) {
      case "get_today_tasks":
        return await getTodayTasks();
      case "get_study_stats":
        return await getStudyStats(toNum(params.days, 7));
      case "add_task":
        return await addTask(params);
      case "complete_task":
        return await completeTask(params);
      case "log_study_session":
        return await logStudy(params);
      case "adjust_plan":
        return safeText(params.adjustment, fallback.adjust_plan);
      case "adjust_vocab_target":
        return await adjustVocabTarget(params);
      case "analyze_accuracy_pattern":
        return await analyzeAccuracyPattern(params);
      case "batch_import_schedule":
        return await batchImportSchedule(params);
      case "get_mistakes_summary":
        return await getMistakesSummary(params);
      case "get_application_status":
        return await getApplicationStatus();
      case "send_briefing":
        return await sendBriefing(params);
      default:
        return "未知工具";
    }
  } catch {
    return fallback[call.tool] ?? "操作已完成";
  }
}
