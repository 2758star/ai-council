import { runSecureAiPrompt } from "@/features/integrations/api";
import type { Message, ToolCallRecord } from "@/pages/ai-secretary/types";
import { executeSecretaryTool, type SecretaryToolName } from "./tools";

type LlmToolJson = {
  tool: SecretaryToolName | null;
  params?: Record<string, unknown>;
  reply: string;
};

export interface SecretaryResult {
  text: string;
  toolCall?: ToolCallRecord;
  subText?: string;
}

const TOOL_DESCRIPTIONS = `
你有以下工具可以调用，调用时用 JSON 格式返回：
{ "tool": "工具名", "params": {...}, "reply": "给用户的回复" }
如果不需要工具，返回：
{ "tool": null, "reply": "给用户的回复" }

工具列表：
- get_today_tasks: {} → 返回今日任务列表
- get_study_stats: { "days": 7 } → 返回近N天学习统计
- add_task: { "title": "任务名", "subject": "雅思|GRE|申请|其他", "date": "YYYY-MM-DD", "duration_minutes": 30 }
- complete_task: { "task_id": 1, "accuracy": 75, "notes": "备注" }
- log_study_session: { "subject": "雅思听力", "duration_minutes": 45, "accuracy": 75 }
- adjust_plan: { "adjustment": "调整说明" }
- get_mistakes_summary: { "subject": "雅思|GRE|全部" }
- get_application_status: {}
- send_briefing: { "type": "morning|evening|custom" }
- adjust_vocab_target: { "date": "YYYY-MM-DD", "exam": "雅思|GRE", "additional_words": 10 }
- analyze_accuracy_pattern: { "subject": "雅思|GRE|全部", "days": 7 }
- batch_import_schedule: {
  "goals": [{ "title": "...", "subject": "雅思|GRE", "total_amount": 2500, "unit": "词", "daily_target": 160, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "notes": "" }],
  "tasks": [{ "title": "...", "task_type": "雅思|GRE|词汇|申请|其他", "scheduled_date": "YYYY-MM-DD", "notes": "" }]
}
`;

const ADJUSTMENT_RULES = `
## 计划调整规则（严格遵守）

### 单词欠量补偿
- 当日单词未完成N词 → 从明天起分摊到未来3天补回
- 例：今天欠30词 → 明天+10词，后天+10词，大后天+10词
- 调用工具：adjust_vocab_target(date, exam, additional_words)

### 正确率分析
- 正确率 < 60%：分析是哪类题型集中出错，明天专项练习该题型，不减总量
- 正确率 60-70%：记录，观察3天趋势
- 正确率连续3天下降：触发深度分析，生成专项练习建议
- 正确率 > 85%：可建议适当增加难度或数量
- 调用工具：analyze_accuracy_pattern(subject, days)

### 状态描述处理
- 用户说“很累/状态不好/睡不着”等 → 只记录状态，不调整任务量
- 用户说“今天不想学了” → 提醒执行底线，记录状态，不删除任务
- 任务量只因实际完成情况调整，不因主观感受调整

### 不可调整的底线
- 每天必须有至少一项可登记结果
- 单词总量不减少，只重新分配到未来日期
- 申请截止日期提醒不因任何原因延后
`;

function buildPrompt(history: Message[], userText: string): string {
  const historyText = history
    .filter((msg) => !msg.isLoading && msg.text)
    .slice(-10)
    .map((msg) => `${msg.from === "user" || msg.from === "feishu" ? "用户" : "AI"}：${msg.text}`)
    .join("\n");

  return `你是用户的个人学习秘书“小助手”。用简洁中文回复，友好自然，像助手而非机器人。

${TOOL_DESCRIPTIONS}
${ADJUSTMENT_RULES}

对话历史：
${historyText}

用户说：${userText}

请判断是否需要调用工具，并严格返回 JSON。`;
}

function parseMaybeJson(raw: string): LlmToolJson | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Partial<LlmToolJson>;
    if (typeof parsed.reply !== "string") return null;
    return {
      tool: (parsed.tool as SecretaryToolName | null) ?? null,
      params: parsed.params ?? {},
      reply: parsed.reply,
    };
  } catch {
    return null;
  }
}

export async function runSecretaryChat(history: Message[]): Promise<SecretaryResult> {
  const userMsg = history[history.length - 1];
  if (!userMsg) throw new Error("No user message");

  const prompt = buildPrompt(history.slice(0, -1), userMsg.text);

  try {
    const response = await runSecureAiPrompt({
      systemPrompt: "你是 AI 秘书，先判断是否调用工具，再输出 JSON。",
      prompt,
    });

    const parsed = parseMaybeJson(response.text);
    if (!parsed) {
      return { text: response.text };
    }

    if (!parsed.tool) {
      return { text: parsed.reply };
    }

    const toolResult = await executeSecretaryTool({
      tool: parsed.tool,
      params: parsed.params ?? {},
    });

    return {
      text: parsed.reply,
      toolCall: {
        tool: parsed.tool,
        desc:
          Object.entries(parsed.params ?? {})
            .map(([, value]) => String(value))
            .join(" · ") || "已执行",
        result: toolResult.split("\n")[0],
      },
      subText: toolResult.includes("\n") ? toolResult : undefined,
    };
  } catch {
    return {
      text: "抱歉，AI 暂时无法响应，请检查 API Key 配置。",
    };
  }
}
