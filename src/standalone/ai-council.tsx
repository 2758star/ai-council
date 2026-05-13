import { createRoot } from "react-dom/client";
import { Bot, Globe2, Layers3, LoaderCircle, MessageSquareMore, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { openExternalUrl, readWebSessionMessage, sendWebSessionMessage } from "@/features/integrations/api";
import "./ai-council.css";

type Mode = "api" | "web";

type ProviderRecord = {
  id: string;
  family?: string;
  configured?: boolean;
  defaultModel?: string;
};

type Participant = {
  provider: string;
  label: string;
  model: string;
  stancePrompt: string;
  enabled: boolean;
  configured: boolean;
};

type TranscriptEntry = {
  id?: string;
  round: number;
  speaker: string;
  provider: string;
  model?: string;
  content: string;
  state?: "active" | "withdrawn" | "rejected";
  stateNote?: string;
};

type SummaryResult =
  | { ok: true; provider: string; model: string; text: string }
  | { ok: false; provider: string; model: string | null; message: string }
  | null;

type LocalCouncilSummary = {
  consensus: string[];
  tensions: string[];
  nextActions: string[];
};

type ArtifactKind = "decision" | "action_items" | "draft" | "comparison";

type CouncilArtifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  updatedAt: string;
};

type FinalDraftStatus = "candidate" | "accepted" | "rejected" | "superseded";

type FinalDraftRecord = {
  id: string;
  sourceEntryId?: string;
  provider: WebBinding["provider"];
  speaker: string;
  round: number;
  content: string;
  status: FinalDraftStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

type DiscussionStage = "brief" | "react" | "revise" | "final";

type RoundStatus = {
  round: number;
  stage: DiscussionStage;
  expected: number;
  completed: number;
  skipped: number;
  mentionUsed: number;
  mentionLimit: number;
  mentionEvents: string[];
  mentionBlocked: string[];
  status: "waiting" | "running" | "done" | "partial";
  updatedAt: string;
};

type StewardDraft = {
  stage: DiscussionStage;
  messages: Record<string, string>;
  skipped: string[];
  summary: string;
};

type StewardQuality = {
  hasProgress: boolean;
  isArguing: boolean;
  summary: string;
  suggestion: string;
};

type StewardMentionDecision = {
  ok: boolean;
  mode: "full" | "summary" | "blocked";
  reason: string;
};

type StewardRelayProvider = "local" | string;

type MemorySnapshot = {
  condensed: string[];
  recent: TranscriptEntry[];
  transcriptCount: number;
};

type MentionRouting = {
  targets: Array<WebBinding["provider"] | "all">;
  cleanedText: string;
  unknownMentions: string[];
};

type CouncilSession = {
  id: string;
  title: string;
  topic: string;
  context: string;
  stage: DiscussionStage;
  stageNote?: string;
  finalWriterProvider?: WebBinding["provider"] | "";
  transcript: TranscriptEntry[];
  summary: LocalCouncilSummary | null;
  memory: MemorySnapshot;
  artifacts: CouncilArtifact[];
  finalDrafts: FinalDraftRecord[];
  updatedAt: string;
};

type SavedRoom = {
  id: string;
  title: string;
  bindings: WebBinding[];
  sessions: CouncilSession[];
  activeSessionId: string;
  updatedAt: string;
};

type RoundtableResult = {
  ok: boolean;
  objective: string;
  rounds: number;
  transcript: TranscriptEntry[];
  roundResults: Array<{
    round: number;
    responses: Array<
      | { ok: true; round: number; speaker: string; provider: string; model?: string; content: string }
      | { ok: false; round: number; speaker: string; provider: string; model: string | null; message: string }
    >;
  }>;
  summary: SummaryResult;
};

type WebBinding = {
  provider: "openai" | "anthropic" | "gemini";
  label: string;
  threadUrl: string;
  homeUrl: string;
  note: string;
};

type WebProviderPhase = "idle" | "sending" | "waiting" | "receiving" | "ready" | "degraded" | "dead";

type WebProviderStatus = {
  phase: WebProviderPhase;
  note: string;
  updatedAt?: string;
  lastSnippet?: string;
  lastText?: string;
  lastChangeAt?: string;
  pendingText?: string;
  pendingStableCount?: number;
  failureCount?: number;
  skipped?: boolean;
};

const STORAGE_KEYS = {
  mode: "standalone_ai_council_mode",
  relayUrl: "standalone_ai_council_relay",
  bindings: "standalone_ai_council_bindings",
  webTranscript: "standalone_ai_council_web_transcript",
  webAutoSync: "standalone_ai_council_web_auto_sync",
  webAutoSyncInterval: "standalone_ai_council_web_auto_sync_interval",
  webOnlyChanged: "standalone_ai_council_web_only_changed",
  rooms: "standalone_ai_council_rooms",
  activeRoomId: "standalone_ai_council_active_room_id",
};

const DEFAULT_RELAY = "http://127.0.0.1:8080";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "GPT",
  anthropic: "Claude",
  gemini: "Gemini",
  deepseek: "DeepSeek",
  glm: "GLM",
  kimi: "Kimi",
};

const WEB_PHASE_LABELS: Record<WebProviderPhase, string> = {
  idle: "idle",
  sending: "sending",
  waiting: "waiting",
  receiving: "receiving",
  ready: "ready",
  degraded: "degraded",
  dead: "dead",
};

const ARTIFACT_LABELS: Record<ArtifactKind, string> = {
  decision: "Decision",
  action_items: "Action Items",
  draft: "Draft",
  comparison: "Comparison",
};

const STAGE_LABELS: Record<DiscussionStage, string> = {
  brief: "出题",
  react: "互评",
  revise: "定向修改",
  final: "终稿",
};

const DEFAULT_STANCES: Record<string, string> = {
  openai: "偏落地与执行顺序。",
  anthropic: "偏结构化推理与风险。",
  gemini: "偏发散备选与全局视角。",
  deepseek: "偏成本与工程效率。",
  glm: "偏中文表达与整合。",
  kimi: "偏长文本整理与摘要。",
};

const DEFAULT_BINDINGS: WebBinding[] = [
  {
    provider: "openai",
    label: "ChatGPT",
    threadUrl: "",
    homeUrl: "https://chatgpt.com/",
    note: "绑定一个专门给 AI Council 用的 ChatGPT 会话。",
  },
  {
    provider: "anthropic",
    label: "Claude",
    threadUrl: "",
    homeUrl: "https://claude.ai/",
    note: "单独的 Claude 线程更容易保持稳定上下文。",
  },
  {
    provider: "gemini",
    label: "Gemini",
    threadUrl: "",
    homeUrl: "https://gemini.google.com/",
    note: "Gemini 可以先作为网页登录模式的首个固定线程。",
  },
];

function optimizePrompt(topic: string, context: string) {
  const objective = topic.trim();
  const extra = context.trim();
  const sections = [
    "你正在参与一场多模型协作讨论，请延续上下文，不要重复复述问题。",
    objective ? `当前目标：${objective}` : "",
    extra ? `补充背景：${extra}` : "",
    "请先给出你的结论，再补充原因、风险和下一步建议。",
  ].filter(Boolean);
  return sections.join("\n\n");
}

function buildStagePrompt(
  stage: DiscussionStage,
  binding: WebBinding,
  topic: string,
  context: string,
  transcript: TranscriptEntry[],
  stageNote = "",
  finalWriterProvider: WebBinding["provider"] | "" = "",
) {
  const memory = compressTranscriptMemory(transcript);
  const recent = memory.recent
    .filter((entry) => entry.provider !== binding.provider)
    .map((entry) => `${entry.speaker}: ${buildSnippet(entry.content)}`)
    .join("\n");

  const base = [
    `【讨论主题】${topic.trim() || "未命名讨论"}`,
    context.trim() ? `【补充背景】${context.trim()}` : "",
    stageNote.trim() ? `【甲方最新指令】${stageNote.trim()}` : "",
    memory.condensed.length ? `【更早讨论记忆】\n${memory.condensed.join("\n")}` : "",
    recent ? `【其他成员最近回复】\n${recent}` : "",
  ].filter(Boolean);

  const stageInstruction =
    stage === "brief"
      ? "【当前阶段】出题\n【你的任务】根据主题给出你的初稿或核心方案。如果有关键不明确处，也可以顺手指出。"
      : stage === "react"
        ? "【当前阶段】互评\n【你的任务】阅读其他成员的回复，指出你认为不够好的地方，并给出修改建议。不要偏离主题。"
        : stage === "revise"
          ? "【当前阶段】定向修改\n【你的任务】优先按照甲方最新指令修改你的方案，同时可以吸收其他成员的优点。"
          : `【当前阶段】终稿\n【你的任务】${finalWriterProvider && finalWriterProvider !== binding.provider ? "这轮你不用出终稿，只补充你认为最关键的收尾建议。" : "请综合本次讨论，输出一份终稿。优先给出可直接交付的版本。"}`
  ;

  return [...base, stageInstruction].join("\n\n");
}

function inferNextStage(current: DiscussionStage, hasFeedback: boolean) {
  if (current === "brief") return hasFeedback ? "revise" : "react";
  if (current === "react") return hasFeedback ? "revise" : "react";
  if (current === "revise") return hasFeedback ? "revise" : "react";
  return "final";
}

function buildHandoffPacket(topic: string, context: string, transcript: TranscriptEntry[]) {
  const recent = transcript
    .filter((entry) => entry.provider !== "user" && entry.content.trim())
    .slice(-4)
    .map((entry) => `[Round ${entry.round}] ${entry.speaker}: ${entry.content.trim()}`)
    .join("\n\n");

  const sections = [
    "你现在接入的是一场已经进行中的 AI Council 讨论。",
    topic.trim() ? `讨论目标：${topic.trim()}` : "",
    context.trim() ? `补充上下文：${context.trim()}` : "",
    recent ? `最近发言摘录：\n${recent}` : "",
    "请接着当前脉络继续，不必从头复述背景。",
  ].filter(Boolean);

  return sections.join("\n\n");
}

function readBindings(): WebBinding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bindings);
    if (!raw) return DEFAULT_BINDINGS;
    const parsed = JSON.parse(raw) as WebBinding[];
    return DEFAULT_BINDINGS.map((binding) => parsed.find((item) => item.provider === binding.provider) || binding);
  } catch {
    return DEFAULT_BINDINGS;
  }
}

function writeBindings(bindings: WebBinding[]) {
  localStorage.setItem(STORAGE_KEYS.bindings, JSON.stringify(bindings));
}

function readSavedRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.rooms);
    if (!raw) return [] as SavedRoom[];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [] as SavedRoom[];
    return parsed.map((item) => normalizeRoomRecord(item)).filter((item): item is SavedRoom => Boolean(item));
  } catch {
    return [] as SavedRoom[];
  }
}

function writeSavedRooms(rooms: SavedRoom[]) {
  localStorage.setItem(STORAGE_KEYS.rooms, JSON.stringify(rooms));
}

function readWebTranscript() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.webTranscript);
    if (!raw) return [] as TranscriptEntry[];
    const parsed = JSON.parse(raw) as TranscriptEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as TranscriptEntry[];
  }
}

function nextRoundValue(transcript: TranscriptEntry[]) {
  return transcript.reduce((max, item) => Math.max(max, item.round), 0) + 1;
}

function buildContinuePrompt(topic: string, context: string, transcript: TranscriptEntry[]) {
  return [
    buildHandoffPacket(topic, context, transcript),
    "请继续推进这场讨论，优先补充新信息、修正分歧，并给出下一步建议。",
  ].join("\n\n");
}

function shouldSendInStage(
  binding: WebBinding,
  stage: DiscussionStage,
  finalWriterProvider: WebBinding["provider"] | "",
) {
  if (stage !== "final" || !finalWriterProvider) return true;
  return binding.provider === finalWriterProvider;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatClock(timestamp?: string) {
  if (!timestamp) return "未同步";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "未同步";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function buildSnippet(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > 110 ? `${compact.slice(0, 110)}…` : compact;
}

function createTranscriptEntry(payload: Omit<TranscriptEntry, "id" | "state"> & { id?: string; state?: TranscriptEntry["state"] }) {
  return {
    id: payload.id || `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    state: payload.state || "active",
    ...payload,
  } satisfies TranscriptEntry;
}

function describeRoundStatus(status?: RoundStatus) {
  if (!status) return "等待开始";
  if (status.status === "done") return `全部回复完毕 · @${status.mentionUsed}/${status.mentionLimit}`;
  if (status.status === "partial") return `已完成 ${status.completed}/${status.expected}，跳过 ${status.skipped} · @${status.mentionUsed}/${status.mentionLimit}`;
  if (status.status === "running") return `等待中 ${status.completed}/${status.expected} · @${status.mentionUsed}/${status.mentionLimit}`;
  return "等待开始";
}

function shouldAllowAgentMention(params: {
  stage: DiscussionStage;
  sourceProvider: WebBinding["provider"];
  targetProvider: WebBinding["provider"];
  latestText: string;
  mentionUsed: number;
  mentionLimit: number;
  mentionEvents: string[];
}) {
  const { stage, sourceProvider, targetProvider, latestText, mentionUsed, mentionLimit, mentionEvents } = params;
  if (stage === "final") return { ok: false, reason: "终稿阶段禁止成员互相 @。" };
  if (mentionUsed >= mentionLimit) return { ok: false, reason: "本轮 @ 次数已用完。" };
  if (latestText.trim().length < 48) return { ok: false, reason: "回复太短，不触发协作转发。" };
  if (mentionEvents.some((item) => item.startsWith(`${sourceProvider}->`))) {
    return { ok: false, reason: "同一成员本轮最多只允许 @1 次。" };
  }
  if (mentionEvents.some((item) => item.startsWith(`${targetProvider}->${sourceProvider}`))) {
    return { ok: false, reason: "检测到来回互 ping，已拦截本次 @。" };
  }
  if (/不同意|反对|你错了|这不对/i.test(latestText) && latestText.length < 120) {
    return { ok: false, reason: "疑似情绪化或无效争论，已拦截本次 @。" };
  }
  return { ok: true as const };
}

function stewardDecideMention(params: {
  stage: DiscussionStage;
  latestText: string;
  stewardProvider: string;
  quality: StewardQuality;
}): StewardMentionDecision {
  const { stage, latestText, stewardProvider, quality } = params;
  if (stage === "final") {
    return { ok: false, mode: "blocked", reason: `${stewardProvider}：终稿阶段不建议再触发成员协作。` };
  }
  if (quality.isArguing) {
    return { ok: false, mode: "blocked", reason: `${stewardProvider}：这段内容更像无效争论，建议由甲方直接改方向。` };
  }
  if (!quality.hasProgress && latestText.trim().length < 160) {
    return { ok: false, mode: "blocked", reason: `${stewardProvider}：新增信息太少，这次 @ 不值得放行。` };
  }
  if (latestText.trim().length > 320 || !quality.hasProgress) {
    return { ok: true, mode: "summary", reason: `${stewardProvider}：允许协作，但建议只转摘要，减少摩擦。` };
  }
  return { ok: true, mode: "full", reason: `${stewardProvider}：这次 @ 有明确增量，可以放行全文协作。` };
}

function compressTranscriptForSteward(transcript: TranscriptEntry[]) {
  return compressTranscriptMemory(transcript)
    .recent.map((entry) => `${entry.speaker}：${buildSnippet(entry.content)}`)
    .join("\n");
}

function buildStewardDraft(
  bindings: WebBinding[],
  topic: string,
  transcript: TranscriptEntry[],
  instruction: string,
  stage: DiscussionStage,
) : StewardDraft {
  const recent = compressTranscriptForSteward(transcript);
  const messages = Object.fromEntries(
    bindings.map((binding) => [
      binding.provider,
      [
        `【讨论主题】${topic.trim() || "未命名讨论"}`,
        instruction.trim() ? `【甲方最新指令】${instruction.trim()}` : "",
        `【当前阶段】${STAGE_LABELS[stage]}`,
        recent ? `【最近讨论摘要】\n${recent}` : "",
        `【你的任务】请按 ${STAGE_LABELS[stage]} 阶段继续推进，并保持聚焦主题。`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    ]),
  );
  return {
    stage,
    messages,
    skipped: bindings.filter((binding) => !binding.threadUrl.trim()).map((binding) => binding.label),
    summary: `已为 ${bindings.length} 个成员生成 ${STAGE_LABELS[stage]} 阶段转述稿。`,
  };
}

function inspectDiscussionQuality(transcript: TranscriptEntry[]): StewardQuality {
  const recent = transcript.slice(-6).map((entry) => entry.content.trim()).filter(Boolean);
  const uniqueSnippets = new Set(recent.map((text) => buildSnippet(text)));
  const arguing = recent.some((text) => /不同意|反对|但是你错了|你忽略了|这不对/i.test(text)) && uniqueSnippets.size <= 3;
  const hasProgress = uniqueSnippets.size >= 3;
  return {
    hasProgress,
    isArguing: arguing,
    summary: hasProgress ? "这一轮有新的有效信息进入讨论。" : "这一轮新增信息有限，开始出现重复。",
    suggestion: arguing
      ? "建议下一轮不要让成员互相拉扯，直接给定新的甲方方向。"
      : hasProgress
        ? "可以继续一轮互评，或者开始收敛成决策。"
        : "建议进入定向修改或终稿，而不是继续空转。",
  };
}

function recommendStewardStage(current: DiscussionStage, quality: StewardQuality | null, hasInstruction: boolean) {
  if (current === "final") return "final" as DiscussionStage;
  if (hasInstruction) return "revise" as DiscussionStage;
  if (!quality) return inferNextStage(current, false);
  if (quality.isArguing) return "revise" as DiscussionStage;
  if (!quality.hasProgress) return current === "brief" ? "react" : "revise";
  return inferNextStage(current, false);
}

function mergeArtifactsWithSummary(current: CouncilArtifact[], summary: LocalCouncilSummary | null) {
  if (!summary) return current;
  const now = new Date().toISOString();
  return current.map((artifact) => {
    if (artifact.kind === "decision" && !artifact.content.trim()) {
      return { ...artifact, content: summary.consensus.join("\n"), updatedAt: now };
    }
    if (artifact.kind === "action_items" && !artifact.content.trim()) {
      return { ...artifact, content: summary.nextActions.join("\n"), updatedAt: now };
    }
    if (artifact.kind === "comparison" && !artifact.content.trim()) {
      return { ...artifact, content: summary.tensions.join("\n"), updatedAt: now };
    }
    return artifact;
  });
}

function hasProviderReplyChanged(
  provider: WebBinding["provider"],
  text: string,
  transcript: TranscriptEntry[],
  status?: WebProviderStatus,
) {
  const normalized = text.trim();
  if (!normalized) return false;
  if (status?.lastText?.trim() === normalized) return false;
  const lastSameProvider = [...transcript].reverse().find((entry) => entry.provider === provider);
  return lastSameProvider?.content.trim() !== normalized;
}

function computeReplyStability(text: string, status?: WebProviderStatus) {
  const normalized = text.trim();
  if (!normalized) {
    return {
      pendingText: "",
      pendingStableCount: 0,
      isStable: false,
    };
  }
  const sameAsPending = status?.pendingText?.trim() === normalized;
  const pendingStableCount = sameAsPending ? (status?.pendingStableCount ?? 0) + 1 : 1;
  return {
    pendingText: normalized,
    pendingStableCount,
    isStable: pendingStableCount >= 2,
  };
}

function buildFailureRuntime(
  previous: WebProviderStatus | undefined,
  message: string,
  autoDegradeEnabled: boolean,
  now = new Date().toISOString(),
): WebProviderStatus {
  const failureCount = (previous?.failureCount ?? 0) + 1;
  const dead = autoDegradeEnabled && failureCount >= 2;
  return {
    phase: dead ? "dead" : "degraded",
    note: dead ? `连续失败，已自动跳过: ${message}` : `最近一次失败: ${message}`,
    updatedAt: now,
    lastSnippet: previous?.lastSnippet,
    lastText: previous?.lastText,
    lastChangeAt: previous?.lastChangeAt,
    pendingText: previous?.pendingText,
    pendingStableCount: previous?.pendingStableCount,
    failureCount,
    skipped: dead,
  };
}

function deriveReadPhase(
  payloadStatus: string,
  normalizedText: string,
  isStable: boolean,
  previousPhase?: WebProviderPhase,
): WebProviderPhase {
  if (payloadStatus === "responding") return "waiting";
  if (!normalizedText) {
    return previousPhase === "sending" || previousPhase === "waiting" || previousPhase === "receiving" ? "waiting" : "idle";
  }
  if (!isStable) return "receiving";
  return "ready";
}

function isProviderOperational(status?: WebProviderStatus) {
  if (!status) return false;
  return status.phase !== "dead" && !status.skipped;
}

function isProviderLive(status?: WebProviderStatus) {
  if (!status) return false;
  return ["sending", "waiting", "receiving", "ready"].includes(status.phase) && !status.skipped;
}

function statusTone(phase?: WebProviderPhase) {
  if (!phase) return "off";
  if (phase === "ready") return "ok";
  if (phase === "sending" || phase === "waiting" || phase === "receiving") return "active";
  if (phase === "degraded" || phase === "dead") return "warn";
  return "off";
}

function roomDotTone(phase?: WebProviderPhase) {
  if (!phase) return "idle";
  if (phase === "ready") return "ready";
  if (phase === "sending" || phase === "waiting" || phase === "receiving") return "active";
  if (phase === "degraded" || phase === "dead") return "error";
  return "idle";
}

function buildRoomTitle(topic: string) {
  const normalized = topic.trim() || "未命名讨论";
  return normalized.length > 20 ? `${normalized.slice(0, 20)}…` : normalized;
}

function buildSessionTitle(topic: string, sessionCount = 1) {
  const normalized = topic.trim();
  if (normalized) {
    return normalized.length > 24 ? `${normalized.slice(0, 24)}…` : normalized;
  }
  return `Session ${sessionCount}`;
}

function createDefaultArtifacts(summary?: LocalCouncilSummary | null): CouncilArtifact[] {
  const now = new Date().toISOString();
  return [
    {
      id: `artifact_decision_${Date.now()}`,
      kind: "decision",
      title: "当前决策",
      content: summary?.consensus?.join("\n") || "",
      updatedAt: now,
    },
    {
      id: `artifact_actions_${Date.now()}`,
      kind: "action_items",
      title: "下一步行动",
      content: summary?.nextActions?.join("\n") || "",
      updatedAt: now,
    },
    {
      id: `artifact_draft_${Date.now()}`,
      kind: "draft",
      title: "工作草稿",
      content: "",
      updatedAt: now,
    },
    {
      id: `artifact_comparison_${Date.now()}`,
      kind: "comparison",
      title: "对比表",
      content: summary?.tensions?.join("\n") || "",
      updatedAt: now,
    },
  ];
}

function upsertFinalDraftFromEntry(current: FinalDraftRecord[], entry: TranscriptEntry) {
  const content = entry.content.trim();
  if (!content || entry.provider === "user" || entry.provider === "system") return current;
  const now = new Date().toISOString();
  const existingIndex = current.findIndex((item) => item.sourceEntryId && item.sourceEntryId === entry.id);
  if (existingIndex >= 0) {
    return current.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            content,
            updatedAt: now,
          }
        : item,
    );
  }
  const nextDraft: FinalDraftRecord = {
    id: `final_${entry.id || `${entry.provider}_${Date.now()}`}`,
    sourceEntryId: entry.id,
    provider: entry.provider as WebBinding["provider"],
    speaker: entry.speaker,
    round: entry.round,
    content,
    status: "candidate",
    createdAt: now,
    updatedAt: now,
  };
  return [nextDraft, ...current.map((item) => (item.status === "candidate" ? { ...item, status: "superseded" as const, updatedAt: now } : item))];
}

function markFinalDraftStatus(
  drafts: FinalDraftRecord[],
  draftId: string,
  status: FinalDraftStatus,
  note?: string,
) {
  const now = new Date().toISOString();
  return drafts.map((draft) =>
    draft.id === draftId
      ? { ...draft, status, note: note ?? draft.note, updatedAt: now }
      : status === "accepted" && draft.status === "candidate"
        ? { ...draft, status: "superseded" as const, updatedAt: now }
        : draft,
  );
}

function createCouncilSession(payload?: Partial<CouncilSession>): CouncilSession {
  const topic = payload?.topic ?? "让三个模型一起讨论一个产品方案，并减少我手动同步信息的负担。";
  const transcript = payload?.transcript ?? [];
  const summary = payload?.summary ?? null;
  return {
    id: payload?.id || `session_${Date.now()}`,
    title: payload?.title || buildSessionTitle(topic),
    topic,
    context: payload?.context ?? "希望长期保留群聊记忆，同时兼顾网页登录模式与后续更多 provider 的扩展。",
    stage: payload?.stage ?? "brief",
    stageNote: payload?.stageNote ?? "",
    finalWriterProvider: payload?.finalWriterProvider ?? "",
    transcript,
    summary,
    memory: payload?.memory ?? compressTranscriptMemory(transcript),
    artifacts: mergeArtifactsWithSummary(payload?.artifacts ?? createDefaultArtifacts(summary), summary),
    finalDrafts: payload?.finalDrafts ?? [],
    updatedAt: payload?.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeRoomRecord(raw: unknown): SavedRoom | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<SavedRoom> & {
    topic?: string;
    context?: string;
    transcript?: TranscriptEntry[];
    summary?: LocalCouncilSummary | null;
    memory?: MemorySnapshot;
  };

  const bindings = Array.isArray(candidate.bindings) ? candidate.bindings : DEFAULT_BINDINGS;
  const updatedAt = candidate.updatedAt || new Date().toISOString();

  let sessions: CouncilSession[] = [];
  if (Array.isArray(candidate.sessions) && candidate.sessions.length) {
    sessions = candidate.sessions.map((session, index) =>
      createCouncilSession({
        ...session,
        id: session.id || `session_${Date.now()}_${index}`,
        title: session.title || buildSessionTitle(session.topic || "", index + 1),
        topic: session.topic || candidate.title || "",
        context: session.context || "",
        stage: session.stage ?? "brief",
        stageNote: session.stageNote ?? "",
        finalWriterProvider: session.finalWriterProvider ?? "",
        transcript: Array.isArray(session.transcript) ? session.transcript : [],
        summary: session.summary ?? null,
        memory: session.memory ?? compressTranscriptMemory(Array.isArray(session.transcript) ? session.transcript : []),
        artifacts: Array.isArray(session.artifacts) ? session.artifacts : undefined,
        finalDrafts: Array.isArray(session.finalDrafts) ? session.finalDrafts : [],
        updatedAt: session.updatedAt || updatedAt,
      }),
    );
  } else if (typeof candidate.topic === "string") {
    sessions = [
      createCouncilSession({
        id: `session_${candidate.id || Date.now()}`,
        title: buildSessionTitle(candidate.topic, 1),
        topic: candidate.topic,
        context: candidate.context || "",
        stage: "brief",
        stageNote: "",
        finalWriterProvider: "",
        transcript: Array.isArray(candidate.transcript) ? candidate.transcript : [],
        summary: candidate.summary ?? null,
        memory: candidate.memory ?? compressTranscriptMemory(Array.isArray(candidate.transcript) ? candidate.transcript : []),
        finalDrafts: [],
        updatedAt,
      }),
    ];
  }

  if (!sessions.length) {
    sessions = [createCouncilSession()];
  }

  const activeSessionId =
    candidate.activeSessionId && sessions.some((session) => session.id === candidate.activeSessionId)
      ? candidate.activeSessionId
      : sessions[0].id;

  return {
    id: candidate.id || `room_${Date.now()}`,
    title: candidate.title || buildRoomTitle(sessions[0].topic),
    bindings,
    sessions,
    activeSessionId,
    updatedAt,
  };
}

function parseMentionRouting(input: string): MentionRouting {
  const aliasMap: Record<string, WebBinding["provider"] | "all"> = {
    all: "all",
    gemini: "gemini",
    claude: "anthropic",
    anthropic: "anthropic",
    gpt: "openai",
    chatgpt: "openai",
    openai: "openai",
  };

  const rawMentions = Array.from(input.matchAll(/@([a-zA-Z][\w-]*)/g)).map((match) => match[1]);
  const targets: Array<WebBinding["provider"] | "all"> = [];
  const unknownMentions: string[] = [];

  for (const mention of rawMentions) {
    const normalized = mention.toLowerCase();
    const mapped = aliasMap[normalized];
    if (!mapped) {
      if (!unknownMentions.includes(mention)) unknownMentions.push(mention);
      continue;
    }
    if (!targets.includes(mapped)) targets.push(mapped);
  }

  return {
    targets,
    cleanedText: input.replace(/@([a-zA-Z][\w-]*)/g, "").replace(/\s+/g, " ").trim(),
    unknownMentions,
  };
}

function parseAgentMentions(input: string): WebBinding["provider"][] {
  const aliasMap: Record<string, WebBinding["provider"]> = {
    gemini: "gemini",
    claude: "anthropic",
    anthropic: "anthropic",
    gpt: "openai",
    chatgpt: "openai",
    openai: "openai",
  };
  const rawMentions = Array.from(input.matchAll(/@([a-zA-Z][\w-]*)/g)).map((match) => match[1].toLowerCase());
  const targets: WebBinding["provider"][] = [];
  for (const mention of rawMentions) {
    const mapped = aliasMap[mention];
    if (mapped && !targets.includes(mapped)) targets.push(mapped);
  }
  return targets;
}

function buildMentionRelayPrompt(
  sourceBinding: WebBinding,
  targetBinding: WebBinding,
  topic: string,
  context: string,
  sourceText: string,
  stage: DiscussionStage,
  mode: "full" | "summary" = "full",
) {
  const sourcePayload = mode === "summary" ? buildSnippet(sourceText) : sourceText.trim();
  return [
    `【讨论主题】${topic.trim() || "未命名讨论"}`,
    context.trim() ? `【补充背景】${context.trim()}` : "",
    `【当前阶段】${STAGE_LABELS[stage]}`,
    `【协作点名】${sourceBinding.label} 在本轮点名了你。`,
    `【${sourceBinding.label} 的${mode === "summary" ? "摘要" : "原话摘录"}】${sourcePayload}`,
    `【你的任务】只回应 ${sourceBinding.label} 点名你的那一部分，给出简洁、直接、可执行的补充。`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildQuickPrompt(kind: "challenge" | "summary" | "next", topic: string, transcript: TranscriptEntry[]) {
  const recent = transcript
    .filter((entry) => entry.provider !== "user" && entry.content.trim())
    .slice(-3)
    .map((entry) => `${entry.speaker}：${buildSnippet(entry.content)}`)
    .join("\n");
  if (kind === "challenge") {
    return [`请挑战当前方案里最脆弱的假设。`, topic ? `主题：${topic}` : "", recent ? `最近讨论：\n${recent}` : ""]
      .filter(Boolean)
      .join("\n\n");
  }
  if (kind === "summary") {
    return [`请只总结目前的共识、分歧和待确认点。`, topic ? `主题：${topic}` : "", recent ? `最近讨论：\n${recent}` : ""]
      .filter(Boolean)
      .join("\n\n");
  }
  return [`请给出下一步最值得执行的 3 个动作。`, topic ? `主题：${topic}` : "", recent ? `最近讨论：\n${recent}` : ""]
    .filter(Boolean)
    .join("\n\n");
}

function summarizeTranscriptLocally(transcript: TranscriptEntry[]): LocalCouncilSummary {
  const normalized = transcript
    .filter((entry) => entry.provider !== "user")
    .map((entry) => entry.content.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const pick = (matcher: RegExp, fallbackPrefix: string, limit = 3) => {
    const results: string[] = [];
    for (const text of normalized) {
      if (results.length >= limit) break;
      const sentence = text
        .split(/(?<=[。！？.!?])/)
        .map((item) => item.trim())
        .find((item) => matcher.test(item) || item.includes(fallbackPrefix));
      if (sentence && !results.includes(sentence)) {
        results.push(sentence);
      }
    }
    return results;
  };

  const consensus = pick(/共识|一致|都认为|应该|优先/i, "应该");
  const tensions = pick(/分歧|但是|不过|风险|问题|担心/i, "风险");
  const nextActions = pick(/下一步|建议|先做|行动|落地/i, "下一步");

  return {
    consensus: consensus.length ? consensus : normalized.slice(0, 3),
    tensions: tensions.length ? tensions : normalized.slice(3, 6),
    nextActions: nextActions.length ? nextActions : normalized.slice(-3),
  };
}

function compressTranscriptMemory(transcript: TranscriptEntry[]): MemorySnapshot {
  const meaningful = transcript.filter((entry) => entry.content.trim());
  const recent = meaningful.slice(-6);
  const older = meaningful.slice(0, Math.max(0, meaningful.length - recent.length));

  const condensed = older
    .map((entry) => `${entry.speaker}：${buildSnippet(entry.content)}`)
    .filter(Boolean)
    .slice(-8);

  return {
    condensed,
    recent,
    transcriptCount: meaningful.length,
  };
}

function buildSpeakerPrompt(binding: WebBinding, topic: string, context: string, transcript: TranscriptEntry[], round: number) {
  const memory = compressTranscriptMemory(transcript);
  const recent = memory.recent
    .map((entry) => `${entry.speaker}: ${buildSnippet(entry.content)}`)
    .join("\n");
  return [
    `你现在是 AI Council 的第 ${round} 轮发言成员，本轮由 ${binding.label} 继续推进讨论。`,
    topic.trim() ? `讨论主题：${topic.trim()}` : "",
    context.trim() ? `补充上下文：${context.trim()}` : "",
    memory.condensed.length ? `更早讨论记忆：\n${memory.condensed.join("\n")}` : "",
    recent ? `最近讨论记录：\n${recent}` : "",
    "请直接补充新观点，不要重复已经说过的内容。优先指出新的风险、机会或下一步行动。",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function fetchProviders(baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/providers`);
  if (!response.ok) {
    throw new Error(`Provider request failed: ${response.status}`);
  }
  const payload = (await response.json()) as { providers: ProviderRecord[] };
  return payload.providers ?? [];
}

async function streamRoundtable(
  baseUrl: string,
  payload: Record<string, unknown>,
  onEvent: (event: string, data: unknown) => void,
) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/roundtable/stream`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Roundtable stream failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary < 0) break;
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = raw.split(/\r?\n/);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim() || "message";
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      onEvent(event, JSON.parse(dataLines.join("\n")));
    }
  }
}

async function requestRelayChat(
  baseUrl: string,
  payload: {
    provider: string;
    model?: string;
    system?: string;
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    temperature?: number;
    maxTokens?: number;
  },
) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/chat`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Relay chat failed: ${response.status}`);
  }
  return (await response.json()) as {
    ok: boolean;
    text?: string;
    provider?: string;
    model?: string;
    message?: string;
  };
}

function parseJsonBlock<T>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

function buildParticipants(rows: ProviderRecord[]): Participant[] {
  return rows.map((row) => ({
    provider: row.id,
    label: PROVIDER_LABELS[row.id] || row.id,
    model: row.defaultModel || "",
    stancePrompt: DEFAULT_STANCES[row.id] || "",
    enabled: Boolean(row.configured),
    configured: Boolean(row.configured),
  }));
}

function App() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem(STORAGE_KEYS.mode) === "web" ? "web" : "api"));
  const [relayUrl, setRelayUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.relayUrl) || DEFAULT_RELAY);
  const [relayDraft, setRelayDraft] = useState(() => localStorage.getItem(STORAGE_KEYS.relayUrl) || DEFAULT_RELAY);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [bindings, setBindings] = useState<WebBinding[]>(() => readBindings());
  const [topic, setTopic] = useState("让三个模型一起讨论一个产品方案，并减少我手动同步信息的负担。");
  const [context, setContext] = useState("希望长期保留群聊记忆，同时兼顾网页登录模式与后续更多 provider 的扩展。");
  const [rounds, setRounds] = useState(2);
  const [summaryProvider, setSummaryProvider] = useState("openai");
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [running, setRunning] = useState(false);
  const [sendingWeb, setSendingWeb] = useState<string | null>(null);
  const [syncingWeb, setSyncingWeb] = useState<string | null>(null);
  const [webStatus, setWebStatus] = useState("idle");
  const [webProviderStatus, setWebProviderStatus] = useState<Record<string, WebProviderStatus>>({});
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.webAutoSync) === "1");
  const [autoSyncIntervalSec, setAutoSyncIntervalSec] = useState(() => {
    const raw = Number(localStorage.getItem(STORAGE_KEYS.webAutoSyncInterval) || "12");
    return Number.isFinite(raw) ? Math.min(60, Math.max(5, raw)) : 12;
  });
  const [onlyChangedSyncEnabled, setOnlyChangedSyncEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEYS.webOnlyChanged) !== "0",
  );
  const [webRoundCount, setWebRoundCount] = useState(2);
  const [webTurnOrder, setWebTurnOrder] = useState<Array<WebBinding["provider"]>>(["gemini", "anthropic", "openai"]);
  const [webOrchestrating, setWebOrchestrating] = useState(false);
  const [autoDegradeEnabled, setAutoDegradeEnabled] = useState(true);
  const [notice, setNotice] = useState("新页面已与旧页面分离。这里是专用 AI Council 前端。");
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>(() => readWebTranscript());
  const [composerText, setComposerText] = useState("");
  const [composerTarget, setComposerTarget] = useState<"all" | "gemini" | "openai" | "anthropic">("all");
  const [editingReasonEntryId, setEditingReasonEntryId] = useState<string | null>(null);
  const [editingReasonText, setEditingReasonText] = useState("");
  const [editingFinalDraftReasonId, setEditingFinalDraftReasonId] = useState<string | null>(null);
  const [editingFinalDraftReasonText, setEditingFinalDraftReasonText] = useState("");
  const [handoffTargetSelect, setHandoffTargetSelect] = useState<WebBinding["provider"] | "">("");
  const [discussionStage, setDiscussionStage] = useState<DiscussionStage>("brief");
  const [stageNote, setStageNote] = useState("");
  const [finalWriterProvider, setFinalWriterProvider] = useState<WebBinding["provider"] | "">("");
  const [awaitingUserTurn, setAwaitingUserTurn] = useState(false);
  const [roundStatuses, setRoundStatuses] = useState<RoundStatus[]>([]);
  const [stewardProvider, setStewardProvider] = useState<StewardRelayProvider>("local");
  const [stewardDraft, setStewardDraft] = useState<StewardDraft | null>(null);
  const [stewardQuality, setStewardQuality] = useState<StewardQuality | null>(null);
  const [stewardMemoryText, setStewardMemoryText] = useState("");
  const [activeSpeakerKey, setActiveSpeakerKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResult>(null);
  const [localSummary, setLocalSummary] = useState<LocalCouncilSummary | null>(null);
  const [memorySnapshot, setMemorySnapshot] = useState<MemorySnapshot>(() => compressTranscriptMemory(readWebTranscript()));
  const [artifacts, setArtifacts] = useState<CouncilArtifact[]>(() => createDefaultArtifacts(null));
  const [finalDrafts, setFinalDrafts] = useState<FinalDraftRecord[]>([]);
  const [finalResult, setFinalResult] = useState<RoundtableResult | null>(null);
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>(() => readSavedRooms());
  const [activeRoomId, setActiveRoomId] = useState(() => localStorage.getItem(STORAGE_KEYS.activeRoomId) || "");
  const [activeSessionId, setActiveSessionId] = useState("");
  const stopOrchestratorRef = useRef(false);
  const liveTranscriptRef = useRef<TranscriptEntry[]>(liveTranscript);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.mode, mode);
  }, [mode]);

  useEffect(() => {
    writeBindings(bindings);
  }, [bindings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.webTranscript, JSON.stringify(liveTranscript));
    liveTranscriptRef.current = liveTranscript;
    setMemorySnapshot(compressTranscriptMemory(liveTranscript));
  }, [liveTranscript]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.webAutoSync, autoSyncEnabled ? "1" : "0");
  }, [autoSyncEnabled]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.webAutoSyncInterval, String(autoSyncIntervalSec));
  }, [autoSyncIntervalSec]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.webOnlyChanged, onlyChangedSyncEnabled ? "1" : "0");
  }, [onlyChangedSyncEnabled]);

  useEffect(() => {
    const finalRounds = new Set(roundStatuses.filter((item) => item.stage === "final").map((item) => item.round));
    if (!finalRounds.size) return;
    const candidateEntries = liveTranscript.filter(
      (entry) =>
        finalRounds.has(entry.round) &&
        entry.provider !== "user" &&
        entry.provider !== "system" &&
        entry.content.trim() &&
        (finalWriterProvider ? entry.provider === finalWriterProvider : true),
    );
    if (!candidateEntries.length) return;
    setFinalDrafts((prev) => candidateEntries.reduce<FinalDraftRecord[]>((acc, entry) => upsertFinalDraftFromEntry(acc, entry), prev));
  }, [liveTranscript, roundStatuses, finalWriterProvider]);

  useEffect(() => {
    writeSavedRooms(savedRooms);
  }, [savedRooms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.activeRoomId, activeRoomId);
  }, [activeRoomId]);

  const activeRoomRecord = useMemo(() => savedRooms.find((room) => room.id === activeRoomId) || null, [savedRooms, activeRoomId]);
  const activeSessionRecord = useMemo(
    () => activeRoomRecord?.sessions.find((session) => session.id === activeSessionId) || null,
    [activeRoomRecord, activeSessionId],
  );
  const transcriptRounds = useMemo(() => {
    const grouped = new Map<number, TranscriptEntry[]>();
    for (const entry of liveTranscript) {
      const list = grouped.get(entry.round) || [];
      list.push(entry);
      grouped.set(entry.round, list);
    }
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, entries]) => ({
        round,
        entries,
        status: roundStatuses.find((item) => item.round === round),
      }));
  }, [liveTranscript, roundStatuses]);
  const stewardRelayOptions = useMemo(
    () => [
      { id: "local", label: "local" },
      ...providers
        .filter((item) => item.configured)
        .map((item) => ({ id: item.id, label: `${PROVIDER_LABELS[item.id] || item.id}${item.defaultModel ? ` · ${item.defaultModel}` : ""}` })),
    ],
    [providers],
  );
  const currentFinalDraft = useMemo(
    () =>
      finalDrafts.find((draft) => draft.status === "candidate") ||
      finalDrafts.find((draft) => draft.status === "accepted") ||
      null,
    [finalDrafts],
  );
  const finalDraftHistory = useMemo(() => finalDrafts.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [finalDrafts]);

  async function refreshProviderList(url = relayUrl) {
    setLoadingProviders(true);
    try {
      const rows = await fetchProviders(url);
      setProviders(rows);
      setParticipants((prev) => {
        const fresh = buildParticipants(rows);
        if (!prev.length) return fresh;
        return fresh.map((item) => {
          const existing = prev.find((entry) => entry.provider === item.provider);
          return existing
            ? {
                ...item,
                enabled: existing.configured ? existing.enabled : item.enabled,
                label: existing.label,
                model: existing.model,
                stancePrompt: existing.stancePrompt,
              }
            : item;
        });
      });
      const fallback = rows.find((row) => row.configured)?.id || "";
      if (!rows.some((row) => row.id === summaryProvider && row.configured)) {
        setSummaryProvider(fallback);
      }
      setNotice(`已连接 Relay：${url}`);
    } catch (error) {
      setProviders([]);
      setParticipants([]);
      setNotice(`Relay 连接失败：${String(error)}`);
    } finally {
      setLoadingProviders(false);
    }
  }

  useEffect(() => {
    refreshProviderList(relayUrl).catch(() => undefined);
  }, []);

  async function saveRelay() {
    const next = relayDraft.trim() || DEFAULT_RELAY;
    setRelayUrl(next);
    localStorage.setItem(STORAGE_KEYS.relayUrl, next);
    await refreshProviderList(next);
  }

  async function runDiscussion() {
    if (mode === "web") {
      setNotice("网页登录模式这版先专注线程管理与风格重写，后续再接自动驱动。");
      return;
    }
    const active = participants.filter((item) => item.enabled && item.configured);
    if (!active.length) {
      setNotice("至少启用一个已配置的模型。");
      return;
    }

    setRunning(true);
    setFinalResult(null);
    setSummary(null);
    setActiveSpeakerKey(null);
    setLiveTranscript(context.trim() ? [createTranscriptEntry({ round: 0, speaker: "user", provider: "user", content: context.trim() })] : []);

    try {
      await streamRoundtable(
        relayUrl,
        {
          topic,
          rounds,
          temperature: 0.4,
          maxTokens: 900,
          providers: active.map((item) => ({
            provider: item.provider,
            label: item.label,
            model: item.model,
            stancePrompt: item.stancePrompt,
          })),
          summaryProvider: summaryProvider ? { provider: summaryProvider } : null,
          messages: context.trim() ? [{ role: "user", content: context.trim() }] : [],
        },
        (event, data) => {
          if (event === "session") {
            const payload = data as { transcript?: TranscriptEntry[] };
            setLiveTranscript(payload.transcript ?? []);
            return;
          }
          if (event === "speaker_start") {
            const entry = data as { round: number; speaker: string; provider: string; model?: string | null };
            setActiveSpeakerKey(`${entry.round}:${entry.speaker}:${entry.provider}`);
            setLiveTranscript((prev) => [
              ...prev,
              createTranscriptEntry({
                round: entry.round,
                speaker: entry.speaker,
                provider: entry.provider,
                model: entry.model || undefined,
                content: "",
              }),
            ]);
            return;
          }
          if (event === "speaker_delta") {
            const entry = data as { round: number; speaker: string; provider: string; text: string };
            setLiveTranscript((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i -= 1) {
                const item = next[i];
                if (item.round === entry.round && item.speaker === entry.speaker && item.provider === entry.provider) {
                  next[i] = { ...item, content: `${item.content}${entry.text}` };
                  return next;
                }
              }
              return [...next, createTranscriptEntry({ round: entry.round, speaker: entry.speaker, provider: entry.provider, content: entry.text })];
            });
            return;
          }
          if (event === "speaker_done") {
            const entry = data as { round: number; speaker: string; provider: string; content: string; model?: string };
            setActiveSpeakerKey(null);
            setLiveTranscript((prev) =>
              prev.map((item) =>
                item.round === entry.round && item.speaker === entry.speaker && item.provider === entry.provider
                  ? { ...item, content: entry.content, model: entry.model }
                  : item,
              ),
            );
            return;
          }
          if (event === "speaker_error") {
            const entry = data as { round: number; speaker: string; provider: string; message: string };
            setActiveSpeakerKey(null);
            setLiveTranscript((prev) =>
              prev.map((item) =>
                item.round === entry.round && item.speaker === entry.speaker && item.provider === entry.provider
                  ? { ...item, content: `[ERROR] ${entry.message}` }
                  : item,
              ),
            );
            return;
          }
          if (event === "summary_done" || event === "summary_error") {
            setSummary(data as SummaryResult);
            return;
          }
          if (event === "complete") {
            setFinalResult(data as RoundtableResult);
          }
        },
      );
      setNotice("本轮讨论完成。");
    } catch (error) {
      setNotice(`讨论失败：${String(error)}`);
    } finally {
      setRunning(false);
      setActiveSpeakerKey(null);
    }
  }

  const enabledCount = useMemo(() => participants.filter((item) => item.enabled && item.configured).length, [participants]);
  const boundCount = useMemo(() => bindings.filter((item) => item.threadUrl.trim()).length, [bindings]);
  const geminiBinding = useMemo(() => bindings.find((item) => item.provider === "gemini") || DEFAULT_BINDINGS[2], [bindings]);
  const boundBindings = useMemo(() => bindings.filter((item) => item.threadUrl.trim()), [bindings]);
  const orderedBoundBindings = useMemo(() => {
    const rank = new Map(webTurnOrder.map((provider, index) => [provider, index]));
    return [...boundBindings]
      .filter((binding) => (webProviderStatus[binding.provider] ? isProviderOperational(webProviderStatus[binding.provider]) : true))
      .sort((a, b) => (rank.get(a.provider) ?? 99) - (rank.get(b.provider) ?? 99));
  }, [boundBindings, webTurnOrder, webProviderStatus]);
  const optimizedPrompt = useMemo(() => optimizePrompt(topic, context), [topic, context]);
  const handoffPacket = useMemo(() => buildHandoffPacket(topic, context, liveTranscript), [topic, context, liveTranscript]);
  const continuePrompt = useMemo(() => buildContinuePrompt(topic, context, liveTranscript), [topic, context, liveTranscript]);
  const mentionRouting = useMemo(() => parseMentionRouting(composerText), [composerText]);
  const readyBindingCount = useMemo(
    () => boundBindings.filter((binding) => isProviderLive(webProviderStatus[binding.provider])).length,
    [boundBindings, webProviderStatus],
  );

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(successMessage);
    } catch {
      setNotice("复制失败，可以先手动选中文本。");
    }
  }

  async function openUrl(url: string) {
    const target = url.trim();
    if (!target) return;
    try {
      await openExternalUrl(target);
    } catch {
      window.open(target, "_blank");
    }
  }

  async function sendToWebThread(binding: WebBinding, text: string) {
    const threadUrl = binding.threadUrl.trim();
    if (!threadUrl) {
      setNotice(`${binding.label} 还没有绑定固定线程。`);
      return;
    }
    const payload = text.trim();
    if (!payload) {
      setNotice("没有可发送的内容。");
      return;
    }

    setSendingWeb(binding.provider);
    setWebProviderStatus((prev) => ({
      ...prev,
      [binding.provider]: {
        ...(prev[binding.provider] ?? {}),
        phase: "sending",
        note: "正在发送到网页线程",
        updatedAt: new Date().toISOString(),
        skipped: false,
      },
    }));
    try {
      const result = await sendWebSessionMessage({
        provider: binding.provider,
        threadUrl,
        text: payload,
      });
      setWebProviderStatus((prev) => ({
        ...prev,
        [binding.provider]: {
          ...(prev[binding.provider] ?? {}),
          phase: "waiting",
          note: result || "已发出，等待网页回复",
          updatedAt: new Date().toISOString(),
          failureCount: 0,
          skipped: false,
        },
      }));
      setNotice(`${binding.label} 已尝试发送：${result || "ok"}`);
    } catch (error) {
      setWebProviderStatus((prev) => ({
        ...prev,
        [binding.provider]: buildFailureRuntime(prev[binding.provider], String(error), autoDegradeEnabled),
      }));
      setNotice(`${binding.label} 自动发送失败：${String(error)}。你也可以先复制文本手动贴过去。`);
      throw error;
    } finally {
      setSendingWeb(null);
    }
  }

  async function syncFromWebThread(
    binding: WebBinding,
    options: { quietNoChange?: boolean; onlyChanged?: boolean } = {},
  ) {
    const threadUrl = binding.threadUrl.trim();
    if (!threadUrl) {
      setNotice(`${binding.label} 还没有绑定固定线程。`);
      return null;
    }

    setSyncingWeb(binding.provider);
    setWebProviderStatus((prev) => ({
      ...prev,
      [binding.provider]: {
        ...(prev[binding.provider] ?? {}),
        phase: "receiving",
        note: "正在读取网页回复",
        updatedAt: new Date().toISOString(),
      },
    }));
    try {
      const payload = await readWebSessionMessage({
        provider: binding.provider,
        threadUrl,
      });
      const normalizedText = payload.text.trim();
      const providerRuntime = webProviderStatus[binding.provider];
      const changed = hasProviderReplyChanged(
        binding.provider,
        normalizedText,
        liveTranscriptRef.current,
        providerRuntime,
      );
      const stability = computeReplyStability(normalizedText, providerRuntime);
      const nextStatusTime = new Date().toISOString();
      setWebStatus(payload.status);
      setWebProviderStatus((prev) => ({
        ...prev,
        [binding.provider]: {
          phase: deriveReadPhase(payload.status, normalizedText, stability.isStable, providerRuntime?.phase),
          note: !normalizedText
            ? "暂无新内容"
            : payload.status === "responding"
              ? "回复生成中，继续等待"
              : !stability.isStable
                ? "正在接收回复，等待稳定"
                : changed
                  ? "已抓取新回复"
                  : "回复无变化",
          updatedAt: nextStatusTime,
          lastSnippet: buildSnippet(normalizedText || prev[binding.provider]?.lastText || ""),
          lastText: normalizedText || prev[binding.provider]?.lastText,
          pendingText: stability.pendingText || prev[binding.provider]?.pendingText,
          pendingStableCount: stability.pendingStableCount,
          lastChangeAt: changed ? nextStatusTime : prev[binding.provider]?.lastChangeAt,
          failureCount: 0,
          skipped: false,
        },
      }));
      if (!normalizedText) {
        if (!options.quietNoChange) setNotice(`${binding.label} 当前还没有可读取的新回复。`);
        return { ...payload, changed: false, complete: false };
      }

      if (payload.status === "responding") {
        if (!options.quietNoChange) setNotice(`${binding.label} 还在生成，先继续等待。`);
        return { ...payload, changed: false, complete: false };
      }

      if (!stability.isStable) {
        if (!options.quietNoChange) setNotice(`${binding.label} 的回复还没稳定，先不写入记录。`);
        return { ...payload, changed: false, complete: false };
      }

      if (options.onlyChanged !== false && !changed) {
        if (!options.quietNoChange) setNotice(`${binding.label} 暂时没有新的不同回复。`);
        return { ...payload, changed: false, complete: true };
      }

      setLiveTranscript((prev) => [
        ...prev,
        createTranscriptEntry({
          round: nextRoundValue(prev),
          speaker: binding.label,
          provider: binding.provider,
          content: normalizedText,
        }),
      ]);
      setNotice(`${binding.label} 最新回复已同步。`);
      return { ...payload, changed: true, complete: true };
    } catch (error) {
      setWebProviderStatus((prev) => ({
        ...prev,
        [binding.provider]: buildFailureRuntime(prev[binding.provider], String(error), autoDegradeEnabled),
      }));
      setNotice(`${binding.label} 读取回复失败：${String(error)}`);
      return null;
    } finally {
      setSyncingWeb(null);
    }
  }

  async function sendAndTrack(binding: WebBinding, text: string, speaker = "你", options: { logUserEntry?: boolean } = {}) {
    const payload = text.trim();
    if (!payload) return;
    if (webProviderStatus[binding.provider]?.skipped) {
      setNotice(`${binding.label} 当前处于自动跳过状态。`);
      return;
    }
    if (options.logUserEntry !== false) {
      setLiveTranscript((prev) => [
        ...prev,
        createTranscriptEntry({
          round: nextRoundValue(prev),
          speaker,
          provider: "user",
          content: payload,
        }),
      ]);
    }
    try {
      await sendToWebThread(binding, payload);
    } catch {
      return;
    }
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await sleep(3000);
      const result = await syncFromWebThread(binding, { quietNoChange: true, onlyChanged: onlyChangedSyncEnabled });
      if ((result as { complete?: boolean; changed?: boolean } | null)?.complete && (result as { changed?: boolean }).changed) {
        return result;
      }
      if (result?.status === "responding") {
        setNotice(`${binding.label} 还在生成，继续等待中...`);
      } else if (result?.text?.trim() && !(result as { complete?: boolean }).complete) {
        setNotice(`${binding.label} 回复还没稳定，继续等待中...`);
      }
    }
    return null;
  }

  async function startWebDiscussion() {
    if (!geminiBinding.threadUrl.trim()) {
      setNotice("先绑定 Gemini 固定线程。");
      return;
    }
    setFinalResult(null);
    setSummary(null);
    setActiveSpeakerKey(null);
    setDiscussionStage("brief");
    setWebStatus("starting");
    await sendAndTrack(geminiBinding, buildStagePrompt("brief", geminiBinding, topic, context, liveTranscriptRef.current, stageNote, finalWriterProvider), "出题");
  }

  async function continueWebDiscussion() {
    if (!geminiBinding.threadUrl.trim()) {
      setNotice("先绑定 Gemini 固定线程。");
      return;
    }
    const nextStage = inferNextStage(discussionStage, false);
    setDiscussionStage(nextStage);
    setWebStatus("continuing");
    await sendAndTrack(
      geminiBinding,
      buildStagePrompt(nextStage, geminiBinding, topic, context, liveTranscriptRef.current, stageNote, finalWriterProvider),
      `${STAGE_LABELS[nextStage]}推进`,
    );
  }

  function resetWebTranscript() {
    setLiveTranscript([]);
    setWebProviderStatus({});
    setMemorySnapshot(compressTranscriptMemory([]));
    setRoundStatuses([]);
    setAwaitingUserTurn(false);
    setNotice("网页登录模式的本地 transcript 已清空。");
  }

  async function syncAllWebThreads(options: { quietNoChange?: boolean; onlyChanged?: boolean } = {}) {
    if (!boundBindings.length) {
      setNotice("先至少绑定一个网页登录线程。");
      return;
    }
    setWebStatus("syncing_all");
    let changedCount = 0;
    let touchedCount = 0;
    for (const binding of boundBindings) {
      const result = await syncFromWebThread(binding, {
        quietNoChange: options.quietNoChange ?? onlyChangedSyncEnabled,
        onlyChanged: options.onlyChanged ?? onlyChangedSyncEnabled,
      });
      if (result) touchedCount += 1;
      if ((result as { changed?: boolean } | null)?.changed) changedCount += 1;
      await sleep(800);
    }
    if (changedCount > 0) {
      setNotice(`已同步 ${changedCount} 个有新变化的线程。`);
      return;
    }
    if (!options.quietNoChange) {
      setNotice(touchedCount ? "本轮同步完成，但没有新的不同回复。" : "当前没有可同步的线程。");
    }
  }

  async function broadcastToBoundThreads(text: string, speaker = "群聊广播") {
    const payload = text.trim();
    if (!payload) {
      setNotice("没有可广播的内容。");
      return;
    }
    if (!boundBindings.length) {
      setNotice("先至少绑定一个网页登录线程。");
      return;
    }
    setLiveTranscript((prev) => [
      ...prev,
      createTranscriptEntry({
        round: nextRoundValue(prev),
        speaker,
        provider: "user",
        content: payload,
      }),
    ]);
    setWebStatus("broadcasting");
    for (const binding of boundBindings) {
      await sendToWebThread(binding, payload);
      await sleep(1200);
    }
    setNotice(`已向 ${boundBindings.length} 个已绑定线程广播。`);
  }

  async function continueAllBoundThreads() {
    const nextStage = inferNextStage(discussionStage, false);
    setDiscussionStage(nextStage);
    const candidates = boundBindings.filter((binding) => shouldSendInStage(binding, nextStage, finalWriterProvider));
    if (!candidates.length) {
      setNotice("当前阶段没有可发送的成员。");
      return;
    }
    for (const binding of candidates) {
      await sendAndTrack(
        binding,
        buildStagePrompt(nextStage, binding, topic, context, liveTranscriptRef.current, stageNote, finalWriterProvider),
        `${STAGE_LABELS[nextStage]}推进`,
      );
      await sleep(1200);
    }
    setNotice(`已按 ${STAGE_LABELS[nextStage]} 阶段推进一轮。`);
  }

  async function sendStageRoundToBindings(
    stage: DiscussionStage,
    instruction: string,
    bindingsToUse: WebBinding[],
    speakerLabel: string,
    customMessages?: Record<string, string>,
  ) {
    if (!bindingsToUse.length) {
      setNotice("当前阶段没有可发送的成员。");
      return;
    }
    setDiscussionStage(stage);
    setStageNote(instruction);
    setAwaitingUserTurn(false);
    const round = nextRoundValue(liveTranscriptRef.current);
    const activeBindings = bindingsToUse.filter((binding) => !webProviderStatus[binding.provider]?.skipped);
    const skipped = bindingsToUse.length - activeBindings.length;
    setRoundStatuses((prev) => [
      ...prev.filter((item) => item.round !== round),
      {
        round,
        stage,
        expected: activeBindings.length,
        completed: 0,
        skipped,
        mentionUsed: 0,
        mentionLimit: 2,
        mentionEvents: [],
        mentionBlocked: [],
        status: activeBindings.length ? "running" : "partial",
        updatedAt: new Date().toISOString(),
      },
    ]);
    setLiveTranscript((prev) => [
      ...prev,
      createTranscriptEntry({
        round,
        speaker: speakerLabel,
        provider: "user",
        content: instruction,
      }),
    ]);
    let completed = 0;
    let mentionUsed = 0;
    const mentionEvents: string[] = [];
    const mentionBlocked: string[] = [];
    for (const binding of activeBindings) {
      const result = await sendAndTrack(
        binding,
        customMessages?.[binding.provider] ||
          buildStagePrompt(stage, binding, topic, context, liveTranscriptRef.current, instruction, finalWriterProvider),
        speakerLabel,
        { logUserEntry: false },
      );
      const latestText = (result as { text?: string; complete?: boolean; changed?: boolean } | null)?.text?.trim() || "";
      if (latestText && stage !== "final") {
        const requestedTargets = parseAgentMentions(latestText).filter((target) => target !== binding.provider);
        if (requestedTargets.length) {
          const targetProvider = requestedTargets[0];
          const targetBinding = bindings.find((item) => item.provider === targetProvider && item.threadUrl.trim());
          const quality = inspectDiscussionQuality([
            ...liveTranscriptRef.current,
            createTranscriptEntry({
              round,
              speaker: binding.label,
              provider: binding.provider,
              content: latestText,
            }),
          ]);
          setStewardQuality(quality);
          const decision = shouldAllowAgentMention({
            stage,
            sourceProvider: binding.provider,
            targetProvider,
            latestText,
            mentionUsed,
            mentionLimit: 2,
            mentionEvents,
          });
          if (!targetBinding) {
            mentionBlocked.push(`${binding.provider}->${targetProvider}: 目标线程未绑定`);
          } else if (!decision.ok) {
            mentionBlocked.push(`${binding.provider}->${targetProvider}: ${decision.reason}`);
          } else {
            const stewardDecision = await decideMentionWithSteward({
              stage,
              sourceProvider: binding.provider,
              targetProvider,
              latestText,
              quality,
            });
            if (!stewardDecision.ok) {
              mentionBlocked.push(`${binding.provider}->${targetProvider}: ${stewardDecision.reason}`);
            } else {
              const mentionPrompt = buildMentionRelayPrompt(
                binding,
                targetBinding,
                topic,
                context,
                latestText,
                stage,
                stewardDecision.mode === "summary" ? "summary" : "full",
              );
              mentionUsed += 1;
              mentionEvents.push(`${binding.provider}->${targetProvider}:${stewardDecision.mode}`);
              setRoundStatuses((prev) =>
                prev.map((item) =>
                  item.round === round
                    ? {
                        ...item,
                        mentionUsed,
                        mentionEvents: [...mentionEvents],
                        mentionBlocked: [...mentionBlocked],
                        updatedAt: new Date().toISOString(),
                      }
                    : item,
                ),
              );
              setLiveTranscript((prev) => [
                ...prev,
                createTranscriptEntry({
                  round,
                  speaker: "系统转发",
                  provider: "system",
                  content: `${binding.label} @ ${targetBinding.label}（${stewardDecision.mode === "summary" ? "摘要协作" : "全文协作"}）`,
                  stateNote: stewardDecision.reason,
                }),
              ]);
              await sendAndTrack(targetBinding, mentionPrompt, `系统转发 · ${binding.label}@${targetBinding.label}`, { logUserEntry: false });
            }
          }
          setRoundStatuses((prev) =>
            prev.map((item) =>
              item.round === round
                ? {
                    ...item,
                    mentionUsed,
                    mentionEvents: [...mentionEvents],
                    mentionBlocked: [...mentionBlocked],
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          );
        }
      }
      completed += 1;
      setRoundStatuses((prev) =>
        prev.map((item) =>
          item.round === round
            ? {
                ...item,
                completed,
                status: completed >= item.expected ? (item.skipped > 0 ? "partial" : "done") : "running",
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      await sleep(1200);
    }
    setRoundStatuses((prev) =>
      prev.map((item) =>
        item.round === round
          ? {
              ...item,
              completed,
              status: completed >= item.expected ? (item.skipped > 0 ? "partial" : "done") : item.status,
              mentionBlocked: [...mentionBlocked],
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setAwaitingUserTurn(true);
  }

  function refreshLocalSummary() {
    const next = summarizeTranscriptLocally(liveTranscriptRef.current);
    setLocalSummary(next);
    setMemorySnapshot(compressTranscriptMemory(liveTranscriptRef.current));
    setArtifacts((prev) => mergeArtifactsWithSummary(prev, next));
    setNotice("已根据当前群聊记录刷新本地总结。");
  }

  function getStewardRelayConfig() {
    if (stewardProvider === "local") return null;
    const found = providers.find((item) => item.id === stewardProvider && item.configured);
    if (!found) return null;
    return {
      provider: found.id,
      model: found.defaultModel || undefined,
    };
  }

  async function requestStewardRelayJson<T>(task: string, fallback: () => T | Promise<T>, options?: { silentFallback?: boolean }) {
    const cfg = getStewardRelayConfig();
    if (!cfg) {
      return await fallback();
    }
    try {
      const result = await requestRelayChat(relayUrl, {
        provider: cfg.provider,
        model: cfg.model,
        system: "You are the steward layer inside AI Council. Always return strict JSON only, with no markdown fence unless necessary.",
        messages: [{ role: "user", content: task }],
        temperature: 0.2,
        maxTokens: 900,
      });
      const parsed = parseJsonBlock<T>(result.text || "");
      if (!parsed) {
        throw new Error("steward_invalid_json");
      }
      return parsed;
    } catch {
      if (!options?.silentFallback) {
        setNotice(`Steward relay 暂时不可用，已回退本地 ${stewardProvider} 规则。`);
      }
      return await fallback();
    }
  }

  function updateArtifact(kind: ArtifactKind, content: string) {
    setArtifacts((prev) =>
      prev.map((artifact) =>
        artifact.kind === kind
          ? {
              ...artifact,
              content,
              updatedAt: new Date().toISOString(),
            }
          : artifact,
      ),
    );
  }

  function syncFinalDraftToArtifacts(draft: FinalDraftRecord) {
    const providerLabel = PROVIDER_LABELS[draft.provider] || draft.provider;
    setArtifacts((prev) =>
      prev.map((artifact) => {
        if (artifact.kind === "draft") {
          return {
            ...artifact,
            content: draft.content,
            updatedAt: new Date().toISOString(),
          };
        }
        if (artifact.kind === "decision") {
          const header = `终稿已确认：${providerLabel}`;
          return {
            ...artifact,
            content: artifact.content.trim() ? `${header}\n${artifact.content}` : header,
            updatedAt: new Date().toISOString(),
          };
        }
        return artifact;
      }),
    );
  }

  async function runStewardCompression() {
    const result = await requestStewardRelayJson<{ condensed: string[]; summary?: string }>(
      [
        "请把下面这段 AI Council transcript 压缩成适合后续轮次继续使用的短记忆。",
        "返回 JSON：{\"condensed\":[\"...\"],\"summary\":\"...\"}",
        `topic: ${topic}`,
        `stage: ${discussionStage}`,
        `transcript:\n${liveTranscriptRef.current.map((entry) => `${entry.speaker}: ${entry.content}`).join("\n")}`,
      ].join("\n\n"),
      () => ({
        condensed: compressTranscriptForSteward(liveTranscriptRef.current).split("\n").filter(Boolean),
        summary: "本地压缩完成。",
      }),
    );
    setStewardMemoryText((result.condensed || []).join("\n"));
    setNotice(result.summary || "管家已生成一版上下文压缩稿。");
  }

  async function runStewardQualityCheck() {
    const result = await requestStewardRelayJson<StewardQuality>(
      [
        "请评估这场 AI Council 最近一轮的讨论质量。",
        "返回 JSON：{\"hasProgress\":true,\"isArguing\":false,\"summary\":\"...\",\"suggestion\":\"...\"}",
        `topic: ${topic}`,
        `stage: ${discussionStage}`,
        `transcript:\n${liveTranscriptRef.current.map((entry) => `${entry.speaker}: ${entry.content}`).join("\n")}`,
      ].join("\n\n"),
      () => inspectDiscussionQuality(liveTranscriptRef.current),
    );
    setStewardQuality(result);
    setNotice("管家已完成讨论质量检查。");
  }

  async function runStewardDraftBuilder() {
    const recommendedStage = recommendStewardStage(discussionStage, stewardQuality, Boolean(stageNote.trim() || composerText.trim()));
    const members = (boundBindings.length ? boundBindings : bindings).map((binding) => `${binding.provider}:${binding.label}`);
    const result = await requestStewardRelayJson<StewardDraft>(
      [
        "你是 AI Council 的 steward，请为本轮生成各成员转述稿。",
        "返回 JSON：{\"stage\":\"brief|react|revise|final\",\"summary\":\"...\",\"skipped\":[\"...\"],\"messages\":{\"openai\":\"...\",\"anthropic\":\"...\",\"gemini\":\"...\"}}",
        `recommendedStage: ${recommendedStage}`,
        `topic: ${topic}`,
        `instruction: ${stageNote || composerText || "请继续推进讨论。"}`,
        `members: ${members.join(", ")}`,
        `transcript:\n${liveTranscriptRef.current.map((entry) => `${entry.speaker}: ${entry.content}`).join("\n")}`,
      ].join("\n\n"),
      () =>
        buildStewardDraft(
          boundBindings.length ? boundBindings : bindings,
          topic,
          liveTranscriptRef.current,
          stageNote || composerText || "请继续推进讨论。",
          recommendedStage,
        ),
    );
    setStewardDraft(result);
    setDiscussionStage(result.stage || recommendedStage);
    setNotice("管家已生成本轮转述稿。");
  }

  async function decideMentionWithSteward(params: {
    stage: DiscussionStage;
    sourceProvider: WebBinding["provider"];
    targetProvider: WebBinding["provider"];
    latestText: string;
    quality: StewardQuality;
  }) {
    return await requestStewardRelayJson<StewardMentionDecision>(
      [
        "你是 AI Council 的 steward，正在判断一次成员间的受控 @ 是否值得放行。",
        "返回 JSON：{\"ok\":true,\"mode\":\"full|summary|blocked\",\"reason\":\"...\"}",
        `stage: ${params.stage}`,
        `sourceProvider: ${params.sourceProvider}`,
        `targetProvider: ${params.targetProvider}`,
        `qualitySummary: ${params.quality.summary}`,
        `qualitySuggestion: ${params.quality.suggestion}`,
        `latestText:\n${params.latestText}`,
      ].join("\n\n"),
      () =>
        stewardDecideMention({
          stage: params.stage,
          latestText: params.latestText,
          stewardProvider,
          quality: params.quality,
        }),
      { silentFallback: true },
    );
  }

  function applyStewardDraftToComposer() {
    if (!stewardDraft) {
      setNotice("先生成一版管家转述稿。");
      return;
    }
    const merged = Object.entries(stewardDraft.messages)
      .map(([provider, text]) => `@${PROVIDER_LABELS[provider] || provider}\n${text}`)
      .join("\n\n");
    setDiscussionStage(stewardDraft.stage);
    setStageNote(stewardDraft.summary);
    setComposerText(merged);
    setNotice("已把管家稿注入输入框，你可以再改一句再发。");
  }

  async function runStewardDraftRound() {
    if (!stewardDraft) {
      setNotice("先生成一版管家转述稿。");
      return;
    }
    const bindingsToUse = bindings.filter((binding) => stewardDraft.messages[binding.provider] && binding.threadUrl.trim());
    await sendStageRoundToBindings(
      stewardDraft.stage,
      stewardDraft.summary,
      bindingsToUse,
      `管家推进 · ${STAGE_LABELS[stewardDraft.stage]}`,
      stewardDraft.messages,
    );
    setNotice("已按管家稿推进一轮。");
  }

  function markTranscriptEntryState(entryId: string, state: TranscriptEntry["state"], stateNote?: string) {
    setLiveTranscript((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, state, stateNote } : entry)),
    );
  }

  async function withdrawUserMessage(entry: TranscriptEntry) {
    if (!entry.id || entry.provider !== "user" || entry.state === "withdrawn") return;
    markTranscriptEntryState(entry.id, "withdrawn", "已撤回");
    setComposerText(entry.content);
    setNotice("已撤回，原文已填入输入框。修改后直接发送即可。");
  }

  function startRedoModelReply(entry: TranscriptEntry) {
    if (!entry.id || entry.provider === "user" || entry.state === "rejected") return;
    const binding = bindings.find((item) => item.provider === entry.provider);
    if (!binding?.threadUrl.trim()) {
      setNotice("这个成员还没有绑定线程，暂时无法重做。");
      return;
    }
    setEditingReasonEntryId(entry.id);
    setEditingReasonText("");
  }

  function cancelRedoModelReply() {
    setEditingReasonEntryId(null);
    setEditingReasonText("");
  }

  async function confirmRedoModelReply(entry: TranscriptEntry) {
    const binding = bindings.find((item) => item.provider === entry.provider);
    if (!binding?.threadUrl.trim()) return;
    const reason = editingReasonText.trim();
    markTranscriptEntryState(entry.id!, "rejected", reason ? `已驳回：${reason}` : "已驳回");
    setEditingReasonEntryId(null);
    setEditingReasonText("");
    const redoPrompt = [
      `你上一条回复被甲方驳回了。`,
      topic.trim() ? `讨论主题：${topic.trim()}` : "",
      `你被驳回的内容：${entry.content}`,
      reason ? `甲方意见：${reason}` : "",
      "请重新回答，聚焦主题，给出更可执行、更贴题的版本。",
    ]
      .filter(Boolean)
      .join("\n\n");
    await sendAndTrack(binding, redoPrompt, `${binding.label} 重做`);
    setNotice(`${binding.label} 已收到重做请求。`);
  }

  async function acceptFinalDraft(draft: FinalDraftRecord) {
    setFinalDrafts((prev) => markFinalDraftStatus(prev, draft.id, "accepted", "甲方已接受终稿"));
    syncFinalDraftToArtifacts(draft);
    setSummary({
      ok: true,
      provider: draft.provider,
      model: draft.speaker,
      text: draft.content,
    });
    setDiscussionStage("final");
    setAwaitingUserTurn(true);
    setNotice(`已接受 ${draft.speaker} 的终稿，并同步到 Artifacts。`);
  }

  async function rejectFinalDraft(draft: FinalDraftRecord) {
    const reason = window.prompt("告诉这个终稿为什么被驳回。", draft.note || "") || "";
    setFinalDrafts((prev) => markFinalDraftStatus(prev, draft.id, "rejected", reason.trim() || "甲方驳回终稿"));
    const linkedEntry = liveTranscriptRef.current.find((entry) => entry.id && entry.id === draft.sourceEntryId);
    if (linkedEntry) {
      await redoModelReply(linkedEntry);
    } else {
      const binding = bindings.find((item) => item.provider === draft.provider);
      if (binding?.threadUrl.trim()) {
        await sendAndTrack(
          binding,
          [
            "你上一版终稿被甲方驳回了。",
            topic.trim() ? `讨论主题：${topic.trim()}` : "",
            `被驳回的终稿：${draft.content}`,
            reason.trim() ? `甲方意见：${reason.trim()}` : "",
            "请重新输出一版更成熟的终稿。",
          ]
            .filter(Boolean)
            .join("\n\n"),
          `${draft.speaker} 终稿重做`,
        );
      }
    }
    setNotice(`已驳回 ${draft.speaker} 的终稿，并发起重做。`);
  }

  async function handoffFinalWriter() {
    const available = boundBindings.filter((binding) => binding.provider !== finalWriterProvider);
    if (!available.length) {
      setNotice("没有其他可接手终稿的成员。");
      return;
    }
    const answer = (window.prompt(`把终稿改交给谁？可选：${available.map((item) => item.provider).join(" / ")}`, available[0].provider) || "").trim() as WebBinding["provider"];
    const target = available.find((binding) => binding.provider === answer);
    if (!target) {
      setNotice("没有匹配到新的终稿成员。");
      return;
    }
    setFinalWriterProvider(target.provider);
    setDiscussionStage("final");
    const handoff = [
      "你现在接手这一场讨论的终稿工作。",
      topic.trim() ? `讨论主题：${topic.trim()}` : "",
      stageNote.trim() ? `甲方要求：${stageNote.trim()}` : "",
      currentFinalDraft?.content ? `上一版终稿候选：\n${currentFinalDraft.content}` : "",
      "请综合前文，输出一版新的终稿，尽量比上一版更完整、更可交付。",
    ]
      .filter(Boolean)
      .join("\n\n");
    await sendStageRoundToBindings("final", handoff, [target], `终稿换人 · ${target.label}`);
    setNotice(`终稿已改交给 ${target.label}。`);
  }

  function restoreProvider(provider: WebBinding["provider"]) {
    setWebProviderStatus((prev) => ({
      ...prev,
      [provider]: {
        ...(prev[provider] ?? { phase: "idle", note: "已恢复" }),
        phase: "idle",
        note: "已恢复，可重新参与讨论",
        updatedAt: new Date().toISOString(),
        failureCount: 0,
        pendingStableCount: 0,
        skipped: false,
      },
    }));
    setNotice(`${PROVIDER_LABELS[provider] || provider} 已恢复参与。`);
  }

  function buildCurrentSession(sessionId = activeSessionId || `session_${Date.now()}`): CouncilSession {
    return {
      id: sessionId,
      title: buildSessionTitle(topic, activeRoomRecord?.sessions.length || 1),
      topic,
      context,
      stage: discussionStage,
      stageNote,
      finalWriterProvider,
      transcript: liveTranscriptRef.current,
      summary: localSummary,
      memory: compressTranscriptMemory(liveTranscriptRef.current),
      artifacts,
      finalDrafts,
      updatedAt: new Date().toISOString(),
    };
  }

  function buildCurrentRoom(roomId = activeRoomId || `room_${Date.now()}`, sessionOverride?: CouncilSession, nextActiveSessionId?: string): SavedRoom {
    const currentSession = sessionOverride ?? buildCurrentSession();
    const previousSessions = activeRoomRecord?.sessions ?? [];
    const otherSessions = previousSessions.filter((session) => session.id !== currentSession.id);
    const sessions = [currentSession, ...otherSessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return {
      id: roomId,
      title: buildRoomTitle(currentSession.topic),
      bindings,
      sessions,
      activeSessionId: nextActiveSessionId || currentSession.id,
      updatedAt: new Date().toISOString(),
    };
  }

  function loadSessionIntoState(session: CouncilSession) {
    setActiveSessionId(session.id);
    setTopic(session.topic);
    setContext(session.context);
    setDiscussionStage(session.stage);
    setStageNote(session.stageNote || "");
    setFinalWriterProvider(session.finalWriterProvider || "");
    setLiveTranscript(session.transcript);
    setLocalSummary(session.summary);
    setMemorySnapshot(session.memory);
    setArtifacts(session.artifacts);
    setFinalDrafts(session.finalDrafts);
  }

  function saveCurrentRoom() {
    const roomId = activeRoomId || `room_${Date.now()}`;
    const currentSession = buildCurrentSession();
    const room = buildCurrentRoom(roomId, currentSession, currentSession.id);
    setSavedRooms((prev) => {
      const rest = prev.filter((item) => item.id !== roomId);
      return [room, ...rest].slice(0, 20);
    });
    setActiveRoomId(roomId);
    setActiveSessionId(currentSession.id);
    setNotice("当前讨论房间已保存。");
  }

  function loadRoom(room: SavedRoom, sessionId?: string) {
    const normalized = normalizeRoomRecord(room);
    if (!normalized) return;
    const targetSession =
      normalized.sessions.find((session) => session.id === (sessionId || normalized.activeSessionId)) || normalized.sessions[0];
    setSavedRooms((prev) =>
      prev.map((item) => (item.id === normalized.id ? { ...normalized, activeSessionId: targetSession.id } : item)),
    );
    setActiveRoomId(normalized.id);
    setBindings(normalized.bindings);
    loadSessionIntoState(targetSession);
    setNotice(`已恢复房间：${normalized.title} / ${targetSession.title}`);
  }

  function createNewRoom() {
    setActiveRoomId("");
    const freshSession = createCouncilSession();
    loadSessionIntoState(freshSession);
    setActiveSessionId(freshSession.id);
    setNotice("已创建新的空白讨论房间。");
  }

  function saveCurrentSessionIntoRoom() {
    if (!activeRoomId || !activeRoomRecord) return;
    const currentSession = buildCurrentSession();
    const room = buildCurrentRoom(activeRoomId, currentSession, currentSession.id);
    setSavedRooms((prev) => [room, ...prev.filter((item) => item.id !== room.id)].slice(0, 20));
  }

  function createNewSession() {
    saveCurrentSessionIntoRoom();
    const freshSession = createCouncilSession({
      topic,
      context,
      title: buildSessionTitle("", (activeRoomRecord?.sessions.length ?? 0) + 1),
      stage: "brief",
      stageNote: "",
      finalWriterProvider: "",
      transcript: [],
      summary: null,
      memory: compressTranscriptMemory([]),
    });
    loadSessionIntoState(freshSession);
    setActiveSessionId(freshSession.id);
    if (activeRoomId) {
      const room = buildCurrentRoom(activeRoomId, freshSession, freshSession.id);
      setSavedRooms((prev) => [room, ...prev.filter((item) => item.id !== room.id)].slice(0, 20));
    }
    setNotice("已创建新的讨论 Session。");
  }

  function switchSession(sessionId: string) {
    if (!activeRoomRecord) return;
    saveCurrentSessionIntoRoom();
    const latestRoom =
      savedRooms.find((room) => room.id === activeRoomRecord.id) || buildCurrentRoom(activeRoomRecord.id, buildCurrentSession(), activeSessionId);
    const target = latestRoom.sessions.find((session) => session.id === sessionId);
    if (!target) return;
    setSavedRooms((prev) =>
      prev.map((room) => (room.id === latestRoom.id ? { ...room, activeSessionId: target.id, updatedAt: room.updatedAt } : room)),
    );
    loadSessionIntoState(target);
    setNotice(`已切换到 Session：${target.title}`);
  }

  function exportCurrentRoom() {
    const currentSession = buildCurrentSession();
    const room = buildCurrentRoom(activeRoomId || `room_${Date.now()}`, currentSession, currentSession.id);
    const blob = new Blob([JSON.stringify(room, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${room.title || "ai-council-room"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("当前房间已导出。");
  }

  async function importRoomFromFile(file: File) {
    try {
      const text = await file.text();
      const room = normalizeRoomRecord(JSON.parse(text));
      if (!room) {
        throw new Error("invalid room format");
      }
      const normalized: SavedRoom = {
        ...room,
        updatedAt: new Date().toISOString(),
      };
      setSavedRooms((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)].slice(0, 20));
      loadRoom(normalized);
      setNotice(`已导入房间：${normalized.title}`);
    } catch (error) {
      setNotice(`导入失败：${String(error)}`);
    }
  }

  function moveTurnProvider(provider: WebBinding["provider"], direction: -1 | 1) {
    setWebTurnOrder((prev) => {
      const index = prev.indexOf(provider);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  async function runWebOrchestrator() {
    if (!orderedBoundBindings.length) {
      setNotice("先绑定至少一个网页登录线程。");
      return;
    }
    stopOrchestratorRef.current = false;
    setWebOrchestrating(true);
    setWebStatus("roundtable");
    try {
      const stageForRound = discussionStage === "brief" ? "brief" : inferNextStage(discussionStage, false);
      setNotice(`严格一轮一停：本次只推进一轮 ${STAGE_LABELS[stageForRound]}，随后等待甲方继续。`);
      await sendStageRoundToBindings(
        stageForRound,
        stageNote.trim() || `请按 ${STAGE_LABELS[stageForRound]} 阶段继续推进。`,
        orderedBoundBindings.filter((binding) => shouldSendInStage(binding, stageForRound, finalWriterProvider)),
        `${STAGE_LABELS[stageForRound]} · 自动编排`,
      );
      setLocalSummary(summarizeTranscriptLocally(liveTranscriptRef.current));
      setMemorySnapshot(compressTranscriptMemory(liveTranscriptRef.current));
      setNotice(stopOrchestratorRef.current ? "网页群聊已停止。" : "本轮编排完成，已停下来等待甲方。");
    } finally {
      setWebOrchestrating(false);
      stopOrchestratorRef.current = false;
      setWebStatus("idle");
    }
  }

  function stopWebOrchestrator() {
    stopOrchestratorRef.current = true;
    setNotice("将在当前步骤结束后停止网页群聊。");
  }

  async function sendComposerMessage() {
    const payload = mentionRouting.cleanedText.trim();
    if (!payload) {
      setNotice("先写一条群聊消息。");
      return;
    }

    if (mentionRouting.unknownMentions.length) {
      setNotice(`无法识别这些 @mention：${mentionRouting.unknownMentions.map((item) => `@${item}`).join("、")}`);
      return;
    }

    if (mentionRouting.targets.includes("all")) {
      const nextStage = inferNextStage(discussionStage, true);
      await sendStageRoundToBindings(nextStage, payload, boundBindings.filter((binding) => shouldSendInStage(binding, nextStage, finalWriterProvider)), `甲方指令 · ${STAGE_LABELS[nextStage]}`);
      setComposerText("");
      return;
    }

    if (mentionRouting.targets.length) {
      const targetBindings = mentionRouting.targets
        .filter((target): target is WebBinding["provider"] => target !== "all")
        .map((target) => bindings.find((item) => item.provider === target))
        .filter((item): item is WebBinding => Boolean(item?.threadUrl.trim()));

      if (!targetBindings.length) {
        setNotice("被 @ 到的线程还没有绑定。");
        return;
      }

      for (const binding of targetBindings) {
        const targetStage = discussionStage === "final" ? "final" : "revise";
        await sendStageRoundToBindings(targetStage, payload, [binding], `定向消息 · ${STAGE_LABELS[targetStage]}`);
      }
      setComposerText("");
      return;
    }

    if (composerTarget === "all") {
      const nextStage = inferNextStage(discussionStage, true);
      await sendStageRoundToBindings(nextStage, payload, boundBindings.filter((binding) => shouldSendInStage(binding, nextStage, finalWriterProvider)), `甲方指令 · ${STAGE_LABELS[nextStage]}`);
      setComposerText("");
      return;
    }

    const binding = bindings.find((item) => item.provider === composerTarget);
    if (!binding || !binding.threadUrl.trim()) {
      setNotice("目标线程还没有绑定。");
      return;
    }
    const targetStage = discussionStage === "final" ? "final" : "revise";
    await sendStageRoundToBindings(targetStage, payload, [binding], `定向消息 · ${STAGE_LABELS[targetStage]}`);
    setComposerText("");
  }

  useEffect(() => {
    if (mode !== "web" || !autoSyncEnabled || !boundBindings.length || webOrchestrating) return;
    const timer = window.setInterval(() => {
      if (sendingWeb || syncingWeb) return;
      syncAllWebThreads({ quietNoChange: true, onlyChanged: onlyChangedSyncEnabled }).catch(() => undefined);
    }, autoSyncIntervalSec * 1000);
    return () => window.clearInterval(timer);
  }, [mode, autoSyncEnabled, autoSyncIntervalSec, boundBindings, sendingWeb, syncingWeb, webOrchestrating, onlyChangedSyncEnabled]);

  return (
    <div className="council-shell">
      <div className="council-grid">
        <aside className="panel sidebar">
          <div className="hero">
            <div>
              <div className="eyebrow">Standalone Council</div>
              <h1 className="title">AI Council</h1>
              <p className="subtitle">黑白灰的独立前端，不复用旧壳。以后可以单独打开、单独迭代、单独接网页登录自动化。</p>
            </div>
            <div className="ghost-icon">
              <Layers3 size={18} />
            </div>
          </div>

          <div className="mode-switch">
            {([
              ["api", "API Mode", "流式 roundtable、适合编排与稳定调试"],
              ["web", "Web Mode", "固定线程工位，后续接官网登录自动化"],
            ] as const).map(([value, label, copy]) => (
              <button key={value} className={`mode-card ${mode === value ? "active" : ""}`} onClick={() => setMode(value)}>
                <div className="mode-card-title">{label}</div>
                <div className="mode-card-copy">{copy}</div>
              </button>
            ))}
          </div>

          <section className="section">
            <div className="section-head">
              <div className="section-title">Room</div>
              <div className="provider-actions">
                <button className="secondary-btn" onClick={saveCurrentRoom}>
                  保存房间
                </button>
                <button className="secondary-btn" onClick={createNewRoom}>
                  新房间
                </button>
                <button className="secondary-btn" onClick={exportCurrentRoom}>
                  导出
                </button>
                <button className="secondary-btn" onClick={() => importInputRef.current?.click()}>
                  导入
                </button>
              </div>
            </div>
            <p className="notice" style={{ marginTop: 10 }}>
              {activeRoomRecord ? `当前房间：${activeRoomRecord.title}` : "当前还在未保存房间中"} ·{" "}
              {activeSessionRecord ? `当前 Session：${activeSessionRecord.title}` : "未选中 Session"}
            </p>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  importRoomFromFile(file).catch(() => undefined);
                }
                e.currentTarget.value = "";
              }}
            />
            <div className="room-list">
              {savedRooms.length ? (
                savedRooms.map((room) => (
                  <button key={room.id} className={`room-list-item ${activeRoomId === room.id ? "active" : ""}`} onClick={() => loadRoom(room)}>
                    <div className="room-list-title">{room.title}</div>
                    <div className="room-list-meta">{formatClock(room.updatedAt)} · {room.sessions.length} 个 Session</div>
                  </button>
                ))
              ) : (
                <p className="notice">还没有保存过讨论房间。</p>
              )}
            </div>
            <div className="section-head" style={{ marginTop: 14 }}>
              <div className="section-title">Session</div>
              <div className="provider-actions">
                <button className="secondary-btn" onClick={createNewSession}>
                  新 Session
                </button>
                <button className="secondary-btn" onClick={saveCurrentRoom}>
                  保存当前
                </button>
              </div>
            </div>
            <div className="room-list">
              {activeRoomRecord?.sessions.length ? (
                activeRoomRecord.sessions.map((session) => (
                  <button
                    key={session.id}
                    className={`room-list-item ${activeSessionId === session.id ? "active" : ""}`}
                    onClick={() => switchSession(session.id)}
                  >
                    <div className="room-list-title">{session.title}</div>
                    <div className="room-list-meta">{formatClock(session.updatedAt)} · {session.transcript.length} 条消息</div>
                  </button>
                ))
              ) : (
                <p className="notice">这个房间里还没有保存过 Session。</p>
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <div className="section-title">Relay</div>
              <button className="secondary-btn" onClick={() => refreshProviderList().catch(() => undefined)}>
                {loadingProviders ? "刷新中" : "刷新"}
              </button>
            </div>
            <div className="relay-row" style={{ marginTop: 12 }}>
              <input className="input" value={relayDraft} onChange={(e) => setRelayDraft(e.target.value)} />
              <button className="primary-btn" onClick={() => saveRelay().catch(() => undefined)}>
                保存
              </button>
            </div>
            <p className="notice" style={{ marginTop: 10 }}>
              当前地址：{relayUrl}
            </p>
          </section>

          {mode === "web" ? (
            <>
              <section className="section web-hero">
                <div className="web-hero-copy">
                  <div className="section-title">Gemini Workspace</div>
                  <h3 className="web-hero-title">先把 Gemini 变成你的固定讨论工位</h3>
                  <p className="notice web-hero-note">
                    这条线优先服务“不想手动同步消息”的场景。先把 Gemini 线程绑稳，后面再把 Claude 和 GPT 挂进来，就不会每次都从空白会话开始。
                  </p>
                </div>
                <div className="web-hero-actions">
                  <button className="secondary-btn strong" onClick={() => openUrl(geminiBinding.homeUrl).catch(() => undefined)}>
                    打开 Gemini
                  </button>
                  <button className="secondary-btn" onClick={() => geminiBinding.threadUrl.trim() && openUrl(geminiBinding.threadUrl).catch(() => undefined)}>
                    当前线程
                  </button>
                  <button
                    className="secondary-btn"
                    disabled={sendingWeb === "gemini"}
                    onClick={() => sendToWebThread(geminiBinding, optimizedPrompt).catch(() => undefined)}
                  >
                    {sendingWeb === "gemini" ? "发送中" : "发送优化稿"}
                  </button>
                  <button className="secondary-btn" disabled={sendingWeb === "gemini" || syncingWeb === "gemini"} onClick={() => syncFromWebThread(geminiBinding).catch(() => undefined)}>
                    {syncingWeb === "gemini" ? "读取中" : "读取回复"}
                  </button>
                </div>
              </section>

              <section className="section">
                <div className="section-head">
                  <div className="section-title">Web Control</div>
                  <div className="status-inline">{webStatus}</div>
                </div>
                <p className="notice" style={{ marginTop: 10 }}>
                  这里是 Gemini-first 的闭环入口。先发优化稿，再把最新回复同步回本地 transcript，之后可以直接继续下一轮。
                </p>
                <div className="mini-grid" style={{ marginTop: 12 }}>
                  <div>
                    <label className="label">当前阶段</label>
                    <select className="select" value={discussionStage} onChange={(e) => setDiscussionStage(e.target.value as DiscussionStage)}>
                      {Object.entries(STAGE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">终稿成员</label>
                    <select className="select" value={finalWriterProvider} onChange={(e) => setFinalWriterProvider(e.target.value as WebBinding["provider"] | "")}>
                      <option value="">未指定</option>
                      {boundBindings.map((binding) => (
                        <option key={binding.provider} value={binding.provider}>
                          {binding.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="label" style={{ marginTop: 12 }}>
                  甲方阶段说明
                </label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 92 }}
                  value={stageNote}
                  onChange={(e) => setStageNote(e.target.value)}
                  placeholder="比如：继续，但结尾要更有力；或者：请 Gemini 负责终稿。"
                />
                <div className="provider-actions" style={{ marginTop: 12 }}>
                  <button className="secondary-btn strong" disabled={sendingWeb === "gemini" || syncingWeb === "gemini"} onClick={() => startWebDiscussion().catch(() => undefined)}>
                    开始网页讨论
                  </button>
                  <button className="secondary-btn" disabled={sendingWeb === "gemini" || syncingWeb === "gemini"} onClick={() => continueWebDiscussion().catch(() => undefined)}>
                    继续一轮
                  </button>
                  <button className="secondary-btn" disabled={syncingWeb === "gemini"} onClick={() => syncFromWebThread(geminiBinding).catch(() => undefined)}>
                    同步 Gemini
                  </button>
                  <button className="secondary-btn" onClick={resetWebTranscript}>
                    清空记录
                  </button>
                </div>
                <div className="provider-actions" style={{ marginTop: 10 }}>
                  <button className="secondary-btn" disabled={!boundBindings.length} onClick={() => broadcastToBoundThreads(optimizedPrompt).catch(() => undefined)}>
                    广播到全部
                  </button>
                  <button className="secondary-btn" disabled={!boundBindings.length} onClick={() => continueAllBoundThreads().catch(() => undefined)}>
                    全部继续一轮
                  </button>
                  <button className="secondary-btn" disabled={!boundBindings.length} onClick={() => syncAllWebThreads().catch(() => undefined)}>
                    同步全部
                  </button>
                </div>
                <div className="orchestrator-panel">
                  <div className="orchestrator-head">
                    <div className="section-title">Turn Order</div>
                    <select className="select auto-sync-select" value={webRoundCount} onChange={(e) => setWebRoundCount(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value} 轮
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="turn-order-list">
                    {orderedBoundBindings.map((binding) => (
                      <div key={binding.provider} className="turn-order-item">
                        <div className="turn-order-name">{binding.label}</div>
                        <div className="turn-order-actions">
                          <button className="chip-btn" onClick={() => moveTurnProvider(binding.provider, -1)}>
                            前移
                          </button>
                          <button className="chip-btn" onClick={() => moveTurnProvider(binding.provider, 1)}>
                            后移
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="provider-actions" style={{ marginTop: 12 }}>
                    <button className="secondary-btn strong" disabled={!orderedBoundBindings.length || webOrchestrating} onClick={() => runWebOrchestrator().catch(() => undefined)}>
                      {webOrchestrating ? "编排中" : "自动轮流讨论"}
                    </button>
                    <button className="secondary-btn" disabled={!webOrchestrating} onClick={stopWebOrchestrator}>
                      停止编排
                    </button>
                    <button className="secondary-btn" disabled={!liveTranscript.length} onClick={refreshLocalSummary}>
                      一键共识总结
                    </button>
                  </div>
                </div>
                <div className="auto-sync-row">
                  <label className="auto-sync-toggle">
                    <input type="checkbox" checked={autoSyncEnabled} onChange={(e) => setAutoSyncEnabled(e.target.checked)} />
                    <span>自动轮询同步</span>
                  </label>
                  <label className="auto-sync-toggle">
                    <input type="checkbox" checked={onlyChangedSyncEnabled} onChange={(e) => setOnlyChangedSyncEnabled(e.target.checked)} />
                    <span>只同步有变化</span>
                  </label>
                  <label className="auto-sync-toggle">
                    <input type="checkbox" checked={autoDegradeEnabled} onChange={(e) => setAutoDegradeEnabled(e.target.checked)} />
                    <span>失败自动降级</span>
                  </label>
                  <select className="select auto-sync-select" value={autoSyncIntervalSec} onChange={(e) => setAutoSyncIntervalSec(Number(e.target.value))}>
                    {[5, 8, 12, 20, 30, 45, 60].map((value) => (
                      <option key={value} value={value}>
                        {value} 秒
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="section">
                <div className="section-head">
                  <div className="section-title">Fixed Threads</div>
                  <button
                    className="secondary-btn strong"
                    onClick={() =>
                      Promise.all(bindings.filter((item) => item.threadUrl.trim()).map((item) => openUrl(item.threadUrl))).catch(() => undefined)
                    }
                  >
                    打开全部
                  </button>
                </div>
                <div className="providers" style={{ marginTop: 12 }}>
                  {bindings.map((binding, index) => (
                    <div key={binding.provider} className={`provider-card ${binding.provider === "gemini" ? "provider-card-featured" : ""}`}>
                      <div className="provider-head">
                        <div className="provider-name">
                          <Globe2 size={14} />
                          {binding.label}
                        </div>
                        <span className={`status-pill ${binding.threadUrl.trim() ? "ok" : "off"}`}>{binding.threadUrl.trim() ? "Bound" : "Empty"}</span>
                      </div>
                      {binding.provider === "gemini" ? <div className="featured-tag">Primary workspace</div> : null}
                      <input
                        className="input"
                        style={{ marginTop: 10 }}
                        placeholder="粘贴固定线程 URL"
                        value={binding.threadUrl}
                        onChange={(e) =>
                          setBindings((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, threadUrl: e.target.value } : item)))
                        }
                      />
                      <div className="provider-actions">
                        <button className="chip-btn" onClick={() => openUrl(binding.homeUrl).catch(() => undefined)}>
                          官网
                        </button>
                        <button className="chip-btn" onClick={() => binding.threadUrl.trim() && openUrl(binding.threadUrl).catch(() => undefined)}>
                          线程
                        </button>
                        <button
                          className="chip-btn"
                          onClick={() => {
                            writeBindings(bindings);
                            setNotice(`${binding.label} 线程已保存。`);
                          }}
                        >
                          保存
                        </button>
                        <button
                          className="chip-btn"
                          disabled={sendingWeb === binding.provider}
                          onClick={() => sendToWebThread(binding, optimizedPrompt).catch(() => undefined)}
                        >
                          {sendingWeb === binding.provider ? "发送中" : "试发"}
                        </button>
                        <button
                          className="chip-btn"
                          disabled={syncingWeb === binding.provider}
                          onClick={() => syncFromWebThread(binding).catch(() => undefined)}
                        >
                          {syncingWeb === binding.provider ? "读取中" : "同步"}
                        </button>
                      </div>
                      {webProviderStatus[binding.provider] ? (
                        <div className="provider-runtime">
                          <span className={`status-pill ${statusTone(webProviderStatus[binding.provider].phase)}`}>
                            {WEB_PHASE_LABELS[webProviderStatus[binding.provider].phase]}
                          </span>
                          <span className="provider-runtime-note">{webProviderStatus[binding.provider].note}</span>
                        </div>
                      ) : null}
                      {webProviderStatus[binding.provider]?.skipped ? (
                        <div className="provider-actions">
                          <button className="chip-btn" onClick={() => restoreProvider(binding.provider)}>
                            恢复参与
                          </button>
                        </div>
                      ) : null}
                      {webProviderStatus[binding.provider]?.updatedAt ? (
                        <div className="provider-runtime-meta">最近同步 {formatClock(webProviderStatus[binding.provider].updatedAt)}</div>
                      ) : null}
                      {webProviderStatus[binding.provider]?.failureCount ? (
                        <div className="provider-runtime-meta">连续失败 {webProviderStatus[binding.provider].failureCount} 次</div>
                      ) : null}
                      {webProviderStatus[binding.provider]?.lastChangeAt ? (
                        <div className="provider-runtime-meta">最近变化 {formatClock(webProviderStatus[binding.provider].lastChangeAt)}</div>
                      ) : null}
                      {webProviderStatus[binding.provider]?.lastSnippet ? (
                        <div className="provider-snippet">{webProviderStatus[binding.provider].lastSnippet}</div>
                      ) : null}
                      <p className="notice" style={{ marginTop: 10 }}>
                        {binding.note}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="section">
                <div className="section-head">
                  <div className="section-title">Thread Handoff</div>
                  <button className="secondary-btn" onClick={() => copyText(handoffPacket, "续接摘要已复制。").catch(() => undefined)}>
                    复制续接包
                  </button>
                </div>
                <p className="notice" style={{ marginTop: 10 }}>
                  如果你中途要换线程，不需要手动重讲上下文。把这段贴进新线程，就能让它继续接上。
                </p>
                <textarea className="textarea handoff-box" style={{ marginTop: 12 }} value={handoffPacket} readOnly />
                <div className="provider-actions">
                  <button className="chip-btn" onClick={() => geminiBinding.threadUrl.trim() && sendToWebThread(geminiBinding, handoffPacket).catch(() => undefined)}>
                    发到 Gemini
                  </button>
                </div>
              </section>
            </>
          ) : null}

          <section className="section">
            <div className="section-title">Prompt</div>
            <label className="label" style={{ marginTop: 12 }}>
              讨论目标
            </label>
            <textarea className="textarea" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <label className="label" style={{ marginTop: 12 }}>
              补充上下文
            </label>
            <textarea className="textarea" value={context} onChange={(e) => setContext(e.target.value)} />
            <div className="mini-grid" style={{ marginTop: 12 }}>
              <div>
                <label className="label">轮数</label>
                <select className="select" value={rounds} onChange={(e) => setRounds(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>
                      {value} 轮
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">总结模型</label>
                <select className="select" value={summaryProvider} onChange={(e) => setSummaryProvider(e.target.value)}>
                  <option value="">不总结</option>
                  {participants.filter((item) => item.configured).map((item) => (
                    <option key={item.provider} value={item.provider}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="label" style={{ marginTop: 12 }}>
              发前优化稿
            </label>
            <textarea className="textarea handoff-box" value={optimizedPrompt} readOnly />
            <div className="provider-actions">
              <button className="chip-btn" onClick={() => copyText(optimizedPrompt, "优化后的发送稿已复制。").catch(() => undefined)}>
                复制优化稿
              </button>
            </div>
          </section>

          <section className="section" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            <div className="section-title">Participants</div>
            <div className="providers" style={{ marginTop: 12 }}>
              {participants.map((item, index) => (
                <div key={item.provider} className="provider-card">
                  <div className="provider-head">
                    <label className="provider-name">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        disabled={!item.configured}
                        onChange={(e) =>
                          setParticipants((prev) =>
                            prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, enabled: e.target.checked } : entry)),
                          )
                        }
                      />
                      {item.label}
                    </label>
                    <span className={`status-pill ${item.configured ? "ok" : "off"}`}>{item.configured ? "Ready" : "Off"}</span>
                  </div>
                  <input
                    className="input"
                    style={{ marginTop: 10 }}
                    value={item.model}
                    onChange={(e) =>
                      setParticipants((prev) =>
                        prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, model: e.target.value } : entry)),
                      )
                    }
                  />
                  <textarea
                    className="textarea"
                    style={{ minHeight: 72, marginTop: 10 }}
                    value={item.stancePrompt}
                    onChange={(e) =>
                      setParticipants((prev) =>
                        prev.map((entry, entryIndex) => (entryIndex === index ? { ...entry, stancePrompt: e.target.value } : entry)),
                      )
                    }
                  />
                </div>
              ))}
            </div>
          </section>

          <button className="primary-btn" style={{ height: 52, borderRadius: 18 }} disabled={running} onClick={() => runDiscussion().catch(() => undefined)}>
            {running ? "讨论进行中..." : mode === "api" ? "开始群聊讨论" : "网页登录模式已接 Gemini"}
          </button>
          <p className="notice">{notice}</p>
        </aside>

        <main className="body-pane">
          <section className="panel masthead">
            <div className="masthead-copy">
              <div className="eyebrow">Council Feed</div>
              <h2>{finalResult?.objective || topic}</h2>
              <p>这是一套全新独立入口。你可以把它当成专门的多模型讨论工作台，而不是原 app 的一个子页。</p>
              <div className="room-roster" style={{ marginTop: 10 }}>
                <div className="room-roster-item">
                  <span className="bubble-state">{STAGE_LABELS[discussionStage]}</span>
                  <span>当前阶段</span>
                </div>
                {discussionStage === "final" ? (
                  <div className="room-roster-item">
                    <span className="bubble-state">{finalWriterProvider ? PROVIDER_LABELS[finalWriterProvider] : "未指定"}</span>
                    <span>终稿成员</span>
                  </div>
                ) : null}
              </div>
              <div className="room-roster">
                {boundBindings.length ? (
                  boundBindings.map((binding) => (
                    <div key={binding.provider} className="room-roster-item">
                      <span className={`room-dot ${roomDotTone(webProviderStatus[binding.provider]?.phase)}`} />
                      <span>{binding.label}</span>
                    </div>
                  ))
                ) : (
                  <div className="room-roster-item muted">还没有绑定网页登录成员</div>
                )}
              </div>
            </div>
            <div className="state-board">
              <div className="stat-chip">
                <div className="stat-chip-label">Mode</div>
                <div className="stat-chip-value">{mode === "api" ? "API Relay" : "Web Threads"}</div>
              </div>
              <div className="stat-chip">
                <div className="stat-chip-label">Active</div>
                <div className="stat-chip-value">{enabledCount} models</div>
              </div>
              <div className="stat-chip">
                <div className="stat-chip-label">Bound</div>
                <div className="stat-chip-value">{boundCount} threads</div>
              </div>
              <div className="stat-chip">
                <div className="stat-chip-label">Ready</div>
                <div className="stat-chip-value">{readyBindingCount} live</div>
              </div>
              <div className="stat-chip">
                <div className="stat-chip-label">Status</div>
                <div className="stat-chip-value">{running ? "Discussing" : finalResult ? "Completed" : "Idle"}</div>
              </div>
            </div>
          </section>

          <div className="stage">
            <section className="panel transcript-panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Live Transcript</div>
                  <div className="panel-sub">像一个黑白灰编辑室，而不是之前那套产品壳。</div>
                </div>
                <MessageSquareMore size={16} />
              </div>
              <div className="transcript-scroll">
                {liveTranscript.length ? (
                  <div className="transcript-list">
                    {transcriptRounds.map((group) => (
                      <div key={`round-${group.round}`} className="round-group-shell">
                        <div className="round-separator">
                          <span className="round-separator-title">第 {group.round} 轮 · {group.status ? STAGE_LABELS[group.status.stage] : STAGE_LABELS[discussionStage]}</span>
                          <span className={`status-pill ${group.status?.status === "done" ? "ok" : group.status?.status === "running" ? "active" : group.status?.status === "partial" ? "warn" : "off"}`}>
                            {describeRoundStatus(group.status)}
                          </span>
                        </div>
                        {group.status?.mentionEvents.length ? (
                          <div className="provider-runtime-meta" style={{ marginTop: -6 }}>
                            本轮 @ 记录：{group.status.mentionEvents.join(" · ")}
                          </div>
                        ) : null}
                        {group.status?.mentionBlocked.length ? (
                          <div className="provider-runtime-meta" style={{ marginTop: 4 }}>
                            已拦截：{group.status.mentionBlocked.join(" · ")}
                          </div>
                        ) : null}
                        {group.entries.map((entry, index) => {
                          const key = `${entry.round}:${entry.speaker}:${entry.provider}`;
                          return (
                            <article
                              key={`${entry.id || key}:${index}`}
                              className={`bubble ${entry.provider === "user" ? "user" : ""} ${entry.state === "withdrawn" ? "is-withdrawn" : ""} ${
                                entry.state === "rejected" ? "is-rejected" : ""
                              }`}
                            >
                              <div className="bubble-meta">
                                <span>{entry.speaker}</span>
                                <span>Round {entry.round}</span>
                                {entry.state && entry.state !== "active" ? <span className="bubble-state">{entry.stateNote || entry.state}</span> : null}
                                {activeSpeakerKey === key ? <span className="typing-dot">typing</span> : null}
                              </div>
                              <div className="bubble-text">{entry.content}</div>
                              <div className="bubble-actions">
                                {entry.provider === "user" && entry.state !== "withdrawn" ? (
                                  <button className="chip-btn" onClick={() => withdrawUserMessage(entry).catch(() => undefined)}>
                                    撤回
                                  </button>
                                ) : null}
                                {entry.provider !== "user" && entry.provider !== "system" && entry.state !== "rejected" ? (
                                  <button className="chip-btn" onClick={() => redoModelReply(entry).catch(() => undefined)}>
                                    重做
                                  </button>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty">
                    <div className="empty-box">
                      <div className="empty-icon">
                        {running ? <LoaderCircle size={20} className="animate-spin" /> : <Sparkles size={20} />}
                      </div>
                      <h3 className="empty-title">{running ? "模型正在连线" : "等待第一场讨论"}</h3>
                      <p className="empty-copy">左边填好目标和上下文，点一次开始。这个 standalone 页面以后可以单独打磨成你真正想要的产品界面。</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="composer-bar">
                <div className="composer-actions">
                  <button className="secondary-btn" disabled={sendingWeb !== null || syncingWeb !== null} onClick={() => continueAllBoundThreads().catch(() => undefined)}>
                    继续一轮
                  </button>
                  <button
                    className="secondary-btn"
                    disabled={sendingWeb !== null || syncingWeb !== null || !finalWriterProvider}
                    onClick={() =>
                      sendStageRoundToBindings(
                        "final",
                        stageNote.trim() || "请综合前面全部讨论，输出终稿。",
                        boundBindings.filter((binding) => shouldSendInStage(binding, "final", finalWriterProvider)),
                        "终稿指令",
                      ).catch(() => undefined)
                    }
                  >
                    终稿
                  </button>
                  <span className="mention-hint">
                    {awaitingUserTurn ? "本轮已结束，正在等待甲方继续或改方向。" : "甲方控制模式：每轮结束后停下来，等你继续或插话。"}
                  </span>
                </div>
                <div className="composer-row">
                  <select className="select composer-target" value={composerTarget} onChange={(e) => setComposerTarget(e.target.value as typeof composerTarget)}>
                    <option value="all">发给全部</option>
                    {bindings.map((binding) => (
                      <option key={binding.provider} value={binding.provider}>
                        发给 {binding.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="textarea composer-input"
                    placeholder="直接在这里插话，让群聊继续。"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                  />
                  <button className="primary-btn composer-send" onClick={() => sendComposerMessage().catch(() => undefined)}>
                    发送
                  </button>
                </div>
                <div className="composer-actions">
                  <button className="chip-btn" onClick={() => setComposerText(buildQuickPrompt("challenge", topic, liveTranscript))}>
                    挑战假设
                  </button>
                  <button className="chip-btn" onClick={() => setComposerText(buildQuickPrompt("summary", topic, liveTranscript))}>
                    总结分歧
                  </button>
                  <button className="chip-btn" onClick={() => setComposerText(buildQuickPrompt("next", topic, liveTranscript))}>
                    要下一步
                  </button>
                </div>
                <div className="mention-bar">
                  <span className="mention-label">路由预览</span>
                  {mentionRouting.targets.length ? (
                    mentionRouting.targets.map((target) => (
                      <span key={target} className="mention-chip">
                        {target === "all" ? "@all" : `@${PROVIDER_LABELS[target] || target}`}
                      </span>
                    ))
                  ) : (
                    <span className="mention-hint">
                      {composerTarget === "all" ? "未写 @mention，当前会发给全部" : `未写 @mention，当前会发给 ${PROVIDER_LABELS[composerTarget] || composerTarget}`}
                    </span>
                  )}
                  {mentionRouting.unknownMentions.length ? (
                    <span className="mention-error">未知：{mentionRouting.unknownMentions.map((item) => `@${item}`).join("、")}</span>
                  ) : null}
                </div>
              </div>
            </section>

            <aside className="summary-panel">
              <section className="panel round-card">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Round Ledger</div>
                    <div className="panel-sub">按轮记录，而不是埋在旧 UI 里。</div>
                  </div>
                  <Bot size={16} />
                </div>
                <div className="round-scroll">
                  {finalResult?.roundResults?.length ? (
                    <div className="transcript-list">
                      {finalResult.roundResults.map((round) => (
                        <div key={round.round} className="round-group">
                          <div className="round-tag">Round {round.round}</div>
                          <div className="round-items">
                            {round.responses.map((entry, index) => (
                              <div key={index} className="round-item">
                                <div className="round-item-title">{entry.speaker}</div>
                                <div className="round-item-copy">{"ok" in entry && entry.ok === false ? entry.message : entry.content}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="notice">完成一场讨论后，这里会按轮落账。</p>
                  )}
                </div>
              </section>

              <section className="panel memory-card">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Room Memory</div>
                    <div className="panel-sub">更早消息会压缩在这里，后续轮次优先带这份短记忆。</div>
                  </div>
                </div>
                <div className="round-scroll">
                  {memorySnapshot.condensed.length ? (
                    <div className="memory-list">
                      {memorySnapshot.condensed.map((item, index) => (
                        <div key={`${index}:${item.slice(0, 20)}`} className="memory-item">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="notice">当前还没有需要压缩的更早消息，等对话更长时这里会自动沉淀。</p>
                  )}
                </div>
              </section>

              <section className="summary-card">
                <div className="eyebrow" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Summary
                </div>
                <div className="panel-sub" style={{ marginTop: 8 }}>
                  {summary && "ok" in summary && summary.ok ? `${summary.provider} 输出` : localSummary ? "本地总结器" : "等待总结模型"}
                </div>
                <div className="summary-text">
                  {summary
                    ? "ok" in summary && summary.ok
                      ? summary.text
                      : summary.message
                    : localSummary
                      ? [
                          localSummary.consensus.length ? `共识\n${localSummary.consensus.map((item) => `- ${item}`).join("\n")}` : "",
                          localSummary.tensions.length ? `\n分歧\n${localSummary.tensions.map((item) => `- ${item}`).join("\n")}` : "",
                          localSummary.nextActions.length ? `\n下一步\n${localSummary.nextActions.map((item) => `- ${item}`).join("\n")}` : "",
                        ]
                          .filter(Boolean)
                          .join("\n")
                      : "如果启用了总结模型，最后的共识、分歧和建议下一步会留在这里。"}
                </div>
              </section>

              <section className="panel round-card">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Final Review</div>
                    <div className="panel-sub">阶段五：终稿候选、接受驳回、换人重写都在这里闭环。</div>
                  </div>
                  <Sparkles size={16} />
                </div>
                <div className="round-scroll">
                  {currentFinalDraft ? (
                    <div className="provider-card">
                      <div className="provider-head">
                        <div className="provider-name">{currentFinalDraft.speaker}</div>
                        <span className={`status-pill ${currentFinalDraft.status === "accepted" ? "ok" : currentFinalDraft.status === "candidate" ? "active" : "warn"}`}>
                          {currentFinalDraft.status}
                        </span>
                      </div>
                      <div className="provider-runtime-meta" style={{ marginTop: 8 }}>
                        第 {currentFinalDraft.round} 轮 · {PROVIDER_LABELS[currentFinalDraft.provider] || currentFinalDraft.provider}
                      </div>
                      {currentFinalDraft.note ? (
                        <div className="provider-runtime-meta" style={{ marginTop: 6 }}>
                          {currentFinalDraft.note}
                        </div>
                      ) : null}
                      <textarea className="textarea" style={{ minHeight: 140, marginTop: 10 }} value={currentFinalDraft.content} readOnly />
                      <div className="provider-actions" style={{ marginTop: 10 }}>
                        <button className="secondary-btn" onClick={() => acceptFinalDraft(currentFinalDraft).catch(() => undefined)}>
                          接受终稿
                        </button>
                        <button className="secondary-btn" onClick={() => rejectFinalDraft(currentFinalDraft).catch(() => undefined)}>
                          驳回重做
                        </button>
                        <button className="secondary-btn" onClick={() => handoffFinalWriter().catch(() => undefined)}>
                          换人重写
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="notice" style={{ marginTop: 12 }}>
                      还没有捕获到终稿候选。进入终稿阶段并收到终稿回复后，这里会出现审稿面板。
                    </p>
                  )}
                  {finalDraftHistory.length ? (
                    <div className="providers" style={{ marginTop: 12 }}>
                      {finalDraftHistory.map((draft) => (
                        <div key={draft.id} className="provider-card">
                          <div className="provider-head">
                            <div className="provider-name">
                              {draft.speaker} · 第 {draft.round} 轮
                            </div>
                            <span className={`status-pill ${draft.status === "accepted" ? "ok" : draft.status === "candidate" ? "active" : "off"}`}>
                              {draft.status}
                            </span>
                          </div>
                          {draft.note ? (
                            <div className="provider-runtime-meta" style={{ marginTop: 8 }}>
                              {draft.note}
                            </div>
                          ) : null}
                          <div className="provider-snippet" style={{ marginTop: 10 }}>
                            {buildSnippet(draft.content)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="panel round-card">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Steward</div>
                    <div className="panel-sub">阶段 3 的管家层雏形：先本地可用，后续再切到 DeepSeek。</div>
                  </div>
                  <div className="status-inline">{stewardProvider}</div>
                </div>
                <div className="provider-actions" style={{ marginTop: 12 }}>
                  <select className="select auto-sync-select" value={stewardProvider} onChange={(e) => setStewardProvider(e.target.value as StewardRelayProvider)}>
                    {stewardRelayOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button className="chip-btn" onClick={() => runStewardDraftBuilder().catch(() => undefined)}>
                    生成转述稿
                  </button>
                  <button className="chip-btn" onClick={() => runStewardCompression().catch(() => undefined)}>
                    压缩上下文
                  </button>
                  <button className="chip-btn" onClick={() => runStewardQualityCheck().catch(() => undefined)}>
                    质量检查
                  </button>
                  <button className="chip-btn" onClick={applyStewardDraftToComposer}>
                    注入输入框
                  </button>
                  <button className="chip-btn" onClick={() => runStewardDraftRound().catch(() => undefined)}>
                    按管家稿推进
                  </button>
                </div>
                <div className="round-scroll">
                  <p className="notice" style={{ marginTop: 12 }}>
                    当前仲裁规则：终稿阶段禁止 @；每轮全局最多 2 次；每个成员每轮最多 1 次；检测到来回互 ping、短回复、疑似吵架会直接拦截。
                  </p>
                  {stewardDraft ? (
                    <div className="providers" style={{ marginTop: 12 }}>
                      <div className="provider-card">
                        <div className="provider-head">
                          <div className="provider-name">转述概览</div>
                        </div>
                        <div className="provider-runtime-meta" style={{ marginTop: 8 }}>
                          推荐阶段：{STAGE_LABELS[stewardDraft.stage]} · {stewardDraft.summary}
                        </div>
                        {Object.entries(stewardDraft.messages).map(([provider, text]) => (
                          <div key={provider} style={{ marginTop: 10 }}>
                            <div className="provider-runtime-meta">{PROVIDER_LABELS[provider] || provider}</div>
                            <textarea className="textarea" style={{ minHeight: 88, marginTop: 6 }} value={text} readOnly />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {stewardMemoryText ? (
                    <div className="provider-card" style={{ marginTop: 12 }}>
                      <div className="provider-head">
                        <div className="provider-name">压缩记忆</div>
                      </div>
                      <textarea className="textarea" style={{ minHeight: 110, marginTop: 10 }} value={stewardMemoryText} readOnly />
                    </div>
                  ) : null}
                  {stewardQuality ? (
                    <div className="provider-card" style={{ marginTop: 12 }}>
                      <div className="provider-head">
                        <div className="provider-name">质量提示</div>
                      </div>
                      <div className="provider-runtime-meta" style={{ marginTop: 8 }}>
                        {stewardQuality.summary}
                      </div>
                      <div className="provider-snippet" style={{ marginTop: 10 }}>
                        {stewardQuality.suggestion}
                      </div>
                    </div>
                  ) : null}
                  {!stewardDraft && !stewardMemoryText && !stewardQuality ? (
                    <p className="notice" style={{ marginTop: 12 }}>
                      这里会逐步长成真正的管家层。当前版本先把三件事做本地化：转述编排、上下文压缩、讨论质量提示。
                    </p>
                  ) : null}
                </div>
              </section>

              <section className="panel round-card">
                <div className="panel-head">
                  <div>
                    <div className="panel-title">Artifacts</div>
                    <div className="panel-sub">每个 Session 自带产物层，后面可以继续升级成导出稿、决策单和交付物。</div>
                  </div>
                </div>
                <div className="round-scroll">
                  <div className="providers" style={{ marginTop: 0 }}>
                    {artifacts.map((artifact) => (
                      <div key={artifact.id} className="provider-card">
                        <div className="provider-head">
                          <div className="provider-name">{ARTIFACT_LABELS[artifact.kind]}</div>
                          <span className="status-pill off">{formatClock(artifact.updatedAt)}</span>
                        </div>
                        <div className="provider-runtime-meta" style={{ marginTop: 8 }}>
                          {artifact.title}
                        </div>
                        <textarea
                          className="textarea"
                          style={{ minHeight: 96, marginTop: 10 }}
                          value={artifact.content}
                          onChange={(e) => updateArtifact(artifact.kind, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
