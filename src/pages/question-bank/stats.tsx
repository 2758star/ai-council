import { useMemo, useState, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateQuestionBankAiReport } from "@/features/ai/workflows";
import { useQuestionBankStore } from "@/stores/question-bank-store";
import { useUiStore } from "@/stores/ui-store";

type TrendRange = "week" | "month" | "all";
type BankKey = "all" | "gre-reading" | "gre-math" | "ielts-reading";

type AiReportState = {
  weaknesses: string[];
  suggestions: string[];
  gapEstimate: string;
};

const cardStyle: CSSProperties = {
  background: "rgba(255,255,255,0.75)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.9)",
  borderRadius: 13,
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
  padding: 16,
};

const trendData: Array<{ date: string; gre_read: number; gre_math: number; ielts_read: number }> = [
  
];

const radarData: Array<{ subject: string; A: number }> = [
  
];

const typeVolumeData: Array<{ name: string; correct: number; wrong: number }> = [
  
];

const timeData: Array<{ date: string; gre_read: number; gre_math: number }> = [
  
];

const passageTimeData: Array<{ name: string; time: number }> = [];

const worstPassages: Array<{ num: number; errors: number; accuracy: number; types: string }> = [
  
];

const bankPresets: Record<BankKey, { total: number; correctRate: number; totalTime: string; mastered: string; weeklyAdd: string }> = {
  all: { total: 0, correctRate: 0, totalTime: "0h 0m", mastered: "0 / 0", weeklyAdd: "+0题" },
  "gre-reading": { total: 0, correctRate: 0, totalTime: "0h 0m", mastered: "0 / 0", weeklyAdd: "+0题" },
  "gre-math": { total: 0, correctRate: 0, totalTime: "0h 0m", mastered: "0 / 0", weeklyAdd: "+0题" },
  "ielts-reading": { total: 0, correctRate: 0, totalTime: "0h 0m", mastered: "0 / 0", weeklyAdd: "+0题" },
};

function getHeatColor(count: number) {
  if (count === 0) return "rgba(0,0,0,0.05)";
  if (count <= 2) return "rgba(99,102,241,0.2)";
  if (count <= 4) return "rgba(99,102,241,0.45)";
  if (count <= 6) return "rgba(99,102,241,0.7)";
  return "#6366F1";
}

function buildHeatmapWeeks() {
  const today = new Date();
  const weeks: { date: string; count: number }[][] = [];
  for (let w = 3; w >= 0; w -= 1) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - w * 7 - (6 - d));
      week.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count: (w * 3 + d * 2 + 1) % 8,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function getTrendByRange(range: TrendRange) {
  if (range === "week") return trendData.slice(-4);
  if (range === "month") return trendData.slice(-10);
  return trendData;
}

function parseDurationToHours(value: string) {
  const match = value.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return Number(match[1]) + Number(match[2]) / 60;
}

export function QuestionBankStatsPage() {
  const setRoute = useUiStore((state) => state.setRoute);
  const setActivePassageId = useQuestionBankStore((state) => state.setActivePassageId);
  const setReviewMode = useQuestionBankStore((state) => state.setReviewMode);

  const [selectedBank, setSelectedBank] = useState<BankKey>("all");
  const [trendRange, setTrendRange] = useState<TrendRange>("month");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<AiReportState | null>(null);

  const stats = bankPresets[selectedBank];
  const visibleTrend = getTrendByRange(trendRange);
  const heatmapData = useMemo(() => buildHeatmapWeeks(), []);

  const weakTypes = useMemo(() => {
    return [...radarData]
      .sort((a, b) => a.A - b.A)
      .slice(0, 3)
      .map((item) => `${item.subject}(${item.A}%)`)
      .join(" · ") || "暂无";
  }, []);

  const passageStats = useMemo(() => {
    const total = selectedBank === "all" ? 440 : selectedBank === "gre-reading" ? 440 : selectedBank === "gre-math" ? 170 : 120;
    const done = selectedBank === "all" ? 89 : selectedBank === "gre-reading" ? 89 : selectedBank === "gre-math" ? 54 : 38;
    const allCorrect = selectedBank === "all" ? 34 : selectedBank === "gre-reading" ? 34 : selectedBank === "gre-math" ? 28 : 17;
    const hasError = selectedBank === "all" ? 38 : selectedBank === "gre-reading" ? 38 : selectedBank === "gre-math" ? 20 : 13;
    const untouched = total - allCorrect - hasError;
    return { total, done, allCorrect, hasError, untouched };
  }, [selectedBank]);

  async function handleGenerateReport() {
    setGeneratingReport(true);
    try {
      const report = await generateQuestionBankAiReport({
        accuracyByType: radarData.map((item, index) => ({
          qType: item.subject,
          accuracy: item.A,
          total: typeVolumeData[index]?.correct + typeVolumeData[index]?.wrong || 0,
        })),
        trend: visibleTrend.map((item) => ({
          date: item.date,
          accuracy: Math.round((item.gre_read + item.gre_math + item.ielts_read) / 3),
        })),
        highFreqWrongKeywords: radarData
          .filter((item) => item.A < 70)
          .map((item) => item.subject),
      });

      setAiReport({
        weaknesses: report.weaknesses,
        suggestions: report.weekly_focus,
        gapEstimate: report.score_gap_estimate,
      });
    } catch {
      setAiReport({
        weaknesses: [
          "选句子题正确率仅48%，定位原文能力弱",
          "推断题逻辑跳跃过快，容易过度推断",
          "GRE阅读每题用时超出目标40%，需提速",
        ],
        suggestions: [
          "本周每天专项做5道选句子题，重点练习识别段落核心句",
          "推断题错题回顾：标出你多推了哪一步",
          "GRE阅读定时练习，每篇文章控制在4分钟内",
        ],
        gapEstimate: "GRE阅读目标75%，现73%，按当前提升速度约需2-3周达到",
      });
    } finally {
      setGeneratingReport(false);
    }
  }

  return (
    <section
      style={{
        position: "fixed",
        inset: "0",
        display: "flex",
        flexDirection: "column",
        background: "#F5F5F7",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 48,
          flexShrink: 0,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setRoute("question-bank")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#6366F1",
            fontWeight: 500,
            fontFamily: "inherit",
          }}
        >
          ← 返回
        </button>

        <span style={{ fontSize: 15, fontWeight: 700, color: "#1D1D1F" }}>题库统计</span>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={selectedBank}
            onChange={(event) => setSelectedBank(event.target.value as BankKey)}
            style={{
              height: 30,
              borderRadius: 8,
              border: "0.5px solid rgba(0,0,0,0.12)",
              background: "rgba(255,255,255,0.8)",
              padding: "0 10px",
              fontSize: 12,
              fontFamily: "inherit",
              color: "#1D1D1F",
              outline: "none",
            }}
          >
            <option value="all">全部题库</option>
            <option value="gre-reading">GRE 阅读机经440篇</option>
            <option value="gre-math">GRE 数学题库</option>
            <option value="ielts-reading">雅思阅读题库</option>
          </select>

          <button
            type="button"
            onClick={() => {
              handleGenerateReport().catch(() => undefined);
            }}
            disabled={generatingReport}
            style={{
              height: 30,
              padding: "0 14px",
              borderRadius: 8,
              border: "none",
              background: generatingReport ? "rgba(0,0,0,0.07)" : "#6366F1",
              color: generatingReport ? "#C7C7CC" : "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: generatingReport ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {generatingReport ? "生成中..." : "✨ AI分析报告"}
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            {
              label: "总做题数",
              value: stats.total.toLocaleString(),
              sub: `本周 ${stats.weeklyAdd}`,
              color: "#6366F1",
              bg: "rgba(99,102,241,0.07)",
              icon: "📝",
            },
            {
              label: "综合正确率",
              value: `${stats.correctRate}%`,
              sub: "较上周 ↑5%",
              color: "#10B981",
              bg: "rgba(16,185,129,0.07)",
              icon: "✅",
              hasRing: true,
              ringPct: stats.correctRate,
            },
            {
              label: "总用时",
              value: stats.totalTime,
              sub: `平均每题 ${(parseDurationToHours(stats.totalTime) * 60 / stats.total).toFixed(1)}min`,
              color: "#F59E0B",
              bg: "rgba(245,158,11,0.07)",
              icon: "⏱",
            },
            {
              label: "错题已掌握",
              value: stats.mastered,
              sub: "掌握率 54%",
              color: "#EF4444",
              bg: "rgba(239,68,68,0.07)",
              icon: "📚",
            },
          ].map((card, index) => (
            <div
              key={index}
              style={{
                ...cardStyle,
                background: card.bg,
                border: `0.5px solid ${card.color}22`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#86868B", fontWeight: 500, marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: card.color, lineHeight: 1 }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: "#86868B", marginTop: 6 }}>{card.sub}</div>
                </div>
                {"hasRing" in card && card.hasRing ? (
                  <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="5" />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="5"
                      strokeDasharray={`${((2 * Math.PI * 20 * card.ringPct) / 100).toFixed(2)} ${(2 * Math.PI * 20).toFixed(2)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                    />
                    <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#10B981">
                      {card.ringPct}%
                    </text>
                  </svg>
                ) : (
                  <span style={{ fontSize: 28 }}>{card.icon}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>正确率趋势</div>
            <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 7, padding: 2 }}>
              {(["week", "month", "all"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTrendRange(key)}
                  style={{
                    height: 24,
                    padding: "0 10px",
                    borderRadius: 5,
                    border: "none",
                    background: trendRange === key ? "#fff" : "transparent",
                    color: trendRange === key ? "#6366F1" : "#86868B",
                    fontSize: 11,
                    fontWeight: trendRange === key ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: trendRange === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {key === "week" ? "本周" : key === "month" ? "本月" : "全部"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={visibleTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#86868B" }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[40, 100]}
                tick={{ fontSize: 10, fill: "#86868B" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const map: Record<string, string> = {
                    gre_read: "GRE阅读",
                    gre_math: "GRE数学",
                    ielts_read: "雅思阅读",
                  };
                  return [`${value}%`, map[name] ?? name];
                }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid rgba(0,0,0,0.1)" }}
              />
              <Legend
                formatter={(name) => {
                  const map: Record<string, string> = {
                    gre_read: "GRE阅读",
                    gre_math: "GRE数学",
                    ielts_read: "雅思阅读",
                  };
                  return map[String(name)] ?? String(name);
                }}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Line type="monotone" dataKey="gre_read" stroke="#6366F1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gre_math" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ielts_read" stroke="#10B981" strokeWidth={2} strokeDasharray="5 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 14 }}>题型分析</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#86868B", marginBottom: 8, textAlign: "center" }}>各题型正确率</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(0,0,0,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#86868B" }} />
                  <Radar
                    name="正确率"
                    dataKey="A"
                    stroke="#6366F1"
                    fill="rgba(99,102,241,0.15)"
                    strokeWidth={2}
                  />
                  <Tooltip formatter={(value: number) => [`${value}%`, "正确率"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#86868B", marginBottom: 8, textAlign: "center" }}>各题型做题量</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={typeVolumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#86868B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#86868B" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="correct" name="正确" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="wrong" name="错误" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.06)",
              border: "0.5px solid rgba(239,68,68,0.15)",
            }}
          >
            <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>📉 薄弱题型：</span>
            <span style={{ fontSize: 11, color: "#DC2626" }}>{weakTypes}</span>
            <span style={{ fontSize: 11, color: "#86868B", marginLeft: 8 }}>建议本周专项练习</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 14 }}>用时分析</div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#86868B", marginBottom: 8 }}>平均每题用时趋势（分钟）</div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={timeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#86868B" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#86868B" }}
                    axisLine={false}
                    tickLine={false}
                    domain={[1, 5]}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <Tooltip formatter={(value: number) => [`${value}min`, ""]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="gre_read" name="GRE阅读" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gre_math" name="GRE数学" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={() => 2} stroke="#EF4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="目标2min" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "#86868B", marginBottom: 8 }}>耗时最多的Passage（分钟/题）</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {passageTimeData.map((item) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#86868B", width: 30, flexShrink: 0 }}>{item.name}</span>
                    <div style={{ flex: 1, height: 18, background: "rgba(0,0,0,0.05)", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 4,
                          width: `${(item.time / 5) * 100}%`,
                          background: item.time > 3.5 ? "#EF4444" : item.time > 3 ? "#F59E0B" : "#10B981",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        width: 32,
                        textAlign: "right",
                        flexShrink: 0,
                        color: item.time > 3.5 ? "#EF4444" : item.time > 3 ? "#F59E0B" : "#10B981",
                      }}
                    >
                      {item.time}m
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: "#86868B" }}>🔴 &gt;3.5min · 🟡 3-3.5min · 🟢 &lt;3min</div>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>错题热力图</div>
            <div style={{ fontSize: 11, color: "#86868B" }}>过去28天每日错题数</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 22 }}>
              {["日", "一", "二", "三", "四", "五", "六"].map((d, idx) => (
                <div key={d} style={{ height: 14, fontSize: 9, color: "#C7C7CC", display: "flex", alignItems: "center" }}>
                  {idx % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {heatmapData.map((week, idx) => (
                  <div key={idx} style={{ flex: 1, fontSize: 9, color: "#C7C7CC", textAlign: "center" }}>
                    {week[0].date}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {heatmapData.map((week, wIdx) => (
                  <div key={wIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    {week.map((day, dIdx) => (
                      <div
                        key={`${wIdx}-${dIdx}`}
                        title={`${day.date} · ${day.count}道错题`}
                        style={{
                          height: 14,
                          borderRadius: 3,
                          background: getHeatColor(day.count),
                          cursor: "pointer",
                          transition: "opacity 0.15s",
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, color: "#86868B" }}>少</span>
            {[0, 2, 4, 6, 8].map((value) => (
              <div key={value} style={{ width: 12, height: 12, borderRadius: 2, background: getHeatColor(value) }} />
            ))}
            <span style={{ fontSize: 10, color: "#86868B" }}>多</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F" }}>AI 分析报告</div>
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 99,
                background: "#EDE9FE",
                color: "#5B21B6",
                fontWeight: 600,
              }}
            >
              Gemini 生成
            </span>
          </div>

          {!aiReport ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#C7C7CC", fontSize: 13 }}>
              点击右上角「✨ AI分析报告」生成个性化学习建议
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "rgba(239,68,68,0.05)",
                  border: "0.5px solid rgba(239,68,68,0.15)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>📉 核心弱点</div>
                {aiReport.weaknesses.map((item, idx) => (
                  <div
                    key={`weak-${idx}`}
                    style={{
                      fontSize: 12,
                      color: "#1D1D1F",
                      lineHeight: 1.65,
                      paddingLeft: 12,
                      borderLeft: "2px solid #EF4444",
                      marginBottom: 6,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div
                style={{
                  flex: 1,
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "rgba(16,185,129,0.05)",
                  border: "0.5px solid rgba(16,185,129,0.15)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 8 }}>✅ 本周建议</div>
                {aiReport.suggestions.map((item, idx) => (
                  <div
                    key={`suggest-${idx}`}
                    style={{
                      fontSize: 12,
                      color: "#1D1D1F",
                      lineHeight: 1.65,
                      paddingLeft: 12,
                      borderLeft: "2px solid #10B981",
                      marginBottom: 6,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              <div
                style={{
                  width: 180,
                  flexShrink: 0,
                  borderRadius: 10,
                  padding: "12px 14px",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))",
                  border: "0.5px solid rgba(99,102,241,0.15)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 8 }}>🎯 差距估算</div>
                <div style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.7 }}>{aiReport.gapEstimate}</div>
              </div>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1D1D1F", marginBottom: 14 }}>Passage 完成情况</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "#86868B" }}>总进度</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F" }}>
                {passageStats.done} / {passageStats.total} 篇
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 99, overflow: "hidden", display: "flex", gap: 1 }}>
              <div style={{ width: `${(passageStats.allCorrect / passageStats.total) * 100}%`, background: "#10B981" }} />
              <div style={{ width: `${(passageStats.hasError / passageStats.total) * 100}%`, background: "#EF4444" }} />
              <div style={{ flex: 1, background: "rgba(0,0,0,0.08)" }} />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {[
                { color: "#10B981", label: `全对 ${passageStats.allCorrect}篇` },
                { color: "#EF4444", label: `有错 ${passageStats.hasError}篇` },
                { color: "rgba(0,0,0,0.12)", label: `未做 ${passageStats.untouched}篇` },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                  <span style={{ fontSize: 10, color: "#86868B" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", marginBottom: 8 }}>错误最多的5篇 · 建议重做</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {worstPassages.map((item) => (
              <button
                key={item.num}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.04)",
                  border: "0.5px solid rgba(239,68,68,0.1)",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setActivePassageId(item.num);
                  setReviewMode("review");
                  setRoute("question-bank-exam");
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", width: 32 }}>P{item.num}</span>
                <span style={{ fontSize: 11, color: "#86868B", flex: 1 }}>{item.types}</span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: "rgba(239,68,68,0.1)",
                    color: "#DC2626",
                    fontWeight: 600,
                  }}
                >
                  错{item.errors}题
                </span>
                <span style={{ fontSize: 10, color: "#86868B", width: 56, textAlign: "right" }}>正确率{item.accuracy}%</span>
                <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 500 }}>重做 →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default QuestionBankStatsPage;
