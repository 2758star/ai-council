import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openExternalUrl } from "@/features/integrations/api";
import {
  hasApiKey,
  setApiKey as setDeepSeekKey,
  summarizeRoundNew,
  detectRepetition,
  analyzeTopicForWorkflow,
  buildWorkflowStepPrompt,
  buildRoundtablePrompt,
  composeMessages,
  compressReply,
  detectArguing,
  evaluateQuota,
  summarizeRound,
} from "./steward";
import type { WorkflowStep } from "./steward";
import { ContextManager } from "./context-manager";
import type { ContextPackage } from "./context-manager";
import { QuotaManager } from "./quota-manager";
import type { ProviderQuota } from "./quota-manager";
import "./ai-council.css";

type ActiveNav = "chat" | "workflow" | "artifacts" | "settings";

type ChatMessage = {
  id: string;
  role: "user" | "ai" | "steward";
  provider?: string;
  content: string;
  round?: number;
  timestamp: number;
};

type ArtifactKind = "decision" | "action_items" | "draft" | "comparison";

type CouncilArtifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  updatedAt: string;
};

type BindingStatus = "connected" | "disconnected" | "error";

type ProviderBinding = {
  provider: string;
  threadUrl: string;
  status: BindingStatus;
};

// ─── Main App ─────────────────────────────────────────────────────

function App() {
  const [activeNav, setActiveNav] = useState<ActiveNav>("chat");

  // 通用状态
  const [topic, setTopic] = useState("");
  const [stewardApiKey, setStewardApiKey] = useState(
    () => localStorage.getItem("standalone_ai_council_deepseek_key") || ""
  );
  const [notice, setNotice] = useState("");
  const [stewardStatus, setStewardStatus] = useState<string>("idle");

  // 群聊状态
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isRoundRunning, setIsRoundRunning] = useState(false);
  const [previousReplies, setPreviousReplies] = useState<Record<string, string>>({});
  const [polishPreview, setPolishPreview] = useState("");

  // 工作流状态
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [workflowOutputs, setWorkflowOutputs] = useState<Record<number, string>>({});
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<"auto" | "step">("step");
  const [workflowRetry, setWorkflowRetry] = useState(0);
  const [workflowStatus, setWorkflowStatus] = useState<"idle" | "running" | "paused" | "done">("idle");

  // 产物状态
  const [artifacts, setArtifacts] = useState<CouncilArtifact[]>([]);

  // 线程绑定
  const [bindings, setBindings] = useState<ProviderBinding[]>(() => {
    try {
      const raw = localStorage.getItem("ai_council_bindings");
      return raw ? JSON.parse(raw) : providers.map(p => ({ provider: p, threadUrl: "", status: "disconnected" as BindingStatus }));
    } catch {
      return providers.map(p => ({ provider: p, threadUrl: "", status: "disconnected" as BindingStatus }));
    }
  });

  function updateBinding(provider: string, threadUrl: string) {
    setBindings(prev => {
      const next = prev.map(b => b.provider === provider ? { ...b, threadUrl } : b);
      localStorage.setItem("ai_council_bindings", JSON.stringify(next));
      return next;
    });
    // 通知 Rust 后端
    invoke("set_thread_url", { provider, url: threadUrl }).catch(() => {});
  }

  // 定时拉取连接状态
  useEffect(() => {
    async function refreshStatus() {
      try {
        const statuses = await invoke<{ provider: string; connected: boolean }[]>("get_provider_status");
        if (statuses && statuses.length > 0) {
          setBindings(prev => {
            const statusMap = new Map(statuses.map(s => [s.provider, s.connected]));
            return prev.map(b => ({
              ...b,
              status: statusMap.has(b.provider)
                ? (statusMap.get(b.provider) ? "connected" as BindingStatus : "error" as BindingStatus)
                : b.status,
            }));
          });
        }
      } catch { /* bridge not ready yet */ }
    }
    refreshStatus();
    const t = setInterval(refreshStatus, 5000);
    return () => clearInterval(t);
  }, []);

  // 额度管理器
  const quotaManager = useRef(new QuotaManager());
  const contextManager = useRef(new ContextManager());

  const providers = ["chatgpt", "claude", "gemini"];

  // ─── 群聊逻辑 ─────────────────────────────────────────────────

  function addChatMessage(msg: Omit<ChatMessage, "id" | "timestamp">) {
    setChatMessages(prev => [
      ...prev,
      { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
    ]);
  }

  async function runChatRound(userMessage: string) {
    if (!topic) { setNotice("请先输入讨论主题"); return; }
    setIsRoundRunning(true);
    setStewardStatus("running");
    const round = currentRound + 1;
    setCurrentRound(round);

    addChatMessage({ role: "user", content: userMessage, round });

    const contextPkg = contextManager.current.buildContextPackage();
    const replies: Record<string, string> = {};

    for (const provider of providers) {
      const prompt = buildRoundtablePrompt(topic, provider, round, contextPkg, userMessage);
      try {
        const requestId = `${Date.now()}-${provider}-${round}`;
        await invoke("send_to_provider", { provider, text: prompt, requestId });
        quotaManager.current.recordSend(provider);

        const reply = await invoke<string>("read_from_provider", {
          provider,
          requestId: `${requestId}-read`,
        });
        replies[provider] = reply;
        quotaManager.current.recordSuccess(provider);
        addChatMessage({ role: "ai", provider, content: reply, round });
        await sleep(1000 + Math.random() * 1000);
      } catch (err) {
        quotaManager.current.recordError(provider, String(err));
        addChatMessage({ role: "steward", content: `${provider} 出错：${err}`, round });
      }
    }

    // 管家总结
    if (stewardApiKey) {
      try {
        setStewardStatus("summarizing");
        const summary = await summarizeRoundNew(round, topic, replies, stewardApiKey);
        contextManager.current.addRound(round, replies);
        contextManager.current.addStewardSummary(round, summary);
        addChatMessage({ role: "steward", content: summary, round });
      } catch { /* ignore steward errors */ }
    }

    // 车轱辘检测
    const repeated = detectRepetition(replies, previousReplies);
    if (repeated.length > 0) {
      setNotice(`管家提醒：${repeated.join("、")} 在重复之前的观点，建议换个角度`);
      setTimeout(() => setNotice(""), 8000);
    }

    setPreviousReplies(replies);
    setIsRoundRunning(false);
    setStewardStatus("idle");
  }

  // ─── 管家润色 ─────────────────────────────────────────────────

  async function polishUserInput(text: string) {
    if (!stewardApiKey || !text.trim()) return;
    setStewardStatus("polishing");
    try {
      const result = await composeMessages({
        topic: topic || "通用讨论",
        userMessage: `请润色以下用户输入，使其更清晰明确：${text}`,
        currentRound: currentRound + 1,
        members: providers,
        latestReplies: {},
        quotaStatus: {},
      });
      setPolishPreview(result.messages?.["chatgpt"] || "");
    } catch { /* ignore */ }
    setStewardStatus("idle");
  }

  // ─── 工作流逻辑 ───────────────────────────────────────────────

  async function initWorkflow() {
    if (!topic) { setNotice("请先输入议题"); return; }
    if (!stewardApiKey) { setNotice("请先设置 DeepSeek API Key"); return; }
    setStewardStatus("analyzing");
    try {
      const steps = await analyzeTopicForWorkflow(topic, stewardApiKey);
      setWorkflowSteps(steps);
      setWorkflowOutputs({});
      setCurrentWorkflowStep(0);
      setWorkflowStatus("idle");
      setWorkflowRetry(0);
    } catch {
      setNotice("工作流分析失败");
    }
    setStewardStatus("idle");
  }

  async function runWorkflowStep(stepIdx: number) {
    const step = workflowSteps[stepIdx];
    if (!step) { setWorkflowStatus("done"); return; }

    setCurrentWorkflowStep(stepIdx);
    setWorkflowRunning(true);
    setWorkflowStatus("running");

    const prompt = buildWorkflowStepPrompt(topic, step, workflowOutputs);

    try {
      const requestId = `${Date.now()}-${step.provider}-wf-${stepIdx}`;
      await invoke("send_to_provider", { provider: step.provider, text: prompt, requestId });
      quotaManager.current.recordSend(step.provider);
      const reply = await invoke<string>("read_from_provider", {
        provider: step.provider,
        requestId: `${requestId}-read`,
      });
      quotaManager.current.recordSuccess(step.provider);

      // 最后一步检查是否通过
      if (stepIdx === workflowSteps.length - 1) {
        const approved = reply.includes("通过") || reply.includes("approve") || reply.includes("合格");
        if (!approved && workflowRetry < 2) {
          setWorkflowRetry(r => r + 1);
          setWorkflowOutputs(prev => ({ ...prev, [stepIdx]: reply }));
          if (workflowMode === "auto") {
            setWorkflowRunning(false);
            await sleep(1000);
            await runWorkflowStep(stepIdx - 1);
          } else {
            setWorkflowRunning(false);
            setWorkflowStatus("paused");
          }
          return;
        }
      }

      setWorkflowOutputs(prev => ({ ...prev, [stepIdx]: reply }));
      setWorkflowRunning(false);

      if (workflowMode === "auto") {
        await sleep(1000);
        await runWorkflowStep(stepIdx + 1);
      } else {
        setWorkflowStatus("paused");
      }
    } catch (err) {
      quotaManager.current.recordError(step.provider, String(err));
      setWorkflowRunning(false);
      setWorkflowStatus("paused");
      setNotice(`${step.provider} 出错：${err}`);
    }
  }

  function saveAsArtifact(kind: ArtifactKind, title: string, content: string) {
    setArtifacts(prev => [
      ...prev,
      { id: `${Date.now()}`, kind, title, content, updatedAt: new Date().toISOString() },
    ]);
  }

  // ─── UI ────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg, #FFFDF7)" }}>
      <LeftNav activeNav={activeNav} onSelect={setActiveNav} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopStatusBar
          quotaManager={quotaManager.current}
          stewardStatus={stewardStatus}
          notice={notice}
          onDismissNotice={() => setNotice("")}
        />

        {activeNav === "chat" && (
          <ChatPage
            topic={topic}
            setTopic={setTopic}
            chatMessages={chatMessages}
            isRoundRunning={isRoundRunning}
            polishPreview={polishPreview}
            stewardApiKey={stewardApiKey}
            stewardStatus={stewardStatus}
            onSend={runChatRound}
            onPolish={polishUserInput}
            onClearPolish={() => setPolishPreview("")}
          />
        )}

        {activeNav === "workflow" && (
          <WorkflowPage
            topic={topic}
            setTopic={setTopic}
            workflowSteps={workflowSteps}
            workflowOutputs={workflowOutputs}
            currentWorkflowStep={currentWorkflowStep}
            workflowRunning={workflowRunning}
            workflowMode={workflowMode}
            workflowStatus={workflowStatus}
            workflowRetry={workflowRetry}
            stewardApiKey={stewardApiKey}
            onInitWorkflow={initWorkflow}
            onRunStep={runWorkflowStep}
            onSetMode={setWorkflowMode}
            onSaveArtifact={saveAsArtifact}
            onContinue={() => {
              if (workflowStatus === "paused") runWorkflowStep(currentWorkflowStep + 1);
            }}
            onRetryStep={() => runWorkflowStep(currentWorkflowStep)}
            onEditOutput={(stepIdx, value) => setWorkflowOutputs(prev => ({ ...prev, [stepIdx]: value }))}
          />
        )}

        {activeNav === "artifacts" && (
          <ArtifactsPage artifacts={artifacts} />
        )}

        {activeNav === "settings" && (
          <SettingsPage
            stewardApiKey={stewardApiKey}
            onSetApiKey={(k) => { setStewardApiKey(k); setDeepSeekKey(k); }}
            quotaManager={quotaManager.current}
            bindings={bindings}
            onUpdateBinding={updateBinding}
          />
        )}
      </div>
    </div>
  );
}

// ─── LeftNav ──────────────────────────────────────────────────────

function LeftNav({ activeNav, onSelect }: {
  activeNav: ActiveNav;
  onSelect: (nav: ActiveNav) => void;
}) {
  const items: { id: ActiveNav; label: string; icon: string; color: string }[] = [
    { id: "chat", label: "群聊", icon: "💬", color: "#10B981" },
    { id: "workflow", label: "工作流", icon: "🔗", color: "#8B5CF6" },
    { id: "artifacts", label: "产物", icon: "📦", color: "#3B82F6" },
    { id: "settings", label: "设置", icon: "⚙️", color: "#6B7280" },
  ];

  return (
    <nav className="left-nav">
      {items.map(item => (
        <button
          key={item.id}
          className={`left-nav-btn ${activeNav === item.id ? "active" : ""}`}
          style={activeNav === item.id ? { background: item.color, color: "#fff" } : {}}
          onClick={() => onSelect(item.id)}
          title={item.label}
        >
          <span className="left-nav-icon">{item.icon}</span>
          <span className="left-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── TopStatusBar ─────────────────────────────────────────────────

function TopStatusBar({ quotaManager, stewardStatus, notice, onDismissNotice }: {
  quotaManager: QuotaManager;
  stewardStatus: string;
  notice: string;
  onDismissNotice: () => void;
}) {
  const [quotas, setQuotas] = useState<ProviderQuota[]>([]);

  useEffect(() => {
    const t = setInterval(() => setQuotas(quotaManager.getAll()), 3000);
    setQuotas(quotaManager.getAll());
    return () => clearInterval(t);
  }, [quotaManager]);

  const statusLabels: Record<string, string> = {
    idle: "空闲", running: "思考中", summarizing: "总结中", polishing: "润色中", analyzing: "分析中",
  };

  return (
    <div className="top-status-bar">
      <div className="quota-bars">
        {quotas.map(q => {
          const remaining = quotaManager.getEstimatedRemaining(q.provider);
          const pct = Math.min(100, (q.sentCount / q.estimatedLimit) * 100);
          const dotColor = q.state === "limited" || q.state === "cooldown" ? "#EF4444"
            : remaining < q.estimatedLimit * 0.2 ? "#F59E0B" : "#10B981";
          return (
            <div key={q.provider} className="quota-item">
              <span className="quota-dot" style={{ background: dotColor }} />
              <span className="quota-name">{q.provider}</span>
              <div className="quota-bar">
                <div className={`quota-bar-fill ${pct > 80 ? "red" : pct > 50 ? "yellow" : "green"}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <span className="quota-count">{remaining}</span>
            </div>
          );
        })}
      </div>

      <div className="status-center">
        <span className={`steward-status steward-${stewardStatus}`}>
          管家：{statusLabels[stewardStatus] || stewardStatus}
        </span>
      </div>

      <div className="status-right">
        {notice && (
          <div className="notice-banner" onClick={onDismissNotice}>
            {notice}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ChatPage ─────────────────────────────────────────────────────

function ChatPage({ topic, setTopic, chatMessages, isRoundRunning, polishPreview, stewardApiKey, stewardStatus, onSend, onPolish, onClearPolish }: {
  topic: string;
  setTopic: (t: string) => void;
  chatMessages: ChatMessage[];
  isRoundRunning: boolean;
  polishPreview: string;
  stewardApiKey: string;
  stewardStatus: string;
  onSend: (text: string) => void;
  onPolish: (text: string) => void;
  onClearPolish: () => void;
}) {
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleSend() {
    const text = polishPreview || input;
    if (!text.trim() || isRoundRunning) return;
    onSend(text.trim());
    setInput("");
    onClearPolish();
  }

  return (
    <div className="page-content chat-page">
      <div className="chat-header">
        <input
          className="topic-input"
          placeholder="输入讨论主题..."
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
      </div>

      <div className="message-stream">
        {chatMessages.map(msg => (
          <div key={msg.id} className={`message-wrapper ${msg.role === "user" ? "msg-right" : msg.role === "steward" ? "msg-center" : "msg-left"}`}>
            {msg.role === "user" && <div className="bubble-user">{msg.content}</div>}
            {msg.role === "ai" && (
              <div className={`bubble-ai ${msg.provider}`}>
                <div className="bubble-provider">{msg.provider}</div>
                <div>{msg.content}</div>
              </div>
            )}
            {msg.role === "steward" && (
              <div className="bubble-steward">
                <span className="steward-label">管家摘要 · 第{msg.round}轮</span>
                <div>{msg.content}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-area">
        {polishPreview && (
          <div className="polish-preview">
            <div className="polish-header">
              <span>管家润色预览</span>
              <button onClick={onClearPolish}>✕</button>
            </div>
            <div className="polish-content">{polishPreview}</div>
          </div>
        )}
        <div className="input-row">
          <input
            className="chat-input"
            placeholder={isRoundRunning ? "等待回复中..." : "输入消息..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={isRoundRunning}
          />
          {stewardApiKey && (
            <button className="btn-secondary" onClick={() => onPolish(input)} disabled={isRoundRunning || !input.trim()}>
              润色
            </button>
          )}
          <button className="btn-primary" onClick={handleSend} disabled={isRoundRunning}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WorkflowPage ─────────────────────────────────────────────────

function WorkflowPage({ topic, setTopic, workflowSteps, workflowOutputs, currentWorkflowStep, workflowRunning, workflowMode, workflowStatus, workflowRetry, stewardApiKey, onInitWorkflow, onRunStep, onSetMode, onSaveArtifact, onContinue, onRetryStep, onEditOutput }: {
  topic: string;
  setTopic: (t: string) => void;
  workflowSteps: WorkflowStep[];
  workflowOutputs: Record<number, string>;
  currentWorkflowStep: number;
  workflowRunning: boolean;
  workflowMode: "auto" | "step";
  workflowStatus: string;
  workflowRetry: number;
  stewardApiKey: string;
  onInitWorkflow: () => void;
  onRunStep: (idx: number) => void;
  onSetMode: (mode: "auto" | "step") => void;
  onSaveArtifact: (kind: ArtifactKind, title: string, content: string) => void;
  onContinue: () => void;
  onRetryStep: () => void;
  onEditOutput: (stepIdx: number, value: string) => void;
}) {
  return (
    <div className="page-content workflow-page">
      <div className="workflow-header">
        <input
          className="topic-input"
          placeholder="输入议题..."
          value={topic}
          onChange={e => setTopic(e.target.value)}
        />
        <button className="btn-primary" onClick={onInitWorkflow} disabled={!topic || !stewardApiKey}>
          分析议题
        </button>
      </div>

      {workflowSteps.length > 0 && (
        <div className="workflow-content">
          <div className="workflow-progress">
            {workflowSteps.map((step, idx) => {
              const done = workflowOutputs[idx] != null;
              const current = idx === currentWorkflowStep && workflowStatus === "running";
              const pending = !done && !current;
              return (
                <div key={idx} className="workflow-step-indicator">
                  <div className={`workflow-dot ${done ? "done" : current ? "current" : "pending"}`}>
                    {done ? "✓" : step.step}
                  </div>
                  <div className="workflow-step-info">
                    <span className="workflow-step-provider">{step.provider}</span>
                    <span className="workflow-step-name">{step.name}</span>
                  </div>
                  {done && (
                    <div className="workflow-step-actions">
                      <button className="btn-sm" onClick={() => onSaveArtifact("draft", `${step.name}`, workflowOutputs[idx])}>保存</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="workflow-main">
            {workflowOutputs[currentWorkflowStep] != null && (
              <textarea
                className="workflow-output"
                value={workflowOutputs[currentWorkflowStep] || ""}
                onChange={e => onEditOutput(currentWorkflowStep, e.target.value)}
              />
            )}
            {workflowOutputs[currentWorkflowStep] == null && workflowStatus !== "running" && (
              <div className="workflow-placeholder">
                {workflowStatus === "idle" ? "点击下方「开始」执行第一步" :
                 workflowStatus === "done" ? "工作流已完成" : "等待执行..."}
              </div>
            )}
            {workflowStatus === "running" && (
              <div className="workflow-loading">正在执行第 {currentWorkflowStep + 1} 步...</div>
            )}
          </div>
        </div>
      )}

      <div className="workflow-controls">
        <div className="workflow-mode">
          <button className={`btn-sm ${workflowMode === "auto" ? "btn-active" : ""}`} onClick={() => onSetMode("auto")}>自动</button>
          <button className={`btn-sm ${workflowMode === "step" ? "btn-active" : ""}`} onClick={() => onSetMode("step")}>逐步</button>
        </div>
        <div className="workflow-actions">
          {workflowStatus === "idle" && workflowSteps.length > 0 && (
            <button className="btn-primary" onClick={() => onRunStep(0)}>开始</button>
          )}
          {workflowStatus === "paused" && currentWorkflowStep < workflowSteps.length - 1 && (
            <button className="btn-primary" onClick={onContinue}>继续</button>
          )}
          {workflowStatus === "paused" && (
            <button className="btn-secondary" onClick={onRetryStep}>重跑此步</button>
          )}
          {workflowStatus === "done" && (
            <span className="workflow-done-label">全部完成 ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ArtifactsPage ────────────────────────────────────────────────

function ArtifactsPage({ artifacts }: { artifacts: CouncilArtifact[] }) {
  return (
    <div className="page-content artifacts-page">
      <h3 className="page-title">产物</h3>
      {artifacts.length === 0 && <p className="empty-hint">暂无产物，在工作流中保存的输出会出现在这里。</p>}
      {artifacts.map(a => (
        <div key={a.id} className="card artifact-card">
          <div className="artifact-header">
            <span className="artifact-kind">{a.kind}</span>
            <span className="artifact-title">{a.title}</span>
            <span className="artifact-time">{new Date(a.updatedAt).toLocaleString()}</span>
          </div>
          <div className="artifact-content">{a.content}</div>
          <button className="btn-sm" onClick={() => navigator.clipboard.writeText(a.content)}>
            复制
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────

function SettingsPage({ stewardApiKey, onSetApiKey, quotaManager, bindings, onUpdateBinding }: {
  stewardApiKey: string;
  onSetApiKey: (key: string) => void;
  quotaManager: QuotaManager;
  bindings: ProviderBinding[];
  onUpdateBinding: (provider: string, url: string) => void;
}) {
  const [providers, setProviders] = useState<ProviderQuota[]>([]);
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setInterval(() => setProviders(quotaManager.getAll()), 3000);
    setProviders(quotaManager.getAll());
    return () => clearInterval(t);
  }, [quotaManager]);

  useEffect(() => {
    const map: Record<string, string> = {};
    bindings.forEach(b => { map[b.provider] = b.threadUrl; });
    setEditingUrls(prev => ({ ...map, ...prev }));
  }, [bindings]);

  const providerLabels: Record<string, string> = {
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
  };

  const providerPlaceholders: Record<string, string> = {
    chatgpt: "https://chatgpt.com/c/xxx",
    claude: "https://claude.ai/chat/xxx",
    gemini: "https://gemini.google.com/app/xxx",
  };

  const statusDot = (status: BindingStatus) => {
    const colors: Record<BindingStatus, string> = {
      connected: "#10B981",
      disconnected: "#9CA3AF",
      error: "#EF4444",
    };
    return (
      <span
        className="binding-dot"
        style={{ background: colors[status] }}
        title={status === "connected" ? "已连接" : status === "error" ? "错误" : "未连接"}
      />
    );
  };

  return (
    <div className="page-content settings-page">
      <h3 className="page-title">设置</h3>

      {/* 成员线程配置 — 最重要，放在最顶部 */}
      <div className="card binding-card">
        <h4>成员线程配置</h4>
        <p className="binding-hint">配置各 AI 的对话线程 URL，应用通过浏览器桥接脚本与这些页面通信。</p>
        {bindings.map(b => (
          <div key={b.provider} className="binding-row">
            <div className="binding-provider">
              {statusDot(b.status)}
              <span className="binding-provider-name">{providerLabels[b.provider] || b.provider}</span>
              <span className="binding-status-text">
                {b.status === "connected" ? "已连接" : b.status === "error" ? "错误" : "未连接"}
              </span>
            </div>
            <input
              className="binding-input"
              type="text"
              placeholder={providerPlaceholders[b.provider] || `https://${b.provider}.com/...`}
              value={editingUrls[b.provider] ?? b.threadUrl}
              onChange={e => setEditingUrls(prev => ({ ...prev, [b.provider]: e.target.value }))}
              onBlur={() => onUpdateBinding(b.provider, editingUrls[b.provider] ?? b.threadUrl)}
            />
            <button
              className="btn-sm"
              onClick={() => onUpdateBinding(b.provider, editingUrls[b.provider] ?? b.threadUrl)}
            >
              保存
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h4>DeepSeek API Key</h4>
        <input
          className="setting-input"
          type="password"
          placeholder="sk-..."
          value={stewardApiKey}
          onChange={e => onSetApiKey(e.target.value)}
        />
      </div>

      <div className="card">
        <h4>成员额度状态</h4>
        {providers.map(p => (
          <div key={p.provider} className="provider-status-row">
            <span className="provider-name">{p.provider}</span>
            <span className={`provider-state state-${p.state}`}>{p.state}</span>
            <span>{quotaManager.getEstimatedRemaining(p.provider)} 剩余</span>
          </div>
        ))}
        {providers.length === 0 && <p className="empty-hint">暂无连接。请打开 ChatGPT / Claude / Gemini 页面并安装油猴脚本。</p>}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Mount ────────────────────────────────────────────────────────

createRoot(document.getElementById("root")!).render(<App />);
