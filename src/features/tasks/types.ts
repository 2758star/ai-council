export type TaskStatus = "未开始" | "进行中" | "已完成";
export type TaskPriority = "高" | "中" | "低";
export type TaskCompletionTag = "顺利完成" | "被打断" | "超时完成" | "提前完成";
export type TaskDelayReasonCode =
  | "低估时长"
  | "被打断"
  | "临时插入任务"
  | "精力不足"
  | "材料未齐"
  | "其他";
export type TaskRecurrenceType = "daily" | "weekly" | "monthly" | "custom_days";

export type Task = {
  id: number;
  title: string;
  description: string | null;
  sourceType: string | null;
  sourceId: number | null;
  sourceLabel: string | null;
  taskType: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number | null;
  scheduledDate: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  reminderAt: string | null;
  deadline: string | null;
  parentTaskId: number | null;
  recurrenceEnabled: boolean;
  recurrenceType: TaskRecurrenceType | null;
  recurrenceInterval: number | null;
  recurrenceDaysOfWeek: string | null;
  recurrenceDayOfMonth: number | null;
  recurrenceUntil: string | null;
  recurrenceSourceTaskId: number | null;
  completionTag: TaskCompletionTag | null;
  lastDelayReasonCode: TaskDelayReasonCode | null;
  lastDelayReasonNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewTaskInput = {
  title: string;
  description: string | null;
  sourceType: string | null;
  sourceId: number | null;
  taskType: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number | null;
  scheduledDate: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  reminderAt: string | null;
  deadline: string | null;
  parentTaskId: number | null;
  recurrenceEnabled?: boolean;
  recurrenceType?: TaskRecurrenceType | null;
  recurrenceInterval?: number | null;
  recurrenceDaysOfWeek?: string | null;
  recurrenceDayOfMonth?: number | null;
  recurrenceUntil?: string | null;
  recurrenceSourceTaskId?: number | null;
  completionTag?: TaskCompletionTag | null;
  lastDelayReasonCode?: TaskDelayReasonCode | null;
  lastDelayReasonNote?: string | null;
};

export type UpdateTaskInput = NewTaskInput & { id: number };

export type TaskConflictCheckInput = {
  taskId?: number | null;
  scheduledDate?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  priority?: TaskPriority | null;
  estimatedMinutes?: number | null;
};

export type TaskConflictCheckResult = {
  hasTimeConflict: boolean;
  hasDailyLoadRisk: boolean;
  hasPriorityRisk: boolean;
  riskLevel: "low" | "medium" | "high";
  messages: string[];
  conflictedTaskIds: number[];
};

export type PostponeTaskInput = {
  taskId: number;
  newScheduledDate: string | null;
  newDeadline: string | null;
  newTimeStart: string | null;
  newTimeEnd: string | null;
  reasonCode: TaskDelayReasonCode | null;
  reasonNote: string | null;
};

export type TaskEventLog = {
  id: number;
  taskId: number;
  eventType: string;
  detailJson: string | null;
  reasonCode: string | null;
  reasonNote: string | null;
  createdAt: string;
};

export type Goal = {
  id: number;
  title: string;
  subject: string;
  totalAmount: number;
  unit: string;
  dailyTarget: number;
  startDate: string;
  endDate: string;
  completedAmount: number;
  status: "active" | "completed" | "paused" | string;
  notes: string | null;
  createdAt: string;
};

export type GoalLog = {
  id: number;
  goalId: number;
  logDate: string;
  amount: number;
  notes: string | null;
  createdAt: string;
};
