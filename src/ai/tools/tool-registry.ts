import { listProjects } from "@/features/applications/api";
import {
  createPlanDraft,
  createStudyAnalysisLog,
  generateWeeklyGrowthReview,
  listPlanDrafts,
  listStudyAnalysisLogs,
} from "@/features/ai/api";
import { createTaskFromWebChange, listWebChangeLogs, markWebChangeProcessed } from "@/features/integrations/api";
import { createTask, listTasks } from "@/features/tasks/api";

export type AiToolPermission = "read" | "draft" | "commit";

export type AiToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
};

export type AiTool = {
  name: string;
  description: string;
  permission: AiToolPermission;
  inputSchema?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<AiToolResult>;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export class ToolRegistry {
  private readonly tools = new Map<string, AiTool>();

  constructor() {
    this.registerDefaults();
  }

  register(tool: AiTool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string) {
    return this.tools.get(name);
  }

  list() {
    return Array.from(this.tools.values());
  }

  private registerDefaults() {
    this.register({
      name: "get_today_tasks",
      description: "读取今日任务（任务执行视角）。",
      permission: "read",
      async execute() {
        const today = todayKey();
        const tasks = await listTasks();
        const rows = tasks.filter(
          (task) => task.scheduledDate === today || (task.deadline?.slice(0, 10) ?? null) === today,
        );
        return {
          ok: true,
          summary: `已读取今日任务 ${rows.length} 条。`,
          data: rows,
        };
      },
    });

    this.register({
      name: "get_week_tasks",
      description: "读取最近一周任务。",
      permission: "read",
      async execute() {
        const tasks = await listTasks();
        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const rows = tasks.filter((task) => {
          const candidate = task.scheduledDate || task.deadline?.slice(0, 10) || "";
          if (!candidate) return false;
          const d = new Date(`${candidate}T00:00:00`);
          return d >= now && d <= in7;
        });
        return { ok: true, summary: `已读取本周任务 ${rows.length} 条。`, data: rows };
      },
    });

    this.register({
      name: "get_project_summary",
      description: "读取项目总览与关键状态。",
      permission: "read",
      async execute() {
        const projects = await listProjects();
        return { ok: true, summary: `项目共 ${projects.length} 个。`, data: projects };
      },
    });

    this.register({
      name: "get_recent_web_changes",
      description: "读取最近网页变化。",
      permission: "read",
      async execute(args) {
        const limit = asNumber(args.limit, 20);
        const rows = await listWebChangeLogs({ limit });
        return { ok: true, summary: `最近网页变化 ${rows.length} 条。`, data: rows };
      },
    });

    this.register({
      name: "get_study_analysis_logs",
      description: "读取学习分析日志。",
      permission: "read",
      async execute(args) {
        const limit = asNumber(args.limit, 60);
        const rows = await listStudyAnalysisLogs(limit);
        return { ok: true, summary: `学习分析日志 ${rows.length} 条。`, data: rows };
      },
    });

    this.register({
      name: "get_plan_versions",
      description: "读取计划草案版本队列（仅草稿，不含日程产品层）。",
      permission: "read",
      async execute(args) {
        const status = asString(args.status, "all");
        const limit = asNumber(args.limit, 60);
        const dateKey = asString(args.dateKey) || null;
        const draftRows = await listPlanDrafts({ status, limit });
        return {
          ok: true,
          summary: `计划草案 ${draftRows.length} 条。`,
          data: { planDrafts: draftRows, dateKey },
        };
      },
    });

    this.register({
      name: "create_plan_draft",
      description: "创建计划草案（Draft-write）。",
      permission: "draft",
      async execute(args) {
        const draft = asRecord(args.draft);
        const itemsInput = Array.isArray(args.items) ? args.items : [];
        const draftId = await createPlanDraft({
          draftType: asString(draft.draftType, "manual"),
          title: asString(draft.title, "AI 生成草案"),
          targetDate: asString(draft.targetDate) || null,
          weekKey: asString(draft.weekKey) || null,
          sourceContextJson: JSON.stringify({ source: "ai_tool", createdAt: new Date().toISOString() }),
          suggestionText: asString(draft.suggestionText) || null,
          status: "pending",
          items: itemsInput.map((row, index) => {
            const item = asRecord(row);
            return {
              itemOrder: asNumber(item.itemOrder, index + 1),
              itemType: asString(item.itemType, "task"),
              title: asString(item.title, `草案任务 ${index + 1}`),
              description: asString(item.description) || null,
              priority: asString(item.priority, "中"),
              estimatedMinutes: asNumber(item.estimatedMinutes, 60),
              scheduledDate: asString(item.scheduledDate) || null,
              deadline: asString(item.deadline) || null,
            };
          }),
        });
        return { ok: true, summary: `计划草案已创建 #${draftId}。`, data: { draftId } };
      },
    });

    this.register({
      name: "append_study_analysis_log",
      description: "追加一条学习分析日志（Draft-write）。",
      permission: "draft",
      async execute(args) {
        const id = await createStudyAnalysisLog({
          dateKey: asString(args.dateKey, todayKey()),
          examType: asString(args.examType, "GRE"),
          subject: asString(args.subject, "阅读"),
          module: asString(args.module) || null,
          material: asString(args.material) || null,
          inputSummary: asString(args.inputSummary) || asString(args.material) || null,
          performanceSummary: asString(args.performanceSummary, "待补充"),
          analysisSummary: asString(args.analysisSummary) || asString(args.performanceSummary, "待补充"),
          weakestModule: asString(args.weakestModule) || null,
          keyErrorsJson: args.keyErrorsJson ? JSON.stringify(args.keyErrorsJson) : null,
          suggestedAdjustment: asString(args.suggestedAdjustment) || null,
          tomorrowAdjustment: asString(args.tomorrowAdjustment) || asString(args.suggestedAdjustment) || null,
          intensityChange: asString(args.intensityChange) || null,
          notes: asString(args.notes) || null,
          adoptionStatus: asString(args.adoptionStatus, "pending"),
          sourceType: asString(args.sourceType, "ai"),
          sourceRefId: asNumber(args.sourceRefId, 0) || null,
        });
        return { ok: true, summary: `学习分析日志已写入 #${id}。`, data: { id } };
      },
    });

    this.register({
      name: "create_task_draft",
      description: "创建单条任务草案（Draft-write）。",
      permission: "draft",
      async execute(args) {
        const title = asString(args.title, "AI 草案任务");
        const draftId = await createPlanDraft({
          draftType: "task_draft",
          title: `任务草案 · ${title}`,
          status: "pending",
          items: [
            {
              itemType: "task",
              title,
              description: asString(args.description) || null,
              priority: asString(args.priority, "中"),
              estimatedMinutes: asNumber(args.estimatedMinutes, 45),
              scheduledDate: asString(args.scheduledDate) || null,
              deadline: asString(args.deadline) || null,
            },
          ],
        });
        return { ok: true, summary: `任务草案已创建 #${draftId}。`, data: { draftId } };
      },
    });

    this.register({
      name: "create_weekly_review_draft",
      description: "生成周成长复盘草案（Draft-write）。",
      permission: "draft",
      async execute(args) {
        const weekKey = asString(args.weekKey) || null;
        const review = await generateWeeklyGrowthReview(weekKey);
        return { ok: true, summary: `周复盘已生成：${review.weekKey}。`, data: review };
      },
    });

    this.register({
      name: "link_web_change_to_project",
      description: "将网页变化关联到项目（当前以草案方式记录）。",
      permission: "draft",
      async execute(args) {
        const projectId = asNumber(args.projectId, 0);
        const changeId = asNumber(args.changeId, 0);
        if (!projectId || !changeId) {
          return { ok: false, summary: "需要 projectId 和 changeId。" };
        }
        const draftId = await createPlanDraft({
          draftType: "web_change_link",
          title: `网页变化关联草案 · 项目 ${projectId}`,
          status: "pending",
          items: [
            {
              itemType: "task",
              title: `处理网页变化 #${changeId}`,
              description: `将变化记录关联到项目 #${projectId}，并确认后续动作。`,
              priority: "中",
              estimatedMinutes: 30,
            },
          ],
        });
        return { ok: true, summary: `已生成关联草案 #${draftId}。`, data: { draftId } };
      },
    });

    this.register({
      name: "mark_web_change_processed",
      description: "标记网页变化已处理/待处理（Draft-write）。",
      permission: "draft",
      async execute(args) {
        const changeId = asNumber(args.changeId, 0);
        if (!changeId) {
          return { ok: false, summary: "需要 changeId。" };
        }
        const processed = String(args.processed ?? "true").toLowerCase() !== "false";
        await markWebChangeProcessed(changeId, processed);
        return {
          ok: true,
          summary: processed ? `变化 #${changeId} 已标记处理。` : `变化 #${changeId} 已恢复待处理。`,
          data: { changeId, processed },
        };
      },
    });

    this.register({
      name: "save_image_analysis_result",
      description: "保存截图分析结果为学习日志（Draft-write）。",
      permission: "draft",
      async execute(args) {
        const recordId = await createStudyAnalysisLog({
          dateKey: asString(args.date, todayKey()),
          examType: asString(args.examType, "Unknown"),
          subject: asString(args.subject, "Unknown"),
          module: asString(args.module) || asString(args.subject) || null,
          material: asString(args.material) || null,
          inputSummary: asString(args.material) || null,
          performanceSummary: asString(args.performanceSummary, "截图分析结果"),
          analysisSummary: asString(args.performanceSummary, "截图分析结果"),
          weakestModule: asString(args.weakestModule) || null,
          keyErrorsJson: args.keyErrors ? JSON.stringify(args.keyErrors) : null,
          suggestedAdjustment: asString(args.suggestedAdjustment) || null,
          tomorrowAdjustment: asString(args.suggestedAdjustment) || null,
          intensityChange: asString(args.intensityChange) || null,
          notes: asString(args.notes) || null,
          adoptionStatus: "pending",
          sourceType: "image_analysis",
          sourceRefId: null,
        });
        return { ok: true, summary: `截图分析结果已保存 #${recordId}。`, data: { recordId } };
      },
    });

    this.register({
      name: "commit_create_task",
      description: "直接创建正式任务（Commit-write，默认禁用）。",
      permission: "commit",
      async execute(args) {
        const taskId = await createTask({
          title: asString(args.title, "AI 正式任务"),
          description: asString(args.description) || null,
          sourceType: "ai_orchestrator",
          sourceId: null,
          taskType: asString(args.taskType, "通用"),
          priority: asString(args.priority, "中") as "高" | "中" | "低",
          status: "未开始",
          estimatedMinutes: asNumber(args.estimatedMinutes, 45),
          scheduledDate: asString(args.scheduledDate) || null,
          timeStart: asString(args.timeStart) || null,
          timeEnd: asString(args.timeEnd) || null,
          reminderAt: null,
          deadline: asString(args.deadline) || null,
          parentTaskId: null,
        });
        return { ok: true, summary: `已创建正式任务 #${taskId}。`, data: { taskId } };
      },
    });

    this.register({
      name: "commit_create_task_from_web_change",
      description: "将网页变化直接转为正式任务（Commit-write，默认禁用）。",
      permission: "commit",
      async execute(args) {
        const changeId = asNumber(args.changeId, 0);
        if (!changeId) {
          return { ok: false, summary: "需要 changeId。" };
        }
        const taskId = await createTaskFromWebChange(changeId);
        return { ok: true, summary: `网页变化 #${changeId} 已转任务 #${taskId}。`, data: { taskId } };
      },
    });
  }
}
