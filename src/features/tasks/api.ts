import { invoke } from "@tauri-apps/api/core";
import type {
  Goal,
  GoalLog,
  NewTaskInput,
  PostponeTaskInput,
  Task,
  TaskCompletionTag,
  TaskConflictCheckInput,
  TaskConflictCheckResult,
  TaskEventLog,
  TaskStatus,
  UpdateTaskInput,
} from "@/features/tasks/types";

export async function listTasks() {
  return invoke<Task[]>("list_tasks");
}

export async function getTasksByDate(date: string) {
  return invoke<Task[]>("get_tasks_by_date", { date });
}

export async function getGoals() {
  return invoke<Goal[]>("get_goals");
}

export async function logGoalProgress(goalId: number, date: string, amount: number) {
  return invoke<void>("log_goal_progress", { goalId, date, amount });
}

export async function getGoalLogByDate(date: string) {
  return invoke<GoalLog[]>("get_goal_log_by_date", { date });
}

export async function getTodayGoalLogs(date: string) {
  return invoke<GoalLog[]>("get_today_goal_logs", { date });
}

export async function createTask(payload: NewTaskInput) {
  return invoke<number>("create_task", { payload });
}

export async function updateTask(payload: UpdateTaskInput) {
  return invoke<void>("update_task", { payload });
}

export async function updateTaskStatus(taskId: number, status: TaskStatus, completionTag?: TaskCompletionTag | null) {
  return invoke<number | null>("update_task_status_with_tag", { taskId, status, completionTag: completionTag ?? null });
}

export async function deleteTask(taskId: number) {
  return invoke<void>("delete_task", { taskId });
}

export async function seedTaskDemoData() {
  return invoke<void>("seed_task_demo_data");
}

export async function previewTaskConflicts(payload: TaskConflictCheckInput) {
  return invoke<TaskConflictCheckResult>("preview_task_conflicts", { payload });
}

export async function postponeTask(payload: PostponeTaskInput) {
  return invoke<void>("postpone_task", { payload });
}

export async function listTaskEventLogs(taskId: number, limit = 20) {
  return invoke<TaskEventLog[]>("list_task_event_logs", { taskId, limit });
}
