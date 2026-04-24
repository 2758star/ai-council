import { motion } from "framer-motion";
import { Copy, RefreshCw } from "lucide-react";
import { useState } from "react";
import { generateEveningBriefing, type EveningBriefingOutput } from "@/features/ai/workflows";

type Brief = { id: number; type: "早报" | "晚报"; time: string; preview: string; status: "已发" | "待发" };

const history: Brief[] = [
  { id: 1, type: "早报", time: "07:05", preview: "今日任务与申请提醒已生成", status: "已发" },
  { id: 2, type: "晚报", time: "21:10", preview: "晚间复盘与明日草案", status: "待发" },
  { id: 3, type: "早报", time: "07:03", preview: "连击第6天，继续推进", status: "已发" },
];

export function BriefingPage() {
  const [activeId, setActiveId] = useState(1);
  const [generated, setGenerated] = useState<EveningBriefingOutput | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const active = history.find((h) => h.id === activeId) ?? history[0];

  async function handleGenerateEvening() {
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const payload = await generateEveningBriefing({
        completedTasks: ["雅思听力 Section 3 精练", "GRE 数学代数 20题"],
        pendingTasks: ["完善 MIT SoP 第2段", "错题回顾：推断题", "晚间词汇复习 60个"],
        applicationAlerts: ["MIT EECS 距截止 6 天", "Stanford CS 推荐信待跟进", "Columbia CS 材料完成 75%"],
        mistakeStats: {
          addedToday: 12,
          masteredToday: 8,
          weakTags: ["GRE代数×5", "雅思推断×4", "GRE几何×3"],
        },
      });
      setGenerated(payload);
    } catch (error) {
      setBriefError(String(error));
      setGenerated(null);
    } finally {
      setLoadingBrief(false);
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="h-full overflow-hidden bg-[#F5F5F7] p-3">
      <div className="grid h-full min-h-0 grid-cols-[176px_minmax(0,1fr)_192px] gap-3">
        <motion.aside whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className="gc min-h-0 overflow-y-auto px-3 py-3">
          <h3 className="text-[14px] font-semibold">简报历史</h3>
          <div className="mt-2 space-y-2">
            {history.map((row) => (
              <button key={row.id} onClick={() => setActiveId(row.id)} className={`w-full rounded-[10px] px-2 py-2 text-left ${row.id === activeId ? "bg-indigo-50" : "bg-white/70"}`}>
                <div className="flex items-center justify-between"><span className={`h-2.5 w-2.5 rounded-full ${row.type === "早报" ? "bg-yellow-400" : "bg-indigo-500"}`} /><span className="text-[10px] text-zinc-500">{row.time}</span></div>
                <p className="mt-1 text-[11px] text-zinc-700">{row.preview}</p>
                <p className="mt-1 text-[10px] text-zinc-500">{row.status}</p>
              </button>
            ))}
          </div>
        </motion.aside>

        <motion.main whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className="gc min-h-0 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[10px] ${active.type === "早报" ? "bg-yellow-50 text-yellow-700" : "bg-indigo-50 text-indigo-600"}`}>{active.type}</span><span className="text-[11px] text-zinc-500">2026-04-15 · {active.time}</span></div>
            <div className="flex items-center gap-2"><button className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-[11px] text-zinc-600"><Copy size={12} />复制全文</button><button className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] text-emerald-600">已发飞书</button></div>
          </div>

          <div className="mt-3 space-y-3">
            <article className="rounded-[10px] bg-white/70 p-3">
              <h4 className="text-[13px] font-semibold">今日任务</h4>
              <div className="mt-1 space-y-1 text-[12px] text-zinc-700">
                {(generated?.sections.nextActions ?? [
                  "☐ 雅思听力 Section 3 精练 [雅思]",
                  "☐ GRE 数学代数 20题 [GRE]",
                  "☐ 完善 MIT SoP 第2段 [申请]",
                ]).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </article>
            <article className="rounded-[10px] bg-white/70 p-3">
              <h4 className="text-[13px] font-semibold">申请提醒</h4>
              <div className="mt-1 space-y-1 text-[12px] text-zinc-700">
                {(generated?.sections.applicationReminders ?? [
                  "⚠ MIT EECS — 距截止6天",
                  "✓ CMU SCS — 材料已提交",
                  "○ Stanford CS — 推荐信待跟进",
                ]).map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </article>
            <article className="rounded-[10px] bg-indigo-50 p-3">
              <h4 className="text-[13px] font-semibold text-indigo-700">AI激励</h4>
              <p className="mt-1 text-[12px] text-indigo-700">
                {generated?.sections.motivation ?? "连击第7天，今天再完成3个关键动作即可达成周目标。"}
              </p>
            </article>
            {briefError ? <p className="text-[11px] text-rose-500">晚报生成失败，已保留本地内容：{briefError}</p> : null}
          </div>
        </motion.main>

        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <motion.article whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className="gc px-3 py-3">
            <h3 className="text-[13px] font-semibold">推送计划</h3>
            <p className="mt-1 text-[11px] text-zinc-500">早报 07:00 · 晚报 21:00</p>
            <button
              onClick={() => {
                handleGenerateEvening().catch(() => undefined);
              }}
              className="mt-2 w-full rounded bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-600"
            >
              {loadingBrief ? "生成中..." : "立即生成晚报"}
            </button>
          </motion.article>
          <motion.article whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className="gc px-3 py-3"><h3 className="text-[13px] font-semibold">飞书推送状态</h3><p className="mt-1 text-[11px] text-zinc-500">今日早报：已送达</p><p className="text-[11px] text-zinc-500">今日晚报：待发</p><p className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">Webhook在线</p></motion.article>
          <motion.article whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className="gc px-3 py-3"><h3 className="text-[13px] font-semibold">本周统计</h3><p className="mt-1 text-[11px] text-zinc-500">已发送 7 条</p><p className="text-[11px] text-zinc-500">未录入兜底 0 次</p><p className="text-[11px] text-zinc-500">连续发送 7 天</p><button className="mt-2 inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-[10px] text-zinc-600"><RefreshCw size={11} />刷新</button></motion.article>
        </aside>
      </div>
    </motion.section>
  );
}
