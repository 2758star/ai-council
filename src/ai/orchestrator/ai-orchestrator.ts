import { createAiLog } from "@/features/ai/api";
import { WritePolicy, type ToolPermissionLevel, type WritePermissionMode } from "@/ai/policies/write-policy";
import type { ProviderAdapter, ProviderTextResult } from "@/ai/providers/provider-adapter";
import { ToolRegistry, type AiToolResult } from "@/ai/tools/tool-registry";

export type OrchestratorExecuteInput = {
  prompt: string;
  systemPrompt?: string;
  model: string;
  allowToolCalls?: boolean;
  commitConfirmed?: boolean;
};

export type OrchestratorExecuteResult = {
  providerId: string;
  mode: WritePermissionMode;
  text: string;
  toolCalls: Array<{
    name: string;
    permission: ToolPermissionLevel;
    allowed: boolean;
    result?: AiToolResult;
    blockedReason?: string;
  }>;
};

export type ScreenshotStructuredOutput = {
  date: string;
  exam_type: string;
  subject: string;
  material: string;
  performance_summary: string;
  weakest_module: string;
  key_errors: string[];
  suggested_adjustment: string;
  intensity_change: string;
  notes: string;
};

function toolPermissionToPolicyLevel(level: ToolPermissionLevel) {
  return level;
}

export class AiOrchestrator {
  private readonly policy: WritePolicy;

  constructor(
    private readonly provider: ProviderAdapter,
    private readonly tools = new ToolRegistry(),
    mode: WritePermissionMode = "draft-write",
  ) {
    this.policy = new WritePolicy(mode);
  }

  get mode() {
    return this.policy.currentMode;
  }

  listTools() {
    return this.tools.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      permission: tool.permission,
    }));
  }

  async execute(input: OrchestratorExecuteInput): Promise<OrchestratorExecuteResult> {
    const allowToolCalls = input.allowToolCalls ?? true;
    const toolDefs = this.tools.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
    const startedAt = performance.now();
    const providerResult = allowToolCalls
      ? await this.provider.callWithTools({
          model: input.model,
          prompt: input.prompt,
          tools: toolDefs,
          systemPrompt: input.systemPrompt,
        })
      : {
          ...(await this.provider.generateText({
            model: input.model,
            prompt: input.prompt,
            systemPrompt: input.systemPrompt,
          })),
          toolCalls: [],
        };

    const toolResults: OrchestratorExecuteResult["toolCalls"] = [];
    for (const call of providerResult.toolCalls) {
      const tool = this.tools.get(call.name);
      if (!tool) {
        toolResults.push({
          name: call.name,
          permission: "read",
          allowed: false,
          blockedReason: "tool_not_found",
        });
        continue;
      }
      const permission = toolPermissionToPolicyLevel(tool.permission);
      const allowed = this.policy.canExecute(permission, Boolean(input.commitConfirmed));
      if (!allowed) {
        toolResults.push({
          name: call.name,
          permission,
          allowed: false,
          blockedReason: permission === "commit" ? "commit_confirmation_required" : "policy_blocked",
        });
        continue;
      }
      try {
        const result = await tool.execute(call.arguments);
        toolResults.push({
          name: call.name,
          permission,
          allowed: true,
          result,
        });
      } catch (error) {
        toolResults.push({
          name: call.name,
          permission,
          allowed: true,
          result: {
            ok: false,
            summary: String(error),
          },
        });
      }
    }

    await this.logProviderCall("orchestrator_execute", providerResult, performance.now() - startedAt, true);
    return {
      providerId: this.provider.id,
      mode: this.mode,
      text: providerResult.text,
      toolCalls: toolResults,
    };
  }

  async analyzeScreenshot(
    model: string,
    imageBase64: string,
    prompt?: string,
  ): Promise<ScreenshotStructuredOutput> {
    const startedAt = performance.now();
    const result = await this.provider.generateStructuredOutput<ScreenshotStructuredOutput>({
      model,
      prompt:
        prompt ||
        "请分析这张学习相关截图，返回结构化 JSON，字段：date, exam_type, subject, material, performance_summary, weakest_module, key_errors, suggested_adjustment, intensity_change, notes。",
      schemaDescription:
        "{date:string, exam_type:string, subject:string, material:string, performance_summary:string, weakest_module:string, key_errors:string[], suggested_adjustment:string, intensity_change:string, notes:string}",
      systemPrompt: "你是本地个人秘书系统的学习分析助手。",
    });
    await this.logProviderCall("screenshot_analysis", result, performance.now() - startedAt, true);
    return result.data;
  }

  private async logProviderCall(
    actionName: string,
    result: ProviderTextResult,
    latencyMs: number,
    success: boolean,
  ) {
    try {
      await createAiLog({
        moduleName: "ai_orchestrator",
        actionName,
        modelName: null,
        providerName: this.provider.id,
        inputTokens: Number(result.usage?.inputTokens ?? 0),
        outputTokens: Number(result.usage?.outputTokens ?? 0),
        estimatedCost: Number((Number(result.usage?.inputTokens ?? 0) + Number(result.usage?.outputTokens ?? 0)) * 0.0000009),
        latencyMs: Math.round(latencyMs),
        success,
      });
    } catch {
      // swallow logging errors to avoid breaking orchestrator flow
    }
  }
}
