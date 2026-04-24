import type { CSSProperties, ReactNode } from "react";

interface Props {
  onGoToBriefing: () => void;
}

const TOOLS = [
  "get_today_tasks",
  "add_task",
  "complete_task",
  "log_study_session",
  "get_study_stats",
  "adjust_plan",
  "get_mistakes_summary",
  "get_application_status",
  "send_briefing",
];

export function RightPanel({ onGoToBriefing }: Props) {
  return (
    <div
      style={{
        width: 180,
        flexShrink: 0,
        borderLeft: "0.5px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.5)",
      }}
    >
      <div
        style={{
          padding: "10px 12px 7px",
          fontSize: 9.5,
          fontWeight: 600,
          color: "#86868B",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          borderBottom: "0.5px solid rgba(0,0,0,0.05)",
        }}
      >
        系统状态
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        <Card title="今日进度">
          <StatRow label="任务完成" value="3/5" color="#10B981" />
          <Bar fill={60} color="#10B981" />
          <StatRow label="综合正确率" value="68%" color="#F59E0B" style={{ marginTop: 5 }} />
          <Bar fill={68} color="#F59E0B" />
        </Card>

        <Card title="简报推送">
          <StatRow label="今日早报" value="✓ 已发" color="#10B981" />
          <StatRow label="今日晚报" value="待生成" color="#F59E0B" />
          <StatRow label="连续推送" value="7天" color="#6366F1" />
          <button
            type="button"
            onClick={onGoToBriefing}
            style={{
              width: "100%",
              marginTop: 7,
              height: 26,
              borderRadius: 7,
              border: "none",
              background: "rgba(99,102,241,0.1)",
              color: "#6366F1",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            立即生成晚报 →
          </button>
        </Card>

        <Card title="考试倒计时">
          <StatRow label="🇬🇧 雅思" value="51天" color="#EF4444" />
          <StatRow label="📝 GRE" value="95天" color="#F59E0B" />
        </Card>

        <Card title="单向推送">
          <StatRow label="状态" value="● 已启用" color="#10B981" />
          <StatRow label="通道" value="Webhook" color="#6366F1" />
          <StatRow label="今日推送" value="3条" color="#1a1a2e" />
        </Card>

        <Card title="主动提醒">
          <div style={{ fontSize: 10, color: "#DC2626", lineHeight: 1.8 }}>⚠️ MIT截止6天</div>
          <div style={{ fontSize: 10, color: "#D97706", lineHeight: 1.8 }}>📉 GRE填空连续2天低于65%</div>
          <div style={{ fontSize: 10, color: "#86868B", lineHeight: 1.8 }}>📚 错题6题待复习</div>
        </Card>

        <Card title="可用工具">
          {TOOLS.map((tool) => (
            <div key={tool} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 3px" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: "#86868B" }}>{tool}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 9,
        padding: "8px 9px",
        marginBottom: 6,
        background: "rgba(255,255,255,0.7)",
        border: "0.5px solid rgba(255,255,255,0.9)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 9.5, fontWeight: 600, color: "#86868B", marginBottom: 5 }}>{title}</div>
      {children}
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
  style,
}: {
  label: string;
  value: string;
  color: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, ...style }}>
      <span style={{ fontSize: 9.5, color: "#86868B" }}>{label}</span>
      <span style={{ fontSize: 9.5, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function Bar({ fill, color }: { fill: number; color: string }) {
  return (
    <div
      style={{
        height: 3,
        borderRadius: 99,
        background: "rgba(0,0,0,0.06)",
        overflow: "hidden",
        marginTop: 3,
      }}
    >
      <div style={{ height: "100%", width: `${fill}%`, borderRadius: 99, background: color }} />
    </div>
  );
}
