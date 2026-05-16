const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const DEEPSEEK_MODEL = "deepseek-chat";

const KEY_STORAGE = "standalone_ai_council_deepseek_key";

function getApiKey(): string {
  try {
    const raw = localStorage.getItem(KEY_STORAGE);
    return raw?.trim() || "";
  } catch {
    return "";
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key.trim());
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

async function callDeepSeek(systemPrompt: string, userMessage: string, maxTokens = 900): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("DEEPSEEK_NO_KEY");

  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`DeepSeek API ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DEEPSEEK_EMPTY_RESPONSE");
  return content;
}

function parseJson<T>(text: string): T | null {
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

// ─── composeMessages ─────────────────────────────────────────────

export interface ComposeInput {
  topic: string;
  userMessage: string;
  currentRound: number;
  members: string[];
  latestReplies: Record<string, string>;
  quotaStatus: Record<string, { used: number; limit: number; status: string }>;
}

export interface ComposeOutput {
  messages: Record<string, string>;
  skip: string[];
  stage: string;
  summary: string;
}

const COMPOSE_SYSTEM = `你是 AI Council 的管家（steward），负责转述编排。
你的任务：根据用户的指令、当前讨论上下文、额度状态，为每个 AI 成员生成它本轮应该收到的消息。

铁律：
1. 每条消息以【讨论主题】开头。
2. 每条消息不超过 800 字。
3. 不得包含引导模型互相反驳或争论的语言。
4. 如果某成员额度紧张（usage >= 80%），考虑跳过该成员并在 skip 中列出。
5. 根据讨论阶段（brief/react/revise/final）调整消息的引导方向。
6. 消息是对该成员说的"你该做什么"，不要包含其他成员的完整回复。

只输出 JSON，不要任何其他内容。
JSON 格式：
{
  "stage": "brief|react|revise|final",
  "summary": "简短说明本轮编排逻辑",
  "skip": ["跳过的成员名"],
  "messages": { "成员名": "发给该成员的内容" }
}`;

export async function composeMessages(input: ComposeInput): Promise<ComposeOutput> {
  const userMsg = [
    `【用户指令】${input.userMessage}`,
    `【当前轮次】第 ${input.currentRound} 轮`,
    `【成员列表】${input.members.join(", ")}`,
    input.quotaStatus && Object.keys(input.quotaStatus).length
      ? `【额度状态】\n${Object.entries(input.quotaStatus)
          .map(([k, v]) => `  ${k}: ${v.used}/${v.limit} (${v.status})`)
          .join("\n")}`
      : "",
    input.latestReplies && Object.keys(input.latestReplies).length
      ? `【上轮摘要】\n${Object.entries(input.latestReplies)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await callDeepSeek(COMPOSE_SYSTEM, userMsg, 900);
  const parsed = parseJson<ComposeOutput>(text);
  if (!parsed || !parsed.messages) throw new Error("STEWARD_COMPOSE_INVALID");
  return parsed;
}

// ─── compressReply ───────────────────────────────────────────────

const COMPRESS_SYSTEM = `你是 AI Council 的管家，负责将 AI 模型的回复压缩为 2-3 句摘要。
摘要要聚焦于：该模型的核心观点、提出的建议或风险、与其他成员的分歧点。
只输出 2-3 句中文摘要，不要 JSON，不要任何前缀。`;

export async function compressReply(input: {
  provider: string;
  fullReply: string;
  topic: string;
}): Promise<string> {
  const userMsg = [
    `【讨论主题】${input.topic}`,
    `【模型】${input.provider}`,
    `【完整回复】\n${input.fullReply}`,
    "请给出 2-3 句摘要。",
  ].join("\n");
  return await callDeepSeek(COMPRESS_SYSTEM, userMsg, 300);
}

// ─── detectArguing ───────────────────────────────────────────────

const ARGUE_SYSTEM = `你是 AI Council 的管家，负责检测多模型讨论是否落入了无意义争论（"吵架"）。
判断标准：
- 两个以上成员在互相反驳但没提出新信息
- 回复语气情绪化（"你错了""你不懂""这不对"）
- 内容开始重复循环，没有推进

只输出 JSON，不要任何其他内容。
JSON 格式：
{
  "isArguing": true,
  "reason": "简短说明为什么判断为吵架（或为什么没有）",
  "suggestion": "如果是吵架，给出甲方下一步建议"
}`;

export async function detectArguing(input: {
  provider: string;
  reply: string;
  previousReplies: Record<string, string>;
}): Promise<{ isArguing: boolean; reason: string; suggestion: string }> {
  const userMsg = [
    `【最新回复】\n${input.provider}: ${input.reply}`,
    input.previousReplies && Object.keys(input.previousReplies).length
      ? `【此前回复】\n${Object.entries(input.previousReplies)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const text = await callDeepSeek(ARGUE_SYSTEM, userMsg, 500);
  const parsed = parseJson<{ isArguing: boolean; reason: string; suggestion: string }>(text);
  if (!parsed) throw new Error("STEWARD_ARGUE_INVALID");
  return parsed;
}

// ─── evaluateQuota ───────────────────────────────────────────────

const QUOTA_SYSTEM = `你是 AI Council 的管家，负责额度预警和建议分配策略。
根据各模型的当前用量和预估剩余轮数，判断哪些模型需要预警，建议本轮优先使用顺序。

只输出 JSON，不要任何其他内容。
JSON 格式：
{
  "warnings": ["对用户的预警文本"],
  "recommendedOrder": ["按优先顺序排列的 provider id"],
  "suggestion": "简短建议"
}`;

export async function evaluateQuota(input: {
  quotaTrackers: Record<string, { used: number; limit: number; resetIn: string; status: string }>;
  estimatedRoundsLeft: number;
}): Promise<{ warnings: string[]; recommendedOrder: string[]; suggestion: string }> {
  const userMsg = [
    `【预估剩余轮数】${input.estimatedRoundsLeft}`,
    `【各模型额度】`,
    ...Object.entries(input.quotaTrackers).map(
      ([k, v]) => `  ${k}: ${v.used}/${v.limit}, 状态=${v.status}, 重置=${v.resetIn}`,
    ),
  ].join("\n");
  const text = await callDeepSeek(QUOTA_SYSTEM, userMsg, 500);
  const parsed = parseJson<{ warnings: string[]; recommendedOrder: string[]; suggestion: string }>(text);
  if (!parsed) throw new Error("STEWARD_QUOTA_INVALID");
  return parsed;
}

// ─── summarizeRound ───────────────────────────────────────────────

const ROUND_SUMMARY_SYSTEM = `你是 AI Council 的管家，负责在每轮结束后给用户（甲方）一个极简概览。
用 2 句话总结：
1. 这一轮有没有实质进展
2. 建议下一步做什么

只输出 2 句话，不要 JSON，不要任何前缀。`;

export async function summarizeRoundLegacy(input: {
  topic: string;
  roundNumber: number;
  replies: Record<string, string>;
  userFeedback?: string;
}): Promise<string> {
  const userMsg = [
    `【讨论主题】${input.topic}`,
    `【轮次】第 ${input.roundNumber} 轮`,
    input.userFeedback ? `【用户反馈】${input.userFeedback}` : "",
    `【各模型回复摘要】\n${Object.entries(input.replies)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n")}`,
  ].join("\n");
  return await callDeepSeek(ROUND_SUMMARY_SYSTEM, userMsg, 300);
}

// 向后兼容别名
export { summarizeRoundLegacy as summarizeRound };

// ─── Phase 3: 新管家函数 ─────────────────────────────────────────

/** 简化版 DeepSeek 调用（单 prompt + apiKey） */
async function callDeepSeekWithKey(prompt: string, apiKey: string, maxTokens = 900): Promise<string> {
  const resp = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`DeepSeek API ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DEEPSEEK_EMPTY_RESPONSE");
  return content;
}

export interface WorkflowStep {
  step: number;
  provider: string;
  name: string;
  task: string;
}

const DEFAULT_WORKFLOW_STEPS: WorkflowStep[] = [
  { step: 1, provider: 'claude', name: '制定框架', task: '分析问题核心，给出整体思路和方案框架' },
  { step: 2, provider: 'gemini', name: '创意发散', task: '基于框架提供创新视角和发散思维' },
  { step: 3, provider: 'chatgpt', name: '信息补充', task: '补充相关信息、数据和案例支撑' },
  { step: 4, provider: 'gemini', name: '写作草稿', task: '综合前几步内容，写出完整草稿' },
  { step: 5, provider: 'claude', name: '审查完善', task: '检查草稿，提出修改意见和完善建议' },
  { step: 6, provider: 'chatgpt', name: '修改终稿', task: '根据意见修改，生成最终版本' },
  { step: 7, provider: 'claude', name: '最终审核', task: '最终把关，确认质量达标或指出问题' },
];

// 1. 每轮结束后生成摘要（群聊模式）
export async function summarizeRoundNew(
  round: number,
  topic: string,
  replies: Record<string, string>,
  apiKey: string
): Promise<string> {
  const prompt = `你是一个多模型讨论的管家助手。以下是第${round}轮各AI的回复：

${Object.entries(replies).map(([p, r]) => `【${p}】${r}`).join('\n\n')}

请用200字以内总结本轮的核心观点、共识和分歧，供下一轮参考。用中文回复，简洁直接。`;

  return await callDeepSeekWithKey(prompt, apiKey);
}

// 2. 检测车轱辘话（连续两轮重复度高）
export function detectRepetition(
  currentReplies: Record<string, string>,
  previousReplies: Record<string, string>
): string[] {
  const repeated: string[] = [];
  Object.entries(currentReplies).forEach(([provider, current]) => {
    const prev = previousReplies[provider];
    if (!prev) return;
    const currentWords = new Set(current.split(/\s+/));
    const prevWords = new Set(prev.split(/\s+/));
    const intersection = [...currentWords].filter(w => prevWords.has(w)).length;
    const similarity = intersection / Math.max(currentWords.size, prevWords.size);
    if (similarity > 0.7) repeated.push(provider);
  });
  return repeated;
}

// 3. 分析议题，推荐工作流步骤
export async function analyzeTopicForWorkflow(
  topic: string,
  apiKey: string
): Promise<WorkflowStep[]> {
  const prompt = `你是一个项目管理助手。用户想讨论或完成以下任务：

"${topic}"

请分析这个任务，推荐一个5-7步的接力协作流程。
每步指定：执行者（从 chatgpt/claude/gemini 中选一个）、任务名称（10字内）、具体任务描述（50字内）。

只返回 JSON 数组，格式如下，不要有任何其他文字：
[
  {"step": 1, "provider": "claude", "name": "制定框架", "task": "分析问题核心，给出整体思路和框架"},
  {"step": 2, "provider": "gemini", "name": "创意发散", "task": "基于框架提供创新视角和补充想法"}
]`;

  const result = await callDeepSeekWithKey(prompt, apiKey);
  try {
    return JSON.parse(result.replace(/```json|```/g, '').trim());
  } catch {
    return DEFAULT_WORKFLOW_STEPS;
  }
}

// 4. 为工作流每步构建 prompt（包含前面所有步骤的产出）
export function buildWorkflowStepPrompt(
  topic: string,
  currentStep: WorkflowStep,
  previousOutputs: Record<number, string>
): string {
  const history = Object.entries(previousOutputs)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([step, output]) => `【第${step}步产出】${output}`)
    .join('\n\n');

  return `你正在参与一个多AI协作工作流，用中文回复。

【议题】${topic}

${history ? `【前面步骤的产出】\n${history}\n` : ''}
【你的任务（第${currentStep.step}步/${currentStep.name}）】
${currentStep.task}

请直接给出你的输出，不要重复前面的内容，聚焦在你的任务上。`;
}

// 5. 为群聊每轮构建 prompt
export function buildRoundtablePrompt(
  topic: string,
  provider: string,
  round: number,
  contextPkg: { skeleton: string; summary: string; recentRounds: string },
  userMessage: string
): string {
  const parts = [
    `你正在参与一个多AI群聊讨论，用中文回复，不超过300字。`,
    `【讨论主题】${topic}`,
  ];
  if (contextPkg.skeleton) parts.push(`【背景总纲】${contextPkg.skeleton}`);
  if (contextPkg.summary) parts.push(`【前情摘要】${contextPkg.summary}`);
  if (contextPkg.recentRounds) parts.push(`【最近讨论】\n${contextPkg.recentRounds}`);
  parts.push(`【用户发言（第${round}轮）】${userMessage}`);
  parts.push(`请直接发表你的观点，不要重复别人说过的内容。`);
  return parts.join('\n\n');
}
