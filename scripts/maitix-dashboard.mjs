#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import http from "node:http";
import process from "node:process";

const DEFAULT_MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const authCache = new Map();

function toCamelKey(raw) {
  return raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function parseArgs(argv) {
  const options = {
    sessionKeywords: [],
    help: false,
    open: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      throw new Error(`无法识别参数: ${token}`);
    }
    const rawKey = token.slice(2);
    if (rawKey === "help" || rawKey === "open") {
      options[rawKey] = true;
      continue;
    }
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`参数 ${token} 缺少值`);
    }
    i += 1;
    if (rawKey === "session") {
      options.sessionKeywords.push(value);
      continue;
    }
    options[toCamelKey(rawKey)] = value;
  }
  return options;
}

function parseJsonLoose(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // ignore
  }
  const jsonp = text.match(/^[^(]*\(([\s\S]+)\)\s*;?$/);
  if (jsonp?.[1]) {
    try {
      return JSON.parse(jsonp[1]);
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
    variants.add(`${year}${month}${day}`);
    variants.add(
      `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`,
    );
  }
  return [...variants].filter(Boolean);
}

function parseUrlSafe(rawUrl) {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
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

function getMaitixRetList(json) {
  if (!Array.isArray(json?.ret)) return [];
  return json.ret.map((item) => String(item)).filter(Boolean);
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

function selectMaitixEventsBySession(events, sessionKeywords) {
  if (sessionKeywords.length === 0) {
    return { sessionMatched: true, scopedEvents: events };
  }
  const keywordGroups = sessionKeywords
    .map((keyword) => buildKeywordVariants(keyword))
    .filter((group) => group.length > 0);
  if (keywordGroups.length === 0) {
    return { sessionMatched: true, scopedEvents: events };
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
    scopedEvents,
  };
}

function buildEventRow(event) {
  const prices = Array.isArray(event.priceVoList) ? event.priceVoList : [];
  const ticketCount = prices.reduce((sum, price) => {
    const n = Number(price?.marginCount);
    return Number.isFinite(n) && n > 0 ? sum + n : sum;
  }, 0);
  const hasPriceStock =
    ticketCount > 0 || prices.some((price) => price?.sellOut === false);
  const canBuy =
    Number(event?.eventChangeTag) !== 2 && (event?.sellOut === false || hasPriceStock);
  return {
    name: event?.aliasName ?? event?.eventCaption ?? "未知场次",
    showTime: event?.showTime ?? "",
    canBuy,
    ticketCount: ticketCount > 0 ? ticketCount : canBuy ? null : 0,
  };
}

async function fetchMaitixProject({
  projectId,
  targetOrigin,
  timeoutMs,
  forceRefreshAuth = false,
}) {
  const base = "https://client.maitix.com";
  const parsedOrigin = parseUrlSafe(targetOrigin);
  const originHost = parsedOrigin?.hostname ?? "bjythx.maitix.com";
  const siteHeader = originHost.split(".")[0] || "bjythx";
  const commonHeaders = {
    "user-agent": DEFAULT_MOBILE_UA,
    accept: "application/json, text/plain, */*",
    origin: targetOrigin,
    referer: `${targetOrigin}/h5`,
    "x-requested-with": "XMLHttpRequest",
    site: siteHeader,
  };

  const cacheKey = originHost;
  const cached = authCache.get(cacheKey);
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
        authCache.set(cacheKey, { sessionId, xsrfToken, expiresAt });
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
  return {
    ok: projectRes.ok,
    status: projectRes.status,
    headers: Object.fromEntries(projectRes.headers.entries()),
    json: parseJsonLoose(body),
    body,
  };
}

async function fetchMaitixProjectWithRetry(params) {
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await fetchMaitixProject({
      ...params,
      forceRefreshAuth: attempt === 2,
    });
    last = result;
    if (result.ok && result.json?.success === true && result.json?.data) return result;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return last;
}

function formatTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("zh-CN", { hour12: false });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>余票实时看板</title>
  <style>
    :root { --bg:#f6f8fb; --fg:#1f2328; --ok:#0f8a3d; --bad:#9aa4b2; --alert:#cf222e; --card:#fff; --line:#d0d7de; }
    *{box-sizing:border-box}
    body{margin:0;padding:16px;background:linear-gradient(120deg,#f6f8fb,#eef3fb);color:var(--fg);font:14px/1.45 "SF Pro Text","PingFang SC","Helvetica Neue",sans-serif}
    .wrap{max-width:980px;margin:0 auto}
    .head{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
    .badge{padding:8px 12px;border-radius:10px;font-weight:700}
    .badge.ok{background:#d4f8e1;color:#0b6f2f}
    .badge.bad{background:#eef1f5;color:#5d6670}
    .badge.risk{background:#ffe2e5;color:#a40e1a}
    .meta{color:#5a6470}
    .card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
    table{width:100%;border-collapse:collapse}
    th,td{padding:10px;border-bottom:1px solid #eef1f5;text-align:left}
    th{background:#f8fafc}
    tr.available{background:#fff1f1}
    .count{font-weight:800;color:#b00020}
    .muted{color:#66707c}
    .footer{margin-top:10px;color:#66707c;font-size:12px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div id="badge" class="badge bad">加载中...</div>
      <div class="meta" id="summary"></div>
      <div class="meta" id="updated"></div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr><th>场次</th><th>时间</th><th>状态</th><th>余票参考</th></tr>
        </thead>
        <tbody id="rows">
          <tr><td colspan="4" class="muted">等待首轮数据...</td></tr>
        </tbody>
      </table>
    </div>
    <div class="footer" id="reason"></div>
  </div>
  <script>
    const badge = document.getElementById("badge");
    const summary = document.getElementById("summary");
    const updated = document.getElementById("updated");
    const rows = document.getElementById("rows");
    const reason = document.getElementById("reason");
    let lastAvailable = false;

    function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
    function fmt(ts){ if(!ts) return "-"; return new Date(ts).toLocaleString("zh-CN",{hour12:false}); }

    async function refresh(){
      try{
        const res = await fetch("/api/status?t="+Date.now(), { cache: "no-store" });
        const data = await res.json();
        const available = data.summary.availableEventCount > 0;
        if (data.riskBlocked) {
          badge.className = "badge risk";
          badge.textContent = "触发风控，已自动降频";
        } else if (available) {
          badge.className = "badge ok";
          badge.textContent = "有票";
        } else {
          badge.className = "badge bad";
          badge.textContent = "无票";
        }

        summary.textContent = "目标场次: " + (data.sessionKeywords.join(" / ") || "全部") + " | 有票场次: " + data.summary.availableEventCount + " | 余票参考总数: " + data.summary.totalTickets;
        updated.textContent = "最近刷新: " + fmt(data.lastUpdateAt);
        reason.textContent = data.reason ? ("状态说明: " + data.reason) : "";

        if (!Array.isArray(data.events) || data.events.length === 0) {
          rows.innerHTML = "<tr><td colspan='4' class='muted'>未匹配到目标场次</td></tr>";
        } else {
          rows.innerHTML = data.events.map((row) => {
            const status = row.canBuy ? "<span style='color:#b00020;font-weight:700'>有票</span>" : "<span class='muted'>无票</span>";
            const count = row.ticketCount === null ? "<span class='count'>可买(数量未给出)</span>" : "<span class='count'>" + row.ticketCount + "</span>";
            return "<tr class='" + (row.canBuy ? "available" : "") + "'><td>" + esc(row.name) + "</td><td>" + esc(row.showTime || "-") + "</td><td>" + status + "</td><td>" + count + "</td></tr>";
          }).join("");
        }

        if (available && !lastAvailable) {
          alert("有票了，快去下单！");
        }
        lastAvailable = available;
      } catch (e) {
        badge.className = "badge bad";
        badge.textContent = "刷新失败";
        reason.textContent = "状态说明: " + e.message;
      }
    }
    refresh();
    setInterval(refresh, 10000);
  </script>
</body>
</html>`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`用法:
node scripts/maitix-dashboard.mjs --url "<maitix项目链接>" [--session "2026.4.2"] [--interval 10] [--port 8787] [--open]
`);
    return;
  }
  if (!args.url) {
    throw new Error("必须提供 --url");
  }
  const parsed = parseUrlSafe(args.url);
  if (!parsed || !parsed.hostname.includes("maitix.com")) {
    throw new Error("--url 必须是 maitix 链接");
  }
  const projectId = extractProjectIdFromUrl(args.url);
  if (!projectId) {
    throw new Error("链接中未找到 projectId");
  }

  const port = Number(args.port ?? 8787);
  const intervalSec = Number(args.interval ?? 10);
  const timeoutMs = Number(args.timeout ?? 10000);
  const targetOrigin = parsed.origin;
  const sessionKeywords =
    args.sessionKeywords.length > 0 ? args.sessionKeywords : ["2026.4.2"];

  const state = {
    url: args.url,
    projectId,
    sessionKeywords,
    intervalSec,
    timeoutMs,
    reason: "启动中...",
    riskBlocked: false,
    events: [],
    lastUpdateAt: 0,
    lastSuccessAt: 0,
    summary: {
      availableEventCount: 0,
      totalTickets: 0,
    },
  };

  let polling = false;
  async function pollOnce() {
    if (polling) return;
    polling = true;
    try {
      const result = await fetchMaitixProjectWithRetry({
        projectId,
        targetOrigin,
        timeoutMs,
      });
      state.lastUpdateAt = Date.now();
      if (!result?.ok) {
        state.reason = `请求失败 HTTP ${result?.status ?? "unknown"}`;
        state.riskBlocked = false;
        return;
      }
      if (!result.json || result.json.success !== true || !result.json.data) {
        const retList = getMaitixRetList(result.json);
        state.riskBlocked = isMaitixRiskBlocked(result);
        state.reason = state.riskBlocked
          ? `触发风控: ${retList.join(" | ") || "FAIL_SYS_USER_VALIDATE"}`
          : `接口返回失败: ${retList.join(" | ") || "未知格式"}`;
        return;
      }
      const events = Array.isArray(result.json.data.eventVoList)
        ? result.json.data.eventVoList
        : [];
      const scoped = selectMaitixEventsBySession(events, sessionKeywords);
      const rows = scoped.scopedEvents.map(buildEventRow);
      const totalTickets = rows.reduce((sum, row) => sum + (row.ticketCount || 0), 0);
      const availableEventCount = rows.filter((row) => row.canBuy).length;
      state.events = rows;
      state.summary = { availableEventCount, totalTickets };
      state.reason = scoped.sessionMatched ? "正常" : "未匹配到目标场次";
      state.riskBlocked = false;
      state.lastSuccessAt = state.lastUpdateAt;
    } catch (error) {
      state.lastUpdateAt = Date.now();
      state.reason = `异常: ${error.message}`;
    } finally {
      polling = false;
    }
  }

  const html = renderHtml();
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end("bad request");
      return;
    }
    const path = req.url.split("?")[0];
    if (path === "/api/status") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(
        JSON.stringify({
          ...state,
          lastUpdateText: formatTime(state.lastUpdateAt),
          lastSuccessText: formatTime(state.lastSuccessAt),
        }),
      );
      return;
    }
    if (path === "/" || path === "/index.html") {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(html);
      return;
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  console.log(`[INFO] 看板已启动: http://127.0.0.1:${port}`);
  console.log(`[INFO] 监控项目: ${projectId}`);
  console.log(`[INFO] 目标场次: ${sessionKeywords.join(" / ")}`);
  console.log(`[INFO] 轮询间隔: ${intervalSec}s`);

  if (args.open) {
    try {
      execFileSync("open", [`http://127.0.0.1:${port}`], { stdio: "ignore" });
    } catch {
      // ignore
    }
  }

  await pollOnce();
  setInterval(() => {
    void pollOnce();
  }, Math.max(intervalSec, 1) * 1000);
}

main().catch((error) => {
  console.error(`[FATAL] ${error.message}`);
  process.exitCode = 1;
});
