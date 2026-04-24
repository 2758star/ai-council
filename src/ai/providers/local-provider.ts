import { StructuredOutputParser } from "@/ai/schemas/structured-output";
import type {
  ProviderAdapter,
  ProviderCallWithToolsInput,
  ProviderImageInput,
  ProviderStructuredInput,
  ProviderStructuredResult,
  ProviderTextInput,
  ProviderTextResult,
  ProviderToolCall,
  ProviderToolResult,
} from "@/ai/providers/provider-adapter";

function inferLocalToolCalls(prompt: string): ProviderToolCall[] {
  const text = prompt.toLowerCase();
  const calls: ProviderToolCall[] = [];
  if (text.includes("今天") && (text.includes("计划") || text.includes("安排") || text.includes("任务"))) {
    calls.push({ name: "get_today_tasks", arguments: {} });
  }
  if (text.includes("本周") && text.includes("任务")) {
    calls.push({ name: "get_week_tasks", arguments: { limit: 80 } });
  }
  if (text.includes("项目")) {
    calls.push({ name: "get_project_summary", arguments: {} });
  }
  if (text.includes("网页") || text.includes("官网") || text.includes("变化")) {
    calls.push({ name: "get_recent_web_changes", arguments: { limit: 20 } });
  }
  if (text.includes("学习分析") || text.includes("错因")) {
    calls.push({ name: "get_study_analysis_logs", arguments: { limit: 30 } });
  }
  if (text.includes("草案") && text.includes("计划")) {
    calls.push({ name: "get_plan_versions", arguments: { status: "pending", limit: 20 } });
  }
  if ((text.includes("网页变化") || text.includes("官网变化")) && text.includes("已处理")) {
    calls.push({
      name: "mark_web_change_processed",
      arguments: { changeId: 1, processed: true },
    });
  }
  if ((text.includes("网页变化") || text.includes("官网变化")) && (text.includes("转任务") || text.includes("创建任务"))) {
    calls.push({
      name: "commit_create_task_from_web_change",
      arguments: { changeId: 1 },
    });
  }
  if (text.includes("创建任务草案")) {
    calls.push({
      name: "create_task_draft",
      arguments: {
        title: "AI 建议任务",
        description: "来自本地规则引擎的任务草案。",
        priority: "中",
        estimatedMinutes: 60,
      },
    });
  }
  return calls;
}

export class LocalRuleProvider implements ProviderAdapter {
  readonly id = "local";

  async generateText(input: ProviderTextInput): Promise<ProviderTextResult> {
    const text = `本地规则引擎已处理请求：${input.prompt.slice(0, 220)}`;
    return {
      text,
      usage: {
        inputTokens: Math.max(1, Math.floor(input.prompt.length / 4)),
        outputTokens: Math.max(1, Math.floor(text.length / 4)),
        latencyMs: 5,
      },
    };
  }

  async analyzeImage(input: ProviderImageInput): Promise<ProviderTextResult> {
    void input;
    const placeholder = {
      date: new Date().toISOString().slice(0, 10),
      exam_type: "Unknown",
      subject: "Unknown",
      material: "local-image",
      performance_summary: "本地模式下未启用视觉模型，建议切换到 Gemini 进行准确截图分析。",
      weakest_module: "Unknown",
      key_errors: [],
      suggested_adjustment: "切换至 Gemini Provider 后重试截图分析。",
      intensity_change: "keep",
      notes: "local_provider_no_vision_model",
    };
    return {
      text: JSON.stringify(placeholder),
      usage: { inputTokens: 1, outputTokens: 1, latencyMs: 5 },
    };
  }

  async callWithTools(input: ProviderCallWithToolsInput): Promise<ProviderToolResult> {
    const toolNames = new Set(input.tools.map((tool) => tool.name));
    const toolCalls = inferLocalToolCalls(input.prompt).filter((call) => toolNames.has(call.name));
    const text = toolCalls.length > 0
      ? "本地规则引擎已生成工具调用建议。"
      : "本地规则引擎未识别到可执行工具，建议补充更具体指令。";
    return {
      text,
      toolCalls,
      usage: {
        inputTokens: Math.max(1, Math.floor(input.prompt.length / 4)),
        outputTokens: Math.max(1, Math.floor(text.length / 4)),
        latencyMs: 8,
      },
    };
  }

  async generateStructuredOutput<T>(input: ProviderStructuredInput): Promise<ProviderStructuredResult<T>> {
    const result = await this.generateText({
      model: input.model,
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      temperature: 0.1,
    });
    let data: T;
    try {
      data = StructuredOutputParser.parseJson<T>(result.text);
    } catch {
      data = StructuredOutputParser.parseJson<T>(JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        exam_type: "Unknown",
        subject: "Unknown",
        material: "Unknown",
        performance_summary: "本地模式仅返回规则化占位分析。",
        weakest_module: "Unknown",
        key_errors: [],
        suggested_adjustment: "切换到 Gemini 获得更准确结构化分析。",
        intensity_change: "keep",
        notes: "local_placeholder",
      }));
    }
    return { ...result, data };
  }
}
