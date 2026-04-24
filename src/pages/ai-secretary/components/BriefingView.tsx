import { useMemo, useState, type ReactNode } from "react";
import { BRIEFING_ALERTS, BRIEFING_TASKS } from "../mock-data";
import { generateEveningBriefing, type EveningBriefingOutput } from "@/features/ai/workflows";

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  雅思: { bg: "rgba(16,185,129,0.1)", text: "#065F46" },
  GRE: { bg: "rgba(139,92,246,0.1)", text: "#5B21B6" },
  申请: { bg: "rgba(59,130,246,0.1)", text: "#1E40AF" },
  错题: { bg: "rgba(239,68,68,0.1)", text: "#9F1239" },
  词汇: { bg: "rgba(245,158,11,0.1)", text: "#92400E" },
};

function fallbackInsight() {
  return "今天是你连续备考的第 7天，GRE 填空正确率从63%提升到68%。明天建议重点突破双空题逻辑词，配合口语练习效果更佳。距离雅思还有51天，稳扎稳打。";
}

export function BriefingView() {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<EveningBriefingOutput | null>(null);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const aiInsight = generated?.sections?.motivation || fallbackInsight();

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateEveningBriefing({
        completedTasks: BRIEFING_TASKS.filter((item) => item.done).map((item) => item.label),
        pendingTasks: BRIEFING_TASKS.filter((item) => !item.done).map((item) => item.label),
        applicationAlerts: BRIEFING_ALERTS.map((item) => item.text),
        mistakeStats: {
          addedToday: 12,
          masteredToday: 8,
          weakTags: ["GRE代数×5", "雅思推断×4", "GRE几何×3"],
        },
      });
      setGenerated(result);
    } catch {
      setGenerated(null);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendFeishu() {
    setSendStatus("sending");
    window.setTimeout(() => {
      setSendStatus("sent");
      window.setTimeout(() => setSendStatus("idle"), 3000);
    }, 800);
  }

  const progressText = useMemo(() => {
    const done = BRIEFING_TASKS.filter((task) => task.done).length;
    const total = BRIEFING_TASKS.length;
    return `完成 ${done}/${total} · 今日进度 ${Math.round((done / total) * 100)}%`;
  }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: "#FEF3C7", color: "#92400E", padding: "3px 10px", borderRadius: 99 }}>🌅 早报</span>
          <span style={{ fontSize: 11, fontWeight: 600, background: "#EDE9FE", color: "#5B21B6", padding: "3px 10px", borderRadius: 99 }}>🌙 晚报</span>
        </div>
        <span style={{ fontSize: 11, color: "#86868B" }}>{new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 7,
              border: "0.5px solid rgba(99,102,241,0.25)",
              background: "rgba(99,102,241,0.06)",
              color: "#6366F1",
              fontSize: 11,
              fontWeight: 600,
              cursor: generating ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? "生成中..." : "⚡ 立即生成晚报"}
          </button>
          <button
            type="button"
            onClick={handleSendFeishu}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 7,
              border: "none",
              background: sendStatus === "sent" ? "#10B981" : "#6366F1",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
          >
            {sendStatus === "sending" ? "发送中..." : sendStatus === "sent" ? "✓ 已发飞书" : "📤 发送飞书"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.9)",
          borderRadius: 13,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <Section title="今日任务">
          {BRIEFING_TASKS.map((task, idx) => (
            <TaskRow key={idx} label={task.label} tag={task.tag} done={task.done} />
          ))}
          <div style={{ marginTop: 6, fontSize: 11, color: "#86868B" }}>{progressText}</div>
        </Section>

        <Divider />

        <Section title="申请提醒">
          {BRIEFING_ALERTS.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 7,
                marginBottom: 5,
                padding: "5px 8px",
                borderRadius: 8,
                background: item.urgency === "high" ? "rgba(239,68,68,0.05)" : "transparent",
                border: item.urgency === "high" ? "0.5px solid rgba(239,68,68,0.15)" : "none",
              }}
            >
              <span style={{ fontSize: 12 }}>{item.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  color:
                    item.urgency === "high"
                      ? "#DC2626"
                      : item.urgency === "medium"
                        ? "#D97706"
                        : "#86868B",
                }}
              >
                {item.text}
              </span>
            </div>
          ))}
        </Section>

        <Divider />

        <div
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))",
            border: "0.5px solid rgba(99,102,241,0.15)",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", marginBottom: 5 }}>✨ AI 每日洞察</div>
          <div style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.65 }}>{aiInsight}</div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#86868B", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 0.5, background: "rgba(0,0,0,0.06)" }} />;
}

function TaskRow({ label, tag, done }: { label: string; tag: string; done?: boolean }) {
  const color = TAG_COLORS[tag] ?? { bg: "rgba(0,0,0,0.06)", text: "#86868B" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "0.5px solid rgba(0,0,0,0.04)" }}>
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          flexShrink: 0,
          background: done ? "#6366F1" : "transparent",
          border: done ? "none" : "1.5px solid #D1D1D6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done && <span style={{ color: "#fff", fontSize: 9 }}>✓</span>}
      </div>
      <span
        style={{
          fontSize: 12,
          flex: 1,
          color: done ? "#86868B" : "#1a1a2e",
          textDecoration: done ? "line-through" : "none",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          padding: "1px 7px",
          borderRadius: 99,
          fontWeight: 600,
          background: color.bg,
          color: color.text,
        }}
      >
        {tag}
      </span>
    </div>
  );
}
