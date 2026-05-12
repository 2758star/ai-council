import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import http from "node:http";
import {
  handleLlmChat,
  handleLlmChatStream,
  handleLlmFanout,
  handleLlmProviders,
  handleLlmRoundtable,
  handleLlmRoundtableStream,
} from "./unified-llm.mjs";

const PORT = Number(process.env.PORT || "8080");
const TZ = process.env.TZ || "Asia/Shanghai";
const APP_NAME = process.env.PSA_APP_NAME || "Personal Secretary Cloud Relay";
const FEISHU_KEYWORD = (process.env.FEISHU_KEYWORD || "Mos提醒").trim();
const FEISHU_INBOUND_VERIFY_TOKEN = (process.env.FEISHU_INBOUND_VERIFY_TOKEN || "").trim();
const FEISHU_ENFORCE_VERIFY_TOKEN = matchesTrue(process.env.FEISHU_ENFORCE_VERIFY_TOKEN || "true");
const FEISHU_WEBHOOK_PATH_SECRET = (process.env.FEISHU_WEBHOOK_PATH_SECRET || "").trim();
const FEISHU_BOT_WEBHOOK_URL = (process.env.FEISHU_BOT_WEBHOOK_URL || "").trim();
const FEISHU_APP_ID = (process.env.FEISHU_APP_ID || "").trim();
const FEISHU_APP_SECRET = (process.env.FEISHU_APP_SECRET || "").trim();
const FEISHU_IM_REPLY_ENABLED = matchesTrue(process.env.FEISHU_IM_REPLY_ENABLED || "true");
const CRON_SHARED_TOKEN = (process.env.CRON_SHARED_TOKEN || "").trim();
const PROJECT_ID = (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "").trim();
const FEISHU_WEBHOOK_PATH = FEISHU_WEBHOOK_PATH_SECRET
  ? `/webhooks/feishu/${FEISHU_WEBHOOK_PATH_SECRET}`
  : "/webhooks/feishu";

const FIRESTORE_BASE = PROJECT_ID
  ? `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  : "";

const memoryStore = {
  inboundLogs: [],
  tasks: [],
  notifications: [],
};

const tokenCache = {
  accessToken: "",
  expiresAtMs: 0,
};

const feishuTokenCache = {
  accessToken: "",
  expiresAtMs: 0,
};

function nowIso() {
  return new Date().toISOString();
}

function hashText(input) {
  return createHash("sha256").update(input).digest("hex");
}

function matchesTrue(value) {
  if (typeof value !== "string") {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function json(res, statusCode, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

function safeText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function constantTimeEquals(left, right) {
  const a = Buffer.from(safeText(left), "utf8");
  const b = Buffer.from(safeText(right), "utf8");
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  return timingSafeEqual(a, b);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
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

function toChineseDateString(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\//g, "-");
}

function localDateAtOffset(offsetDays) {
  const current = new Date();
  current.setDate(current.getDate() + offsetDays);
  return current;
}

function weekdayFromChinese(word) {
  const map = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    日: 0,
    天: 0,
  };
  return map[word] ?? null;
}

function resolveWeekdayDate(baseDate, targetWeekday, mode) {
  const baseWeekday = baseDate.getDay();
  let delta = (targetWeekday - baseWeekday + 7) % 7;
  if (mode === "next") {
    if (delta === 0) {
      delta = 7;
    } else {
      delta += 7;
    }
  } else if (mode === "this" && delta === 0) {
    delta = 0;
  }
  const next = new Date(baseDate);
  next.setDate(next.getDate() + delta);
  return next;
}

function chineseNumberToInt(input) {
  const normalized = input
    .replace(/两/g, "二")
    .replace(/〇/g, "零")
    .replace(/○/g, "零")
    .trim();
  const single = {
    零: 0,
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  };
  if (normalized === "十") {
    return 10;
  }
  if (normalized.startsWith("十")) {
    const tail = single[normalized.slice(1)] ?? 0;
    return 10 + tail;
  }
  if (normalized.includes("十")) {
    const [head, tailRaw] = normalized.split("十");
    const headNum = single[head] ?? 1;
    const tailNum = single[tailRaw] ?? 0;
    return headNum * 10 + tailNum;
  }
  return single[normalized] ?? null;
}

function parseTimeFromText(text) {
  const direct = text.match(/([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)/);
  if (direct) {
    return `${direct[1].padStart(2, "0")}:${direct[2].padStart(2, "0")}`;
  }

  const cn = text.match(/([零〇○一二三四五六七八九十两]{1,3}|\d{1,2})\s*点\s*(半|一刻|三刻|[0-5]?\d分?)?/);
  if (cn) {
    let hour = Number(cn[1]);
    if (Number.isNaN(hour)) {
      hour = chineseNumberToInt(cn[1]);
    }
    if (hour !== null && Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      let minute = 0;
      const minuteRaw = (cn[2] || "").replace(/分/g, "");
      if (minuteRaw === "半") {
        minute = 30;
      } else if (minuteRaw === "一刻") {
        minute = 15;
      } else if (minuteRaw === "三刻") {
        minute = 45;
      } else if (/^\d{1,2}$/.test(minuteRaw)) {
        minute = Number(minuteRaw);
      }
      const lower = text.toLowerCase();
      if ((text.includes("下午") || text.includes("晚上") || text.includes("晚")) && hour >= 1 && hour <= 11) {
        hour += 12;
      }
      if ((text.includes("凌晨") || lower.includes("am")) && hour === 12) {
        hour = 0;
      }
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }
  if (/(明早|今早|早上|上午)/.test(text)) {
    return "08:00";
  }
  return null;
}

function datePartsToIso(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  const candidate = new Date(y, m - 1, d);
  if (
    candidate.getFullYear() !== y ||
    candidate.getMonth() !== m - 1 ||
    candidate.getDate() !== d
  ) {
    return null;
  }
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDateFromText(text) {
  const base = new Date();
  const fullDate = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (fullDate) {
    const parsed = datePartsToIso(fullDate[1], fullDate[2], fullDate[3]);
    if (parsed) {
      return parsed;
    }
  }
  const monthDay = text.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})(?!\d)/);
  if (monthDay) {
    const parsed = datePartsToIso(base.getFullYear(), monthDay[1], monthDay[2]);
    if (parsed) {
      return parsed;
    }
  }
  const zhMonthDay = text.match(/(\d{1,2})月(\d{1,2})(?:日|号)?/);
  if (zhMonthDay) {
    const parsed = datePartsToIso(base.getFullYear(), zhMonthDay[1], zhMonthDay[2]);
    if (parsed) {
      return parsed;
    }
  }
  if (text.includes("大后天")) {
    return toChineseDateString(localDateAtOffset(3));
  }
  if (text.includes("后天")) {
    return toChineseDateString(localDateAtOffset(2));
  }
  if (text.includes("明天") || text.includes("明早") || text.includes("明晚")) {
    return toChineseDateString(localDateAtOffset(1));
  }
  if (text.includes("今天") || text.includes("今早") || text.includes("今晚")) {
    return toChineseDateString(base);
  }

  const week = text.match(/(下周|本周|这周|周|星期)\s*([一二三四五六日天])/);
  if (week) {
    const mode = week[1] === "下周" ? "next" : "this";
    const weekday = weekdayFromChinese(week[2]);
    if (weekday !== null) {
      const resolved = resolveWeekdayDate(base, weekday, mode);
      return toChineseDateString(resolved);
    }
  }
  return toChineseDateString(base);
}

function cleanupTaskTitle(text) {
  return text
    .replace(/^Mos提醒[:：\s-]*/i, "")
    .replace(/^新增任务[:：\s-]*/i, "")
    .replace(/(\d{4}[./-]\d{1,2}[./-]\d{1,2})/g, "")
    .replace(/(?<!\d)(\d{1,2}[./-]\d{1,2})(?!\d)/g, "")
    .replace(/(\d{1,2})月(\d{1,2})(日|号)?/g, "")
    .replace(/(明天|明早|明晚|今天|今早|今晚|后天|大后天|下周[一二三四五六日天]|本周[一二三四五六日天]|这周[一二三四五六日天]|周[一二三四五六日天]|星期[一二三四五六日天])/g, "")
    .replace(/(早上|上午|下午|晚上|凌晨|中午)/g, "")
    .replace(/([01]?\d|2[0-3])\s*[:：]\s*([0-5]\d)/g, "")
    .replace(/([零〇○一二三四五六七八九十两]{1,3}|\d{1,2})\s*点\s*(半|一刻|三刻|[0-5]?\d分?)?/g, "")
    .replace(/[，。,.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTaskType(text, timeStart) {
  const normalized = safeText(text).toLowerCase();
  if (
    normalized.includes("上课") ||
    normalized.includes("课程") ||
    normalized.includes("讲座") ||
    normalized.includes("会议") ||
    normalized.includes("预约") ||
    normalized.includes("面试") ||
    normalized.includes("日程") ||
    safeText(timeStart)
  ) {
    return "日程";
  }
  return "任务";
}

function normalizeIncomingText(text) {
  if (!safeText(text)) return "";
  const withoutMentions = safeText(text)
    .replace(/@[A-Za-z0-9_-]+/g, " ")
    .replace(/<_user_[^>]*>/g, " ");
  const compact = withoutMentions.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  if (!FEISHU_KEYWORD) return compact;
  const keywordPattern = new RegExp(`^${FEISHU_KEYWORD}\\s*[：:]?\\s*`, "i");
  return compact.replace(keywordPattern, "").trim();
}

function parseIncomingCommand(rawText) {
  const text = safeText(rawText).replace(/\u00a0/g, " ");
  const normalized = normalizeIncomingText(text);
  const lowered = normalized.toLowerCase();

  if (!normalized) {
    return { action: "noop", summary: "空消息，已忽略。", success: false };
  }
  if (normalized.includes("查询今日计划") || normalized.includes("今日计划")) {
    return { action: "query_today", summary: "已收到查询今日计划指令。", success: true };
  }
  if (normalized.includes("项目状态")) {
    return { action: "query_project", summary: "已收到查询项目状态指令。", success: true };
  }
  if (lowered.includes("帮助") || lowered.includes("help")) {
    return {
      action: "help",
      summary:
        "可用命令：新增任务 xxx；明早八点 GRE 阅读；查询今日计划；查询项目状态。",
      success: true,
    };
  }

  const scheduledDate = parseDateFromText(normalized);
  const timeStart = parseTimeFromText(normalized);
  let title = cleanupTaskTitle(normalized);
  if (!title) {
    title = normalized;
  }
  const taskType = inferTaskType(normalized, timeStart);
  const priority = /紧急|马上|立刻|urgent/i.test(normalized) ? "high" : "medium";
  return {
    action: "create_task_nl",
    success: true,
    task: {
      title,
      taskType,
      status: "pending",
      priority,
      scheduledDate,
      timeStart,
      deadlineDate: scheduledDate,
      sourceType: "feishu_cloud",
      rawText: normalized,
    },
    summary: `已解析${taskType}：${title}（${scheduledDate}${timeStart ? ` ${timeStart}` : ""}）`,
  };
}

function extractTextDeep(value) {
  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }
    try {
      const parsed = JSON.parse(value);
      const nested = extractTextDeep(parsed);
      if (nested) {
        return nested;
      }
    } catch {
      // ignore json parse error
    }
    return value.trim();
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  if (typeof value.text === "string" && value.text.trim()) {
    return value.text.trim();
  }
  for (const child of Object.values(value)) {
    const text = extractTextDeep(child);
    if (text) {
      return text;
    }
  }
  return null;
}

function extractFeishuMeta(payload) {
  if (payload && typeof payload.challenge === "string") {
    return { challenge: payload.challenge, messageId: null, text: null };
  }
  const eventId = safeText(payload?.header?.event_id || payload?.event_id) || null;
  const messageId =
    safeText(payload?.event?.message?.message_id || payload?.event?.message_id) || eventId;
  const text =
    extractTextDeep(payload?.event?.text) ||
    extractTextDeep(payload?.event?.message?.text) ||
    extractTextDeep(payload?.event?.message?.content) ||
    extractTextDeep(payload?.event?.content);
  return {
    challenge: null,
    messageId,
    text,
  };
}

function shallowPayloadSummary(payload) {
  if (!payload || typeof payload !== "object") {
    return { topLevelKeys: [], eventKeys: [], hasEncrypt: false };
  }
  const topLevelKeys = Object.keys(payload).slice(0, 20);
  const eventKeys =
    payload.event && typeof payload.event === "object"
      ? Object.keys(payload.event).slice(0, 20)
      : [];
  return {
    topLevelKeys,
    eventKeys,
    hasEncrypt: typeof payload.encrypt === "string" && payload.encrypt.length > 0,
  };
}

function firestoreFieldValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === "string") {
    return { stringValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => firestoreFieldValue(item)),
      },
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: toFirestoreFields(value),
      },
    };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = firestoreFieldValue(value);
  }
  return fields;
}

function fromFirestoreField(field) {
  if (!field || typeof field !== "object") {
    return null;
  }
  if ("stringValue" in field) {
    return field.stringValue;
  }
  if ("integerValue" in field) {
    return Number(field.integerValue);
  }
  if ("doubleValue" in field) {
    return Number(field.doubleValue);
  }
  if ("booleanValue" in field) {
    return Boolean(field.booleanValue);
  }
  if ("nullValue" in field) {
    return null;
  }
  if ("timestampValue" in field) {
    return field.timestampValue;
  }
  if ("arrayValue" in field) {
    return (field.arrayValue.values || []).map((item) => fromFirestoreField(item));
  }
  if ("mapValue" in field) {
    const out = {};
    const nested = field.mapValue.fields || {};
    for (const [k, v] of Object.entries(nested)) {
      out[k] = fromFirestoreField(v);
    }
    return out;
  }
  return null;
}

function parseFirestoreDoc(document) {
  const fields = document?.fields || {};
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = fromFirestoreField(value);
  }
  const fullName = safeText(document?.name);
  if (fullName) {
    const parts = fullName.split("/");
    result.id = parts[parts.length - 1];
  }
  return result;
}

async function fetchGcpAccessToken() {
  if (!PROJECT_ID) {
    throw new Error("missing_google_cloud_project");
  }
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.accessToken;
  }
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    {
      headers: {
        "Metadata-Flavor": "Google",
      },
    }
  );
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`metadata_token_failed:${response.status}:${message}`);
  }
  const payload = await response.json();
  tokenCache.accessToken = payload.access_token;
  tokenCache.expiresAtMs = now + Number(payload.expires_in || 300) * 1000;
  return tokenCache.accessToken;
}

async function firestoreRequest(path, method = "GET", body = null) {
  if (!PROJECT_ID) {
    throw new Error("missing_google_cloud_project");
  }
  const token = await fetchGcpAccessToken();
  const response = await fetch(`${FIRESTORE_BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`firestore_error:${response.status}:${text}`);
    error.statusCode = response.status;
    throw error;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function saveLogDocument(collection, documentId, data) {
  if (!PROJECT_ID) {
    memoryStore.inboundLogs.push({ id: documentId, ...data });
    return { created: true, id: documentId, mode: "memory" };
  }
  try {
    await firestoreRequest(
      `/${encodeURIComponent(collection)}?documentId=${encodeURIComponent(documentId)}`,
      "POST",
      { fields: toFirestoreFields(data) }
    );
    return { created: true, id: documentId, mode: "firestore" };
  } catch (error) {
    if (String(error?.message || "").includes("ALREADY_EXISTS")) {
      return { created: false, id: documentId, duplicate: true, mode: "firestore" };
    }
    throw error;
  }
}

async function patchDocument(collection, documentId, data) {
  if (!PROJECT_ID) {
    const list = collection === "tasks" ? memoryStore.tasks : memoryStore.inboundLogs;
    const index = list.findIndex((item) => item.id === documentId);
    if (index >= 0) {
      list[index] = { ...list[index], ...data };
    }
    return;
  }
  const params = new URLSearchParams();
  for (const fieldPath of Object.keys(data)) {
    params.append("updateMask.fieldPaths", fieldPath);
  }
  await firestoreRequest(
    `/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}?${params.toString()}`,
    "PATCH",
    { fields: toFirestoreFields(data) }
  );
}

async function queryPendingTasks(limit = 20) {
  if (!PROJECT_ID) {
    return memoryStore.tasks
      .filter((item) => item.status === "pending" && !item.syncedLocal)
      .slice(0, limit);
  }
  const body = {
    structuredQuery: {
      from: [{ collectionId: "tasks" }],
      orderBy: [
        {
          field: { fieldPath: "createdAt" },
          direction: "DESCENDING",
        },
      ],
      limit: Math.max(limit * 5, 50),
    },
  };
  const result = await firestoreRequest(":runQuery", "POST", body);
  return (result || [])
    .map((item) => item.document)
    .filter(Boolean)
    .map((document) => parseFirestoreDoc(document))
    .filter((item) => item.status === "pending" && item.syncedLocal !== true)
    .slice(0, limit);
}

async function createTaskDocument(task, sourceMeta) {
  const taskId = `task_${Date.now()}_${hashText(`${task.title}|${sourceMeta.messageId || randomUUID()}`).slice(0, 8)}`;
  const now = nowIso();
  const row = {
    id: taskId,
    title: task.title,
    taskType: task.taskType || inferTaskType(task.rawText || task.title || "", task.timeStart),
    status: task.status || "pending",
    priority: task.priority || "medium",
    scheduledDate: task.scheduledDate || null,
    timeStart: task.timeStart || null,
    deadlineDate: task.deadlineDate || null,
    sourceType: task.sourceType || "feishu_cloud",
    sourceMessageId: sourceMeta.messageId || null,
    rawText: task.rawText || "",
    syncedLocal: false,
    createdAt: now,
    updatedAt: now,
  };
  if (!PROJECT_ID) {
    memoryStore.tasks.unshift(row);
    return row;
  }
  await saveLogDocument("tasks", taskId, row);
  return row;
}

async function sendFeishuWebhookText(text) {
  if (!FEISHU_BOT_WEBHOOK_URL) {
    return { sent: false, reason: "missing_webhook_url" };
  }
  const decorated =
    FEISHU_KEYWORD && !text.includes(FEISHU_KEYWORD)
      ? `${FEISHU_KEYWORD}：${text}`
      : text;
  const response = await fetch(FEISHU_BOT_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text: decorated },
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    return { sent: false, reason: `http_${response.status}`, raw: body };
  }
  return { sent: true, raw: body };
}

async function fetchFeishuTenantAccessToken() {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    throw new Error("missing_feishu_app_credentials");
  }
  const now = Date.now();
  if (feishuTokenCache.accessToken && feishuTokenCache.expiresAtMs > now + 60_000) {
    return feishuTokenCache.accessToken;
  }
  const response = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    }),
  });
  const payloadText = await response.text();
  if (!response.ok) {
    throw new Error(`feishu_token_http_${response.status}:${payloadText}`);
  }
  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    throw new Error(`invalid_feishu_token_response:${payloadText}`);
  }
  const code = Number(payload?.code ?? -1);
  if (code !== 0 || !safeText(payload?.tenant_access_token)) {
    throw new Error(`feishu_token_failed:${safeText(payload?.msg) || payloadText}`);
  }
  feishuTokenCache.accessToken = safeText(payload.tenant_access_token);
  feishuTokenCache.expiresAtMs = now + Number(payload?.expire || 7200) * 1000;
  return feishuTokenCache.accessToken;
}

async function sendFeishuReplyByMessageId(messageId, text) {
  if (!FEISHU_IM_REPLY_ENABLED) {
    return { sent: false, reason: "im_reply_disabled" };
  }
  if (!safeText(messageId)) {
    return { sent: false, reason: "missing_message_id" };
  }
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    return { sent: false, reason: "missing_feishu_app_credentials" };
  }
  try {
    const token = await fetchFeishuTenantAccessToken();
    const content = JSON.stringify({ text });
    const response = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages/${encodeURIComponent(messageId)}/reply`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          msg_type: "text",
          content,
        }),
      }
    );
    const bodyText = await response.text();
    if (!response.ok) {
      return { sent: false, reason: `im_reply_http_${response.status}`, raw: bodyText };
    }
    const payload = JSON.parse(bodyText);
    const code = Number(payload?.code ?? -1);
    if (code !== 0) {
      return {
        sent: false,
        reason: "im_reply_api_failed",
        code,
        message: safeText(payload?.msg),
        raw: bodyText,
      };
    }
    return { sent: true, channel: "im_reply", raw: bodyText };
  } catch (error) {
    return { sent: false, reason: "im_reply_error", message: String(error?.message || error) };
  }
}

async function sendFeishuReplyPreferred(messageId, text) {
  const reply = await sendFeishuReplyByMessageId(messageId, text);
  if (reply.sent) {
    return reply;
  }
  const webhook = await sendFeishuWebhookText(text);
  return {
    ...webhook,
    channel: webhook.sent ? "webhook_fallback" : "none",
    fallbackFrom: reply.reason || "unknown",
    fallbackDetail: reply,
  };
}

function cronAuthorized(req) {
  if (!CRON_SHARED_TOKEN) {
    return true;
  }
  const headerToken = safeText(req.headers["x-cron-token"]);
  return headerToken && headerToken === CRON_SHARED_TOKEN;
}

function buildTodayTaskSummary(tasks) {
  if (!tasks.length) {
    return "今日待同步任务：0 项。";
  }
  const preview = tasks.slice(0, 5).map((task, index) => {
    const time = task.timeStart ? ` ${task.timeStart}` : "";
    return `${index + 1}. ${task.title}（${task.scheduledDate || "未排期"}${time}）`;
  });
  return `今日待同步任务：${tasks.length} 项\n${preview.join("\n")}`;
}

async function handleFeishuWebhook(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    json(res, 400, { ok: false, error: "invalid_json", message: String(error?.message || error) });
    return;
  }
  // Always prioritize challenge handshake response.
  // Some Feishu callback payload variants may not include token/header in the same shape.
  // We keep strict token verification for real message events below.
  if (typeof payload?.challenge === "string" && payload.challenge.trim()) {
    json(res, 200, { challenge: payload.challenge.trim() });
    return;
  }
  if (FEISHU_ENFORCE_VERIFY_TOKEN) {
    if (!FEISHU_INBOUND_VERIFY_TOKEN) {
      json(res, 503, { ok: false, error: "verify_token_not_configured" });
      return;
    }
    const tokenInPayload = safeText(payload?.token);
    const tokenInHeader = safeText(req.headers["x-feishu-token"] || req.headers["x-lark-token"]);
    if (
      !constantTimeEquals(tokenInPayload, FEISHU_INBOUND_VERIFY_TOKEN) &&
      !constantTimeEquals(tokenInHeader, FEISHU_INBOUND_VERIFY_TOKEN)
    ) {
      json(res, 403, { ok: false, error: "verify_token_mismatch" });
      return;
    }
  }

  const { challenge, messageId, text } = extractFeishuMeta(payload);
  if (challenge) {
    json(res, 200, { challenge });
    return;
  }
  if (!text) {
    try {
      const summary = shallowPayloadSummary(payload);
      const fallbackId = `in_diag_${Date.now()}_${hashText(JSON.stringify(summary)).slice(0, 8)}`;
      await saveLogDocument("feishu_message_logs", fallbackId, {
        id: fallbackId,
        direction: "inbound",
        messageId: null,
        rawText: "",
        normalizedText: "",
        executionStatus: "no_text_found",
        parsedAction: "none",
        parsedPayload: JSON.stringify(summary),
        failureReason: summary.hasEncrypt ? "encrypted_payload_not_supported_yet" : "no_text_field_found",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    } catch {
      // ignore diagnostic write failure
    }
    json(res, 200, { ok: false, handled: false, message: "no_text_found" });
    return;
  }

  const normalizedText = safeText(text);
  const dedupeBase = messageId || hashText(normalizedText);
  const logId = `in_${dedupeBase}`;
  const receivedAt = nowIso();

  let createLog;
  try {
    createLog = await saveLogDocument("feishu_message_logs", logId, {
      id: logId,
      direction: "inbound",
      messageId: messageId || null,
      rawText: normalizedText,
      normalizedText,
      executionStatus: "received",
      createdAt: receivedAt,
      updatedAt: receivedAt,
    });
  } catch (error) {
    json(res, 500, { ok: false, error: "log_failed", message: String(error?.message || error) });
    return;
  }

  if (createLog?.duplicate) {
    json(res, 200, {
      ok: true,
      handled: true,
      deduped: true,
      message: "duplicate webhook event ignored",
      messageId: messageId || null,
    });
    return;
  }

  const parsed = parseIncomingCommand(normalizedText);
  let createdTask = null;
  let outbound = null;
  let status = "success";
  let failureReason = "";

  try {
    if (parsed.action === "create_task_nl" && parsed.task) {
      createdTask = await createTaskDocument(parsed.task, { messageId, rawText: normalizedText });
    }
    if (parsed.action === "query_today") {
      const pending = await queryPendingTasks(10);
      outbound = await sendFeishuReplyPreferred(messageId, buildTodayTaskSummary(pending));
    } else if (parsed.action === "help") {
      outbound = await sendFeishuReplyPreferred(messageId, parsed.summary);
    } else {
      const receipt = parsed.success
        ? `飞书指令回执\n状态：已处理\n动作：${parsed.action}\n结果：${parsed.summary}`
        : `飞书指令回执\n状态：失败\n动作：${parsed.action}\n结果：${parsed.summary}`;
      outbound = await sendFeishuReplyPreferred(messageId, receipt);
    }
  } catch (error) {
    status = "failed";
    failureReason = String(error?.message || error);
  }

  try {
    await patchDocument("feishu_message_logs", logId, {
      executionStatus: status,
      parsedAction: parsed.action,
      parsedPayload: JSON.stringify(parsed),
      createdTaskId: createdTask?.id || null,
      outboundResult: outbound ? JSON.stringify(outbound) : null,
      failureReason: failureReason || null,
      updatedAt: nowIso(),
    });
  } catch {
    // ignore secondary patch errors
  }

  json(res, 200, {
    ok: status === "success",
    handled: true,
    action: parsed.action,
    summary: parsed.summary,
    messageId: messageId || null,
    taskId: createdTask?.id || null,
    failureReason: failureReason || null,
  });
}

async function handleCronWatchScan(req, res, requestUrl) {
  if (!cronAuthorized(req)) {
    json(res, 403, { ok: false, error: "cron_token_invalid" });
    return;
  }
  const sourceUrl = safeText(requestUrl.searchParams.get("source")) || "manual_watch_scan";
  const now = nowIso();
  const noteId = `watch_${Date.now()}_${hashText(sourceUrl).slice(0, 6)}`;
  const payload = {
    id: noteId,
    sourceType: "watch",
    title: "官网扫描执行完成",
    content: `已执行官网扫描任务，来源：${sourceUrl}`,
    status: "created",
    createdAt: now,
    updatedAt: now,
  };
  try {
    await saveLogDocument("notifications", noteId, payload);
    const push = await sendFeishuWebhookText(
      `官网扫描完成\n来源：${sourceUrl}\n时间：${new Date().toLocaleString("zh-CN", { timeZone: TZ })}`
    );
    json(res, 200, {
      ok: true,
      summary: "watch scan tick completed",
      push,
      notificationId: noteId,
    });
  } catch (error) {
    json(res, 500, { ok: false, error: "watch_scan_failed", message: String(error?.message || error) });
  }
}

async function handleCronBriefing(req, res, requestUrl) {
  if (!cronAuthorized(req)) {
    json(res, 403, { ok: false, error: "cron_token_invalid" });
    return;
  }
  const type = safeText(requestUrl.searchParams.get("type")) || "morning";
  const pending = await queryPendingTasks(20);
  const summary =
    type === "evening"
      ? `晚间回顾\n待办任务：${pending.length} 项\n建议：整理延期原因，准备明日 3 个优先任务。`
      : `晨间简报\n今日待办：${pending.length} 项\n建议：优先处理最临近 DDL 的 3 项。`;
  const briefingId = `brief_${type}_${Date.now()}`;
  try {
    await saveLogDocument("assistant_briefings", briefingId, {
      id: briefingId,
      briefType: type,
      summaryText: summary,
      createdAt: nowIso(),
    });
    const push = await sendFeishuWebhookText(summary);
    json(res, 200, { ok: true, type, summary, push });
  } catch (error) {
    json(res, 500, { ok: false, error: "briefing_failed", message: String(error?.message || error) });
  }
}

async function handlePendingTasks(req, res, requestUrl) {
  const limit = Math.max(1, Math.min(100, Number(requestUrl.searchParams.get("limit") || "20")));
  try {
    const tasks = await queryPendingTasks(limit);
    json(res, 200, {
      ok: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    json(res, 500, { ok: false, error: "list_tasks_failed", message: String(error?.message || error) });
  }
}

async function handleTaskAck(req, res, taskId) {
  if (!taskId) {
    json(res, 400, { ok: false, error: "missing_task_id" });
    return;
  }
  try {
    await patchDocument("tasks", taskId, {
      syncedLocal: true,
      status: "synced_local",
      updatedAt: nowIso(),
    });
    json(res, 200, { ok: true, taskId, summary: "task acked by local client" });
  } catch (error) {
    json(res, 500, { ok: false, error: "ack_failed", message: String(error?.message || error) });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const method = (req.method || "GET").toUpperCase();
  const pathname = requestUrl.pathname;

  try {
    if (method === "GET" && pathname === "/health") {
      json(res, 200, {
        ok: true,
        app: APP_NAME,
        projectId: PROJECT_ID || null,
        timeZone: TZ,
        firestoreEnabled: Boolean(PROJECT_ID),
        feishuWebhookConfigured: Boolean(FEISHU_BOT_WEBHOOK_URL),
        feishuImReplyEnabled: FEISHU_IM_REPLY_ENABLED,
        feishuAppCredentialsConfigured: Boolean(FEISHU_APP_ID && FEISHU_APP_SECRET),
        feishuVerifyTokenEnforced: FEISHU_ENFORCE_VERIFY_TOKEN,
        feishuWebhookPathHardened: Boolean(FEISHU_WEBHOOK_PATH_SECRET),
        now: nowIso(),
      });
      return;
    }

    if (method === "POST" && pathname === FEISHU_WEBHOOK_PATH) {
      await handleFeishuWebhook(req, res);
      return;
    }

    if (method === "POST" && pathname === "/cron/watch-scan") {
      await handleCronWatchScan(req, res, requestUrl);
      return;
    }

    if (method === "POST" && pathname === "/cron/briefing") {
      await handleCronBriefing(req, res, requestUrl);
      return;
    }

    if (method === "GET" && pathname === "/api/tasks/pending") {
      await handlePendingTasks(req, res, requestUrl);
      return;
    }

    if (method === "GET" && pathname === "/api/llm/providers") {
      await handleLlmProviders(req, res);
      return;
    }

    if (method === "POST" && pathname === "/api/llm/chat") {
      await handleLlmChat(req, res);
      return;
    }

    if (method === "POST" && pathname === "/api/llm/chat/stream") {
      await handleLlmChatStream(req, res);
      return;
    }

    if (method === "POST" && pathname === "/api/llm/fanout") {
      await handleLlmFanout(req, res);
      return;
    }

    if (method === "POST" && pathname === "/api/llm/roundtable") {
      await handleLlmRoundtable(req, res);
      return;
    }

    if (method === "POST" && pathname === "/api/llm/roundtable/stream") {
      await handleLlmRoundtableStream(req, res);
      return;
    }

    const ackMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/ack$/);
    if (method === "POST" && ackMatch) {
      await handleTaskAck(req, res, ackMatch[1]);
      return;
    }

    json(res, 404, {
      ok: false,
      error: "not_found",
      path: pathname,
      method,
    });
  } catch (error) {
    json(res, 500, {
      ok: false,
      error: "internal_error",
      message: String(error?.message || error),
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `[${APP_NAME}] listening on :${PORT} | project=${PROJECT_ID || "local-memory"} | timezone=${TZ} | firestore=${matchesTrue(String(Boolean(PROJECT_ID)))}`
  );
});
