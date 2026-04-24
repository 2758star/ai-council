import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BarChart3, FileJson2, Search } from "lucide-react";
import { getPassages, importAnswers, type PassageSummary } from "@/features/question-bank/api";
import { useQuestionBankStore } from "@/stores/question-bank-store";
import { useUiStore } from "@/stores/ui-store";

function classifyStatus(row: PassageSummary): "untouched" | "correct" | "error" {
  if (row.attemptedQuestions <= 0) return "untouched";
  if (row.wrongQuestions > 0) return "error";
  return "correct";
}

function parseAnswerPreview(text: string) {
  try {
    const value = JSON.parse(text) as unknown;
    const record = value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
    if (!record) return null;
    const entries = Object.entries(record);
    return {
      count: entries.length,
      sample: entries.slice(0, 3).map(([k, v]) => `${k}:${String(v)}`).join(" · "),
    };
  } catch {
    return null;
  }
}

export function QuestionBankListPage() {
  const setRoute = useUiStore((s) => s.setRoute);
  const activeBankId = useQuestionBankStore((s) => s.activeBankId);
  const bankName = useQuestionBankStore((s) => s.activeBankName) ?? "题库";
  const setActivePassageId = useQuestionBankStore((s) => s.setActivePassageId);

  const [passages, setPassages] = useState<PassageSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [answerJson, setAnswerJson] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    if (!activeBankId) {
      setPassages([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await getPassages(activeBankId);
      setPassages(rows);
    } finally {
      setLoading(false);
    }
  }, [activeBankId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return passages.filter((p) => !q || `${p.passageNum} ${p.questionTypes ?? ""}`.toLowerCase().includes(q));
  }, [passages, query]);

  const summary = useMemo(() => {
    const donePassages = passages.filter((p) => p.attemptedQuestions > 0).length;
    const totalQuestions = passages.reduce((sum, row) => sum + row.questionCount, 0);
    const totalAttempted = passages.reduce((sum, row) => sum + row.attemptedQuestions, 0);
    const totalCorrect = passages.reduce((sum, row) => sum + row.correctQuestions, 0);
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
    return { donePassages, totalQuestions, accuracy };
  }, [passages]);

  const preview = parseAnswerPreview(answerJson);

  async function handleImportAnswers() {
    if (!activeBankId || !preview) return;
    setImporting(true);
    setImportError("");
    try {
      await importAnswers(activeBankId, answerJson);
      setImportOpen(false);
      setAnswerJson("");
      await load();
    } catch (error) {
      setImportError(String(error));
    } finally {
      setImporting(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: "38px 0 32px 52px",
        overflow: "hidden",
        background: "#F5F5F7",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        className="flex h-12 shrink-0 items-center justify-between border-b border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.85)] px-3"
        style={{ backdropFilter: "blur(20px)" }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoute("question-bank")}
            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-zinc-100 px-2 text-[12px] text-zinc-600"
          >
            <ArrowLeft size={13} /> 返回
          </button>
          <span className="text-[14px] font-semibold text-zinc-800">{bankName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-white px-3 text-[12px] font-semibold text-indigo-600 shadow-sm"
          >
            <FileJson2 size={13} /> 导入答案
          </button>
          <button
            onClick={() => setRoute("question-bank-stats")}
            className="inline-flex h-8 items-center gap-1 rounded-[8px] bg-[#6366F1] px-3 text-[12px] font-semibold text-white"
          >
            <BarChart3 size={13} /> 查看统计
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">
            {passages.length} 篇 · 已完成 {summary.donePassages} · 正确率 {summary.accuracy}% · 共 {summary.totalQuestions} 题
          </span>
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索 Passage"
              className="h-8 w-[180px] rounded-[8px] border border-[rgba(0,0,0,0.08)] bg-white pl-7 pr-2 text-[11px]"
            />
          </div>
        </div>

        <div className="h-full overflow-y-auto rounded-[12px] border border-[rgba(0,0,0,0.06)] bg-[rgba(255,255,255,0.62)] p-2">
          {loading ? (
            <p className="p-4 text-[12px] text-zinc-500">加载中...</p>
          ) : (
            <div className="space-y-2">
              {visible.map((row) => {
                const status = classifyStatus(row);
                return (
                  <motion.div
                    key={row.id}
                    whileHover={{ scale: 1.004 }}
                    className="flex items-center justify-between rounded-[10px] border border-[rgba(0,0,0,0.06)] bg-white/80 px-3 py-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-[13px] font-bold text-[#1D1D1F]">Passage {row.passageNum}</p>
                      <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600">
                        {row.questionTypes ?? "阅读题"}
                      </div>
                      <p className="mt-1 text-[11px] text-[#86868B]">
                        {row.questionCount}题 · 已作答{row.attemptedQuestions}题 · 错{row.wrongQuestions}题
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {status === "untouched" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          <span className="h-2 w-2 rounded-full bg-zinc-300" />
                          未做
                        </span>
                      ) : status === "correct" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">✓ 当前全对</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-600">✗ 有错题</span>
                      )}
                      <button
                        onClick={() => {
                          setActivePassageId(row.id);
                          setRoute("question-bank-exam");
                        }}
                        className="h-7 rounded-[7px] bg-[#6366F1] px-3 text-[11px] font-semibold text-white"
                      >
                        {status === "untouched" ? "开始做题" : "继续 / 重做"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {!loading && visible.length === 0 ? (
                <p className="p-4 text-[12px] text-zinc-500">没有匹配结果</p>
              ) : null}
            </div>
          )}
        </div>
      </main>

      {importOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setImportOpen(false)}
        >
          <div
            style={{
              width: 560,
              borderRadius: 14,
              background: "#fff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
              padding: 20,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1D1D1F", marginBottom: 10 }}>导入答案</div>
            <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7, marginBottom: 12 }}>
              将答案 JSON 粘贴到下方。支持 `1: "B"` 或 `6-1: "ABC"` 两种题号格式。
            </div>
            <textarea
              value={answerJson}
              onChange={(event) => setAnswerJson(event.target.value)}
              placeholder={`{\n  "1": "B",\n  "2": "D",\n  "6-1": "ABC"\n}`}
              style={{
                width: "100%",
                height: 220,
                borderRadius: 10,
                border: preview ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(0,0,0,0.12)",
                padding: 12,
                fontSize: 11,
                fontFamily: "monospace",
                lineHeight: 1.7,
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {preview ? (
              <div style={{ marginTop: 8, fontSize: 11, color: "#059669" }}>
                ✓ 检测到 {preview.count} 条答案映射 · {preview.sample}
              </div>
            ) : answerJson.trim() ? (
              <div style={{ marginTop: 8, fontSize: 11, color: "#DC2626" }}>JSON 格式有误，请检查</div>
            ) : null}
            {importError ? <div style={{ marginTop: 8, fontSize: 11, color: "#DC2626" }}>{importError}</div> : null}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setImportOpen(false)}
                style={{
                  height: 34,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  background: "transparent",
                  color: "#6B7280",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                取消
              </button>
              <button
                onClick={() => handleImportAnswers().catch(() => undefined)}
                disabled={!preview || importing}
                style={{
                  height: 34,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: preview && !importing ? "#6366F1" : "rgba(0,0,0,0.08)",
                  color: preview && !importing ? "#fff" : "#C7C7CC",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: preview && !importing ? "pointer" : "not-allowed",
                }}
              >
                {importing ? "导入中..." : "导入答案"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}
