import { invoke } from "@tauri-apps/api/core";

export type QuestionBank = {
  id: number;
  name: string;
  subject: string | null;
  filePath: string | null;
  totalPassages: number;
  parsedAt: string | null;
  createdAt: string;
};

export type PassageSummary = {
  id: number;
  bankId: number;
  passageNum: number;
  questionCount: number;
  questionTypes: string | null;
  attemptedQuestions: number;
  correctQuestions: number;
  wrongQuestions: number;
  lastAttemptedAt: string | null;
};

export type QuestionDetail = {
  id: number;
  passageId: number;
  qNum: number;
  qType: string | null;
  qText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  correctAnswer: string | null;
  hasAnswer: number;
  highlightedText: string | null;
};

export type PassageDetail = {
  id: number;
  bankId: number;
  passageNum: number;
  passageText: string;
  questionCount: number;
  questionTypes: string | null;
  questions: QuestionDetail[];
};

export type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: string | null;
  hasAnswer: number;
};

export type ImportAnswerResult = {
  matched: number;
  updated: number;
  unmatched: number;
};

export type QuestionAnnotation = {
  id: number;
  questionId: number | null;
  passageId: number;
  annotationType: string;
  quoteText: string | null;
  color: string | null;
  noteText: string | null;
  startOffset: number | null;
  endOffset: number | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionBankStats = {
  totalQuestions: number;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracy: number;
  totalTimeSeconds: number;
  masteredMistakes: number;
  mistakeTotal: number;
  trend: Array<{
    dateKey: string;
    greReading: number;
    greMath: number;
    ieltsReading: number;
    overall: number;
  }>;
  typeMetrics: Array<{
    qType: string;
    total: number;
    correct: number;
    wrong: number;
    accuracy: number;
  }>;
  timeTrend: Array<{
    dateKey: string;
    avgSeconds: number;
  }>;
  passageTime: Array<{
    passageNum: number;
    avgSeconds: number;
  }>;
  wrongHeatmap: Array<{
    dateKey: string;
    qType: string;
    wrongCount: number;
  }>;
  passageCompletion: Array<{
    passageId: number;
    passageNum: number;
    status: string;
    wrongCount: number;
  }>;
};

export async function extractPdfText(filePath: string) {
  return invoke<string>("extract_pdf_text", { filePath });
}

export async function savePassages(passagesJson: string, bankName: string, subject?: string | null) {
  return invoke<number>("save_passages", { passagesJson, bankName, subject: subject ?? null });
}

export async function importAnswers(bankId: number, answersJson: string) {
  return invoke<ImportAnswerResult>("import_answers", { bankId, answersJson });
}

export async function getQuestionBanks() {
  return invoke<QuestionBank[]>("get_question_banks");
}

export async function getPassages(bankId: number, qTypeFilter?: string | null) {
  return invoke<PassageSummary[]>("get_passages", { bankId, qTypeFilter: qTypeFilter ?? null });
}

export async function getPassageDetail(passageId: number) {
  return invoke<PassageDetail | null>("get_passage_detail", { passageId });
}

export async function submitAnswer(questionId: number, myAnswer: string, timeSpentSeconds?: number | null) {
  return invoke<AnswerResult>("submit_answer", {
    questionId,
    myAnswer,
    timeSpentSeconds: timeSpentSeconds ?? null,
  });
}

export async function submitSelfEvaluation(payload: {
  questionId: number;
  myAnswer?: string | null;
  selfEvalResult?: boolean | null;
  timeSpentSeconds?: number | null;
}) {
  return invoke<AnswerResult>("submit_self_evaluation", {
    payload: {
      questionId: payload.questionId,
      myAnswer: payload.myAnswer ?? null,
      selfEvalResult: payload.selfEvalResult ?? null,
      timeSpentSeconds: payload.timeSpentSeconds ?? null,
    },
  });
}

export async function addQuestionAnnotation(payload: {
  questionId?: number | null;
  passageId: number;
  annotationType: string;
  quoteText?: string | null;
  color?: string | null;
  noteText?: string | null;
  startOffset?: number | null;
  endOffset?: number | null;
}) {
  return invoke<number>("add_question_annotation", {
    payload: {
      questionId: payload.questionId ?? null,
      passageId: payload.passageId,
      annotationType: payload.annotationType,
      quoteText: payload.quoteText ?? null,
      color: payload.color ?? null,
      noteText: payload.noteText ?? null,
      startOffset: payload.startOffset ?? null,
      endOffset: payload.endOffset ?? null,
    },
  });
}

export async function getQuestionAnnotations(passageId: number) {
  return invoke<QuestionAnnotation[]>("get_question_annotations", { passageId });
}

export async function getQuestionBankStats(bankId?: number | null, range?: "week" | "month" | "all") {
  return invoke<QuestionBankStats>("get_question_bank_stats", {
    bankId: bankId ?? null,
    range: range ?? "month",
  });
}

export async function addMistakeFromQuestion(questionId: number, errorAnalysis: string, errorType: string) {
  return invoke<number>("add_mistake_from_question", { questionId, errorAnalysis, errorType });
}

export async function addMistakeFromExam(payload: {
  questionId: number;
  myAnswer?: string | null;
  aiAnalysis?: string | null;
  errorType?: string | null;
  timeSpent?: number | null;
}) {
  return invoke<number>("add_mistake_from_exam", {
    payload: {
      questionId: payload.questionId,
      myAnswer: payload.myAnswer ?? null,
      aiAnalysis: payload.aiAnalysis ?? null,
      errorType: payload.errorType ?? null,
      timeSpent: payload.timeSpent ?? null,
    },
  });
}

export async function listMistakesFromExam(limit?: number) {
  return invoke<
    Array<{
      id: number;
      questionId: number;
      bankName: string;
      passageNum: number;
      qType: string | null;
      qText: string;
      myAnswer: string | null;
      correctAnswer: string | null;
      aiAnalysis: string | null;
      errorType: string | null;
      passageText: string | null;
      timeSpent: number | null;
      createdAt: string;
    }>
  >("list_mistakes_from_exam", { limit: limit ?? null });
}
