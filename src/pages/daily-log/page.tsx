import { motion } from "framer-motion";
import { type ReactNode, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { generateTomorrowHomeworkDraft, type TomorrowDraftOutput } from "@/features/ai/workflows";

type DayItem = { id: number; date: string; subject: string; completion: number; accuracy: number; hasClass?: boolean };

const historyRows: DayItem[] = [
  
];

const trend: Array<{ day: string; ielts: number; gre: number }> = [
  
];

const heatValues: number[] = [];

function heatColor(v: number) {
  if (v >= 80) return "#34C759";
  if (v >= 50) return "#FACC15";
  return "#F87171";
}

function HoverCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.article whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className={`gc ${className}`}>
      {children}
    </motion.article>
  );
}

export function DailyLogPage() {
  const [active, setActive] = useState<number | null>(historyRows[0]?.id ?? null);
  const [saved, setSaved] = useState(false);
  const [written, setWritten] = useState(false);
  const [energy, setEnergy] = useState(7);
  const [focus, setFocus] = useState(6);
  const [clarity, setClarity] = useState(7);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<TomorrowDraftOutput | null>(null);

  const selected = useMemo(() => historyRows.find((x) => x.id === active) ?? historyRows[0] ?? null, [active]);
  const stage = selected?.subject.includes("雅思") ? "雅思主线" : "GRE主线";

  async function handleGenerateDraft() {
    setDraftLoading(true);
    setDraftError(null);
    try {
      const result = await generateTomorrowHomeworkDraft({
        energy,
        focus,
        clarity,
        stage,
        historyAccuracy: {
          ielts: trend.map((row) => row.ielts),
          gre: trend.map((row) => row.gre),
        },
      });
      setAiDraft(result);
    } catch (error) {
      setDraftError(String(error));
      setAiDraft(null);
    } finally {
      setDraftLoading(false);
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="h-full overflow-hidden bg-[#F5F5F7] p-3">
      <div className="grid h-full min-h-0 grid-cols-[172px_minmax(0,1fr)] gap-3">
        <HoverCard className="min-h-0 overflow-y-auto px-3 py-3">
          <div className="flex items-center justify-between"><h3 className="text-[14px] font-semibold">历史</h3><button className="rounded bg-zinc-100 px-2 py-1 text-[10px]">导出CSV</button></div>
          <p className="mt-2 text-[10px] font-semibold text-zinc-400">本周</p>
          <div className="mt-1 space-y-2">
            {historyRows.length === 0 ? <div className="rounded-[10px] bg-white/70 px-2 py-2 text-[11px] text-[#86868B]">暂无日志</div> : null}
            {historyRows.map((row) => (
              <button key={row.id} onClick={() => setActive(row.id)} className={`w-full rounded-[10px] px-2 py-2 text-left ${row.id === active ? "bg-indigo-50" : "bg-white/70"}`}>
                <div className="flex items-center justify-between"><p className="text-[11px] font-medium">{row.date.slice(5)}</p>{row.hasClass ? <span className="rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] text-orange-600">有课</span> : null}</div>
                <p className="text-[10px] text-zinc-500">{row.subject}</p>
                <div className="mt-1 h-1.5 rounded-full bg-zinc-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${row.completion}%` }} /></div>
                <p className="mt-1 text-[10px] text-zinc-500">正确率 {row.accuracy}%</p>
              </button>
            ))}
          </div>
        </HoverCard>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <HoverCard className="px-4 py-3">
            <div className="flex items-center justify-between"><h2 className="text-[14px] font-semibold">今日汇总</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-600">内置AI自动生成</span></div>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {["总做题数 128", "综合正确率 74%", "新增错题 12", "今日掌握 8"].map((v) => <div key={v} className="rounded-[10px] bg-white/70 px-2 py-1.5 text-[12px]">{v}</div>)}
            </div>
          </HoverCard>

          <HoverCard className="px-4 py-3">
            <h3 className="text-[14px] font-semibold">今日状态</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-[10px] bg-white/70 px-2 py-2">
                <div className="flex items-center justify-between"><p className="text-[12px] font-medium">精力</p><span className="text-[12px] text-indigo-600">{energy}</span></div>
                <input className="mt-1 w-full accent-[#6366F1]" type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
              </div>
              <div className="rounded-[10px] bg-white/70 px-2 py-2">
                <div className="flex items-center justify-between"><p className="text-[12px] font-medium">专注力</p><span className="text-[12px] text-indigo-600">{focus}</span></div>
                <input className="mt-1 w-full accent-[#6366F1]" type="range" min={1} max={10} value={focus} onChange={(e) => setFocus(Number(e.target.value))} />
              </div>
              <div className="rounded-[10px] bg-white/70 px-2 py-2">
                <div className="flex items-center justify-between"><p className="text-[12px] font-medium">清晰度</p><span className="text-[12px] text-indigo-600">{clarity}</span></div>
                <input className="mt-1 w-full accent-[#6366F1]" type="range" min={1} max={10} value={clarity} onChange={(e) => setClarity(Number(e.target.value))} />
              </div>
            </div>
            <textarea className="command-input mt-2 min-h-[60px] py-2" placeholder="备注" />
            <motion.button
              whileTap={{ scale: 0.97 }}
              animate={saved ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              onClick={() => {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              }}
              className={`mt-2 rounded-full px-3 py-1 text-[12px] font-medium ${saved ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}
            >
              {saved ? "✓ 已保存" : "保存今日记录"}
            </motion.button>
          </HoverCard>

          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
            <HoverCard className="min-h-0 overflow-y-auto px-3 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold">明日作业草案</h3>
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-orange-600">待确认</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    handleGenerateDraft().catch(() => undefined);
                  }}
                  className="rounded bg-indigo-50 px-2 py-1 text-[11px] text-indigo-600"
                >
                  {draftLoading ? "生成中..." : "生成明日草案"}
                </motion.button>
                {aiDraft ? <span className="text-[10px] text-zinc-500">总时长 {aiDraft.totalMinutes} 分钟</span> : null}
              </div>
              <div className="mt-2 space-y-2">
                {(aiDraft
                  ? aiDraft.items.map((item) => `${item.subject} ${item.task} ${item.minutes}min · ${item.intensity}`)
                  : ["词汇复习 40min", "雅思听力 35min", "GRE填空 50min · 弱点加量", "错题复习 30min"]
                ).map((x) => (
                  <div key={x} className="rounded-[8px] bg-white/70 px-2 py-1.5 text-[12px]">{x}</div>
                ))}
              </div>
              {draftError ? <p className="mt-2 text-[11px] text-rose-500">AI草案生成失败：{draftError}</p> : null}
              <div className="mt-2 flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.97 }} className="rounded bg-zinc-100 px-2 py-1 text-[11px]">调整</motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  animate={written ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  onClick={() => {
                    setWritten(true);
                    setTimeout(() => setWritten(false), 2000);
                  }}
                  className={`rounded px-2 py-1 text-[11px] ${written ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}
                >
                  {written ? "✓ 已写入日历" : "确认写入日历"}
                </motion.button>
              </div>
            </HoverCard>

            <HoverCard className="min-h-0 overflow-y-auto px-3 py-3">
              <h3 className="text-[14px] font-semibold">趋势图</h3>
              <div className="mt-2 h-44 rounded-[10px] bg-white/70 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ielts" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="gre" stroke="#8B5CF6" strokeDasharray="5 3" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {heatValues.map((v, i) => <span key={i} className="h-3 rounded" style={{ background: heatColor(v) }} />)}
              </div>
            </HoverCard>
          </div>
        </div>
      </div>
      <div className="sr-only">selected-day-{selected?.date ?? "none"}</div>
    </motion.section>
  );
}
