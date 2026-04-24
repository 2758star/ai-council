import type { ToolCallRecord } from "../types";

export function ToolCallChip({ tc }: { tc: ToolCallRecord }) {
  return (
    <div
      style={{
        background: "rgba(99,102,241,0.08)",
        border: "0.5px solid rgba(99,102,241,0.2)",
        borderRadius: 8,
        padding: "5px 9px",
        marginBottom: 6,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: 11 }}>🔧</span>
      <span style={{ fontSize: 10, color: "#6366F1", flex: 1 }}>
        {tc.tool} · {tc.desc}
      </span>
      <span style={{ fontSize: 9.5, color: "#8B5CF6", fontWeight: 600 }}>{tc.result}</span>
    </div>
  );
}
