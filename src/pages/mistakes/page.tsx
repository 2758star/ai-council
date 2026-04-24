import { AnimatePresence, motion } from "framer-motion";
import { Plus, WandSparkles, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { normalizeMistakeAnalysis, type MistakeNormalizedOutput } from "@/features/ai/workflows";
import { useUiStore } from "@/stores/ui-store";
import { useQuestionBankStore } from "@/stores/question-bank-store";

type MainTab = "all" | "ielts" | "gre";
type Due = "today" | "week" | "mastered";
type ColumnKey = Due;

type Card = {
  id: number;
  exam: "雅思" | "GRE";
  subject: string;
  title: string;
  desc: string;
  myAnswer: string;
  rightAnswer: string;
  errorType: "概念不清" | "粗心大意" | "完全不会";
  due: Due;
  count: number;
  date: string;
  fromQuestionBank?: boolean;
  passageId?: number;
};

const initialCards: Card[] = [
  
];

const subjectMap = {
  雅思: ["听力", "阅读", "写作", "口语"],
  GRE: ["数学", "阅读", "填空", "写作"],
};

function HoverCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.article whileHover={{ scale: 1.005 }} transition={{ duration: 0.15 }} className={`gc ${className}`}>
      {children}
    </motion.article>
  );
}

export function MistakesPage() {
  const setRoute = useUiStore((s) => s.setRoute);
  const setReviewMode = useQuestionBankStore((s) => s.setReviewMode);
  const setActivePassageId = useQuestionBankStore((s) => s.setActivePassageId);
  const [mainTab, setMainTab] = useState<MainTab>("all");
  const [ieltsSub, setIeltsSub] = useState("全部");
  const [greSub, setGreSub] = useState("全部");
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [openModal, setOpenModal] = useState(false);
  const [openAiModal, setOpenAiModal] = useState(false);
  const [aiRaw, setAiRaw] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiParsed, setAiParsed] = useState<MistakeNormalizedOutput | null>(null);
  const [masteredFx, setMasteredFx] = useState<Record<number, boolean>>({});

  const [form, setForm] = useState<Card>({
    id: 0,
    exam: "雅思",
    subject: "听力",
    title: "",
    desc: "",
    myAnswer: "",
    rightAnswer: "",
    errorType: "概念不清",
    due: "today",
    count: 1,
    date: "04-15",
  });

  const filtered = useMemo(() => {
    let rows = cards;
    if (mainTab === "ielts") rows = rows.filter((c) => c.exam === "雅思");
    if (mainTab === "gre") rows = rows.filter((c) => c.exam === "GRE");
    if (mainTab === "ielts" && ieltsSub !== "全部") rows = rows.filter((c) => c.subject === ieltsSub);
    if (mainTab === "gre" && greSub !== "全部") rows = rows.filter((c) => c.subject === greSub);
    return rows;
  }, [cards, mainTab, ieltsSub, greSub]);

  const columns = {
    today: filtered.filter((c) => c.due === "today"),
    week: filtered.filter((c) => c.due === "week"),
    mastered: filtered.filter((c) => c.due === "mastered"),
  } satisfies Record<ColumnKey, Card[]>;

  const columnMeta: Array<{ key: ColumnKey; title: string; badge: string }> = [
    { key: "today", title: "今日复习", badge: "bg-rose-50 text-rose-600" },
    { key: "week", title: "本周到期", badge: "bg-orange-50 text-orange-600" },
    { key: "mastered", title: "已掌握", badge: "bg-emerald-50 text-emerald-600" },
  ];

  async function handleNormalize() {
    setAiLoading(true);
    setAiError(null);
    try {
      const parsed = await normalizeMistakeAnalysis(aiRaw);
      setAiParsed(parsed);
      setForm((prev) => ({
        ...prev,
        exam: parsed.exam,
        subject: parsed.subject,
        title: parsed.title,
        desc: parsed.description,
        myAnswer: parsed.myAnswer,
        rightAnswer: parsed.correctAnswer,
        errorType: parsed.errorType,
      }));
    } catch (error) {
      setAiError(String(error));
      setAiParsed(null);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="h-full overflow-hidden bg-[#F5F5F7] p-3">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <HoverCard className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {[
              ["all", "全部看板"],
              ["ielts", "雅思"],
              ["gre", "GRE"],
            ].map(([k, label]) => (
              <motion.button whileTap={{ scale: 0.97 }} key={k} onClick={() => setMainTab(k as MainTab)} className={`rounded-full px-3 py-1 text-[12px] ${mainTab === k ? "bg-white text-[#6366F1] shadow-sm" : "text-[#86868B]"}`}>{label}</motion.button>
            ))}
            {mainTab === "ielts" ? (
              <div className="ml-2 flex gap-1">
                {["全部", ...subjectMap.雅思].map((s) => (
                  <motion.button whileTap={{ scale: 0.97 }} key={s} onClick={() => setIeltsSub(s)} className={`rounded-full px-2 py-0.5 text-[11px] ${ieltsSub === s ? "bg-white text-[#6366F1]" : "text-[#86868B]"}`}>{s}</motion.button>
                ))}
              </div>
            ) : null}
            {mainTab === "gre" ? (
              <div className="ml-2 flex gap-1">
                {["全部", ...subjectMap.GRE].map((s) => (
                  <motion.button whileTap={{ scale: 0.97 }} key={s} onClick={() => setGreSub(s)} className={`rounded-full px-2 py-0.5 text-[11px] ${greSub === s ? "bg-white text-[#6366F1]" : "text-[#86868B]"}`}>{s}</motion.button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setOpenAiModal(true)}
              className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-[12px] text-zinc-600"
            >
              <WandSparkles size={12} />粘贴AI分析
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOpenModal(true)} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-600"><Plus size={12} />录入错题</motion.button>
          </div>
        </HoverCard>

        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_112px] gap-3">
          <div className="grid min-h-0 grid-cols-3 gap-3">
            {columnMeta.map(({ key, title, badge }) => (
              <HoverCard key={key} className="min-h-0 overflow-y-auto px-3 py-3">
                <div className="flex items-center justify-between"><h3 className="text-[13px] font-semibold">{title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] ${badge}`}>{columns[key].length}</span></div>
                <motion.div layout className="mt-2 space-y-2">
                  <AnimatePresence>
                    {columns[key].length === 0 ? (
                      <div className="rounded-[10px] bg-white/70 px-2.5 py-2 text-[11px] text-[#86868B]">暂无数据</div>
                    ) : null}
                    {columns[key].map((c) => (
                      <motion.div layout key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className={`rounded-[10px] bg-white/70 px-2.5 py-2 ${c.due === "mastered" ? "opacity-50" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] ${c.exam === "雅思" ? "bg-[var(--label-ielts-bg)] text-[var(--label-ielts-text)]" : "bg-[var(--label-gre-bg)] text-[var(--label-gre-text)]"}`}>{c.exam}</span><p className="text-[13px] font-semibold">{c.subject}</p></div>
                          <span className="text-[10px] text-zinc-500">{c.date}</span>
                        </div>
                        <p className={`mt-1 text-[12px] ${c.due === "mastered" ? "line-through" : ""}`}>{c.title}</p>
                        <p className="mt-1 line-clamp-2 text-[10.5px] text-[#86868B]">{c.desc}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{c.errorType}</span>
                          <div className="flex items-center gap-1.5">
                            {c.fromQuestionBank && c.passageId ? (
                              <button
                                onClick={() => {
                                  setReviewMode("review");
                                  setActivePassageId(c.passageId ?? null);
                                  setRoute("question-bank-exam");
                                }}
                                className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-600"
                              >
                                复习
                              </button>
                            ) : null}
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              animate={masteredFx[c.id] ? { scale: [0.8, 1.2, 1] } : { scale: 1 }}
                              transition={{ duration: 0.24 }}
                              onClick={() => {
                                setMasteredFx((p) => ({ ...p, [c.id]: true }));
                                setTimeout(() => setMasteredFx((p) => ({ ...p, [c.id]: false })), 280);
                                setCards((prev) => prev.map((it) => (it.id === c.id ? { ...it, due: "mastered" } : it)));
                              }}
                              className={`grid h-[18px] w-[18px] place-items-center rounded-[4px] text-[10px] ${c.due === "mastered" ? "bg-emerald-500 text-white" : "border border-zinc-300"}`}
                            >
                              ✓
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </HoverCard>
            ))}
          </div>

          <HoverCard className="min-h-0 overflow-y-auto px-2 py-2.5">
            <h3 className="text-[12px] font-semibold">复习状态</h3>
            <div className="mt-2 space-y-1 text-[10px]"><div className="rounded bg-zinc-100 px-2 py-1">今日到期</div><div className="rounded bg-zinc-100 px-2 py-1">本周到期</div><div className="rounded bg-zinc-100 px-2 py-1">之后</div><div className="rounded bg-zinc-100 px-2 py-1">已掌握</div></div>
          </HoverCard>
        </div>
      </div>

      <AnimatePresence>
        {openAiModal ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 grid place-items-center bg-black/20">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="gc w-[540px] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-semibold">粘贴 AI 分析</h3>
                <button onClick={() => setOpenAiModal(false)} className="grid h-6 w-6 place-items-center rounded-md hover:bg-zinc-100"><X size={14} /></button>
              </div>
              <textarea
                value={aiRaw}
                onChange={(e) => setAiRaw(e.target.value)}
                placeholder="粘贴原始分析文本..."
                className="command-input mt-3 min-h-[120px] py-2"
              />
              <div className="mt-3 flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleNormalize().catch(() => undefined)} className="rounded bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-600">
                  {aiLoading ? "格式化中..." : "格式化为标准JSON"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={!aiParsed}
                  onClick={() => {
                    setOpenAiModal(false);
                    setOpenModal(true);
                  }}
                  className={`rounded px-3 py-1 text-[12px] ${aiParsed ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"}`}
                >
                  回填到录入表单
                </motion.button>
              </div>
              {aiError ? <p className="mt-2 text-[11px] text-rose-500">格式化失败：{aiError}</p> : null}
              {aiParsed ? (
                <pre className="mt-2 max-h-[180px] overflow-auto rounded-[8px] bg-zinc-50 p-2 text-[11px] text-zinc-700">
                  {JSON.stringify(aiParsed, null, 2)}
                </pre>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}

        {openModal ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 grid place-items-center bg-black/20">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="gc w-[500px] p-4">
              <div className="flex items-center justify-between"><h3 className="text-[14px] font-semibold">录入错题</h3><button onClick={() => setOpenModal(false)} className="grid h-6 w-6 place-items-center rounded-md hover:bg-zinc-100"><X size={14} /></button></div>
              <div className="mt-3 grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <select className="command-input" value={form.exam} onChange={(e) => setForm((p) => ({ ...p, exam: e.target.value as "雅思" | "GRE", subject: subjectMap[e.target.value as "雅思" | "GRE"][0] }))}><option>雅思</option><option>GRE</option></select>
                  <select className="command-input" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}>{subjectMap[form.exam].map((s) => <option key={s}>{s}</option>)}</select>
                </div>
                <input className="command-input" placeholder="题目标题" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
                <textarea className="command-input min-h-[72px] py-2" placeholder="题目描述" value={form.desc} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} />
                <input className="command-input" placeholder="我的答案" value={form.myAnswer} onChange={(e) => setForm((p) => ({ ...p, myAnswer: e.target.value }))} />
                <input className="command-input" placeholder="正确答案" value={form.rightAnswer} onChange={(e) => setForm((p) => ({ ...p, rightAnswer: e.target.value }))} />
                <select className="command-input" value={form.errorType} onChange={(e) => setForm((p) => ({ ...p, errorType: e.target.value as Card["errorType"] }))}><option>概念不清</option><option>粗心大意</option><option>完全不会</option></select>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setOpenModal(false)} className="rounded bg-zinc-100 px-3 py-1 text-[12px]">取消</motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const item: Card = { ...form, id: Date.now(), due: "today", count: 1, date: "04-15" };
                    setCards((p) => [item, ...p]);
                    setOpenModal(false);
                    setForm({ id: 0, exam: "雅思", subject: "听力", title: "", desc: "", myAnswer: "", rightAnswer: "", errorType: "概念不清", due: "today", count: 1, date: "04-15" });
                  }}
                  className="rounded bg-indigo-50 px-3 py-1 text-[12px] font-medium text-indigo-600"
                >
                  提交
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
