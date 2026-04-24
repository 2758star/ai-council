import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Clock3, Flag, StickyNote } from "lucide-react";
import {
  addMistakeFromExam,
  addQuestionAnnotation,
  getPassageDetail,
  getQuestionAnnotations,
  submitAnswer,
  submitSelfEvaluation,
  type PassageDetail,
  type QuestionAnnotation,
} from "@/features/question-bank/api";
import { analyzeExamMistake } from "@/features/ai/workflows";
import { useQuestionBankStore } from "@/stores/question-bank-store";
import { useUiStore } from "@/stores/ui-store";

type ResultStatus = "pending" | "correct" | "wrong" | "self-correct" | "self-wrong" | "skipped";

type QuestionResult = {
  status: ResultStatus;
  myAnswer: string;
  correctAnswer: string | null;
  marked: boolean;
  timeSpentSeconds: number;
  aiAnalysis?: string;
};

type SelectionDraft = {
  text: string;
  x: number;
  y: number;
};

function formatTimer(seconds: number) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[。！？.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAnswerTextForDisplay(answer: string) {
  return answer.includes(",") ? answer.split(",").join(" / ") : answer;
}

function parseCorrectAnswer(answer: string | null) {
  if (!answer) return [];
  const raw = answer.trim().toUpperCase();
  if (!raw) return [];
  if (raw.includes(",")) {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
  if (raw.length <= 5 && raw.split("").every((item) => /[A-Z]/.test(item))) {
    return raw.split("");
  }
  return [raw];
}

function makeSelectedAnswer(input: {
  single: string | null;
  multi: string[];
  sentence: string | null;
  isSentenceSelect: boolean;
  isMultiSelect: boolean;
}) {
  if (input.isSentenceSelect) return input.sentence ?? "";
  if (input.isMultiSelect) return [...input.multi].sort().join(",");
  return input.single ?? "";
}

export function QuestionBankExamPage() {
  const setRoute = useUiStore((s) => s.setRoute);
  const activePassageId = useQuestionBankStore((s) => s.activePassageId) ?? 0;
  const bankName = useQuestionBankStore((s) => s.activeBankName) ?? "题库";

  const [detail, setDetail] = useState<PassageDetail | null>(null);
  const [annotations, setAnnotations] = useState<QuestionAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fontScale, setFontScale] = useState(1);

  const [singleSelections, setSingleSelections] = useState<Record<number, string>>({});
  const [multiSelections, setMultiSelections] = useState<Record<number, string[]>>({});
  const [sentenceSelections, setSentenceSelections] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, QuestionResult>>({});

  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null);
  const [noteDraft, setNoteDraft] = useState<{ quoteText: string; x: number; y: number; note: string } | null>(null);
  const [banner, setBanner] = useState<{ tone: "ok" | "bad" | "warn"; text: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [addingMistake, setAddingMistake] = useState(false);
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null);

  const questionStartedAtRef = useRef<number>(Date.now());
  const passageContainerRef = useRef<HTMLDivElement | null>(null);

  const questions = detail?.questions ?? [];
  const currentQuestion = questions[currentIdx] ?? null;
  const totalQuestions = questions.length;
  const doneCount = useMemo(
    () => Object.values(results).filter((item) => item.status !== "pending").length,
    [results],
  );
  const correctCount = useMemo(
    () =>
      Object.values(results).filter((item) => item.status === "correct" || item.status === "self-correct").length,
    [results],
  );

  const passageSentences = useMemo(() => splitSentences(detail?.passageText ?? ""), [detail?.passageText]);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getPassageDetail(activePassageId),
      getQuestionAnnotations(activePassageId).catch(() => []),
    ])
      .then(([payload, anns]) => {
        setDetail(payload);
        setAnnotations(anns);
        setCurrentIdx(0);
        setResults({});
        setSingleSelections({});
        setMultiSelections({});
        setSentenceSelections({});
        setFinished(false);
        setBanner(null);
        setSeconds(0);
        questionStartedAtRef.current = Date.now();
      })
      .finally(() => setLoading(false));
  }, [activePassageId]);

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    setBanner(null);
    setSelectionDraft(null);
  }, [currentIdx]);

  const sentenceNotes = useMemo(
    () =>
      annotations.filter((item) => item.annotationType === "note" && item.quoteText && item.quoteText.trim().length > 0),
    [annotations],
  );
  const sentenceHighlights = useMemo(
    () =>
      annotations.filter(
        (item) => item.annotationType === "highlight" && item.quoteText && item.quoteText.trim().length > 0,
      ),
    [annotations],
  );

  const currentIsSentenceSelect = Boolean(currentQuestion?.qType?.includes("选句子"));
  const currentOptions = currentQuestion
    ? [
        { key: "A", value: currentQuestion.optionA },
        { key: "B", value: currentQuestion.optionB },
        { key: "C", value: currentQuestion.optionC },
        { key: "D", value: currentQuestion.optionD },
        { key: "E", value: currentQuestion.optionE },
      ].filter((item) => item.value && item.value.trim().length > 0) as Array<{ key: string; value: string }>
    : [];
  const currentIsMultiSelect = Boolean(
    currentQuestion &&
      (currentQuestion.qType?.includes("多选") ||
        (currentOptions.length === 3 &&
          currentOptions.some((item) => item.key === "A") &&
          currentOptions.some((item) => item.key === "B") &&
          currentOptions.some((item) => item.key === "C"))),
  );

  async function saveAnnotation(payload: {
    annotationType: "highlight" | "note";
    quoteText: string;
    color?: string;
    noteText?: string;
  }) {
    if (!detail || !currentQuestion) return;
    const id = await addQuestionAnnotation({
      questionId: currentQuestion.id,
      passageId: detail.id,
      annotationType: payload.annotationType,
      quoteText: payload.quoteText,
      color: payload.color ?? null,
      noteText: payload.noteText ?? null,
    });
    setAnnotations((prev) => [
      {
        id,
        questionId: currentQuestion.id,
        passageId: detail.id,
        annotationType: payload.annotationType,
        quoteText: payload.quoteText,
        color: payload.color ?? null,
        noteText: payload.noteText ?? null,
        startOffset: null,
        endOffset: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }

  function handleArticleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) {
      setSelectionDraft(null);
      return;
    }
    setSelectionDraft({
      text,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleArticleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!text) return;
    event.preventDefault();
    setNoteDraft({
      quoteText: text,
      x: event.clientX,
      y: event.clientY,
      note: "",
    });
    setSelectionDraft(null);
  }

  async function submitCurrentAnswer() {
    if (!currentQuestion) return;
    const selectedAnswer = makeSelectedAnswer({
      single: singleSelections[currentQuestion.id] ?? null,
      multi: multiSelections[currentQuestion.id] ?? [],
      sentence: sentenceSelections[currentQuestion.id] ?? null,
      isSentenceSelect: currentIsSentenceSelect,
      isMultiSelect: currentIsMultiSelect,
    });
    if (!selectedAnswer.trim()) return;

    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - questionStartedAtRef.current) / 1000));
    const submitResult = await submitAnswer(currentQuestion.id, selectedAnswer, timeSpentSeconds);
    if (submitResult.hasAnswer === 1) {
      const nextStatus: QuestionResult = {
        status: submitResult.isCorrect ? "correct" : "wrong",
        myAnswer: selectedAnswer,
        correctAnswer: submitResult.correctAnswer,
        marked: results[currentQuestion.id]?.marked ?? false,
        timeSpentSeconds,
        aiAnalysis: results[currentQuestion.id]?.aiAnalysis,
      };
      setResults((prev) => ({ ...prev, [currentQuestion.id]: nextStatus }));
      if (submitResult.isCorrect) {
        setBanner({ tone: "ok", text: "✓ 正确。1.5秒后进入下一题。" });
        window.setTimeout(() => {
          setBanner(null);
          if (currentIdx < totalQuestions - 1) setCurrentIdx((value) => value + 1);
          else setFinished(true);
        }, 1500);
      } else {
        setBanner({
          tone: "bad",
          text: `✗ 错误。正确答案：${buildAnswerTextForDisplay(submitResult.correctAnswer ?? "")}`,
        });
      }
      return;
    }

    setResults((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        status: "pending",
        myAnswer: selectedAnswer,
        correctAnswer: null,
        marked: prev[currentQuestion.id]?.marked ?? false,
        timeSpentSeconds,
      },
    }));
    setBanner({ tone: "warn", text: "此题暂无标准答案，请做自我评估。" });
  }

  async function submitSelfEval(result: "correct" | "wrong" | "skip") {
    if (!currentQuestion) return;
    const current = results[currentQuestion.id];
    if (!current) return;
    if (result !== "skip") {
      await submitSelfEvaluation({
        questionId: currentQuestion.id,
        myAnswer: current.myAnswer,
        selfEvalResult: result === "correct",
        timeSpentSeconds: current.timeSpentSeconds,
      });
    }
    setResults((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...current,
        status: result === "correct" ? "self-correct" : result === "wrong" ? "self-wrong" : "skipped",
      },
    }));
    setBanner(null);
    if (currentIdx < totalQuestions - 1) setCurrentIdx((value) => value + 1);
    else setFinished(true);
  }

  async function handleAddMistake() {
    if (!currentQuestion) return;
    const current = results[currentQuestion.id];
    if (!current || current.status !== "wrong") return;
    if (addingMistake) return;
    setAddingMistake(true);
    try {
      let aiText = "";
      if (current.correctAnswer) {
        const ai = await analyzeExamMistake({
          passageText: detail?.passageText,
          questionText: currentQuestion.qText,
          optionA: currentQuestion.optionA,
          optionB: currentQuestion.optionB,
          optionC: currentQuestion.optionC,
          optionD: currentQuestion.optionD,
          optionE: currentQuestion.optionE,
          myAnswer: current.myAnswer,
          correctAnswer: current.correctAnswer,
        });
        aiText = `错误原因：${ai.error_reason}\n解题思路：${ai.correct_logic}\n知识点：${ai.knowledge_point}`;
      }
      await addMistakeFromExam({
        questionId: currentQuestion.id,
        myAnswer: current.myAnswer,
        aiAnalysis: aiText || null,
        errorType: "概念不清",
        timeSpent: current.timeSpentSeconds,
      });
      setResults((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          ...prev[currentQuestion.id],
          aiAnalysis: aiText,
        },
      }));
      setBanner({ tone: "ok", text: "已加入错题本，并生成错因分析。" });
    } catch (error) {
      setBanner({ tone: "bad", text: `加入错题本失败：${String(error)}` });
    } finally {
      setAddingMistake(false);
    }
  }

  const currentResult = currentQuestion ? results[currentQuestion.id] : null;
  const needsSelfEval = Boolean(
    currentQuestion &&
      banner?.tone === "warn" &&
      currentResult &&
      currentResult.status === "pending" &&
      (currentQuestion.hasAnswer ?? 0) !== 1,
  );

  if (loading) {
    return (
      <section style={{ position: "fixed", inset: "38px 0 32px 52px", background: "#0f1319" }}>
        <div className="grid h-full place-items-center text-[12px] text-zinc-400">题目加载中...</div>
      </section>
    );
  }

  if (!detail || questions.length === 0) {
    return (
      <section style={{ position: "fixed", inset: "38px 0 32px 52px", background: "#0f1319" }}>
        <div className="grid h-full place-items-center text-[12px] text-zinc-400">未找到题目数据</div>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: "38px 0 32px 52px",
        background: "#1a1f2e",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={() => setSelectionDraft(null)}
    >
      <header style={{ height: 44, background: "#0f1319" }} className="flex items-center px-4 text-[#A0AEC0]">
        <button onClick={() => setRoute("question-bank-list")} className="mr-3 text-[12px] transition hover:opacity-80">
          ← 返回
        </button>
        <p className="text-[12px]">
          {bankName} · Passage {detail.passageNum}
        </p>
        <span className="ml-3 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
          {currentQuestion?.qType ?? "阅读题"}
        </span>
        <div className="flex-1" />
        <span className="mr-4 text-[11px] text-zinc-400">进度 {currentIdx + 1}/{totalQuestions}</span>
        <span className="inline-flex items-center gap-1 text-[13px] text-rose-300">
          <Clock3 size={13} />
          {formatTimer(seconds)}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="min-w-0 flex-1 border-r border-[rgba(255,255,255,0.08)] px-6 py-5"
          style={{ width: "55%", overflowY: "auto" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#B6A0FF]">Passage {detail.passageNum}</p>
            <div className="flex items-center gap-1 text-[11px] text-zinc-300">
              <button
                onClick={() => setFontScale((value) => Math.max(0.86, value - 0.08))}
                className="rounded bg-white/10 px-2 py-1"
              >
                A-
              </button>
              <button
                onClick={() => setFontScale((value) => Math.min(1.26, value + 0.08))}
                className="rounded bg-white/10 px-2 py-1"
              >
                A+
              </button>
            </div>
          </div>

          <article
            ref={passageContainerRef}
            className="leading-[2.0] text-[#D6D9E5]"
            style={{ fontSize: `${13 * fontScale}px`, fontFamily: "Georgia, serif" }}
            onMouseUp={handleArticleMouseUp}
            onContextMenu={handleArticleContextMenu}
          >
            {passageSentences.map((sentence, index) => {
              const refHighlight = currentQuestion?.highlightedText?.trim();
              const hasRef = Boolean(refHighlight && sentence.includes(refHighlight));
              const hl = sentenceHighlights.find((item) => item.quoteText && sentence.includes(item.quoteText));
              const note = sentenceNotes.find((item) => item.quoteText && sentence.includes(item.quoteText));
              const sentenceActive =
                currentIsSentenceSelect && sentenceSelections[currentQuestion?.id ?? -1] === sentence;
              return (
                <span
                  key={`${sentence}-${index}`}
                  onClick={
                    currentIsSentenceSelect && currentQuestion
                      ? () => setSentenceSelections((prev) => ({ ...prev, [currentQuestion.id]: sentence }))
                      : undefined
                  }
                  className={currentIsSentenceSelect ? "cursor-pointer transition-colors" : ""}
                  style={{
                    background: sentenceActive
                      ? "rgba(182,160,255,0.28)"
                      : hl
                        ? hl.color ?? "rgba(251,191,36,0.22)"
                        : "transparent",
                    borderRadius: 4,
                    padding: sentenceActive || hl ? "1px 2px" : undefined,
                    textDecoration: hasRef ? "underline" : undefined,
                    textDecorationColor: hasRef ? "#B6A0FF" : undefined,
                    textDecorationThickness: hasRef ? "2px" : undefined,
                  }}
                >
                  {sentence}
                  {note ? <span className="ml-1 inline-flex align-middle text-[#FBBF24]"><StickyNote size={12} /></span> : null}{" "}
                </span>
              );
            })}
          </article>
        </div>

        <aside className="flex min-w-[420px] max-w-[46%] flex-1 flex-col bg-[#141820]">
          <div style={{ height: 44, background: "#0f1319" }} className="flex items-center gap-1.5 px-3">
            {questions.map((item, idx) => {
              const result = results[item.id];
              const current = idx === currentIdx;
              const cls = current
                ? "bg-[#6366F1] text-white"
                : result?.marked
                  ? "border border-[#F59E0B] bg-[rgba(245,158,11,0.12)] text-[#F59E0B]"
                  : result?.status === "correct" || result?.status === "self-correct"
                    ? "bg-[#10B981] text-white"
                    : result?.status === "wrong" || result?.status === "self-wrong"
                      ? "bg-[#EF4444] text-white"
                      : result?.status === "skipped"
                        ? "bg-zinc-600 text-zinc-200"
                        : "border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.06)] text-[#8899aa]";
              return (
                <button key={item.id} onClick={() => setCurrentIdx(idx)} className={`h-6 w-6 rounded-full text-[11px] font-semibold ${cls}`}>
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <p className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[#6366F1]">
              Q{currentQuestion?.qNum} · {currentQuestion?.qType ?? "阅读题"}
            </p>
            <div className="mb-4 text-[14px] leading-[1.8] text-[#c8d0e0]" style={{ fontFamily: "Georgia, serif" }}>
              {currentQuestion?.qText}
            </div>

            {currentIsSentenceSelect ? (
              <div className="rounded-[10px] border border-[rgba(182,160,255,0.28)] bg-[rgba(182,160,255,0.08)] p-3">
                <p className="mb-1 text-[11px] text-[#C4B5FD]">选句子题</p>
                <p className="text-[11px] text-zinc-300">点击左侧文章中的句子作为答案。</p>
                {sentenceSelections[currentQuestion?.id ?? -1] ? (
                  <p className="mt-2 text-[11px] text-[#D8B4FE]">
                    已选：{sentenceSelections[currentQuestion?.id ?? -1]?.slice(0, 20)}...
                  </p>
                ) : null}
              </div>
            ) : currentIsMultiSelect ? (
              <>
                <p className="mb-2 text-[11px] text-[#60A5FA]">请选择所有正确答案（可多选）</p>
                {currentOptions.map((item) => {
                  const selected = (multiSelections[currentQuestion?.id ?? -1] ?? []).includes(item.key);
                  const result = currentResult;
                  const submitted = Boolean(result && result.status !== "pending");
                  const correctTokens = parseCorrectAnswer(result?.correctAnswer ?? null);
                  const isCorrectOption = submitted && correctTokens.includes(item.key);
                  const isWrongSelected = submitted && selected && !isCorrectOption;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={submitted}
                      onClick={() =>
                        setMultiSelections((prev) => {
                          const current = prev[currentQuestion?.id ?? -1] ?? [];
                          if (current.includes(item.key)) {
                            return { ...prev, [currentQuestion?.id ?? -1]: current.filter((x) => x !== item.key) };
                          }
                          return { ...prev, [currentQuestion?.id ?? -1]: [...current, item.key] };
                        })
                      }
                      className={`mb-1.5 flex w-full gap-2.5 rounded-[8px] border px-3 py-2 text-left ${
                        isCorrectOption
                          ? "border-[#10B981] bg-[rgba(16,185,129,0.12)]"
                          : isWrongSelected
                            ? "border-[#EF4444] bg-[rgba(239,68,68,0.1)]"
                            : selected
                              ? "border-[rgba(99,102,241,0.6)] bg-[rgba(99,102,241,0.15)]"
                              : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <span className={`inline-grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${selected ? "bg-[#6366F1] text-white" : "bg-[rgba(255,255,255,0.1)] text-[#8899aa]"}`}>
                        {item.key}
                      </span>
                      <span className="text-[12px] leading-[1.6] text-[#c8d0e0]">{item.value}</span>
                    </button>
                  );
                })}
              </>
            ) : (
              currentOptions.map((item) => {
                const selected = singleSelections[currentQuestion?.id ?? -1] === item.key;
                const result = currentResult;
                const submitted = Boolean(result && result.status !== "pending");
                const correctTokens = parseCorrectAnswer(result?.correctAnswer ?? null);
                const isCorrectOption = submitted && correctTokens.includes(item.key);
                const isWrongSelected = submitted && selected && !isCorrectOption;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={submitted}
                    onClick={() => setSingleSelections((prev) => ({ ...prev, [currentQuestion?.id ?? -1]: item.key }))}
                    className={`mb-1.5 flex w-full gap-2.5 rounded-[8px] border px-3 py-2 text-left ${
                      isCorrectOption
                        ? "border-[#10B981] bg-[rgba(16,185,129,0.12)]"
                        : isWrongSelected
                          ? "border-[#EF4444] bg-[rgba(239,68,68,0.1)]"
                          : selected
                            ? "border-[rgba(99,102,241,0.6)] bg-[rgba(99,102,241,0.15)]"
                            : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <span className={`inline-grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${selected ? "bg-[#6366F1] text-white" : "bg-[rgba(255,255,255,0.1)] text-[#8899aa]"}`}>
                      {item.key}
                    </span>
                    <span className="text-[12px] leading-[1.6] text-[#c8d0e0]">{item.value}</span>
                  </button>
                );
              })
            )}
          </div>

          <div style={{ height: 56, background: "#0f1319" }} className="flex items-center gap-2 px-4">
            <button
              onClick={() => setCurrentIdx((idx) => Math.max(0, idx - 1))}
              className="h-7 rounded-[7px] bg-[rgba(255,255,255,0.06)] px-2.5 text-[11px] text-[#8899aa]"
            >
              ← 上一题
            </button>
            <button
              onClick={() =>
                setResults((prev) => ({
                  ...prev,
                  [currentQuestion?.id ?? -1]: {
                    status: prev[currentQuestion?.id ?? -1]?.status ?? "pending",
                    myAnswer: prev[currentQuestion?.id ?? -1]?.myAnswer ?? "",
                    correctAnswer: prev[currentQuestion?.id ?? -1]?.correctAnswer ?? null,
                    marked: !(prev[currentQuestion?.id ?? -1]?.marked ?? false),
                    timeSpentSeconds: prev[currentQuestion?.id ?? -1]?.timeSpentSeconds ?? 0,
                    aiAnalysis: prev[currentQuestion?.id ?? -1]?.aiAnalysis,
                  },
                }))
              }
              className="inline-flex h-7 items-center gap-1 rounded-[7px] border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.12)] px-2.5 text-[11px] text-[#F59E0B]"
            >
              <Flag size={12} /> 标记
            </button>
            <div className="flex-1" />
            <span className="text-[11px] text-[#8899aa]">已完成 {doneCount}/{totalQuestions}</span>
            <button
              onClick={() => submitCurrentAnswer().catch(() => undefined)}
              className="h-7 rounded-[7px] bg-[#6366F1] px-3 text-[11px] text-white"
            >
              确认
            </button>
          </div>

          <AnimatePresence>
            {banner ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`absolute bottom-[56px] left-0 right-0 flex min-h-9 items-center justify-between px-4 py-1 ${
                  banner.tone === "ok"
                    ? "border-t border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)]"
                    : banner.tone === "bad"
                      ? "border-t border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)]"
                      : "border-t border-[rgba(251,146,60,0.35)] bg-[rgba(251,146,60,0.12)]"
                }`}
              >
                <span
                  className={`text-[12px] font-semibold ${
                    banner.tone === "ok" ? "text-[#10B981]" : banner.tone === "bad" ? "text-[#EF4444]" : "text-[#FB923C]"
                  }`}
                >
                  {banner.text}
                </span>
                {currentResult?.status === "wrong" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddMistake().catch(() => undefined)}
                      className="h-6 rounded bg-[rgba(245,158,11,0.2)] px-2 text-[10px] text-[#F59E0B]"
                    >
                      {addingMistake ? "分析中..." : "加入错题本"}
                    </button>
                    <button
                      onClick={() => {
                        setBanner(null);
                        if (currentIdx < totalQuestions - 1) setCurrentIdx((value) => value + 1);
                        else setFinished(true);
                      }}
                      className="h-6 rounded bg-[#6366F1] px-2 text-[10px] text-white"
                    >
                      下一题 →
                    </button>
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {needsSelfEval ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-[56px] left-0 right-0 border-t border-[rgba(251,146,60,0.35)] bg-[rgba(251,146,60,0.12)] px-4 py-2"
              >
                <p className="mb-2 text-[12px] font-semibold text-[#FB923C]">此题暂无标准答案</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submitSelfEval("correct").catch(() => undefined)}
                    className="h-7 rounded-[7px] bg-[#10B981] px-2.5 text-[11px] font-semibold text-white"
                  >
                    自评正确 ✓
                  </button>
                  <button
                    onClick={() => submitSelfEval("wrong").catch(() => undefined)}
                    className="h-7 rounded-[7px] bg-[#EF4444] px-2.5 text-[11px] font-semibold text-white"
                  >
                    自评错误 ✗
                  </button>
                  <button
                    onClick={() => submitSelfEval("skip").catch(() => undefined)}
                    className="h-7 rounded-[7px] bg-white/15 px-2.5 text-[11px] text-zinc-200"
                  >
                    跳过评估
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </aside>
      </div>

      {selectionDraft ? (
        <div
          style={{
            position: "fixed",
            left: selectionDraft.x,
            top: selectionDraft.y + 8,
            transform: "translateX(-50%)",
            zIndex: 90,
            padding: 6,
            borderRadius: 8,
            background: "rgba(16,18,26,0.92)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex",
            gap: 6,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {[
            { color: "rgba(251,191,36,0.28)", label: "黄" },
            { color: "rgba(59,130,246,0.26)", label: "蓝" },
            { color: "rgba(34,197,94,0.24)", label: "绿" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                saveAnnotation({
                  annotationType: "highlight",
                  quoteText: selectionDraft.text,
                  color: item.color,
                }).catch(() => undefined);
                setSelectionDraft(null);
              }}
              className="h-7 rounded px-2 text-[11px] text-zinc-100"
              style={{ background: item.color }}
            >
              高亮{item.label}
            </button>
          ))}
          <button
            onClick={() => {
              setNoteDraft({ quoteText: selectionDraft.text, x: selectionDraft.x, y: selectionDraft.y + 8, note: "" });
              setSelectionDraft(null);
            }}
            className="inline-flex h-7 items-center gap-1 rounded bg-white/10 px-2 text-[11px] text-zinc-100"
          >
            <Bookmark size={12} /> 笔记
          </button>
        </div>
      ) : null}

      {noteDraft ? (
        <div
          style={{
            position: "fixed",
            left: noteDraft.x,
            top: noteDraft.y + 10,
            transform: "translateX(-20%)",
            zIndex: 91,
            width: 280,
            borderRadius: 10,
            background: "rgba(16,18,26,0.96)",
            border: "1px solid rgba(255,255,255,0.14)",
            padding: 10,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="mb-1 text-[10px] text-zinc-400">引用：{noteDraft.quoteText.slice(0, 36)}...</p>
          <textarea
            value={noteDraft.note}
            onChange={(event) => setNoteDraft((prev) => (prev ? { ...prev, note: event.target.value } : prev))}
            placeholder="输入笔记..."
            className="h-20 w-full resize-none rounded-[8px] border border-white/10 bg-white/5 p-2 text-[11px] text-zinc-100 outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setNoteDraft(null)} className="h-7 rounded bg-white/10 px-2 text-[11px] text-zinc-300">
              取消
            </button>
            <button
              onClick={() => {
                if (!noteDraft.note.trim()) return;
                saveAnnotation({
                  annotationType: "note",
                  quoteText: noteDraft.quoteText,
                  noteText: noteDraft.note.trim(),
                }).catch(() => undefined);
                setNoteDraft(null);
              }}
              className="h-7 rounded bg-[#6366F1] px-2 text-[11px] text-white"
            >
              保存
            </button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {finished ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 overflow-y-auto bg-[#1a1f2e] p-6"
          >
            <div className="mx-auto max-w-[860px]">
              <h2 className="text-[24px] font-bold text-white">Passage {detail.passageNum} 完成 ✓</h2>
              <div className="mt-4 flex items-center gap-6 rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
                <div className="relative h-[140px] w-[140px]">
                  <svg viewBox="0 0 140 140" className="h-[140px] w-[140px]">
                    <circle cx="70" cy="70" r="60" stroke="rgba(255,255,255,0.12)" strokeWidth="12" fill="none" />
                    <circle
                      cx="70"
                      cy="70"
                      r="60"
                      stroke="#6366F1"
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={376.99}
                      strokeDashoffset={376.99 * (1 - correctCount / Math.max(totalQuestions, 1))}
                      transform="rotate(-90 70 70)"
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-[18px] font-semibold text-[#EBEDFB]">
                    {Math.round((correctCount / Math.max(totalQuestions, 1)) * 100)}%
                  </div>
                </div>
                <div>
                  <p className="text-[18px] font-semibold text-[#EBEDFB]">{correctCount} / {totalQuestions} 正确</p>
                  <p className="mt-1 text-[13px] text-[#A0AEC0]">用时 {formatTimer(seconds)}</p>
                  <p className="mt-1 text-[12px] text-[#A0AEC0]">已完成题目 {doneCount}</p>
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/10 bg-white/[0.04] p-3">
                <p className="mb-2 text-[13px] font-semibold text-[#E5E7EB]">分题目回顾</p>
                <div className="space-y-2">
                  {questions.map((item) => {
                    const result = results[item.id];
                    const isCorrect = result?.status === "correct" || result?.status === "self-correct";
                    return (
                      <div key={item.id} className="rounded-[10px] border border-white/10 bg-[#111725]/70 px-3 py-2">
                        <button
                          onClick={() => setExpandedReviewId((prev) => (prev === item.id ? null : item.id))}
                          className="flex w-full items-center gap-2 text-left"
                        >
                          <span className="text-[12px] text-zinc-300">Q{item.qNum}</span>
                          <span className="text-[11px] text-zinc-500">{item.qType ?? "阅读题"}</span>
                          <span className="text-[11px] text-zinc-400">我的答案 {result?.myAnswer ?? "-"}</span>
                          <span className="text-[11px] text-zinc-400">正确答案 {result?.correctAnswer ?? "-"}</span>
                          <span className={`ml-auto text-[12px] ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                            {isCorrect ? "✓" : "✗"}
                          </span>
                        </button>
                        {expandedReviewId === item.id ? (
                          <div className="mt-2 border-t border-white/10 pt-2">
                            <p className="text-[12px] text-zinc-200">{item.qText}</p>
                            {result?.aiAnalysis ? (
                              <div className="mt-2 rounded-[8px] border border-[rgba(182,160,255,0.4)] bg-[rgba(182,160,255,0.12)] p-2 text-[11px] text-[#DDD6FE]">
                                {result.aiAnalysis}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setFinished(false)}
                  className="h-9 rounded-[9px] border border-white/20 bg-white/5 px-4 text-[12px] text-zinc-200"
                >
                  查看文章
                </button>
                <button
                  onClick={() => {
                    setFinished(false);
                    setCurrentIdx(0);
                    setResults({});
                    setSingleSelections({});
                    setMultiSelections({});
                    setSentenceSelections({});
                    setSeconds(0);
                  }}
                  className="h-9 rounded-[9px] bg-[#6366F1] px-4 text-[12px] font-semibold text-white"
                >
                  重新做
                </button>
                <button
                  onClick={() => setRoute("question-bank-list")}
                  className="h-9 rounded-[9px] bg-zinc-700 px-4 text-[12px] text-white"
                >
                  返回列表
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
