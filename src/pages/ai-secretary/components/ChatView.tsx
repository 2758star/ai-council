import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";
import { SHORTCUTS } from "../mock-data";

interface Props {
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: (text?: string) => void;
  isThinking: boolean;
}

export function ChatView({ messages, input, onInputChange, onSend, isThinking }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
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
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={endRef} />
      </div>

      <div
        style={{
          padding: "6px 16px",
          display: "flex",
          gap: 5,
          overflowX: "auto",
          flexShrink: 0,
          borderTop: "0.5px solid rgba(0,0,0,0.04)",
        }}
      >
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut}
            type="button"
            onClick={() => onSend(shortcut.replace(/^.{2}/, "").trim())}
            style={{
              height: 25,
              padding: "0 10px",
              borderRadius: 99,
              whiteSpace: "nowrap",
              border: "0.5px solid rgba(0,0,0,0.1)",
              background: "rgba(255,255,255,0.7)",
              color: "#86868B",
              fontSize: 10.5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {shortcut}
          </button>
        ))}
      </div>

      <div style={{ padding: "8px 14px 14px", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            background: "rgba(255,255,255,0.9)",
            border: "0.5px solid rgba(0,0,0,0.1)",
            borderRadius: 14,
            padding: "8px 12px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={isThinking ? "AI 正在思考中..." : "发消息给AI秘书，或直接在飞书说话..."}
            disabled={isThinking}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "#1a1a2e",
              fontFamily: "inherit",
              resize: "none",
              minHeight: 20,
              maxHeight: 80,
              lineHeight: 1.5,
              opacity: isThinking ? 0.5 : 1,
            }}
          />
          <button
            type="button"
            onClick={() => onSend()}
            disabled={!input.trim() || isThinking}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: input.trim() && !isThinking ? "#6366F1" : "rgba(0,0,0,0.08)",
              border: "none",
              cursor: input.trim() && !isThinking ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M12 7L2 2l2.5 5L2 12l10-5z" fill={input.trim() && !isThinking ? "#fff" : "#C7C7CC"} />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
