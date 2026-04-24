import type { HistItem } from "../types";

interface Props {
  history: { section: string; items: HistItem[] }[];
  activeId: number;
  onSelect: (item: HistItem) => void;
}

export function HistoryList({ history, activeId, onSelect }: Props) {
  return (
    <div
      style={{
        width: 192,
        flexShrink: 0,
        borderRight: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.6)",
      }}
    >
      <div
        style={{
          padding: "14px 12px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "0.5px solid rgba(0,0,0,0.06)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>历史记录</span>
        <button
          type="button"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: "rgba(99,102,241,0.1)",
            border: "none",
            color: "#6366F1",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            lineHeight: 1,
            fontFamily: "inherit",
          }}
        >
          +
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
        {history.map(({ section, items }) => (
          <div key={section}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#C7C7CC",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "6px 6px 3px",
              }}
            >
              {section}
            </div>

            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 8,
                    padding: "7px 9px",
                    cursor: "pointer",
                    marginBottom: 2,
                    background: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                    border: `0.5px solid ${isActive ? "rgba(99,102,241,0.2)" : "transparent"}`,
                    transition: "background 0.12s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          item.type === "briefing"
                            ? item.briefingType === "morning"
                              ? "#F59E0B"
                              : "#6366F1"
                            : "#D1D1D6",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: isActive ? "#6366F1" : "#1a1a2e",
                      }}
                    >
                      {item.title}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 9.5,
                      color: "#86868B",
                      paddingLeft: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.preview}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, paddingLeft: 12 }}>
                    <span style={{ fontSize: 9, color: "#C7C7CC" }}>{item.time}</span>
                    {item.fromFeishu && (
                      <span
                        style={{
                          fontSize: 8,
                          padding: "1px 5px",
                          borderRadius: 99,
                          background: "rgba(22,119,255,0.08)",
                          color: "#1677FF",
                        }}
                      >
                        飞书
                      </span>
                    )}
                    {item.type === "briefing" && item.sent && (
                      <span
                        style={{
                          fontSize: 8,
                          padding: "1px 5px",
                          borderRadius: 99,
                          background: "rgba(16,185,129,0.08)",
                          color: "#065F46",
                        }}
                      >
                        已发
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
