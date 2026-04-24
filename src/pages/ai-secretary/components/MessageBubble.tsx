import type { CSSProperties } from "react";
import type { Message } from "../types";
import { ToolCallChip } from "./ToolCallChip";

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#C7C7CC",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}

export function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.from === "user";
  const isFeishu = msg.from === "feishu";
  const isAI = msg.from === "ai";

  const bubbleStyle: CSSProperties = isUser
    ? { background: "#6366F1", color: "#fff", borderRadius: "14px 14px 4px 14px" }
    : isFeishu
      ? {
          background: "rgba(22,119,255,0.08)",
          border: "0.5px solid rgba(22,119,255,0.2)",
          color: "#1d4ed8",
          borderRadius: "4px 14px 14px 14px",
        }
      : {
          background: "rgba(255,255,255,0.9)",
          border: "0.5px solid rgba(0,0,0,0.08)",
          color: "#1a1a2e",
          borderRadius: "4px 14px 14px 14px",
        };

  const avatarStyle: CSSProperties = isUser
    ? { background: "rgba(99,102,241,0.15)", color: "#6366F1", fontSize: 11, fontWeight: 700 }
    : isFeishu
      ? { background: "#1677FF", color: "#fff", fontSize: 9 }
      : { background: "linear-gradient(135deg,#6366F1,#8B5CF6)", fontSize: 13 };

  const avatarLabel = isUser ? "我" : isFeishu ? "飞书" : "🤖";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        flexDirection: isUser ? "row-reverse" : "row",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...avatarStyle,
        }}
      >
        {avatarLabel}
      </div>

      <div style={{ maxWidth: "68%" }}>
        {isFeishu && <div style={{ fontSize: 8.5, color: "#60a5fa", marginBottom: 3 }}>🔵 来自飞书</div>}
        <div
          style={{
            padding: "8px 12px",
            fontSize: 12.5,
            lineHeight: 1.65,
            wordBreak: "break-word",
            whiteSpace: "pre-line",
            ...bubbleStyle,
          }}
        >
          {msg.isLoading ? (
            <ThinkingDots />
          ) : (
            <>
              {isAI && msg.toolCall && <ToolCallChip tc={msg.toolCall} />}
              {msg.text}
              {msg.subText && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: isUser ? "rgba(255,255,255,0.7)" : "#86868B",
                  }}
                >
                  {msg.subText}
                </div>
              )}
            </>
          )}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#C7C7CC",
            marginTop: 3,
            padding: "0 2px",
            textAlign: isUser ? "right" : "left",
          }}
        >
          {msg.time}
        </div>
      </div>
    </div>
  );
}
