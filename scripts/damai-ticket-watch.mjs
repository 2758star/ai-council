#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const DEFAULT_AVAILABLE_KEYWORDS = [
  "立即购买",
  "提交订单",
  "可选座购买",
  "开抢中",
  "去购买",
];

const DEFAULT_BLOCK_KEYWORDS = [
  "缺货登记",
  "暂时缺货",
  "已售罄",
  "无票",
  "停售",
];

const DEFAULT_MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const MAITIX_SAFE_INTERVAL_SEC = 10;

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  red: "\u001b[31m",
  white: "\u001b[37m",
  bgRed: "\u001b[41m",
};

const maitixAuthCache = new Map();

function printHelp() {
  console.log(`
票务余票检测脚本（大麦/麦座，检测提醒，不自动下单）

用法:
  node scripts/damai-ticket-watch.mjs --url <活动页URL> [--url <活动页URL> ...] [选项]

选项:
  --interval <秒>         轮询间隔，默认 10 秒
  --timeout <毫秒>        请求超时，默认 10000
  --url <URL>             监控目标链接，可重复传入多个 URL
  --cookie <字符串>       登录后复制的 Cookie（可选，也可用环境变量 DAMAI_COOKIE）
  --referer <URL>         自定义 Referer（默认使用 --url）
  --session <文本>        仅监控指定场次文本，可重复（如 2026.4.2 19:30）
  --session-window <字符> 场次附近上下文窗口，默认 1200
  --keyword <词>          命中即判定“可购买”，可重复传入
  --block-keyword <词>    命中即判定“不可购买”，可重复传入
  --webhook <URL>         命中后 POST JSON 通知（可选）
  --debug-dir <目录>      保存异常响应快照（可选）
  --once                  只检测一次
  --verbose               输出命中的关键词详情
  --help                  显示帮助

示例:
  node scripts/damai-ticket-watch.mjs \\
    --url "https://m.damai.cn/shows/item.html?itemId=xxxxxxxx" \\
    --url "https://xxxx.maitix.com/h5#/pages-order/projectDetail/index?projectId=yyyy" \\
    --interval 1 \\
    --session "2026.4.2" \\
    --cookie "$DAMAI_COOKIE"
`);
}

function toCamelKey(raw) {
  return raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseArgs(argv) {
  const options = {
    urls: [],
    keywords: [],
    blockKeywords: [],
    sessionKeywords: [],
    once: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`无法识别参数: ${token}`);
    }

    const rawKey = token.slice(2);
    if (rawKey === "help" || rawKey === "once" || rawKey === "verbose") {
      options[rawKey] = true;
      continue;
    }

    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`参数 ${token} 缺少值`);
    }
    i += 1;

    if (rawKey === "keyword") {
      options.keywords.push(value);
      continue;
    }
    if (rawKey === "block-keyword") {
      options.blockKeywords.push(value);
      continue;
    }
    if (rawKey === "session") {
      options.sessionKeywords.push(value);
      continue;
    }
    if (rawKey === "url") {
      options.urls.push(value);
      continue;
    }

    const key = toCamelKey(rawKey);
    options[key] = value;
  }

  return options;
}

function normalizeText(input) {
  return String(input)
    .toLowerCase()
    .replace(
      /[\s`~!@#$%^&*()_+=[\]{}|\\;:'",.<>/?·！￥…（）—\-【】、；：‘’“”，。《》？]/g,
      "",
    );
}

function buildKeywordVariants(rawKeyword) {
  const variants = new Set();
  const normalized = normalizeText(rawKeyword);
  if (normalized) variants.add(normalized);

  const dateMatch = String(rawKeyword)
    .trim()
    .match(/^(\d{4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})日?$/);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    if (Number.isFinite(month) && Number.isFinite(day)) {
      variants.add(`${year}${month}${day}`);
      variants.add(
        `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
      );
    }
  }

  return [...variants].filter(Boolean);
}

function formatNow() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function escapeAppleScript(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function sendWebhook(webhookUrl, message) {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: message,
        source: "damai-ticket-watch",
        sentAt: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.warn(`[WARN] Webhook 返回 ${res.status}`);
    }
  } catch (error) {
    console.warn(`[WARN] Webhook 发送失败: ${error.message}`);
  }
}

function macNotify(title, body) {
  if (os.platform() !== "darwin") return;
  try {
    execFileSync("osascript", [
      "-e",
      `display notification "${escapeAppleScript(body)}" with title "${escapeAppleScript(title)}"`,
    ]);
  } catch {
    // 忽略通知失败，避免影响监控主流程
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function supportAnsi() {
  return Boolean(process.stdout?.isTTY) && !process.env.NO_COLOR;
}

function styleRedBold(text) {
  if (!supportAnsi()) return `!!! ${text} !!!`;
  return `${ANSI.bold}${ANSI.red}${text}${ANSI.reset}`;
}

function styleAlertBox(text) {
  if (!supportAnsi()) return `#################### ${text} ####################`;
  return `${ANSI.bold}${ANSI.white}${ANSI.bgRed} ${text} ${ANSI.reset}`;
}

function parseJsonLoose(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // 继续尝试其他格式
  }

  const jsonpMatch = text.match(/^[^(]*\(([\s\S]+)\)\s*;?$/);
  if (jsonpMatch?.[1]) {
    try {
      return JSON.parse(jsonpMatch[1]);
    } catch {
      // ignore
    }
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // ignore
    }
  }

  return null;
}

function clipInline(text, max = 120) {
  return String(text).replace(/\s+/g, " ").slice(0, max);
}

async function dumpDebugSnapshot(debugDir, label, payload) {
  if (!debugDir) return;
  const safeLabel = String(label).replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(debugDir, `${stamp}_${safeLabel}.json`);
  await mkdir(debugDir, { recursive: true });
  await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

function parseUrlSafe(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function getTargetLabel(rawUrl) {
  const parsed = parseUrlSafe(rawUrl);
  if (!parsed) return rawUrl;
  const projectId = extractProjectIdFromUrl(rawUrl);
  if (projectId && parsed.hostname.includes("maitix.com")) {
    return `${parsed.hostname}(projectId=${projectId})`;
  }
  return parsed.hostname;
}

function extractProjectIdFromUrl(rawUrl) {
  const parsed = parseUrlSafe(rawUrl);
  if (!parsed) return "";

  const direct =
    parsed.searchParams.get("projectId") ?? parsed.searchParams.get("projectid");
  if (direct) return direct;

  const hash = parsed.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
    const fromHash =
      hashParams.get("projectId") ?? hashParams.get("projectid") ?? "";
    if (fromHash) return fromHash;
  }
  return "";
}

function detectProvider(rawUrl) {
  const parsed = parseUrlSafe(rawUrl);
  if (!parsed) return "html-keyword";
  if (parsed.hostname.includes("maitix.com") && extractProjectIdFromUrl(rawUrl)) {
    return "maitix-api";
  }
  return "html-keyword";
}

async function fetchPage({
  url,
  timeoutMs,
  cookie,
  referer,
  userAgent = DEFAULT_MOBILE_UA,
}) {
  const headers = {
    "user-agent": userAgent,
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "zh-CN,zh;q=0.9",
    referer: referer || url,
  };

  if (cookie) headers.cookie = cookie;

  const res = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const html = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    html,
  };
}

async function fetchMaitixProject({
  projectId,
  targetOrigin,
  timeoutMs,
  forceRefreshAuth = false,
  userAgent = DEFAULT_MOBILE_UA,
}) {
  const base = "https://client.maitix.com";
  const parsedOrigin = parseUrlSafe(targetOrigin);
  const originHost = parsedOrigin?.hostname ?? "bjythx.maitix.com";
  const siteHeader = originHost.split(".")[0] || "bjythx";

  const commonHeaders = {
    "user-agent": userAgent,
    accept: "application/json, text/plain, */*",
    origin: targetOrigin,
    referer: `${targetOrigin}/h5`,
    "x-requested-with": "XMLHttpRequest",
    site: siteHeader,
  };

  const cacheKey = originHost;
  const cached = maitixAuthCache.get(cacheKey);
  const now = Date.now();
  let sessionId = "";
  let xsrfToken = "";
  const shouldRefreshAuth =
    forceRefreshAuth ||
    !cached ||
    !cached.sessionId ||
    !cached.xsrfToken ||
    now >= (cached.expiresAt ?? 0);

  if (shouldRefreshAuth) {
    try {
      const csrfRes = await fetch(`${base}/api/getCsrfToken`, {
        method: "GET",
        headers: commonHeaders,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const csrfBody = await csrfRes.text();
      const csrfJson = parseJsonLoose(csrfBody);
      const newSessionId = csrfRes.headers.get("x-mz-session") ?? "";
      const newXsrfToken = csrfJson?.data?.xsrfToken ?? "";
      const expireSec = Number(csrfJson?.data?.expireTime ?? 60);
      const ttl = Number.isFinite(expireSec) && expireSec > 10 ? expireSec - 8 : 52;
      const expiresAt = now + ttl * 1000;

      if (newSessionId && newXsrfToken) {
        sessionId = newSessionId;
        xsrfToken = newXsrfToken;
        maitixAuthCache.set(cacheKey, { sessionId, xsrfToken, expiresAt });
      } else if (cached) {
        sessionId = cached.sessionId;
        xsrfToken = cached.xsrfToken;
      }
    } catch {
      if (cached) {
        sessionId = cached.sessionId;
        xsrfToken = cached.xsrfToken;
      }
    }
  } else {
    sessionId = cached.sessionId;
    xsrfToken = cached.xsrfToken;
  }

  const projectHeaders = { ...commonHeaders };
  if (sessionId) projectHeaders["x-mz-session"] = sessionId;
  if (xsrfToken) projectHeaders["x-xsrf-token"] = xsrfToken;

  const params = new URLSearchParams({
    projectToken: projectId,
    reqType: "1",
  });
  const projectRes = await fetch(`${base}/api/pro/project?${params.toString()}`, {
    method: "GET",
    headers: projectHeaders,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await projectRes.text();
  const json = parseJsonLoose(body);

  return {
    ok: projectRes.ok,
    status: projectRes.status,
    json,
    body,
    headers: Object.fromEntries(projectRes.headers.entries()),
    auth: {
      hasSession: Boolean(sessionId),
      hasXsrf: Boolean(xsrfToken),
      usedCache: !shouldRefreshAuth && Boolean(cached),
      forceRefreshAuth,
    },
  };
}

async function fetchMaitixProjectWithRetry(params) {
  let lastResult = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await fetchMaitixProject({
      ...params,
      forceRefreshAuth: attempt === 2,
    });
    lastResult = result;
    if (result.ok && result.json?.success === true && result.json?.data) {
      return result;
    }
    if (attempt < 2) {
      await sleep(250);
    }
  }
  return lastResult;
}

function getMaitixRetList(json) {
  if (!Array.isArray(json?.ret)) return [];
  return json.ret.map((item) => String(item)).filter(Boolean);
}

function getMaitixPunishUrl(result) {
  const url = result?.json?.data?.url;
  if (typeof url !== "string") return "";
  return /^https?:\/\//i.test(url) ? url : "";
}

function isMaitixRiskBlocked(result) {
  const retList = getMaitixRetList(result?.json);
  const hitRet = retList.some(
    (line) =>
      line.includes("FAIL_SYS_USER_VALIDATE") ||
      line.includes("RGV587_ERROR") ||
      line.includes("被挤爆"),
  );
  const headerFlag = String(result?.headers?.bxpunish ?? "") === "1";
  return hitRet || headerFlag;
}

function buildMaitixUnexpectedReason(result) {
  if (isMaitixRiskBlocked(result)) {
    const retList = getMaitixRetList(result?.json);
    const retText = retList.join(" | ");
    return `触发平台风控校验（${clipInline(retText || "FAIL_SYS_USER_VALIDATE", 100)}）`;
  }

  if (result?.json) {
    const retList = getMaitixRetList(result.json);
    const retCode = retList[0]?.split("::")?.[0] ?? "";
    const rawCode = result.json.code ?? result.json.innerCode ?? retCode ?? "";
    const code = rawCode || "unknown";
    const msg =
      result.json.msg ??
      result.json.detailMsg ??
      result.json.errorName ??
      retList[1] ??
      retList[0] ??
      "无错误信息";
    return `接口返回失败 code=${code} msg=${clipInline(msg, 80)}`;
  }

  const body = String(result?.body ?? "").trim();
  if (!body) {
    return "空响应体（可能被限流/风控）";
  }
  if (body.startsWith("<")) {
    return `返回HTML（疑似风控页） body=${clipInline(body, 80)}`;
  }
  return `非JSON响应 body=${clipInline(body, 80)}`;
}

function buildSessionScope(content, sessionKeywords, sessionWindowChars) {
  if (sessionKeywords.length === 0) {
    return {
      sessionMatched: true,
      matchedSessions: [],
      scopedContent: content,
    };
  }

  const chunks = [];
  const matchedSessions = [];
  for (const rawKeyword of sessionKeywords) {
    const variants = buildKeywordVariants(rawKeyword);
    if (variants.length === 0) continue;

    let foundAtLeastOnce = false;
    for (const keyword of variants) {
      let startAt = 0;
      while (true) {
        const idx = content.indexOf(keyword, startAt);
        if (idx === -1) break;
        foundAtLeastOnce = true;
        const left = Math.max(0, idx - sessionWindowChars);
        const right = Math.min(
          content.length,
          idx + keyword.length + sessionWindowChars,
        );
        chunks.push(content.slice(left, right));
        startAt = idx + keyword.length;
      }
    }
    if (foundAtLeastOnce) matchedSessions.push(rawKeyword);
  }

  if (chunks.length === 0) {
    return {
      sessionMatched: false,
      matchedSessions: [],
      scopedContent: "",
    };
  }

  return {
    sessionMatched: true,
    matchedSessions,
    scopedContent: chunks.join(" "),
  };
}

function judgeStock(
  html,
  availableKeywords,
  blockKeywords,
  sessionKeywords,
  sessionWindowChars,
) {
  const content = normalizeText(html);
  const sessionScope = buildSessionScope(
    content,
    sessionKeywords,
    sessionWindowChars,
  );
  const targetContent = sessionScope.scopedContent;

  const foundAvailable = availableKeywords.filter((word) =>
    targetContent.includes(normalizeText(word)),
  );
  const foundBlock = blockKeywords.filter((word) =>
    targetContent.includes(normalizeText(word)),
  );

  const available =
    sessionScope.sessionMatched &&
    foundAvailable.length > 0 &&
    foundBlock.length === 0;
  return {
    available,
    foundAvailable,
    foundBlock,
    sessionMatched: sessionScope.sessionMatched,
    matchedSessions: sessionScope.matchedSessions,
  };
}

function selectMaitixEventsBySession(events, sessionKeywords) {
  if (sessionKeywords.length === 0) {
    return {
      sessionMatched: true,
      matchedSessions: [],
      scopedEvents: events,
    };
  }

  const keywordGroups = sessionKeywords
    .map((keyword) => buildKeywordVariants(keyword))
    .filter((group) => group.length > 0);
  if (keywordGroups.length === 0) {
    return {
      sessionMatched: true,
      matchedSessions: [],
      scopedEvents: events,
    };
  }

  const scopedEvents = events.filter((event) => {
    const text = normalizeText(
      `${event.aliasName ?? ""} ${event.eventCaption ?? ""} ${event.showTime ?? ""}`,
    );
    return keywordGroups.every((variants) =>
      variants.some((keyword) => text.includes(keyword)),
    );
  });

  return {
    sessionMatched: scopedEvents.length > 0,
    matchedSessions: scopedEvents.length > 0 ? sessionKeywords : [],
    scopedEvents,
  };
}

function isMaitixEventAvailable(event) {
  if (!event) return false;
  if (Number(event.eventChangeTag) === 2) return false;
  if (event.sellOut === false) return true;

  const prices = Array.isArray(event.priceVoList) ? event.priceVoList : [];
  if (prices.some((price) => Number(price.marginCount) > 0)) return true;
  if (prices.some((price) => price.sellOut === false)) return true;
  return false;
}

function formatMaitixEvent(event) {
  const name = event.aliasName ?? event.eventCaption ?? event.eventToken ?? "未知场次";
  const prices = Array.isArray(event.priceVoList) ? event.priceVoList : [];
  const margins = prices
    .map((price) => Number(price.marginCount))
    .filter((margin) => Number.isFinite(margin));
  if (margins.length === 0) return name;
  return `${name}(余量参考:${Math.max(...margins)})`;
}

function judgeMaitixStock(projectData, sessionKeywords) {
  const allEvents = Array.isArray(projectData?.eventVoList)
    ? projectData.eventVoList
    : [];
  const scoped = selectMaitixEventsBySession(allEvents, sessionKeywords);
  const availableEvents = scoped.scopedEvents.filter(isMaitixEventAvailable);

  return {
    available: scoped.sessionMatched && availableEvents.length > 0,
    foundAvailable: availableEvents.slice(0, 6).map(formatMaitixEvent),
    foundBlock:
      scoped.sessionMatched &&
      scoped.scopedEvents.length > 0 &&
      availableEvents.length === 0
        ? ["目标场次暂不可售/可能已售罄"]
        : [],
    sessionMatched: scoped.sessionMatched,
    matchedSessions: scoped.matchedSessions,
  };
}

async function checkTarget({
  target,
  timeoutMs,
  cookie,
  referer,
  debugDir,
  availableKeywords,
  blockKeywords,
  sessionKeywords,
  sessionWindowChars,
}) {
  if (target.provider === "maitix-api") {
    const parsed = parseUrlSafe(target.url);
    const projectId = extractProjectIdFromUrl(target.url);
    const targetOrigin = parsed?.origin ?? "https://bjythx.maitix.com";
    const result = await fetchMaitixProjectWithRetry({
      projectId,
      targetOrigin,
      timeoutMs,
    });

    if (!result.ok) {
      return {
        ok: false,
        status: result.status,
        reason: "接口请求失败",
      };
    }
    if (!result.json || result.json.success !== true || !result.json.data) {
      const reason = buildMaitixUnexpectedReason(result);
      const riskBlocked = isMaitixRiskBlocked(result);
      const punishUrl = getMaitixPunishUrl(result);
      await dumpDebugSnapshot(debugDir, `maitix_unexpected_${target.label}`, {
        now: new Date().toISOString(),
        target,
        reason,
        riskBlocked,
        punishUrl,
        status: result.status,
        headers: result.headers,
        auth: result.auth,
        bodyPreview: String(result.body ?? "").slice(0, 2000),
        json: result.json,
      });
      return {
        ok: false,
        status: result.status,
        reason,
        riskBlocked,
        punishUrl,
      };
    }

    return {
      ok: true,
      status: result.status,
      provider: "maitix-api",
      stock: judgeMaitixStock(result.json.data, sessionKeywords),
    };
  }

  const result = await fetchPage({
    url: target.url,
    timeoutMs,
    cookie,
    referer,
  });

  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      reason: "页面请求失败",
    };
  }

  return {
    ok: true,
    status: result.status,
    provider: "html-keyword",
    stock: judgeStock(
      result.html,
      availableKeywords,
      blockKeywords,
      sessionKeywords,
      sessionWindowChars,
    ),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const targetUrls = args.urls.length > 0 ? args.urls : args.url ? [args.url] : [];
  if (targetUrls.length === 0) {
    printHelp();
    throw new Error("必须至少提供一个 --url");
  }

  const intervalSec = Number(args.interval ?? 10);
  const timeoutMs = Number(args.timeout ?? 10_000);
  const sessionWindowChars = Number(args.sessionWindow ?? 1200);
  const debugDir = args.debugDir ?? "";
  const sessionKeywords =
    args.sessionKeywords.length > 0 ? args.sessionKeywords : [];
  const cookie = args.cookie ?? process.env.DAMAI_COOKIE;
  if (!Number.isFinite(intervalSec) || intervalSec <= 0) {
    throw new Error("--interval 必须是正数");
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("--timeout 必须是正数");
  }
  if (!Number.isFinite(sessionWindowChars) || sessionWindowChars <= 0) {
    throw new Error("--session-window 必须是正数");
  }

  const targets = targetUrls.map((url) => ({
    url,
    label: getTargetLabel(url),
    provider: detectProvider(url),
  }));

  const availableKeywords =
    args.keywords.length > 0 ? args.keywords : DEFAULT_AVAILABLE_KEYWORDS;
  const blockKeywords =
    args.blockKeywords.length > 0 ? args.blockKeywords : DEFAULT_BLOCK_KEYWORDS;

  const configPreview = {
    targets: targets.map((target) => ({
      url: target.url,
      provider: target.provider,
      label: target.label,
    })),
    intervalSec,
    timeoutMs,
    useCookie: Boolean(cookie),
    sessionKeywords,
    sessionWindowChars,
    keywords: availableKeywords,
    blockKeywords,
    webhook: args.webhook ? "enabled" : "disabled",
    debugDir: debugDir || "disabled",
    once: Boolean(args.once),
  };
  console.log(`[INFO] 启动检测: ${JSON.stringify(configPreview, null, 2)}`);

  const previousAvailableMap = new Map();
  for (const target of targets) {
    previousAvailableMap.set(target.url, false);
  }

  while (true) {
    const now = formatNow();
    let nextIntervalSec = intervalSec;
    for (const target of targets) {
      try {
        const result = await checkTarget({
          target,
          timeoutMs,
          cookie,
          referer: args.referer,
          debugDir,
          availableKeywords,
          blockKeywords,
          sessionKeywords,
          sessionWindowChars,
        });

        if (!result.ok) {
          const statusText =
            typeof result.status === "number" ? `[HTTP ${result.status}] ` : "";
          console.log(
            `[${now}] [${target.label}] ${statusText}${result.reason ?? "检测失败"}`,
          );
          if (result.riskBlocked) {
            const safeSec = Math.max(intervalSec, MAITIX_SAFE_INTERVAL_SEC);
            nextIntervalSec = Math.max(nextIntervalSec, safeSec);
            const punishTip = result.punishUrl ? `，校验地址: ${result.punishUrl}` : "";
            console.log(
              `[${now}] [${target.label}] [AUTO] 命中风控，自动降频到 ${safeSec}s${punishTip}`,
            );
          }
          continue;
        }

        const stock = result.stock;
        const statusText = stock.available
          ? "有票信号"
          : sessionKeywords.length > 0 && !stock.sessionMatched
            ? "未匹配到目标场次"
            : "无票信号";
        console.log(
          `[${now}] [${target.label}] [${result.status}] ${statusText} (${result.provider})`,
        );

        if (args.verbose) {
          console.log(
            `[${now}] [${target.label}] [DEBUG] sessionMatched=${stock.sessionMatched} session=${stock.matchedSessions.join(",") || "-"} available=${stock.foundAvailable.join(" | ") || "-"} block=${stock.foundBlock.join(" | ") || "-"}`,
          );
        }

        const previousAvailable = previousAvailableMap.get(target.url) ?? false;
        if (stock.available && !previousAvailable) {
          const sessionHint =
            sessionKeywords.length > 0 ? `（场次: ${sessionKeywords.join(" / ")}）` : "";
          const msg = `${target.label} 疑似可购买${sessionHint}，快手动查看：${target.url}`;
          process.stdout.write("\u0007");
          console.log(`[${now}] [ALERT] ${msg}`);
          macNotify("余票提醒", msg);
          if (args.webhook) {
            await sendWebhook(args.webhook, msg);
          }
        }
        previousAvailableMap.set(target.url, stock.available);
      } catch (error) {
        console.log(`[${now}] [${target.label}] [ERROR] ${error.message}`);
      }
    }

    if (args.once) break;
    await sleep(nextIntervalSec * 1000);
  }
}

main().catch((error) => {
  console.error(`[FATAL] ${error.message}`);
  process.exitCode = 1;
});
