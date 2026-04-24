import { useEffect, useMemo, useState } from "react";
import { Bot, RefreshCw, Sparkles } from "lucide-react";
import { ModuleStateStrip, type ModuleState } from "@/components/state/module-state-strip";
import { generateAiDigest, listAiLogs, listPlanDraftItems, listPlanDrafts } from "@/features/ai/api";
import type { AiDigestPayload, AiLogRecord, PlanDraftItemRecord, PlanDraftRecord } from "@/features/ai/types";

const mockDigest: AiDigestPayload = {
  summary: "今日学习产出稳定，建议把高难模块前置。",
  actions: ["先做GRE填空", "晚间复盘错题", "文书收口30分钟"],
  provider: "mock",
  model: "mock-v1",
  inputTokens: 800,
  outputTokens: 260,
  estimatedCost: 0,
  latencyMs: 0,
};

const mockLogs: AiLogRecord[] = [
  {
    id: 0,
    moduleName: "ai",
    actionName: "local_fallback",
    providerName: "mock",
    modelName: "mock-v1",
    inputTokens: 320,
    outputTokens: 120,
    estimatedCost: 0,
    latencyMs: 32,
    success: true,
    createdAt: new Date().toISOString(),
  },
];

const mockDrafts: PlanDraftRecord[] = [
  {
    id: -1,
    title: "本地兜底草案",
    draftType: "daily_plan",
    targetDate: new Date().toISOString().slice(0, 10),
    weekKey: null,
    sourceContextJson: null,
    suggestionText: "接口异常时展示本地建议",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

type ModuleStateMap = {
  digest: ModuleState;
  logs: ModuleState;
  drafts: ModuleState;
};

export function AIPage() {
  const [digestState, setDigestState] = useState<ModuleState>("loading");
  const [logsState, setLogsState] = useState<ModuleState>("loading");
  const [draftState, setDraftState] = useState<ModuleState>("loading");
  const [errorText, setErrorText] = useState<string | null>(null);

  const [digest, setDigest] = useState<AiDigestPayload | null>(null);
  const [logs, setLogs] = useState<AiLogRecord[]>([]);
  const [drafts, setDrafts] = useState<PlanDraftRecord[]>([]);
  const [draftItems, setDraftItems] = useState<Record<number, PlanDraftItemRecord[]>>({});

  async function refresh() {
    setErrorText(null);
    setDigestState("loading");
    setLogsState("loading");
    setDraftState("loading");

    const [digestResult, logsResult, draftsResult] = await Promise.allSettled([
      generateAiDigest(),
      listAiLogs(20),
      listPlanDrafts({ limit: 8 }),
    ]);

    if (digestResult.status === "fulfilled") {
      setDigest(digestResult.value);
      setDigestState("success");
    } else {
      setDigest(mockDigest);
      setDigestState("fallback");
      setErrorText(String(digestResult.reason));
    }

    if (logsResult.status === "fulfilled") {
      setLogs(logsResult.value);
      setLogsState("success");
    } else {
      setLogs(mockLogs);
      setLogsState("fallback");
      setErrorText((prev) => prev ?? String(logsResult.reason));
    }

    if (draftsResult.status === "fulfilled") {
      const rows = draftsResult.value;
      setDrafts(rows);
      const topDrafts = rows.slice(0, 3);
      const itemPairs = await Promise.all(
        topDrafts.map(async (draft) => ({ id: draft.id, items: await listPlanDraftItems(draft.id) })),
      ).catch(() => []);
      const next: Record<number, PlanDraftItemRecord[]> = {};
      itemPairs.forEach((pair) => {
        next[pair.id] = pair.items;
      });
      setDraftItems(next);
      setDraftState("success");
    } else {
      setDrafts(mockDrafts);
      setDraftItems({});
      setDraftState("fallback");
      setErrorText((prev) => prev ?? String(draftsResult.reason));
    }
  }

  useEffect(() => {
    refresh().catch((err) => {
      setDigest(mockDigest);
      setLogs(mockLogs);
      setDrafts(mockDrafts);
      setDraftItems({});
      setDigestState("fallback");
      setLogsState("fallback");
      setDraftState("fallback");
      setErrorText(String(err));
    });
  }, []);

  const successRate = useMemo(() => {
    if (logs.length === 0) return 0;
    const ok = logs.filter((item) => item.success).length;
    return Math.round((ok / logs.length) * 100);
  }, [logs]);

  const totalCost = useMemo(
    () => logs.reduce((sum, item) => sum + (Number.isFinite(item.estimatedCost) ? item.estimatedCost : 0), 0),
    [logs],
  );

  const overallState: ModuleState = useMemo(() => {
    const states: ModuleStateMap = { digest: digestState, logs: logsState, drafts: draftState };
    const values = Object.values(states);
    if (values.every((s) => s === "success")) return "success";
    if (values.some((s) => s === "fallback")) return "fallback";
    if (values.some((s) => s === "loading")) return "loading";
    return "error";
  }, [digestState, logsState, draftState]);

  return (
    <section className="h-full overflow-hidden bg-[#F5F5F7] p-3">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_220px] gap-3">
        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <article className="gc px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-zinc-800">AI 控制台</h2>
                <p className="mt-1 text-[12px] text-zinc-500">真实调用优先，模块失败仅局部降级，不阻断全页。</p>
              </div>
              <button
                type="button"
                onClick={() => refresh().catch(() => undefined)}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-600"
              >
                <RefreshCw size={13} />
                刷新
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ModuleStateStrip state={overallState} text={overallState === "fallback" ? "局部降级中" : undefined} />
              {errorText ? <span className="line-clamp-1 text-[11px] text-zinc-500">{errorText}</span> : null}
            </div>
          </article>

          <article className="gc min-h-0 flex-1 overflow-hidden px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-zinc-700">
                <Sparkles size={16} className="text-indigo-500" />
                今日 AI 摘要
              </div>
              <ModuleStateStrip state={digestState} />
            </div>
            <div className="mt-3 rounded-[10px] bg-indigo-50/70 p-3">
              <p className="text-[13px] text-zinc-700">{digest?.summary ?? "暂无摘要"}</p>
              <ul className="mt-2 space-y-1 text-[12px] text-zinc-600">
                {(digest?.actions ?? []).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-zinc-500">
                {digest ? `${digest.provider} · ${digest.model} · ${digest.latencyMs}ms` : "-"}
              </p>
            </div>

            <div className="mt-3 grid min-h-0 grid-cols-2 gap-3 overflow-hidden">
              <div className="rounded-[10px] bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-zinc-700">近期调用日志</p>
                  <ModuleStateStrip state={logsState} />
                </div>
                <div className="mt-2 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {logs.length > 0 ? (
                    logs.map((log) => (
                      <div key={log.id} className="rounded-[8px] border border-zinc-100 bg-white px-2 py-1.5">
                        <p className="text-[12px] font-medium text-zinc-700">
                          {log.moduleName} · {log.actionName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {log.providerName ?? "-"} / {log.modelName ?? "-"} / {log.latencyMs ?? 0}ms
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-zinc-500">暂无日志</p>
                  )}
                </div>
              </div>

              <div className="rounded-[10px] bg-white/70 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-zinc-700">计划草稿（真实草稿池）</p>
                  <ModuleStateStrip state={draftState} />
                </div>
                <div className="mt-2 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {drafts.length > 0 ? (
                    drafts.map((draft) => (
                      <div key={draft.id} className="rounded-[8px] border border-zinc-100 bg-white px-2 py-1.5">
                        <p className="text-[12px] font-medium text-zinc-700">{draft.title}</p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {draft.status} · {draft.draftType}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-500">{(draftItems[draft.id] ?? []).length} 项</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-zinc-500">暂无草稿</p>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <article className="gc px-3 py-3">
            <p className="text-[13px] font-semibold text-zinc-700">调用健康</p>
            <p className="mt-2 text-[28px] font-bold text-zinc-800">{successRate}%</p>
            <p className="text-[11px] text-zinc-500">最近{logs.length}次成功率</p>
          </article>

          <article className="gc px-3 py-3">
            <p className="text-[13px] font-semibold text-zinc-700">估算成本</p>
            <p className="mt-2 text-[24px] font-bold text-zinc-800">${totalCost.toFixed(4)}</p>
            <p className="text-[11px] text-zinc-500">按日志累加</p>
          </article>

          <article className="gc px-3 py-3">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-indigo-500" />
              <p className="text-[13px] font-semibold text-zinc-700">状态说明</p>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-zinc-600">
              本页优先读取真实 AI 能力；如遇 provider 或命令异常，仅对应模块降级为 mock。
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
