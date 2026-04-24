import { StructuredOutputParser } from "@/ai/schemas/structured-output";
import { getAppSetting, runSecureAiPrompt } from "@/features/integrations/api";

const DEFAULT_MODEL = "gemini-2.0-flash";
const REPORT_MODEL = "gemini-2.5-pro";

type StructuredRunInput = {
  actionName: string;
  systemPrompt: string;
  userPrompt: string;
  schemaDescription: string;
};

async function resolveModel() {
  return (await getAppSetting("gemini_model")) || DEFAULT_MODEL;
}

async function runStructuredJson<T>(input: StructuredRunInput): Promise<T> {
  const model = await resolveModel();
  const result = await runSecureAiPrompt({
    model,
    systemPrompt: `${input.systemPrompt}\n\n动作: ${input.actionName}`,
    prompt: `${input.userPrompt}\n\n请严格输出 JSON，schema: ${input.schemaDescription}`,
  });
  return StructuredOutputParser.parseJson<T>(result.text);
}

export type EveningBriefingInput = {
  completedTasks: string[];
  pendingTasks: string[];
  applicationAlerts: string[];
  mistakeStats: {
    addedToday: number;
    masteredToday: number;
    weakTags: string[];
  };
};

export type EveningBriefingOutput = {
  title: string;
  generatedAt: string;
  sections: {
    todayStatus: string;
    applicationReminders: string[];
    mistakeSummary: string;
    nextActions: string[];
    motivation: string;
  };
  fullText: string;
};

export async function generateEveningBriefing(input: EveningBriefingInput) {
  return runStructuredJson<EveningBriefingOutput>({
    actionName: "briefing_evening_generate",
    systemPrompt: "你是学习与申请双线秘书。输出简洁、可执行、可直接发送的晚报。",
    userPrompt: `数据输入:\n${JSON.stringify(input, null, 2)}`,
    schemaDescription:
      "{title:string, generatedAt:string, sections:{todayStatus:string, applicationReminders:string[], mistakeSummary:string, nextActions:string[], motivation:string}, fullText:string}",
  });
}

export type TomorrowDraftInput = {
  energy: number;
  focus: number;
  clarity: number;
  historyAccuracy: {
    ielts: number[];
    gre: number[];
  };
  stage: "雅思主线" | "GRE主线";
};

export type TomorrowDraftOutput = {
  stage: "雅思主线" | "GRE主线";
  totalMinutes: number;
  items: Array<{
    subject: string;
    task: string;
    minutes: number;
    intensity: "低" | "中" | "高";
    reason: string;
  }>;
  summary: string;
};

export async function generateTomorrowHomeworkDraft(input: TomorrowDraftInput) {
  return runStructuredJson<TomorrowDraftOutput>({
    actionName: "tomorrow_homework_generate",
    systemPrompt: "你是备考计划助手。根据状态和历史正确率给出明日作业量建议。",
    userPrompt: `输入:\n${JSON.stringify(input, null, 2)}`,
    schemaDescription:
      "{stage:'雅思主线'|'GRE主线', totalMinutes:number, items:[{subject:string, task:string, minutes:number, intensity:'低'|'中'|'高', reason:string}], summary:string}",
  });
}

export type PdfQuestionChunkResult = {
  passage_id: string;
  passage_text: string;
  questions: Array<{
    question_id: string;
    question_text: string;
    options?: string[];
    answer?: string | null;
    explanation?: string | null;
  }>;
};

export async function parsePdfQuestionBankChunks(
  chunks: string[],
  onChunkDone?: (index: number, total: number) => void
) {
  const results: PdfQuestionChunkResult[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const data = await runStructuredJson<{ items: PdfQuestionChunkResult[] }>({
      actionName: "pdf_question_parse",
      systemPrompt: "你是题库结构化解析器。把原始文本转成标准化题目 JSON。",
      userPrompt: `当前块索引: ${i + 1}/${chunks.length}\n原始文本:\n${chunks[i]}`,
      schemaDescription:
        "{items:[{passage_id:string, passage_text:string, questions:[{question_id:string, question_text:string, options?:string[], answer?:string|null, explanation?:string|null}]}]}",
    });
    results.push(...(data.items || []));
    onChunkDone?.(i + 1, chunks.length);
  }
  return results;
}

export type MistakeNormalizedOutput = {
  exam: "雅思" | "GRE";
  subject: string;
  title: string;
  description: string;
  myAnswer: string;
  correctAnswer: string;
  errorType: "概念不清" | "粗心大意" | "完全不会";
  keyPoints: string[];
};

export async function normalizeMistakeAnalysis(rawText: string) {
  return runStructuredJson<MistakeNormalizedOutput>({
    actionName: "mistake_analysis_normalize",
    systemPrompt: "你是错题结构化助手。把用户粘贴分析转换为统一错题 JSON。",
    userPrompt: `原文:\n${rawText}`,
    schemaDescription:
      "{exam:'雅思'|'GRE', subject:string, title:string, description:string, myAnswer:string, correctAnswer:string, errorType:'概念不清'|'粗心大意'|'完全不会', keyPoints:string[]}",
  });
}

export type IeltsWritingScoreInput = {
  task: number;
  prompt: string;
  answer: string;
  minWords: number;
};

export type IeltsWritingScoreOutput = {
  taskAchievement: number;
  coherence: number;
  lexicalResource: number;
  grammar: number;
  overall: number;
  suggestions: string;
};

export async function scoreIeltsWriting(input: IeltsWritingScoreInput) {
  return runStructuredJson<IeltsWritingScoreOutput>({
    actionName: "ielts_writing_score",
    systemPrompt:
      "你是雅思写作评分助手。请按 IELTS 1-9 分维度给分，并输出可执行建议。",
    userPrompt: `输入:\n${JSON.stringify(input, null, 2)}`,
    schemaDescription:
      "{taskAchievement:number, coherence:number, lexicalResource:number, grammar:number, overall:number, suggestions:string}",
  });
}

export type MistakeAutoAnalysisOutput = {
  error_reason: string;
  correct_logic: string;
  knowledge_point: string;
  error_type: "概念不清" | "粗心大意" | "完全不会";
};

export async function analyzeExamMistake(input: {
  passageText?: string;
  questionText: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  optionE?: string | null;
  myAnswer: string;
  correctAnswer: string;
}) {
  return runStructuredJson<MistakeAutoAnalysisOutput>({
    actionName: "exam_mistake_auto_analysis",
    systemPrompt: "你是一个GRE/雅思考试专家，输出简明、可执行、证据导向的错因分析。",
    userPrompt: `
文章（如有）：${input.passageText ?? ""}
题目：${input.questionText}
选项：A.${input.optionA ?? ""} B.${input.optionB ?? ""} C.${input.optionC ?? ""} D.${input.optionD ?? ""} E.${input.optionE ?? ""}
学生选了：${input.myAnswer}
正确答案：${input.correctAnswer}
`,
    schemaDescription:
      "{error_reason:string, correct_logic:string, knowledge_point:string, error_type:'概念不清'|'粗心大意'|'完全不会'}",
  });
}

export async function generateQuestionBankAiReport(input: {
  accuracyByType: Array<{ qType: string; accuracy: number; total: number }>;
  trend: Array<{ date: string; accuracy: number }>;
  highFreqWrongKeywords: string[];
}) {
  const model = (await getAppSetting("gemini_model")) || REPORT_MODEL;
  const result = await runSecureAiPrompt({
    model,
    systemPrompt: "你是考试学习策略顾问。请输出结构化、客观、不鸡汤的分析报告。",
    prompt: `请根据以下数据输出 JSON：
{
  "weaknesses": ["核心弱点1","核心弱点2","核心弱点3"],
  "weekly_focus": ["本周重点1","本周重点2","本周重点3"],
  "score_gap_estimate": "距离目标分数的差距估算"
}
数据如下：
${JSON.stringify(input, null, 2)}
`,
  });
  return StructuredOutputParser.parseJson<{
    weaknesses: string[];
    weekly_focus: string[];
    score_gap_estimate: string;
  }>(result.text);
}
