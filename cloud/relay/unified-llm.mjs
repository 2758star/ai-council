const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/$/, "");
const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-5").trim();

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();
const ANTHROPIC_BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const ANTHROPIC_MODEL = (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514").trim();
const ANTHROPIC_VERSION = (process.env.ANTHROPIC_VERSION || "2023-06-01").trim();

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_BASE_URL = (
  process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta"
).replace(/\/$/, "");
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();

const EXTRA_PROVIDERS_JSON = (process.env.LLM_EXTRA_PROVIDERS_JSON || "").trim();

function safeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function json(res, statusCode, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error("payload_too_large");
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function parseExtraProviders() {
  if (!EXTRA_PROVIDERS_JSON) {
    return [];
  }
  try {
    const parsed = JSON.parse(EXTRA_PROVIDERS_JSON);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

function inferOpenAICompatPath(baseUrl, explicitPath) {
  const cleanPath = safeText(explicitPath);
  if (cleanPath) {
    return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  }
  if (baseUrl.endsWith("/chat/completions")) {
    return "";
  }
  return "/v1/chat/completions";
}

function buildBuiltinProviders() {
  return [
    {
      id: "openai",
      family: "openai_responses",
      apiStyle: "responses",
      stream: "sse",
      configured: Boolean(OPENAI_API_KEY),
      apiKey: OPENAI_API_KEY,
      baseUrl: OPENAI_BASE_URL,
      defaultModel: OPENAI_MODEL,
    },
    {
      id: "anthropic",
      family: "anthropic_messages",
      apiStyle: "messages",
      stream: "sse",
      configured: Boolean(ANTHROPIC_API_KEY),
      apiKey: ANTHROPIC_API_KEY,
      baseUrl: ANTHROPIC_BASE_URL,
      defaultModel: ANTHROPIC_MODEL,
      anthropicVersion: ANTHROPIC_VERSION,
    },
    {
      id: "gemini",
      family: "gemini_generate_content",
      apiStyle: "generateContent",
      stream: "sse",
      configured: Boolean(GEMINI_API_KEY),
      apiKey: GEMINI_API_KEY,
      baseUrl: GEMINI_BASE_URL,
      defaultModel: GEMINI_MODEL,
    },
  ];
}

function buildExtraProviders() {
  return parseExtraProviders().map((item) => {
    const id = safeText(item.id).toLowerCase();
    const family = safeText(item.family || item.apiStyle || "openai_compatible").toLowerCase();
    const apiKey = safeText(item.apiKey || (item.apiKeyEnv ? process.env[safeText(item.apiKeyEnv)] : ""));
    const baseUrl = safeText(item.baseUrl).replace(/\/$/, "");
    const defaultModel = safeText(item.defaultModel || item.model);
    const headers = item.headers && typeof item.headers === "object" ? item.headers : {};
    return {
      id,
      family,
      apiStyle: family,
      stream: "sse",
      configured: Boolean(apiKey),
      apiKey,
      baseUrl,
      defaultModel,
      headers,
      path: inferOpenAICompatPath(baseUrl, item.path),
      anthropicVersion: safeText(item.anthropicVersion || item.version || ANTHROPIC_VERSION),
    };
  });
}

function getProviderCatalog() {
  return [...buildBuiltinProviders(), ...buildExtraProviders()].map((item) => ({
    id: item.id,
    family: item.family,
    configured: item.configured,
    defaultModel: item.defaultModel,
    apiStyle: item.apiStyle,
    stream: item.stream,
  }));
}

function getProviderConfig(providerId) {
  const normalized = safeText(providerId).toLowerCase();
  const catalog = [...buildBuiltinProviders(), ...buildExtraProviders()];
  const match = catalog.find((item) => item.id === normalized);
  if (!match) {
    throw new Error(`unsupported_provider:${providerId}`);
  }
  return match;
}

function normalizeMessages(messages, system) {
  const input = Array.isArray(messages) ? messages : [];
  const normalized = [];
  const systemParts = [];
  if (safeText(system)) {
    systemParts.push(safeText(system));
  }
  for (const item of input) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const role = safeText(item.role).toLowerCase();
    const content = safeText(item.content);
    if (!content) {
      continue;
    }
    if (role === "system" || role === "developer") {
      systemParts.push(content);
      continue;
    }
    if (!["user", "assistant"].includes(role)) {
      continue;
    }
    normalized.push({ role, content });
  }
  if (!normalized.length) {
    normalized.push({ role: "user", content: "" });
  }
  return {
    system: systemParts.join("\n\n").trim(),
    messages: normalized,
  };
}

function coerceRequestBody(payload) {
  const provider = safeText(payload?.provider).toLowerCase();
  const model = safeText(payload?.model);
  const temperature =
    typeof payload?.temperature === "number" && Number.isFinite(payload.temperature)
      ? payload.temperature
      : undefined;
  const maxTokens =
    typeof payload?.maxTokens === "number" && Number.isFinite(payload.maxTokens)
      ? Math.max(1, Math.floor(payload.maxTokens))
      : undefined;
  const includeRaw = payload?.includeRaw === true;
  const normalized = normalizeMessages(payload?.messages, payload?.system);
  return {
    provider,
    model,
    temperature,
    maxTokens,
    includeRaw,
    system: normalized.system,
    messages: normalized.messages,
  };
}

function extractOpenAIResponsesText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks = [];
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (typeof part?.text === "string" && part.text) {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("").trim();
}

function extractOpenAICompatibleText(payload) {
  return safeText(payload?.choices?.[0]?.message?.content);
}

function extractAnthropicText(payload) {
  return (payload?.content || [])
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("")
    .trim();
}

function extractGeminiText(payload) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

function normalizeUsage(family, payload) {
  if (family === "openai_responses") {
    const usage = payload?.usage || {};
    return {
      inputTokens: usage.input_tokens ?? null,
      outputTokens: usage.output_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
    };
  }
  if (family === "openai_compatible") {
    const usage = payload?.usage || {};
    return {
      inputTokens: usage.prompt_tokens ?? null,
      outputTokens: usage.completion_tokens ?? null,
      totalTokens: usage.total_tokens ?? null,
    };
  }
  if (family === "anthropic_messages") {
    const usage = payload?.usage || {};
    const inputTokens = usage.input_tokens ?? null;
    const outputTokens = usage.output_tokens ?? null;
    return {
      inputTokens,
      outputTokens,
      totalTokens:
        inputTokens !== null && outputTokens !== null ? Number(inputTokens) + Number(outputTokens) : null,
    };
  }
  const usage = payload?.usageMetadata || {};
  return {
    inputTokens: usage.promptTokenCount ?? null,
    outputTokens: usage.candidatesTokenCount ?? null,
    totalTokens: usage.totalTokenCount ?? null,
  };
}

function buildOpenAIResponsesBody(input, stream) {
  const body = {
    model: input.model,
    input: input.messages.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    stream,
  };
  if (input.system) {
    body.instructions = input.system;
  }
  if (input.temperature !== undefined) {
    body.temperature = input.temperature;
  }
  if (input.maxTokens !== undefined) {
    body.max_output_tokens = input.maxTokens;
  }
  return body;
}

function buildOpenAICompatibleBody(input, stream) {
  const messages = [];
  if (input.system) {
    messages.push({ role: "system", content: input.system });
  }
  messages.push(...input.messages.map((item) => ({ role: item.role, content: item.content })));
  const body = {
    model: input.model,
    messages,
    stream,
  };
  if (input.temperature !== undefined) {
    body.temperature = input.temperature;
  }
  if (input.maxTokens !== undefined) {
    body.max_tokens = input.maxTokens;
  }
  return body;
}

function buildAnthropicBody(input, stream) {
  const body = {
    model: input.model,
    max_tokens: input.maxTokens || 1024,
    messages: input.messages.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    stream,
  };
  if (input.system) {
    body.system = input.system;
  }
  if (input.temperature !== undefined) {
    body.temperature = input.temperature;
  }
  return body;
}

function buildGeminiBody(input) {
  const body = {
    contents: input.messages.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
  };
  const generationConfig = {};
  if (input.temperature !== undefined) {
    generationConfig.temperature = input.temperature;
  }
  if (input.maxTokens !== undefined) {
    generationConfig.maxOutputTokens = input.maxTokens;
  }
  if (Object.keys(generationConfig).length) {
    body.generationConfig = generationConfig;
  }
  if (input.system) {
    body.systemInstruction = {
      parts: [{ text: input.system }],
    };
  }
  return body;
}

function buildProviderInput(rawInput) {
  const cfg = getProviderConfig(rawInput.provider);
  return {
    ...rawInput,
    provider: cfg.id,
    model: rawInput.model || cfg.defaultModel,
  };
}

function mergeHeaders(base, extra) {
  return { ...base, ...extra };
}

async function requestProviderOnce(rawInput) {
  const input = buildProviderInput(rawInput);
  const cfg = getProviderConfig(input.provider);
  if (!cfg.apiKey) {
    throw new Error(`missing_api_key:${input.provider}`);
  }

  if (cfg.family === "openai_responses") {
    const response = await fetch(`${cfg.baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(buildOpenAIResponsesBody(input, false)),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${cfg.id}_http_${response.status}:${text}`);
    }
    const payload = JSON.parse(text);
    return {
      provider: cfg.id,
      family: cfg.family,
      model: payload?.model || input.model,
      text: extractOpenAIResponsesText(payload),
      usage: normalizeUsage(cfg.family, payload),
      raw: payload,
    };
  }

  if (cfg.family === "openai_compatible") {
    const response = await fetch(`${cfg.baseUrl}${cfg.path || ""}`, {
      method: "POST",
      headers: mergeHeaders(
        {
          authorization: `Bearer ${cfg.apiKey}`,
          "content-type": "application/json; charset=utf-8",
        },
        cfg.headers
      ),
      body: JSON.stringify(buildOpenAICompatibleBody(input, false)),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${cfg.id}_http_${response.status}:${text}`);
    }
    const payload = JSON.parse(text);
    return {
      provider: cfg.id,
      family: cfg.family,
      model: payload?.model || input.model,
      text: extractOpenAICompatibleText(payload),
      usage: normalizeUsage(cfg.family, payload),
      raw: payload,
    };
  }

  if (cfg.family === "anthropic_messages") {
    const response = await fetch(`${cfg.baseUrl}/v1/messages`, {
      method: "POST",
      headers: mergeHeaders(
        {
          "x-api-key": cfg.apiKey,
          "anthropic-version": cfg.anthropicVersion,
          "content-type": "application/json; charset=utf-8",
        },
        cfg.headers
      ),
      body: JSON.stringify(buildAnthropicBody(input, false)),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${cfg.id}_http_${response.status}:${text}`);
    }
    const payload = JSON.parse(text);
    return {
      provider: cfg.id,
      family: cfg.family,
      model: payload?.model || input.model,
      text: extractAnthropicText(payload),
      usage: normalizeUsage(cfg.family, payload),
      raw: payload,
    };
  }

  const endpoint = `${cfg.baseUrl}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: mergeHeaders(
      {
        "content-type": "application/json; charset=utf-8",
      },
      cfg.headers
    ),
    body: JSON.stringify(buildGeminiBody(input)),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${cfg.id}_http_${response.status}:${text}`);
  }
  const payload = JSON.parse(text);
  return {
    provider: cfg.id,
    family: cfg.family,
    model: input.model,
    text: extractGeminiText(payload),
    usage: normalizeUsage(cfg.family, payload),
    raw: payload,
  };
}

function writeSseHeaders(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
}

function writeSseEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function parseSseResponse(response, onEvent) {
  if (!response.body) {
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary < 0) {
        break;
      }
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = rawEvent.split(/\r?\n/);
      let eventName = "message";
      const dataLines = [];
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim() || "message";
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (!dataLines.length) {
        continue;
      }
      const data = dataLines.join("\n");
      if (data === "[DONE]") {
        await onEvent(eventName, "[DONE]");
        continue;
      }
      await onEvent(eventName, data);
    }
  }
}

async function streamProviderToCallbacks(rawInput, handlers = {}) {
  const input = buildProviderInput(rawInput);
  const cfg = getProviderConfig(input.provider);
  if (!cfg.apiKey) {
    throw new Error(`missing_api_key:${input.provider}`);
  }

  let response;
  if (cfg.family === "openai_responses") {
    response = await fetch(`${cfg.baseUrl}/v1/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.apiKey}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(buildOpenAIResponsesBody(input, true)),
    });
  } else if (cfg.family === "openai_compatible") {
    response = await fetch(`${cfg.baseUrl}${cfg.path || ""}`, {
      method: "POST",
      headers: mergeHeaders(
        {
          authorization: `Bearer ${cfg.apiKey}`,
          "content-type": "application/json; charset=utf-8",
        },
        cfg.headers
      ),
      body: JSON.stringify(buildOpenAICompatibleBody(input, true)),
    });
  } else if (cfg.family === "anthropic_messages") {
    response = await fetch(`${cfg.baseUrl}/v1/messages`, {
      method: "POST",
      headers: mergeHeaders(
        {
          "x-api-key": cfg.apiKey,
          "anthropic-version": cfg.anthropicVersion,
          "content-type": "application/json; charset=utf-8",
        },
        cfg.headers
      ),
      body: JSON.stringify(buildAnthropicBody(input, true)),
    });
  } else {
    const endpoint = `${cfg.baseUrl}/models/${encodeURIComponent(input.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`;
    response = await fetch(endpoint, {
      method: "POST",
      headers: mergeHeaders(
        {
          "content-type": "application/json; charset=utf-8",
        },
        cfg.headers
      ),
      body: JSON.stringify(buildGeminiBody(input)),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${cfg.id}_http_${response.status}:${errorText}`);
  }

  if (handlers.onMeta) {
    await handlers.onMeta({
      provider: cfg.id,
      family: cfg.family,
      model: input.model,
    });
  }

  let fullText = "";
  let usage = null;
  let finishReason = null;

  await parseSseResponse(response, async (_eventName, data) => {
    if (data === "[DONE]") {
      return;
    }
    const payload = JSON.parse(data);

    if (cfg.family === "openai_responses") {
      const type = safeText(payload?.type);
      if (type === "response.output_text.delta" && safeText(payload?.delta)) {
        fullText += payload.delta;
        if (handlers.onDelta) {
          await handlers.onDelta({ text: payload.delta });
        }
      } else if (type === "response.completed") {
        usage = normalizeUsage(cfg.family, payload?.response || payload);
        finishReason = payload?.response?.status || "completed";
      } else if (type === "error" && handlers.onError) {
        await handlers.onError({
          provider: cfg.id,
          message: payload?.message || `${cfg.id}_stream_error`,
        });
      }
      return;
    }

    if (cfg.family === "openai_compatible") {
      const delta = safeText(payload?.choices?.[0]?.delta?.content);
      if (delta) {
        fullText += delta;
        if (handlers.onDelta) {
          await handlers.onDelta({ text: delta });
        }
      }
      usage = normalizeUsage(cfg.family, payload);
      finishReason = payload?.choices?.[0]?.finish_reason || finishReason;
      return;
    }

    if (cfg.family === "anthropic_messages") {
      const type = safeText(payload?.type);
      if (type === "content_block_delta" && safeText(payload?.delta?.text)) {
        fullText += payload.delta.text;
        if (handlers.onDelta) {
          await handlers.onDelta({ text: payload.delta.text });
        }
      } else if (type === "message_start") {
        usage = normalizeUsage(cfg.family, payload?.message || payload);
      } else if (type === "message_delta") {
        usage = normalizeUsage(cfg.family, payload?.usage ? payload : { usage: payload.usage });
        finishReason = payload?.delta?.stop_reason || finishReason;
      } else if (type === "error" && handlers.onError) {
        await handlers.onError({
          provider: cfg.id,
          message: payload?.error?.message || `${cfg.id}_stream_error`,
        });
      }
      return;
    }

    const delta = extractGeminiText(payload);
    if (delta) {
      fullText += delta;
      if (handlers.onDelta) {
        await handlers.onDelta({ text: delta });
      }
    }
    usage = normalizeUsage(cfg.family, payload);
    finishReason = payload?.candidates?.[0]?.finishReason || finishReason;
  });

  const donePayload = {
    provider: cfg.id,
    family: cfg.family,
    model: input.model,
    text: fullText,
    usage,
    finishReason,
  };
  if (handlers.onDone) {
    await handlers.onDone(donePayload);
  }
  return donePayload;
}

async function streamProvider(rawInput, res) {
  const input = buildProviderInput(rawInput);
  writeSseHeaders(res);
  try {
    await streamProviderToCallbacks(input, {
      onMeta: async (payload) => writeSseEvent(res, "meta", payload),
      onDelta: async (payload) => writeSseEvent(res, "delta", payload),
      onDone: async (payload) => writeSseEvent(res, "done", payload),
      onError: async (payload) => writeSseEvent(res, "error", payload),
    });
  } catch (error) {
    writeSseEvent(res, "error", {
      provider: input.provider,
      message: String(error?.message || error),
    });
  }
  res.end();
}

function normalizeProviderList(value) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => ({
      provider: safeText(item?.provider || item?.id).toLowerCase(),
      model: safeText(item?.model),
      label: safeText(item?.label || item?.provider || item?.id),
      stancePrompt: safeText(item?.stancePrompt),
    }))
    .filter((item) => item.provider);
}

function formatTranscriptEntries(entries) {
  return entries
    .map((entry, index) => {
      const roundLabel = entry.round ? `Round ${entry.round}` : "Round 0";
      return `${index + 1}. [${roundLabel}] ${entry.speaker}: ${entry.content}`;
    })
    .join("\n");
}

function buildRoundtablePrompt({
  objective,
  round,
  totalRounds,
  transcript,
  participantLabel,
  stancePrompt,
}) {
  const transcriptText = transcript.length ? formatTranscriptEntries(transcript) : "暂无其他发言。";
  const roundInstruction =
    round === 1
      ? "先给出你独立的初步方案，不要复述题目。"
      : "阅读前面的讨论后，指出你赞同和反对的点，并给出更新后的建议。";
  return [
    `讨论目标：${objective}`,
    `你当前身份：${participantLabel}`,
    stancePrompt ? `你的额外视角：${stancePrompt}` : "",
    `当前轮次：第 ${round}/${totalRounds} 轮`,
    roundInstruction,
    "已有讨论记录：",
    transcriptText,
    "输出要求：",
    "1. 先给核心观点",
    "2. 再给理由或对他人观点的回应",
    "3. 尽量简洁，直接服务于方案讨论",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildRoundtableSummaryPrompt({ objective, transcript }) {
  return [
    `请总结下面这场多模型讨论，目标是：${objective}`,
    "请输出：",
    "1. 共识",
    "2. 分歧",
    "3. 推荐决策",
    "4. 下一步行动",
    "讨论记录：",
    formatTranscriptEntries(transcript),
  ].join("\n\n");
}

async function runRoundtable(payload) {
  const providers = normalizeProviderList(payload?.providers);
  if (!providers.length) {
    throw new Error("missing_providers");
  }

  const rounds = Math.max(1, Math.min(6, Number(payload?.rounds || 2)));
  const temperature =
    typeof payload?.temperature === "number" && Number.isFinite(payload.temperature)
      ? payload.temperature
      : 0.4;
  const maxTokens =
    typeof payload?.maxTokens === "number" && Number.isFinite(payload.maxTokens)
      ? payload.maxTokens
      : 1200;

  const normalized = normalizeMessages(payload?.messages, payload?.system);
  const objective =
    safeText(payload?.topic) ||
    normalized.messages.map((item) => `${item.role}: ${item.content}`).join("\n") ||
    "请围绕同一方案进行讨论。";

  const transcript = normalized.messages.map((item) => ({
    round: 0,
    speaker: item.role === "assistant" ? "assistant" : "user",
    provider: item.role,
    content: item.content,
  }));

  const roundResults = [];

  for (let round = 1; round <= rounds; round += 1) {
    const result = await Promise.all(
      providers.map(async (item) => {
        const prompt = buildRoundtablePrompt({
          objective,
          round,
          totalRounds: rounds,
          transcript,
          participantLabel: item.label || item.provider,
          stancePrompt: item.stancePrompt,
        });
        try {
          const response = await requestProviderOnce({
            provider: item.provider,
            model: item.model,
            temperature,
            maxTokens,
            system: safeText(payload?.participantSystemPrompt),
            messages: [{ role: "user", content: prompt }],
            includeRaw: payload?.includeRaw === true,
          });
          const entry = {
            round,
            speaker: item.label || item.provider,
            provider: response.provider,
            model: response.model,
            content: response.text,
            usage: response.usage,
            raw: payload?.includeRaw === true ? response.raw : undefined,
          };
          transcript.push(entry);
          return { ok: true, ...entry };
        } catch (error) {
          const failure = {
            ok: false,
            round,
            speaker: item.label || item.provider,
            provider: item.provider,
            model: item.model || null,
            message: String(error?.message || error),
          };
          transcript.push({
            round,
            speaker: item.label || item.provider,
            provider: item.provider,
            content: `[ERROR] ${failure.message}`,
          });
          return failure;
        }
      })
    );
    roundResults.push({ round, responses: result });
  }

  let summary = null;
  const summaryProvider = safeText(payload?.summaryProvider?.provider || payload?.summaryProvider);
  if (summaryProvider) {
    try {
      const summaryResult = await requestProviderOnce({
        provider: summaryProvider,
        model: safeText(payload?.summaryProvider?.model),
        temperature: 0.2,
        maxTokens,
        messages: [{ role: "user", content: buildRoundtableSummaryPrompt({ objective, transcript }) }],
      });
      summary = {
        ok: true,
        provider: summaryResult.provider,
        model: summaryResult.model,
        text: summaryResult.text,
        usage: summaryResult.usage,
        raw: payload?.includeRaw === true ? summaryResult.raw : undefined,
      };
    } catch (error) {
      summary = {
        ok: false,
        provider: summaryProvider,
        model: safeText(payload?.summaryProvider?.model) || null,
        message: String(error?.message || error),
      };
    }
  }

  return {
    ok: true,
    objective,
    rounds,
    providers,
    transcript,
    roundResults,
    summary,
  };
}

async function streamRoundtable(payload, res) {
  const providers = normalizeProviderList(payload?.providers);
  if (!providers.length) {
    json(res, 400, { ok: false, error: "missing_providers" });
    return;
  }

  const rounds = Math.max(1, Math.min(6, Number(payload?.rounds || 2)));
  const temperature =
    typeof payload?.temperature === "number" && Number.isFinite(payload.temperature)
      ? payload.temperature
      : 0.4;
  const maxTokens =
    typeof payload?.maxTokens === "number" && Number.isFinite(payload.maxTokens)
      ? payload.maxTokens
      : 1200;

  const normalized = normalizeMessages(payload?.messages, payload?.system);
  const objective =
    safeText(payload?.topic) ||
    normalized.messages.map((item) => `${item.role}: ${item.content}`).join("\n") ||
    "请围绕同一方案进行讨论。";

  const transcript = normalized.messages.map((item) => ({
    round: 0,
    speaker: item.role === "assistant" ? "assistant" : "user",
    provider: item.role,
    content: item.content,
  }));
  const roundResults = [];

  writeSseHeaders(res);
  writeSseEvent(res, "session", {
    objective,
    rounds,
    providers,
    transcript,
  });

  for (let round = 1; round <= rounds; round += 1) {
    writeSseEvent(res, "round_start", { round });
    const responses = [];

    for (const item of providers) {
      const prompt = buildRoundtablePrompt({
        objective,
        round,
        totalRounds: rounds,
        transcript,
        participantLabel: item.label || item.provider,
        stancePrompt: item.stancePrompt,
      });

      const entryBase = {
        round,
        speaker: item.label || item.provider,
        provider: item.provider,
        model: item.model || null,
      };

      writeSseEvent(res, "speaker_start", entryBase);
      let buffer = "";

      try {
        const finalPayload = await streamProviderToCallbacks(
          {
            provider: item.provider,
            model: item.model,
            temperature,
            maxTokens,
            system: safeText(payload?.participantSystemPrompt),
            messages: [{ role: "user", content: prompt }],
          },
          {
            onMeta: async (meta) => {
              writeSseEvent(res, "speaker_meta", { ...entryBase, ...meta });
            },
            onDelta: async ({ text }) => {
              buffer += text;
              writeSseEvent(res, "speaker_delta", { ...entryBase, text });
            },
          },
        );

        const doneEntry = {
          ok: true,
          round,
          speaker: item.label || item.provider,
          provider: finalPayload.provider,
          model: finalPayload.model,
          content: buffer || finalPayload.text,
          usage: finalPayload.usage,
        };
        transcript.push(doneEntry);
        responses.push(doneEntry);
        writeSseEvent(res, "speaker_done", doneEntry);
      } catch (error) {
        const failure = {
          ok: false,
          ...entryBase,
          message: String(error?.message || error),
        };
        transcript.push({
          round,
          speaker: item.label || item.provider,
          provider: item.provider,
          content: `[ERROR] ${failure.message}`,
        });
        responses.push(failure);
        writeSseEvent(res, "speaker_error", failure);
      }
    }

    roundResults.push({ round, responses });
    writeSseEvent(res, "round_done", { round, responses });
  }

  let summary = null;
  const summaryProvider = safeText(payload?.summaryProvider?.provider || payload?.summaryProvider);
  if (summaryProvider) {
    writeSseEvent(res, "summary_start", { provider: summaryProvider });
    try {
      const summaryResult = await requestProviderOnce({
        provider: summaryProvider,
        model: safeText(payload?.summaryProvider?.model),
        temperature: 0.2,
        maxTokens,
        messages: [{ role: "user", content: buildRoundtableSummaryPrompt({ objective, transcript }) }],
      });
      summary = {
        ok: true,
        provider: summaryResult.provider,
        model: summaryResult.model,
        text: summaryResult.text,
        usage: summaryResult.usage,
      };
      writeSseEvent(res, "summary_done", summary);
    } catch (error) {
      summary = {
        ok: false,
        provider: summaryProvider,
        model: safeText(payload?.summaryProvider?.model) || null,
        message: String(error?.message || error),
      };
      writeSseEvent(res, "summary_error", summary);
    }
  }

  writeSseEvent(res, "complete", {
    ok: true,
    objective,
    rounds,
    providers,
    transcript,
    roundResults,
    summary,
  });
  res.end();
}

export async function handleLlmProviders(_req, res) {
  json(res, 200, {
    ok: true,
    providers: getProviderCatalog(),
  });
}

export async function handleLlmChat(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_json", message: String(error?.message || error) });
    return;
  }

  let input;
  try {
    input = coerceRequestBody(payload);
    if (!input.provider) {
      throw new Error("missing_provider");
    }
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_request", message: String(error?.message || error) });
    return;
  }

  try {
    const result = await requestProviderOnce(input);
    json(res, 200, {
      ok: true,
      provider: result.provider,
      family: result.family,
      model: result.model,
      text: result.text,
      usage: result.usage,
      raw: input.includeRaw ? result.raw : undefined,
    });
  } catch (error) {
    json(res, 502, {
      ok: false,
      error: "provider_request_failed",
      provider: input.provider,
      message: String(error?.message || error),
    });
  }
}

export async function handleLlmChatStream(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_json", message: String(error?.message || error) });
    return;
  }

  let input;
  try {
    input = coerceRequestBody(payload);
    if (!input.provider) {
      throw new Error("missing_provider");
    }
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_request", message: String(error?.message || error) });
    return;
  }

  try {
    await streamProvider(input, res);
  } catch (error) {
    if (!res.headersSent) {
      json(res, 502, {
        ok: false,
        error: "provider_stream_failed",
        provider: input.provider,
        message: String(error?.message || error),
      });
      return;
    }
    writeSseEvent(res, "error", {
      provider: input.provider,
      message: String(error?.message || error),
    });
    res.end();
  }
}

export async function handleLlmFanout(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_json", message: String(error?.message || error) });
    return;
  }

  const providers = normalizeProviderList(payload?.providers);
  if (!providers.length) {
    json(res, 400, { ok: false, error: "missing_providers" });
    return;
  }

  const shared = coerceRequestBody(payload);
  const results = await Promise.all(
    providers.map(async (item) => {
      const providerInput = {
        ...shared,
        provider: item.provider,
        model: item.model || undefined,
      };
      try {
        const result = await requestProviderOnce(providerInput);
        return {
          ok: true,
          provider: result.provider,
          family: result.family,
          model: result.model,
          text: result.text,
          usage: result.usage,
          raw: shared.includeRaw ? result.raw : undefined,
        };
      } catch (error) {
        return {
          ok: false,
          provider: providerInput.provider,
          model: providerInput.model || null,
          message: String(error?.message || error),
        };
      }
    })
  );

  json(res, 200, { ok: true, count: results.length, results });
}

export async function handleLlmRoundtable(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_json", message: String(error?.message || error) });
    return;
  }

  try {
    const result = await runRoundtable(payload);
    json(res, 200, result);
  } catch (error) {
    json(res, 400, {
      ok: false,
      error: "roundtable_failed",
      message: String(error?.message || error),
    });
  }
}

export async function handleLlmRoundtableStream(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_json", message: String(error?.message || error) });
    return;
  }

  try {
    await streamRoundtable(payload, res);
  } catch (error) {
    if (!res.headersSent) {
      json(res, 400, {
        ok: false,
        error: "roundtable_stream_failed",
        message: String(error?.message || error),
      });
      return;
    }
    writeSseEvent(res, "fatal_error", {
      message: String(error?.message || error),
    });
    res.end();
  }
}
