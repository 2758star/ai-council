import { Fragment, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listProjects } from "@/features/applications/api";
import type { Project } from "@/features/applications/types";
import { updateTaskStatus } from "@/features/tasks/api";
import type { Goal, Task, TaskStatus } from "@/features/tasks/types";

type DailyStats = { date: string; count: number; minutes: number };

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const SLOT_LABELS = ["上午", "下午", "晚上"];

function dateText(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, n: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + n);
  return next;
}

function weekRange(now = new Date()) {
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const start = addDays(now, -(day - 1));
  const end = addDays(start, 6);
  return { start, end };
}

function slotLabel(timeStart?: string | null) {
  if (!timeStart) return "晚上";
  const hour = Number(timeStart.split(":")[0] ?? "20");
  if (hour < 12) return "上午";
  if (hour < 18) return "下午";
  return "晚上";
}

function pillByType(type: string): { bg: string; text: string } {
  if (type === "雅思") return { bg: "rgba(16,185,129,0.12)", text: "#065F46" };
  if (type === "GRE") return { bg: "rgba(99,102,241,0.12)", text: "#4338CA" };
  if (type === "词汇") return { bg: "rgba(245,158,11,0.12)", text: "#92400E" };
  if (type === "申请") return { bg: "rgba(59,130,246,0.12)", text: "#1E3A8A" };
  return { bg: "rgba(0,0,0,0.06)", text: "#6B7280" };
}

function RingCard({
  title,
  current,
  total,
  color,
  detail,
}: {
  title: string;
  current: number;
  total: number;
  color: string;
  detail: string;
}) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const r = 22;
  const c = 2 * Math.PI * r;
  const d = c * (1 - percent / 100);
  return (
    <div
      style={{
        borderRadius: 12,
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <svg width="58" height="58" viewBox="0 0 58 58">
        <circle cx="29" cy="29" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="5" />
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={d}
          transform="rotate(-90 29 29)"
        />
        <text x="29" y="33" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1D1D1F">
          {percent}%
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
          {current}/{total} · {detail}
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [daysToIelts, setDaysToIelts] = useState<number | null>(null);
  const [daysToGre, setDaysToGre] = useState<number | null>(null);
  const [ieltsScore, setIeltsScore] = useState<{ current: number | null; target: number | null }>({
    current: null,
    target: null,
  });
  const [greScore, setGreScore] = useState<{ current: number | null; target: number | null }>({
    current: null,
    target: null,
  });
  const [ieltsProgress, setIeltsProgress] = useState({ current: 0, total: 2500 });
  const [greProgress, setGreProgress] = useState({ current: 0, total: 3500 });
  const [applicationProgress, setApplicationProgress] = useState({ current: 0, total: 0 });
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayTasks, setTodayTasks] = useState<{ list: Task[]; completed: number; total: number }>({
    list: [],
    completed: 0,
    total: 0,
  });
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [heatmapData, setHeatmapData] = useState<DailyStats[]>([]);

  useEffect(() => {
    async function loadSettingsAndStats() {
      const now = new Date();
      const [ieltsDate, greDate, ieltsTarget, ieltsCurrent, greTarget, greCurrent, goals, projectsData, dailyTasks, heat] = await Promise.all([
        invoke<string | null>("get_app_setting", { key: "ielts_exam_date" }),
        invoke<string | null>("get_app_setting", { key: "gre_exam_date" }),
        invoke<string | null>("get_app_setting", { key: "ielts_target_score" }),
        invoke<string | null>("get_app_setting", { key: "ielts_current_score" }),
        invoke<string | null>("get_app_setting", { key: "gre_target_score" }),
        invoke<string | null>("get_app_setting", { key: "gre_current_score" }),
        invoke<Goal[]>("get_goals"),
        listProjects(),
        invoke<Task[]>("get_tasks_by_date", { date: dateText(now) }),
        invoke<DailyStats[]>("get_daily_completion_stats", { days: 112 }),
      ]);

      if (ieltsDate) {
        setDaysToIelts(Math.ceil((new Date(ieltsDate).getTime() - now.getTime()) / 86400000));
      }
      if (greDate) {
        setDaysToGre(Math.ceil((new Date(greDate).getTime() - now.getTime()) / 86400000));
      }
      setIeltsScore({
        current: ieltsCurrent && ieltsCurrent.trim() ? Number(ieltsCurrent) : null,
        target: ieltsTarget && ieltsTarget.trim() ? Number(ieltsTarget) : null,
      });
      setGreScore({
        current: greCurrent && greCurrent.trim() ? Number(greCurrent) : null,
        target: greTarget && greTarget.trim() ? Number(greTarget) : null,
      });

      const ieltsGoal = goals.find((g) => g.subject === "雅思" && g.status === "active");
      const greGoal = goals.find((g) => g.subject === "GRE" && g.status === "active");
      setIeltsProgress(
        ieltsGoal
          ? { current: ieltsGoal.completedAmount, total: ieltsGoal.totalAmount }
          : { current: 0, total: 2500 }
      );
      setGreProgress(
        greGoal
          ? { current: greGoal.completedAmount, total: greGoal.totalAmount }
          : { current: 0, total: 3500 }
      );

      setProjects(projectsData);
      const totalSchools = projectsData.length;
      const activeSchools = projectsData.filter((s: Project) => s.status !== "已放弃").length;
      setApplicationProgress({ current: activeSchools, total: totalSchools });

      const completed = dailyTasks.filter((t) => t.status === "已完成").length;
      setTodayTasks({ list: dailyTasks, completed, total: dailyTasks.length });
      setHeatmapData(heat);

      const { start, end } = weekRange(now);
      const weeklyRows = await invoke<Task[]>("get_tasks_by_date_range", {
        startDate: dateText(start),
        endDate: dateText(end),
      });
      setWeekTasks(weeklyRows);
    }
    loadSettingsAndStats().catch(() => undefined);
  }, []);

  const weekGrid = useMemo(() => {
    const { start } = weekRange(new Date());
    const dates = Array.from({ length: 7 }).map((_, i) => dateText(addDays(start, i)));
    return dates.map((d) => ({
      date: d,
      num: Number(d.slice(-2)),
      slots: SLOT_LABELS.map((slot) =>
        weekTasks.filter((t) => (t.scheduledDate ?? "") === d && slotLabel(t.timeStart) === slot)
      ),
    }));
  }, [weekTasks]);

  const heat = useMemo(() => {
    const dayMap = new Map<string, DailyStats>();
    for (const row of heatmapData) dayMap.set(row.date, row);
    const now = new Date();
    const start = addDays(now, -111);
    const allDays = Array.from({ length: 112 }).map((_, idx) => {
      const date = dateText(addDays(start, idx));
      const row = dayMap.get(date);
      return { date, count: row?.count ?? 0, minutes: row?.minutes ?? 0 };
    });
    const weeks: Array<Array<{ date: string; count: number; minutes: number }>> = [];
    for (let i = 0; i < 16; i += 1) weeks.push(allDays.slice(i * 7, i * 7 + 7));
    const weekRows = allDays.slice(-7);
    const weekTasksDone = weekRows.reduce((s, x) => s + x.count, 0);
    const weekMinutes = weekRows.reduce((s, x) => s + x.minutes, 0);
    let streak = 0;
    for (let i = allDays.length - 1; i >= 0; i -= 1) {
      if (allDays[i].count > 0) streak += 1;
      else break;
    }
    return { weeks, weekTasksDone, weekMinutes, streak, totalDays: allDays.filter((d) => d.count > 0).length };
  }, [heatmapData]);

  const upcomingApplications = useMemo(() => {
    const now = new Date();
    const rows = projects
      .filter((item) => item.deadline)
      .map((item) => {
        const deadline = item.deadline as string;
        const daysLeft = Math.ceil((new Date(deadline).getTime() - now.getTime()) / 86400000);
        return {
          id: item.id,
          school: item.schoolName,
          deadline,
          daysLeft,
          status: item.status,
        };
      })
      .filter((item) => item.daysLeft >= 0 && item.status !== "已放弃")
      .sort((a, b) => a.daysLeft - b.daysLeft);
    return rows.slice(0, 4);
  }, [projects]);

  async function toggleTodayTask(task: Task) {
    const nextStatus: TaskStatus = task.status === "已完成" ? "未开始" : "已完成";
    const prevList = todayTasks.list;
    const nextList = prevList.map((item) =>
      item.id === task.id ? { ...item, status: nextStatus } : item
    );
    const completed = nextList.filter((item) => item.status === "已完成").length;
    setTodayTasks({ list: nextList, completed, total: nextList.length });
    try {
      await updateTaskStatus(task.id, nextStatus);
    } catch {
      const rollbackCompleted = prevList.filter((item) => item.status === "已完成").length;
      setTodayTasks({ list: prevList, completed: rollbackCompleted, total: prevList.length });
    }
  }

  const ieltsScorePercent =
    ieltsScore.current != null && ieltsScore.target != null && ieltsScore.target > 0
      ? Math.min(100, Math.round((ieltsScore.current / ieltsScore.target) * 100))
      : 0;
  const greScorePercent =
    greScore.current != null && greScore.target != null && greScore.target > 0
      ? Math.min(100, Math.round((greScore.current / greScore.target) * 100))
      : 0;

  function getHeatColor(count: number) {
    if (count === 0) return "rgba(0,0,0,0.05)";
    if (count <= 2) return "rgba(99,102,241,0.2)";
    if (count <= 4) return "rgba(99,102,241,0.4)";
    if (count <= 6) return "rgba(99,102,241,0.65)";
    return "#6366F1";
  }

  return (
    <section style={{ position: "fixed", inset: "38px 0 32px 52px", background: "#F5F5F7", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", gap: 10, padding: 12, minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, minHeight: 0, borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.05)", padding: 12, overflow: "auto" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", marginBottom: 10 }}>日历</div>
            <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7,minmax(0,1fr))", gap: 6 }}>
              <div />
              {weekGrid.map((d, i) => (
                <div key={d.date} style={{ borderRadius: 8, textAlign: "center", background: i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.6)", border: i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent", padding: "4px 2px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{WEEKDAY_LABELS[i]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>{d.num}</div>
                </div>
              ))}
              {SLOT_LABELS.map((slot, slotIdx) => (
                <Fragment key={slot}>
                  <div style={{ fontSize: 12, color: "#9CA3AF", paddingTop: 8, textAlign: "center" }}>{slot}</div>
                  {weekGrid.map((day) => (
                    <div key={`${day.date}-${slot}`} style={{ minHeight: 60, borderRadius: 8, background: "rgba(0,0,0,0.02)", padding: 5, display: "flex", flexDirection: "column", gap: 4 }}>
                      {day.slots[slotIdx].slice(0, 2).map((task) => {
                        const style = pillByType(task.taskType);
                        return (
                          <span key={task.id} style={{ fontSize: 10, fontWeight: 600, borderRadius: 6, padding: "3px 6px", background: style.bg, color: style.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {task.title}
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          <div style={{ height: 92, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
            <RingCard title="雅思备考" current={ieltsProgress.current} total={ieltsProgress.total} color="#10B981" detail="目标进度" />
            <RingCard title="GRE备考" current={greProgress.current} total={greProgress.total} color="#6366F1" detail="目标进度" />
            <RingCard title="申请进度" current={applicationProgress.current} total={Math.max(1, applicationProgress.total)} color="#3B82F6" detail={`${applicationProgress.current}/${applicationProgress.total} 学校`} />
          </div>

          <div style={{ height: 230, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.05)", padding: 12, overflow: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F" }}>今日任务</div>
                <span style={{ fontSize: 10, borderRadius: 99, padding: "2px 8px", color: "#4338CA", background: "rgba(99,102,241,0.1)", fontWeight: 600 }}>
                  {todayTasks.completed}/{todayTasks.total}
                </span>
              </div>
              {todayTasks.list.length === 0 ? <div style={{ fontSize: 12, color: "#9CA3AF" }}>今天没有任务</div> : null}
              {todayTasks.list.map((task) => {
                const style = pillByType(task.taskType);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTodayTask(task)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      borderRadius: 8,
                      padding: "6px 8px",
                      background: "rgba(255,255,255,0.8)",
                      border: "0.5px solid rgba(0,0,0,0.06)",
                      marginBottom: 6,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: task.status === "已完成" ? "#6366F1" : "transparent", border: task.status === "已完成" ? "none" : "1.5px solid #D1D1D6", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: task.status === "已完成" ? "#C7C7CC" : "#1D1D1F", textDecoration: task.status === "已完成" ? "line-through" : "none", flex: 1 }}>{task.title}</span>
                    <span style={{ fontSize: 10, borderRadius: 99, padding: "2px 8px", fontWeight: 600, background: style.bg, color: style.text }}>{task.taskType}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.05)", padding: 12, overflow: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>学习热力图</div>
                <div style={{ fontSize: 11, color: "#86868B" }}>过去16周 · 已完成 {heat.totalDays} 天</div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <div style={{ width: 14, display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
                  {["", "一", "", "三", "", "五", ""].map((d, i) => (
                    <div key={i} style={{ height: 12, fontSize: 9, color: "#C7C7CC", display: "flex", alignItems: "center" }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, flex: 1 }}>
                  {heat.weeks.map((week, wi) => (
                    <div key={wi} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                      {week.map((day, di) => (
                        <div key={di} title={`${day.date} · ${day.count}项任务 · ${day.minutes}分钟`} style={{ height: 12, borderRadius: 2, background: getHeatColor(day.count) }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, color: "#86868B" }}>少</span>
                {[0, 2, 4, 6, 8].map((c) => (
                  <div key={c} style={{ width: 11, height: 11, borderRadius: 2, background: getHeatColor(c) }} />
                ))}
                <span style={{ fontSize: 10, color: "#86868B" }}>多</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: "0.5px solid rgba(0,0,0,0.06)" }}>
                {[
                  { label: "本周完成", value: `${heat.weekTasksDone}项任务` },
                  { label: "本周学习", value: `${heat.weekMinutes}分钟` },
                  { label: "连续打卡", value: `${heat.streak}天` },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: "#86868B" }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1D1D1F", marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.05)", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 8 }}>分数看板</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>雅思</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>
                  {ieltsScore.current ?? "--"} / {ieltsScore.target ?? "--"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.08)" }}>
                <div style={{ width: `${ieltsScorePercent}%`, height: "100%", borderRadius: 99, background: "#10B981" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>GRE</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1" }}>
                  {greScore.current ?? "--"} / {greScore.target ?? "--"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "rgba(0,0,0,0.08)" }}>
                <div style={{ width: `${greScorePercent}%`, height: "100%", borderRadius: 99, background: "#6366F1" }} />
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.05)", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 8 }}>考试倒计时</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>雅思考试</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5" }}>{daysToIelts ?? "--"}天</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>GRE考试</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>{daysToGre ?? "--"}天</span>
            </div>
          </div>

          <div style={{ borderRadius: 12, background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 3px rgba(0,0,0,0.04),0 0 0 0.5px rgba(0,0,0,0.05)", padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 8 }}>申请倒计时</div>
            {upcomingApplications.length === 0 ? (
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>暂无申请截止日期</div>
            ) : (
              upcomingApplications.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.school}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.daysLeft <= 14 ? "#DC2626" : "#4F46E5", flexShrink: 0 }}>
                    {item.daysLeft}天
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;
