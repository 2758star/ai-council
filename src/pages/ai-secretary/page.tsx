import { useState } from "react";
import type { MainTab, HistItem, Message } from "./types";
import { HistoryList } from "./components/HistoryList";
import { ChatView } from "./components/ChatView";
import { BriefingView } from "./components/BriefingView";
import { RightPanel } from "./components/RightPanel";
import { INIT_MESSAGES, MOCK_HISTORY } from "./mock-data";
import { runSecretaryChat } from "@/features/ai/secretary";

export function AISecretaryPage() {
  const [tab, setTab] = useState<MainTab>("chat");
  const [activeHistId, setActiveHistId] = useState<number>(2);
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [feishuConnected] = useState(true);

  function handleHistClick(item: HistItem) {
    setActiveHistId(item.id);
    setTab(item.type === "briefing" ? "briefing" : "chat");
  }

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isThinking) return;

    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: Date.now(),
      from: "user",
      text: content,
      time: now,
    };

    const loadingMsg: Message = {
      id: Date.now() + 1,
      from: "ai",
      text: "",
      time: "",
      isLoading: true,
    };

    const nextHistory = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const result = await runSecretaryChat(nextHistory);
      setMessages((prev) =>
        prev
          .filter((item) => !item.isLoading)
          .concat({
            id: Date.now() + 2,
            from: "ai",
            text: result.text,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            toolCall: result.toolCall,
            subText: result.subText,
          }),
      );
    } catch {
      setMessages((prev) =>
        prev
          .filter((item) => !item.isLoading)
          .concat({
            id: Date.now() + 2,
            from: "ai",
            text: "抱歉，出错了，请重试。",
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          }),
      );
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "#F5F5F7",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif",
        overflow: "hidden",
      }}
    >
      <HistoryList history={MOCK_HISTORY} activeId={activeHistId} onSelect={handleHistClick} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar tab={tab} onTabChange={setTab} feishuConnected={feishuConnected} />

        {tab === "chat" && (
          <ChatView
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            isThinking={isThinking}
          />
        )}

        {tab === "briefing" && <BriefingView />}
      </div>

      <RightPanel onGoToBriefing={() => setTab("briefing")} />
    </div>
  );
}

export default AISecretaryPage;

function TopBar({
  tab,
  onTabChange,
  feishuConnected,
}: {
  tab: MainTab;
  onTabChange: (tab: MainTab) => void;
  feishuConnected: boolean;
}) {
  return (
    <div
      style={{
        height: 48,
        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
        flexShrink: 0,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        🤖
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>AI 秘书</div>
        <div style={{ fontSize: 9.5, color: "#86868B" }}>Gemini 2.0 Flash · 可读写系统数据</div>
      </div>

      <div
        style={{
          display: "flex",
          background: "rgba(0,0,0,0.06)",
          borderRadius: 8,
          padding: 3,
          marginLeft: 8,
        }}
      >
        {([
          ["chat", "💬 AI 对话"],
          ["briefing", "📋 简报中心"],
        ] as [MainTab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            style={{
              height: 26,
              padding: "0 12px",
              borderRadius: 6,
              border: "none",
              background: tab === value ? "#fff" : "transparent",
              color: tab === value ? "#6366F1" : "#86868B",
              fontSize: 11,
              fontWeight: tab === value ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: tab === value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ marginLeft: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: feishuConnected ? "rgba(16,185,129,0.08)" : "rgba(0,0,0,0.05)",
            border: `0.5px solid ${feishuConnected ? "rgba(16,185,129,0.2)" : "rgba(0,0,0,0.1)"}`,
            borderRadius: 99,
            padding: "3px 10px",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: feishuConnected ? "#10B981" : "#D1D1D6",
            }}
          />
          <span style={{ fontSize: 10, color: feishuConnected ? "#059669" : "#86868B", fontWeight: 500 }}>
            {feishuConnected ? "飞书已连接" : "飞书未连接"}
          </span>
        </div>
      </div>
    </div>
  );
}
