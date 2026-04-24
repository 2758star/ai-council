import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getQuestionBanks, savePassages } from "@/features/question-bank/api";
import { useQuestionBankStore } from "@/stores/question-bank-store";
import { useUiStore } from "@/stores/ui-store";

type BankStatus = "parsed" | "parsing" | "idle";

type BankCard = {
  id: number;
  name: string;
  subject: "GRE阅读" | "GRE数学" | "GRE填空" | "雅思阅读" | "雅思听力" | "雅思写作" | "雅思口语";
  status: BankStatus;
  total: number;
  finished: number;
  accuracy: number;
};

type JsonValidState = { count: number; questions: number };

type NormalizedQuestion = {
  q_num: number;
  q_type: string;
  q_text: string;
  options: {
    A: string | null;
    B: string | null;
    C: string | null;
    D: string | null;
    E: string | null;
  };
  is_multi_select: boolean;
  highlighted_text: string | null;
  correct_answer: string | null;
  is_sentence_select: boolean;
};

type NormalizedPassage = {
  passage_num: number;
  passage_text: string;
  questions: NormalizedQuestion[];
};

const fallbackBanks: BankCard[] = [
  
];

const bankConfig: Record<
  BankCard["subject"],
  { icon: string; bg: string; color: string; tag: string }
> = {
  GRE阅读: { icon: "📖", bg: "#EDE9FE", color: "#5B21B6", tag: "GRE" },
  GRE数学: { icon: "🔢", bg: "#DBEAFE", color: "#1E40AF", tag: "GRE" },
  GRE填空: { icon: "✏️", bg: "#EDE9FE", color: "#5B21B6", tag: "GRE" },
  雅思阅读: { icon: "📗", bg: "#D1FAE5", color: "#065F46", tag: "雅思" },
  雅思听力: { icon: "🎧", bg: "#D1FAE5", color: "#065F46", tag: "雅思" },
  雅思写作: { icon: "✍️", bg: "#D1FAE5", color: "#065F46", tag: "雅思" },
  雅思口语: { icon: "🎤", bg: "#D1FAE5", color: "#065F46", tag: "雅思" },
};

function statusTone(status: BankStatus) {
  if (status === "parsed") return "bg-emerald-50 text-emerald-600";
  if (status === "parsing") return "bg-amber-50 text-amber-600";
  return "bg-zinc-100 text-zinc-500";
}

function statusText(status: BankStatus) {
  if (status === "parsed") return "已解析";
  if (status === "parsing") return "解析中";
  return "未解析";
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toText(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  if (typeof value === "number") return value !== 0;
  return null;
}

function normalizeType(type: string): string {
  const map: Record<string, string> = {
    主旨: "主旨题",
    推断: "推断题",
    细节: "事实信息题",
    句子功能: "句子作用题",
    词汇: "词汇题",
    多选: "多选题",
  };
  return map[type] ?? type;
}

function normalizePassage(rawInput: unknown, index: number): NormalizedPassage {
  const raw = toRecord(rawInput) ?? {};
  const passage_num = toNumber(raw.id) ?? toNumber(raw.passage_num) ?? index + 1;
  const passage_text = toText(raw.article) ?? toText(raw.passage_text) ?? "";
  const sourceQuestionsRaw = Array.isArray(raw.exercises)
    ? raw.exercises
    : Array.isArray(raw.questions)
      ? raw.questions
      : [];

  const questions = sourceQuestionsRaw.map((qInput, qIndex) => {
    const q = toRecord(qInput) ?? {};
    const q_num = toNumber(q.number) ?? toNumber(q.q_num) ?? qIndex + 1;
    const q_type_raw = toText(q.type) ?? toText(q.q_type) ?? "阅读题";
    const q_text = toText(q.question) ?? toText(q.q_text) ?? "";
    const highlighted_text = toText(q.highlighted_text) ?? null;

    const choicesRecord = toRecord(q.choices) ?? toRecord(q.options);
    const sentenceOption = choicesRecord ? toText(choicesRecord.sentence) : null;
    const is_sentence_select = sentenceOption !== null;

    let optionA: string | null = null;
    let optionB: string | null = null;
    let optionC: string | null = null;
    let optionD: string | null = null;
    let optionE: string | null = null;

    if (is_sentence_select) {
      optionA = sentenceOption;
    } else if (choicesRecord) {
      optionA = toText(choicesRecord.A);
      optionB = toText(choicesRecord.B);
      optionC = toText(choicesRecord.C);
      optionD = toText(choicesRecord.D);
      optionE = toText(choicesRecord.E);
    } else if (Array.isArray(q.options)) {
      optionA = toText(q.options[0]);
      optionB = toText(q.options[1]);
      optionC = toText(q.options[2]);
      optionD = toText(q.options[3]);
      optionE = toText(q.options[4]);
    }

    const inferredMulti = Boolean(optionA && optionB && optionC && !optionD);
    const is_multi_select = toBoolean(q.is_multi_select) ?? inferredMulti;

    const rawCorrect = q.correct_answer ?? q.correctAnswer ?? q.answer ?? null;
    let correct_answer: string | null = null;
    if (Array.isArray(rawCorrect)) {
      const values = rawCorrect.map((item) => toText(item)).filter((item): item is string => Boolean(item));
      correct_answer = values.length > 0 ? values.join(",") : null;
    } else {
      correct_answer = toText(rawCorrect);
    }

    return {
      q_num,
      q_type: is_sentence_select ? "选句子题" : normalizeType(q_type_raw),
      q_text,
      options: {
        A: optionA,
        B: optionB,
        C: optionC,
        D: optionD,
        E: optionE,
      },
      is_multi_select,
      highlighted_text,
      correct_answer,
      is_sentence_select,
    };
  });

  return {
    passage_num,
    passage_text,
    questions,
  };
}

function mapSubject(subject: string | null): BankCard["subject"] {
  const raw = (subject ?? "").toLowerCase();
  if (raw.includes("数学")) return "GRE数学";
  if (raw.includes("填空")) return "GRE填空";
  if (raw.includes("听力")) return "雅思听力";
  if (raw.includes("写作")) return "雅思写作";
  if (raw.includes("口语")) return "雅思口语";
  if (raw.includes("ielts") || raw.includes("雅思")) return "雅思阅读";
  return "GRE阅读";
}

export function QuestionBankIndexPage() {
  const [banks, setBanks] = useState<BankCard[]>(fallbackBanks);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<"json" | "pdf">("json");
  const [jsonText, setJsonText] = useState("");
  const [importSubject, setImportSubject] = useState("GRE阅读");
  const [importBankName, setImportBankName] = useState("GRE阅读机经440篇");
  const [jsonValid, setJsonValid] = useState<JsonValidState | null>(null);
  const [jsonError, setJsonError] = useState("");

  const setRoute = useUiStore((s) => s.setRoute);
  const setActiveBankId = useQuestionBankStore((s) => s.setActiveBankId);
  const setActiveBankName = useQuestionBankStore((s) => s.setActiveBankName);

  async function loadBanks() {
    try {
      const rows = await getQuestionBanks();
      if (rows.length === 0) {
        setBanks([]);
        return;
      }
      setBanks(
        rows.map((item) => ({
          id: item.id,
          name: item.name,
          subject: mapSubject(item.subject),
          status: item.parsedAt ? "parsed" : "idle",
          total: item.totalPassages,
          finished: 0,
          accuracy: 0,
        })),
      );
    } catch {
      setBanks(fallbackBanks);
    }
  }

  useEffect(() => {
    loadBanks().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!jsonText.trim()) {
      setJsonValid(null);
      setJsonError("");
      return;
    }
    try {
      const data = JSON.parse(jsonText) as unknown;
      const arr = Array.isArray(data) ? data : [data];
      const totalQ = arr.reduce((sum, passage) => {
        const record = toRecord(passage);
        if (!record) return sum;
        const questions = Array.isArray(record.exercises)
          ? record.exercises
          : Array.isArray(record.questions)
            ? record.questions
            : [];
        return sum + questions.length;
      }, 0);
      setJsonValid({ count: arr.length, questions: totalQ });
      setJsonError("");
    } catch {
      setJsonValid(null);
      setJsonError("JSON格式有误，请检查");
    }
  }, [jsonText]);

  useEffect(() => {
    const nameMap: Record<string, string> = {
      GRE阅读: "GRE阅读机经440篇",
      GRE数学: "GRE数学题库",
      GRE填空: "GRE填空机经",
      雅思阅读: "雅思阅读题库",
      雅思听力: "雅思听力题库",
      雅思写作: "雅思写作题库",
    };
    setImportBankName(nameMap[importSubject] ?? importSubject);
  }, [importSubject]);

  async function handleImport() {
    if (!jsonValid) return;
    try {
      const raw = JSON.parse(jsonText) as unknown;
      const arr = Array.isArray(raw) ? raw : [raw];
      const normalized = arr.map((item, index) => normalizePassage(item, index));
      await savePassages(JSON.stringify(normalized), importBankName, importSubject);
      setShowImportModal(false);
      setJsonText("");
      setJsonValid(null);
      setJsonError("");
      await loadBanks();
    } catch (error) {
      setJsonError(`导入失败：${String(error)}`);
    }
  }

  const emptyState = useMemo(() => banks.length === 0, [banks.length]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ position: "fixed", inset: "38px 0 32px 52px", overflow: "hidden", background: "#F5F5F7", display: "flex", flexDirection: "column" }}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.85)] px-3" style={{ backdropFilter: "blur(20px)" }}>
        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">题库</h2>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setRoute("question-bank-stats")}
            className="h-8 rounded-[8px] border border-[rgba(99,102,241,0.2)] bg-[rgba(99,102,241,0.08)] px-3 text-[12px] font-medium text-[#6366F1]"
          >
            📊 查看统计
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setShowImportModal(true)}
            className="h-8 rounded-[8px] bg-[#6366F1] px-3 text-[12px] font-medium text-white"
          >
            导入题库
          </motion.button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {emptyState ? (
          <div className="grid h-full place-items-center">
            <div className="text-center">
              <p className="text-[48px]">📚</p>
              <p className="mt-2 text-[14px] text-[#86868B]">还没有题库</p>
              <p className="mt-1 text-[12px] text-[#C7C7CC]">点击右上角导入题库 JSON</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {banks.map((bank) => {
              const progress = bank.total > 0 ? Math.round((bank.finished / bank.total) * 100) : 0;
              return (
                <motion.button
                  key={bank.id}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    setActiveBankId(bank.id);
                    setActiveBankName(bank.name);
                    setRoute("question-bank-list");
                  }}
                  className="cursor-pointer rounded-[13px] border border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.8)] p-4 text-left"
                >
                  <div className="flex items-start justify-between">
                    <span
                      className="grid h-10 w-10 place-items-center rounded-[10px] text-[24px]"
                      style={{ background: bankConfig[bank.subject].bg }}
                    >
                      {bankConfig[bank.subject].icon}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(bank.status)}`}>
                      {statusText(bank.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] font-bold text-[#1D1D1F]">{bank.name}</p>
                  <span
                    className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: bankConfig[bank.subject].bg, color: bankConfig[bank.subject].color }}
                  >
                    {bankConfig[bank.subject].tag} · {bank.subject}
                  </span>

                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${progress}%` }} />
                  </div>

                  <p className="mt-2 text-[11px] text-[#86868B]">
                    {bank.total || "--"}篇 · 已完成{bank.finished}篇 · 正确率{bank.accuracy}%
                  </p>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {showImportModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setShowImportModal(false)}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28, width: 520,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }} onClick={(event) => event.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", marginBottom: 20 }}>
              导入题库
            </div>

            <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.05)", borderRadius: 9, padding: 3, marginBottom: 20 }}>
              {(["json", "pdf"] as const).map((tab) => (
                <button key={tab} onClick={() => setImportTab(tab)} style={{
                  flex: 1, height: 30, borderRadius: 7, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  background: importTab === tab ? "#fff" : "transparent",
                  color: importTab === tab ? "#6366F1" : "#86868B",
                  boxShadow: importTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all .15s",
                }}>
                  {tab === "json" ? "粘贴JSON" : "PDF上传（即将支持）"}
                </button>
              ))}
            </div>

            {importTab === "json" ? (
              <>
                <div style={{
                  background: "rgba(99,102,241,0.06)", border: "0.5px solid rgba(99,102,241,0.15)",
                  borderRadius: 9, padding: "10px 14px", marginBottom: 16,
                  fontSize: 11.5, color: "#4338CA", lineHeight: 1.7,
                }}>
                  1. 用 Gemini 上传PDF并解析，复制输出的JSON<br />
                  2. 粘贴到下方输入框<br />
                  3. 选择科目，点击导入（支持分批多次导入，自动追加）
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", marginBottom: 6 }}>科目</div>
                  <select value={importSubject} onChange={(event) => setImportSubject(event.target.value)} style={{
                    width: "100%", height: 34, borderRadius: 8,
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    background: "rgba(255,255,255,0.8)",
                    padding: "0 10px", fontSize: 13, fontFamily: "inherit",
                    color: "#1D1D1F", outline: "none",
                  }}>
                    {["GRE阅读", "GRE数学", "GRE填空", "雅思阅读", "雅思听力", "雅思写作"].map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", marginBottom: 6 }}>题库名称</div>
                  <input value={importBankName} onChange={(event) => setImportBankName(event.target.value)} style={{
                    width: "100%", height: 34, borderRadius: 8,
                    border: "0.5px solid rgba(0,0,0,0.12)",
                    background: "rgba(255,255,255,0.8)",
                    padding: "0 10px", fontSize: 13, fontFamily: "inherit",
                    color: "#1D1D1F", outline: "none", boxSizing: "border-box",
                  }} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#86868B", marginBottom: 6 }}>
                    粘贴JSON
                  </div>
                  <textarea
                    value={jsonText}
                    onChange={(event) => setJsonText(event.target.value)}
                    placeholder='[ { "id": 1, "article": "...", "exercises": [...] } ]'
                    style={{
                      width: "100%", height: 180, borderRadius: 9,
                      border: jsonError
                        ? "1px solid rgba(239,68,68,0.5)"
                        : jsonValid
                          ? "1px solid rgba(16,185,129,0.5)"
                          : "0.5px solid rgba(0,0,0,0.1)",
                      background: "rgba(0,0,0,0.02)",
                      padding: 12, fontSize: 11, fontFamily: "monospace",
                      color: "#1D1D1F", outline: "none", resize: "vertical",
                      lineHeight: 1.6, boxSizing: "border-box",
                    }}
                  />
                  {jsonValid ? (
                    <div style={{ fontSize: 11, color: "#059669", marginTop: 5, fontWeight: 500 }}>
                      ✓ 检测到 {jsonValid.count} 篇Passage，共 {jsonValid.questions} 道题目
                    </div>
                  ) : null}
                  {jsonError ? (
                    <div style={{ fontSize: 11, color: "#DC2626", marginTop: 5, fontWeight: 500 }}>
                      ✗ {jsonError}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={() => setShowImportModal(false)} style={{
                    height: 34, padding: "0 18px", borderRadius: 8,
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    background: "transparent", color: "#86868B",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>取消</button>
                  <button
                    onClick={() => handleImport().catch(() => undefined)}
                    disabled={!jsonValid}
                    style={{
                      height: 34, padding: "0 18px", borderRadius: 8, border: "none",
                      background: jsonValid ? "#6366F1" : "rgba(0,0,0,0.07)",
                      color: jsonValid ? "#fff" : "#C7C7CC",
                      fontSize: 12, fontWeight: 600,
                      cursor: jsonValid ? "pointer" : "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    {jsonValid ? `导入 ${jsonValid.count} 篇` : "导入"}
                  </button>
                </div>
              </>
            ) : null}

            {importTab === "pdf" ? (
              <div style={{
                textAlign: "center", padding: "40px 0",
                color: "#C7C7CC", fontSize: 13,
              }}>
                📄 PDF直接解析功能开发中<br />
                <span style={{ fontSize: 11, marginTop: 8, display: "block" }}>
                  目前请使用 Gemini 解析后粘贴JSON导入
                </span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </motion.section>
  );
}
