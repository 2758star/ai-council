import type {
  HistItem,
  BriefingTask,
  BriefingAlert,
  Message,
  SecretaryTool,
} from "./types";

export const MOCK_HISTORY: { section: string; items: HistItem[] }[] = [];

export const INIT_MESSAGES: Message[] = [];

export const BRIEFING_TASKS: BriefingTask[] = [
  { label: "雅思听力 Section 3 精练", tag: "雅思", tagColor: "#065F46", done: true },
  { label: "GRE 数学代数 20题", tag: "GRE", tagColor: "#5B21B6", done: true },
  { label: "完善 MIT SoP 第2段", tag: "申请", tagColor: "#1E40AF", done: true },
  { label: "错题回顾：推断题", tag: "错题", tagColor: "#9F1239", done: false },
  { label: "晚间词汇复习 60个", tag: "词汇", tagColor: "#92400E", done: false },
];

export const BRIEFING_ALERTS: BriefingAlert[] = [
  { icon: "⚠️", text: "MIT EECS — 距截止6天，推荐信未提交", urgency: "high" },
  { icon: "✓", text: "CMU SCS — 材料已全部提交", urgency: "low" },
  { icon: "○", text: "Stanford CS — 文书还差第2段", urgency: "medium" },
];

export const SHORTCUTS = [
  "📋 今日任务",
  "📊 本周统计",
  "✅ 记录完成",
  "📅 调整计划",
  "🎯 申请进度",
  "📚 错题摘要",
  "🔥 连击状态",
  "⚡ 发早报",
];

export const SECRETARY_TOOLS: SecretaryTool[] = [
  { name: "get_today_tasks", description: "获取今天的任务列表" },
  { name: "add_task", description: "添加新任务" },
  { name: "complete_task", description: "标记任务完成" },
  { name: "log_study_session", description: "记录一次学习情况" },
  { name: "get_study_stats", description: "获取学习统计数据" },
  { name: "adjust_plan", description: "调整学习计划" },
  { name: "adjust_vocab_target", description: "分摊补偿单词量到后续日期" },
  { name: "analyze_accuracy_pattern", description: "分析近N天正确率趋势" },
  { name: "get_mistakes_summary", description: "获取错题本摘要" },
  { name: "get_application_status", description: "获取申请进度" },
  { name: "send_briefing", description: "立即发送一份简报" },
];
