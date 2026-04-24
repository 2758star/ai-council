import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logGoalProgress, updateTaskStatus } from "@/features/tasks/api";
import type { Goal, Task, TaskStatus } from "@/features/tasks/types";
import { useUiStore } from "@/stores/ui-store";

type ViewMode = "day" | "week" | "month";
type NewType = "task" | "schedule";
type EventType = "task" | "schedule";

type Schedule = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  color: string;
  notes: string | null;
};

type CalEvent = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  color: string;
  type: EventType;
  subject: string;
  isAllDay: boolean;
  taskId?: number;
  status?: string;
};

type GoalCard = {
  id: number;
  name: string;
  total: number;
  unit: string;
  completed: number;
  dailyTarget: number;
  color: string;
  subject: string;
};

type GoalGroupProps = {
  title: string;
  defaultOpen: boolean;
  goals: GoalCard[];
  onLogProgress: (goalId: number, amount: number) => Promise<void>;
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  return addDays(d, -(day - 1));
}

function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateString(a) === toDateString(b);
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function formatDay(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatWeek(date: Date): string {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function timeToPixels(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - 7) * 48 + (m / 60) * 48;
}

function timeToPixelsFull(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - 7) * 56 + (m / 60) * 56;
}

function durationToPixels(duration: number): number {
  return (duration / 60) * 48;
}

function durationToPixelsFull(duration: number): number {
  return (duration / 60) * 56;
}

function diffMinutes(start: string | null, end: string | null): number {
  if (!start || !end) return 60;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return Math.max(15, e - s);
}

function subjectColor(subject: string): string {
  const map: Record<string, string> = {
    雅思: "#10B981",
    GRE: "#6366F1",
    词汇: "#F59E0B",
    课程: "#3B82F6",
    申请: "#EC4899",
    其他: "#9CA3AF",
  };
  return map[subject] ?? "#9CA3AF";
}

function tagStyle(subject: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    雅思: { bg: "#D1FAE5", color: "#065F46" },
    GRE: { bg: "#EDE9FE", color: "#5B21B6" },
    词汇: { bg: "#FEF3C7", color: "#92400E" },
    课程: { bg: "#DBEAFE", color: "#1E40AF" },
    申请: { bg: "#FCE7F3", color: "#9D174D" },
    其他: { bg: "#F3F4F6", color: "#6B7280" },
  };
  return map[subject] ?? map["其他"];
}

function tasksToEvents(tasks: Task[]): CalEvent[] {
  return tasks
    .filter((t) => t.scheduledDate)
    .map((t) => {
      const color = subjectColor(t.taskType ?? "其他");
      const isAllDay = !t.timeStart;
      return {
        id: t.id,
        title: t.title,
        date: t.scheduledDate ?? "",
        startTime: t.timeStart ?? null,
        endTime: t.timeEnd ?? null,
        duration: diffMinutes(t.timeStart ?? null, t.timeEnd ?? null),
        color,
        type: "task",
        subject: t.taskType ?? "其他",
        isAllDay,
        taskId: t.id,
        status: t.status,
      };
    });
}

function schedulesToEvents(schedules: Schedule[]): CalEvent[] {
  return schedules.map((s) => ({
    id: s.id,
    title: s.title,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    duration: diffMinutes(s.startTime, s.endTime),
    color: s.color || "#3B82F6",
    type: "schedule",
    subject: "课程",
    isAllDay: s.isAllDay || !s.startTime,
  }));
}

function toGoalCard(goal: Goal): GoalCard {
  return {
    id: goal.id,
    name: goal.title,
    total: goal.totalAmount,
    unit: goal.unit,
    completed: goal.completedAmount,
    dailyTarget: goal.dailyTarget,
    color: subjectColor(goal.subject),
    subject: goal.subject,
  };
}

function GoalGroup({ title, defaultOpen, goals, onLogProgress }: GoalGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 0",
          cursor: "pointer",
          marginBottom: open ? 6 : 0,
        }}
      >
        <span style={{ fontSize: 10, color: open ? "#6366F1" : "#C7C7CC" }}>{open ? "▾" : "▸"}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "#86868B",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {title}
        </span>
      </div>

      {open &&
        goals.map((goal) => (
          <div
            key={goal.id}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              marginBottom: 5,
              background: "rgba(255,255,255,0.7)",
              border: "0.5px solid rgba(0,0,0,0.07)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "#1D1D1F" }}>{goal.name}</span>
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  borderRadius: 99,
                  background: `${goal.color}22`,
                  color: goal.color,
                  fontWeight: 600,
                }}
              >
                {goal.subject}
              </span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: "rgba(0,0,0,0.08)", marginBottom: 4 }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 99,
                  width: `${Math.min((goal.completed / Math.max(goal.total, 1)) * 100, 100)}%`,
                  background: goal.color,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#86868B",
                marginBottom: goal.dailyTarget > 0 ? 6 : 0,
              }}
            >
              <span>
                {goal.completed} / {goal.total}
                {goal.unit}
              </span>
              {goal.dailyTarget > 0 && (
                <span>
                  今日 {goal.dailyTarget}
                  {goal.unit}
                </span>
              )}
            </div>
            {goal.dailyTarget > 0 && (
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  placeholder={`今天完成多少${goal.unit}`}
                  style={{
                    flex: 1,
                    height: 24,
                    borderRadius: 6,
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    padding: "0 6px",
                    fontSize: 10,
                    fontFamily: "inherit",
                    outline: "none",
                    background: "rgba(255,255,255,0.9)",
                    color: "#1D1D1F",
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      const val = parseInt(e.currentTarget.value, 10);
                      if (!Number.isNaN(val) && val > 0) {
                        await onLogProgress(goal.id, val);
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
                <button
                  onClick={async (e) => {
                    const input = e.currentTarget.previousSibling as HTMLInputElement;
                    const val = parseInt(input.value, 10);
                    if (!Number.isNaN(val) && val > 0) {
                      await onLogProgress(goal.id, val);
                      input.value = "";
                    }
                  }}
                  style={{
                    height: 24,
                    padding: "0 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "#6366F1",
                    color: "#fff",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  记录
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

function MiniCalendar({
  currentDate,
  selectedDate,
  onSelectDate,
}: {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F", marginBottom: 8 }}>{formatMonth(currentDate)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
        {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 9, color: "#C7C7CC" }}>
            {w}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {days.map((d) => {
          const inMonth = d.getMonth() === currentDate.getMonth();
          const selected = isSameDay(d, selectedDate);
          return (
            <button
              key={toDateString(d)}
              onClick={() => onSelectDate(d)}
              style={{
                height: 22,
                borderRadius: 6,
                border: "none",
                background: selected ? "#6366F1" : "transparent",
                color: selected ? "#fff" : inMonth ? "#1D1D1F" : "#C7C7CC",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TasksPage() {
  const setRoute = useUiStore((s) => s.setRoute);
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newType, setNewType] = useState<NewType>("task");
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(toDateString(new Date()));
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newSubject, setNewSubject] = useState("雅思");
  const [newColor, setNewColor] = useState("#3B82F6");

  const selectedDateStr = useMemo(() => toDateString(selectedDate), [selectedDate]);
  const nowTime = useMemo(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  }, []);

  const range = useMemo(() => {
    if (view === "day") {
      const d = toDateString(selectedDate);
      return { start: d, end: d };
    }
    if (view === "week") {
      return {
        start: toDateString(startOfWeek(currentDate)),
        end: toDateString(endOfWeek(currentDate)),
      };
    }
    return {
      start: toDateString(startOfWeek(startOfMonth(currentDate))),
      end: toDateString(endOfWeek(addDays(startOfMonth(currentDate), 34))),
    };
  }, [view, currentDate, selectedDate]);

  async function loadData() {
    const [tasks, schedules, goalRows] = await Promise.all([
      (async () => {
        try {
          return await invoke<Task[]>("get_tasks_by_date_range", {
            startDate: range.start,
            endDate: range.end,
          });
        } catch {
          return invoke<Task[]>("get_tasks_by_date_range", {
            start_date: range.start,
            end_date: range.end,
          });
        }
      })(),
      (async () => {
        try {
          return await invoke<Schedule[]>("get_schedules_by_date_range", {
            startDate: range.start,
            endDate: range.end,
          });
        } catch {
          try {
            return await invoke<Schedule[]>("get_schedules_by_date_range", {
              start_date: range.start,
              end_date: range.end,
            });
          } catch {
            return [];
          }
        }
      })(),
      invoke<Goal[]>("get_goals").catch(() => []),
    ]);

    setEvents([...tasksToEvents(tasks), ...schedulesToEvents(schedules)]);
    setGoals(goalRows);
  }

  useEffect(() => {
    loadData().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRoute("dashboard");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setRoute]);

  const getEventsForDay = useCallback((dateStr: string): CalEvent[] => {
    return events
      .filter((e) => e.date === dateStr)
      .sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
  }, [events]);

  function getAlldayEvents(dateStr: string): CalEvent[] {
    return getEventsForDay(dateStr).filter((e) => e.isAllDay);
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return {
        date,
        dateStr: toDateString(date),
        weekName: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][i],
        dayNum: date.getDate(),
        isToday: isToday(date),
      };
    });
  }, [currentDate]);

  const monthWeeks = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    return Array.from({ length: 5 }, (_, wi) =>
      Array.from({ length: 7 }, (_, di) => {
        const date = addDays(gridStart, wi * 7 + di);
        return {
          date,
          dateStr: toDateString(date),
          dayNum: date.getDate(),
          isToday: isToday(date),
          isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        };
      })
    );
  }, [currentDate]);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === "active"), [goals]);

  const fallbackGroups = useMemo(
    () => ({
      prep: [
        {
          id: 1,
          name: "雅思单词第1遍",
          total: 2500,
          unit: "词",
          completed: 0,
          dailyTarget: 160,
          color: "#10B981",
          subject: "雅思",
        },
        {
          id: 2,
          name: "GRE单词第1遍",
          total: 3500,
          unit: "词",
          completed: 0,
          dailyTarget: 100,
          color: "#6366F1",
          subject: "GRE",
        },
        {
          id: 101,
          name: "雅思阅读练习",
          total: 80,
          unit: "篇",
          completed: 0,
          dailyTarget: 1,
          color: "#10B981",
          subject: "雅思",
        },
        {
          id: 102,
          name: "雅思听力练习",
          total: 120,
          unit: "节",
          completed: 0,
          dailyTarget: 2,
          color: "#10B981",
          subject: "雅思",
        },
      ] as GoalCard[],
      apply: [
        {
          id: 5,
          name: "准备PS初稿",
          total: 1,
          unit: "份",
          completed: 0,
          dailyTarget: 0,
          color: "#EC4899",
          subject: "申请",
        },
        {
          id: 6,
          name: "准备CV",
          total: 1,
          unit: "份",
          completed: 0,
          dailyTarget: 0,
          color: "#EC4899",
          subject: "申请",
        },
        {
          id: 7,
          name: "联系推荐人",
          total: 3,
          unit: "位",
          completed: 0,
          dailyTarget: 0,
          color: "#EC4899",
          subject: "申请",
        },
        {
          id: 8,
          name: "提交申请学校",
          total: 9,
          unit: "所",
          completed: 0,
          dailyTarget: 0,
          color: "#EC4899",
          subject: "申请",
        },
      ] as GoalCard[],
      misc: [
        {
          id: 9,
          name: "Coursera统计课",
          total: 1,
          unit: "门",
          completed: 0,
          dailyTarget: 0,
          color: "#9CA3AF",
          subject: "其他",
        },
      ] as GoalCard[],
    }),
    []
  );

  const goalCards = useMemo(() => activeGoals.map(toGoalCard), [activeGoals]);

  const prepGoals = goalCards.length > 0
    ? goalCards.filter((g) => ["雅思", "GRE", "词汇"].includes(g.subject))
    : fallbackGroups.prep;
  const applyGoals = goalCards.length > 0
    ? goalCards.filter((g) => g.subject === "申请")
    : fallbackGroups.apply;
  const miscGoals = goalCards.length > 0
    ? goalCards.filter((g) => !["雅思", "GRE", "词汇", "申请"].includes(g.subject))
    : fallbackGroups.misc;

  const dayEvents = useMemo(() => getEventsForDay(selectedDateStr), [getEventsForDay, selectedDateStr]);
  const scheduleEvents = useMemo(() => dayEvents.filter((e) => e.type === "schedule"), [dayEvents]);
  const studyTasks = useMemo(
    () =>
      dayEvents
        .filter((e) => e.type === "task")
        .map((e) => ({
          id: e.taskId ?? e.id,
          title: e.title,
          done: e.status === "已完成",
          subject: e.subject,
          tagBg: tagStyle(e.subject).bg,
          tagColor: tagStyle(e.subject).color,
        })),
    [dayEvents]
  );

  const hasVocabTask = useMemo(
    () => studyTasks.some((t) => t.subject === "雅思" || t.subject === "GRE" || t.subject === "词汇"),
    [studyTasks]
  );

  async function handleLogProgress(goalId: number, amount: number) {
    await logGoalProgress(goalId, selectedDateStr, amount);
    await loadData();
  }

  async function toggleTask(taskId: number) {
    const target = events.find((e) => e.taskId === taskId);
    if (!target) return;
    const nextStatus: TaskStatus = target.status === "已完成" ? "未开始" : "已完成";

    const previous = events;
    setEvents((prev) =>
      prev.map((evt) =>
        evt.taskId === taskId
          ? {
              ...evt,
              status: nextStatus,
            }
          : evt
      )
    );

    try {
      await updateTaskStatus(taskId, nextStatus);
    } catch {
      setEvents(previous);
    }
  }

  function shiftDate(step: number) {
    setCurrentDate((prev) => {
      if (view === "day") return addDays(prev, step);
      if (view === "week") return addDays(prev, step * 7);
      return new Date(prev.getFullYear(), prev.getMonth() + step, 1);
    });
    if (view === "day") {
      setSelectedDate((prev) => addDays(prev, step));
    }
  }

  function goToday() {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  }

  function goBackSafe() {
    if (window.history.length > 1) {
      window.history.back();
      window.setTimeout(() => {
        setRoute("dashboard");
      }, 120);
      return;
    }
    setRoute("dashboard");
  }

  function formatSelectedDate() {
    const d = selectedDate;
    const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${week}`;
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;

    if (newType === "task") {
      const estimated = newStartTime && newEndTime ? diffMinutes(newStartTime, newEndTime) : null;
      await invoke("create_task", {
        payload: {
          title: newTitle.trim(),
          description: null,
          sourceType: null,
          sourceId: null,
          taskType: newSubject,
          priority: "中",
          status: "未开始",
          estimatedMinutes: estimated,
          scheduledDate: newDate,
          timeStart: newStartTime || null,
          timeEnd: newEndTime || null,
          reminderAt: null,
          deadline: newDate,
          parentTaskId: null,
          recurrenceEnabled: false,
          recurrenceType: null,
          recurrenceInterval: null,
          recurrenceDaysOfWeek: null,
          recurrenceDayOfMonth: null,
          recurrenceUntil: null,
          recurrenceSourceTaskId: null,
          completionTag: null,
          lastDelayReasonCode: null,
          lastDelayReasonNote: null,
        },
      });
    } else {
      const payload = {
        title: newTitle.trim(),
        date: newDate,
        startTime: newStartTime || null,
        endTime: newEndTime || null,
        isAllDay: newStartTime ? 0 : 1,
        color: newColor,
        notes: null,
      };

      try {
        await invoke("create_schedule", { payload });
      } catch {
        await invoke("create_schedule", {
          title: payload.title,
          date: payload.date,
          start_time: payload.startTime,
          end_time: payload.endTime,
          is_all_day: payload.isAllDay,
          color: payload.color,
          notes: payload.notes,
        });
      }
    }

    setShowAddTask(false);
    setNewTitle("");
    setNewStartTime("");
    setNewEndTime("");
    await loadData();
  }

  return (
    <section
      style={{
        position: "fixed",
        inset: "38px 0 32px 52px",
        display: "flex",
        flexDirection: "column",
        background: "#F5F5F7",
      }}
    >
      <div
        style={{
          height: 44,
          flexShrink: 0,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 10,
        }}
      >
        <button
          onClick={goBackSafe}
          style={{
            height: 26,
            padding: "0 10px",
            borderRadius: 6,
            border: "0.5px solid rgba(0,0,0,0.12)",
            background: "rgba(255,255,255,0.9)",
            color: "#6366F1",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          ← 返回
        </button>
        <button
          onClick={() => setRoute("dashboard")}
          style={{
            height: 26,
            padding: "0 10px",
            borderRadius: 6,
            border: "0.5px solid rgba(0,0,0,0.12)",
            background: "rgba(255,255,255,0.9)",
            color: "#1D1D1F",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            flexShrink: 0,
          }}
        >
          回到总览
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F", flex: 1 }}>
          {view === "day" ? formatDay(currentDate) : view === "week" ? formatWeek(currentDate) : formatMonth(currentDate)}
        </span>
        <button onClick={() => shiftDate(-1)}>‹</button>
        <button onClick={() => shiftDate(1)}>›</button>
        <button onClick={goToday}>今天</button>

        <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 2, gap: 1 }}>
          {(["day", "week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                height: 26,
                padding: "0 10px",
                borderRadius: 6,
                border: "none",
                background: view === v ? "#fff" : "transparent",
                color: view === v ? "#6366F1" : "#86868B",
                fontSize: 11,
                fontWeight: view === v ? 600 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {{ day: "日", week: "周", month: "月" }[v]}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setNewDate(selectedDateStr);
            setShowAddTask(true);
          }}
          style={{
            height: 28,
            padding: "0 12px",
            borderRadius: 8,
            border: "none",
            background: "#6366F1",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + 新建
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          style={{
            width: 200,
            flexShrink: 0,
            background: "rgba(255,255,255,0.6)",
            borderRight: "0.5px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 12px 10px", flexShrink: 0 }}>
            <MiniCalendar
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setCurrentDate(d);
                setView("day");
              }}
            />
          </div>

          <div style={{ height: "0.5px", background: "rgba(0,0,0,0.06)", flexShrink: 0 }} />

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[
                { label: "雅思", color: "#10B981" },
                { label: "GRE", color: "#6366F1" },
                { label: "词汇", color: "#F59E0B" },
                { label: "课程", color: "#3B82F6" },
                { label: "申请", color: "#EC4899" },
                { label: "其他", color: "#9CA3AF" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                  <span style={{ fontSize: 10, color: "#86868B" }}>{item.label}</span>
                </div>
              ))}
            </div>

            <GoalGroup title="备考中" defaultOpen goals={prepGoals} onLogProgress={handleLogProgress} />
            <GoalGroup title="申请准备" defaultOpen={false} goals={applyGoals} onLogProgress={handleLogProgress} />
            <GoalGroup title="其他" defaultOpen={false} goals={miscGoals} onLogProgress={handleLogProgress} />
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {view === "week" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                  background: "rgba(255,255,255,0.85)",
                  flexShrink: 0,
                  minHeight: 32,
                }}
              >
                <div style={{ width: 48, flexShrink: 0, fontSize: 9, color: "#C7C7CC", textAlign: "right", padding: "6px 8px 0 0" }}>全天</div>
                {weekDays.map((day) => (
                  <div key={day.dateStr} style={{ flex: 1, padding: "3px 3px" }}>
                    {getAlldayEvents(day.dateStr).map((evt, i) => (
                      <div
                        key={`${evt.id}-${i}`}
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: `${evt.color}22`,
                          color: evt.color,
                          fontWeight: 600,
                          marginBottom: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, display: "flex", overflowY: "auto" }}>
                <div style={{ width: 48, flexShrink: 0 }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        height: 48,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                        padding: "4px 8px 0 0",
                        fontSize: 9,
                        color: "#C7C7CC",
                      }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                {weekDays.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      setSelectedDate(day.date);
                      setView("day");
                    }}
                    style={{
                      flex: 1,
                      borderRight: "0.5px solid rgba(0,0,0,0.06)",
                      borderLeft: day.isToday ? "2px solid rgba(99,102,241,0.3)" : "none",
                      position: "relative",
                      cursor: "pointer",
                      background: day.isToday ? "rgba(99,102,241,0.02)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        height: 40,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                        position: "sticky",
                        top: 0,
                        background: "rgba(255,255,255,0.9)",
                        zIndex: 2,
                      }}
                    >
                      <span style={{ fontSize: 9, color: "#86868B" }}>{day.weekName}</span>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: day.isToday ? "#6366F1" : "transparent",
                          color: day.isToday ? "#fff" : "#1D1D1F",
                        }}
                      >
                        {day.dayNum}
                      </div>
                    </div>

                    {HOURS.map((h) => (
                      <div key={h} style={{ height: 48, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }} />
                    ))}

                    {getEventsForDay(day.dateStr)
                      .filter((evt) => !evt.isAllDay && evt.startTime)
                      .map((evt, i) => (
                        <div
                          key={`${evt.id}-${i}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                            setSelectedDate(day.date);
                          }}
                          style={{
                            position: "absolute",
                            top: 40 + timeToPixels(evt.startTime as string),
                            height: Math.max(durationToPixels(evt.duration), 20),
                            left: 2,
                            right: 2,
                            borderRadius: 4,
                            borderLeft: `3px solid ${evt.color}`,
                            background: `${evt.color}22`,
                            padding: "2px 4px",
                            cursor: "pointer",
                            overflow: "hidden",
                            zIndex: 1,
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 500, color: evt.color, lineHeight: 1.3 }}>{evt.title}</div>
                          {durationToPixels(evt.duration) > 30 && (
                            <div style={{ fontSize: 9, color: evt.color, opacity: 0.75 }}>{evt.startTime}</div>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "day" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                  background: "rgba(255,255,255,0.85)",
                  flexShrink: 0,
                  minHeight: 32,
                }}
              >
                <div style={{ width: 48, flexShrink: 0, fontSize: 9, color: "#C7C7CC", textAlign: "right", padding: "6px 8px 0 0" }}>全天</div>
                <div style={{ flex: 1, padding: "3px" }}>
                  {getAlldayEvents(selectedDateStr).map((evt, i) => (
                    <div
                      key={`${evt.id}-${i}`}
                      style={{
                        fontSize: 9,
                        padding: "2px 8px",
                        borderRadius: 4,
                        marginBottom: 2,
                        background: `${evt.color}22`,
                        color: evt.color,
                        fontWeight: 600,
                        display: "inline-block",
                        marginRight: 4,
                      }}
                    >
                      {evt.title}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, display: "flex", overflowY: "auto" }}>
                <div style={{ width: 48, flexShrink: 0 }}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        height: 56,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                        padding: "4px 8px 0 0",
                        fontSize: 9,
                        color: "#C7C7CC",
                      }}
                    >
                      {h}:00
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, position: "relative" }}>
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: 56, borderBottom: "0.5px solid rgba(0,0,0,0.05)" }} />
                  ))}

                  {isToday(selectedDate) && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: timeToPixelsFull(nowTime),
                        height: 2,
                        background: "#EF4444",
                        zIndex: 3,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#EF4444",
                          position: "absolute",
                          left: -4,
                          top: -3,
                        }}
                      />
                    </div>
                  )}

                  {getEventsForDay(selectedDateStr)
                    .filter((evt) => !evt.isAllDay && evt.startTime)
                    .map((evt, i) => (
                      <div
                        key={`${evt.id}-${i}`}
                        onClick={() => setSelectedEvent(evt)}
                        style={{
                          position: "absolute",
                          top: timeToPixelsFull(evt.startTime as string),
                          height: Math.max(durationToPixelsFull(evt.duration), 24),
                          left: 4,
                          right: 4,
                          borderRadius: 6,
                          borderLeft: `3px solid ${evt.color}`,
                          background: `${evt.color}18`,
                          padding: "4px 8px",
                          cursor: "pointer",
                          overflow: "hidden",
                          zIndex: 1,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 500, color: evt.color }}>{evt.title}</div>
                        <div style={{ fontSize: 10, color: evt.color, opacity: 0.75 }}>
                          {evt.startTime} — {evt.endTime ?? "--:--"} · {evt.type}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {view === "month" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7,1fr)",
                  borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              >
                {["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((d) => (
                  <div key={d} style={{ padding: "6px 0", textAlign: "center", fontSize: 10, color: "#86868B" }}>
                    {d}
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, display: "grid", gridTemplateRows: "repeat(5,1fr)", overflow: "hidden" }}>
                {monthWeeks.map((week, wi) => (
                  <div
                    key={wi}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7,1fr)",
                      borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {week.map((day, di) => {
                      const dayEventsInMonth = getEventsForDay(day.dateStr);
                      return (
                        <div
                          key={day.dateStr}
                          onClick={() => {
                            setSelectedDate(day.date);
                            setCurrentDate(day.date);
                            setView("day");
                          }}
                          style={{
                            borderRight: di < 6 ? "0.5px solid rgba(0,0,0,0.06)" : "none",
                            padding: "4px 5px",
                            cursor: "pointer",
                            overflow: "hidden",
                            background: day.isToday
                              ? "rgba(99,102,241,0.04)"
                              : day.isCurrentMonth
                                ? "transparent"
                                : "rgba(0,0,0,0.01)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 500,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 3,
                              background: day.isToday ? "#6366F1" : "transparent",
                              color: day.isToday ? "#fff" : day.isCurrentMonth ? "#1D1D1F" : "#C7C7CC",
                            }}
                          >
                            {day.dayNum}
                          </div>

                          {dayEventsInMonth.slice(0, 3).map((evt, i) => (
                            <div
                              key={`${evt.id}-${i}`}
                              style={{
                                fontSize: 9,
                                padding: "1px 5px",
                                borderRadius: 3,
                                marginBottom: 1,
                                background: `${evt.color}22`,
                                color: evt.color,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {evt.title}
                            </div>
                          ))}
                          {dayEventsInMonth.length > 3 && (
                            <div style={{ fontSize: 9, color: "#86868B" }}>+{dayEventsInMonth.length - 3}项</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: "rgba(255,255,255,0.85)",
            borderLeft: "0.5px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px 10px",
              borderBottom: "0.5px solid rgba(0,0,0,0.06)",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 10, color: "#86868B", marginBottom: 2 }}>{formatSelectedDate()}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1D1D1F" }}>今日安排</div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
            {scheduleEvents.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#C7C7CC",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 8,
                  }}
                >
                  日程
                </div>
                {scheduleEvents.map((evt, i) => (
                  <div
                    key={`${evt.id}-${i}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "5px 0",
                      borderBottom: "0.5px solid rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: evt.color, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, color: "#86868B", width: 36, flexShrink: 0 }}>{evt.startTime ?? "全天"}</div>
                    <div style={{ fontSize: 11, color: "#1D1D1F", flex: 1 }}>{evt.title}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#C7C7CC",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: 8,
                }}
              >
                学习任务
              </div>
              {studyTasks.map((task, i) => (
                <div
                  key={`${task.id}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 0",
                    borderBottom: "0.5px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    onClick={() => toggleTask(task.id)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      flexShrink: 0,
                      cursor: "pointer",
                      background: task.done ? "#6366F1" : "transparent",
                      border: task.done ? "none" : "1.5px solid rgba(0,0,0,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {task.done && (
                      <svg width="8" height="6" viewBox="0 0 8 6">
                        <path d="M1 3l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      flex: 1,
                      color: task.done ? "#C7C7CC" : "#1D1D1F",
                      textDecoration: task.done ? "line-through" : "none",
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      padding: "1px 5px",
                      borderRadius: 99,
                      fontWeight: 600,
                      background: task.tagBg,
                      color: task.tagColor,
                    }}
                  >
                    {task.subject}
                  </span>
                </div>
              ))}
              {studyTasks.length === 0 && <div style={{ fontSize: 11, color: "#9CA3AF" }}>当天没有学习任务</div>}
            </div>

            {hasVocabTask && (
              <div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: "#C7C7CC",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 8,
                  }}
                >
                  记录词数
                </div>
                {[
                  { label: "雅思", goalId: 1 },
                  { label: "GRE", goalId: 2 },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <input
                      type="number"
                      placeholder={`${item.label}完成多少词`}
                      style={{
                        flex: 1,
                        height: 28,
                        borderRadius: 7,
                        border: "0.5px solid rgba(0,0,0,0.12)",
                        padding: "0 8px",
                        fontSize: 11,
                        outline: "none",
                        fontFamily: "inherit",
                        color: "#1D1D1F",
                        background: "rgba(255,255,255,0.9)",
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          const val = parseInt(e.currentTarget.value, 10);
                          if (!Number.isNaN(val) && val > 0) {
                            await handleLogProgress(item.goalId, val);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedEvent && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 10, color: "#86868B", marginBottom: 4 }}>已选择事件</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1D1D1F" }}>{selectedEvent.title}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddTask && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>新建</div>

            <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "rgba(0,0,0,0.05)", borderRadius: 8, padding: 3 }}>
              {(["task", "schedule"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewType(t)}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 6,
                    border: "none",
                    background: newType === t ? "#fff" : "transparent",
                    color: newType === t ? "#6366F1" : "#86868B",
                    fontSize: 12,
                    fontWeight: newType === t ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {{ task: "学习任务", schedule: "日程事件" }[t]}
                </button>
              ))}
            </div>

            <input
              placeholder="标题"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 10,
                height: 34,
                borderRadius: 8,
                border: "0.5px solid rgba(0,0,0,0.12)",
                padding: "0 10px",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{
                width: "100%",
                marginBottom: 10,
                height: 34,
                borderRadius: 8,
                border: "0.5px solid rgba(0,0,0,0.12)",
                padding: "0 10px",
                fontSize: 13,
                fontFamily: "inherit",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>

            {newType === "task" && (
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                style={{
                  width: "100%",
                  marginBottom: 10,
                  height: 34,
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  padding: "0 10px",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                <option>雅思</option>
                <option>GRE</option>
                <option>词汇</option>
                <option>申请</option>
                <option>其他</option>
              </select>
            )}

            {newType === "schedule" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {["#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#9CA3AF"].map((c) => (
                  <div
                    key={c}
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      border: newColor === c ? "2px solid #1D1D1F" : "2px solid transparent",
                    }}
                  />
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={() => setShowAddTask(false)}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.1)",
                  background: "transparent",
                  color: "#86868B",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  handleCreate().catch(() => undefined);
                }}
                style={{
                  height: 32,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#6366F1",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default TasksPage;
