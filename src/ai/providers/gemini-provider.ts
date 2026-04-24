import { StructuredOutputParser } from "@/ai/schemas/structured-output";
import type {
  ProviderAdapter,
  ProviderCallWithToolsInput,
  ProviderImageInput,
  ProviderStructuredInput,
  ProviderStructuredResult,
  ProviderTextInput,
  ProviderTextResult,
  ProviderToolResult,
} from "@/ai/providers/provider-adapter";

const MODEL = "gemini-2.0-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const GEMINI_FAST_MODEL = MODEL;
export const GEMINI_COMPLEX_MODEL = "gemini-2.5-pro";

export class GeminiProvider implements ProviderAdapter {
  readonly id = "gemini";

  constructor(private readonly apiKey: string) {}

  private getEndpoint(model: string) {
    if (model === MODEL) {
      return `${API_URL}?key=${this.apiKey}`;
    }
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
  }

  private ensureApiKey() {
    if (!this.apiKey.trim()) {
      throw new Error("Gemini API key is not configured.");
    }
  }

  private async request(model: string, body: unknown) {
    this.ensureApiKey();
    const startedAt = performance.now();
    const response = await fetch(this.getEndpoint(model), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const latencyMs = Math.round(performance.now() - startedAt);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${text}`);
    }
    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim() ?? "";
    if (!text) {
      throw new Error("Gemini returned empty content.");
    }
    return {
      text,
      usage: {
        inputTokens: payload?.usageMetadata?.promptTokenCount ?? null,
        outputTokens: payload?.usageMetadata?.candidatesTokenCount ?? null,
        latencyMs,
      },
      raw: payload,
    } as ProviderTextResult;
  }

  async generateText(input: ProviderTextInput): Promise<ProviderTextResult> {
    const parts = [];
    if (input.systemPrompt?.trim()) {
      parts.push({ text: `System:\n${input.systemPrompt.trim()}` });
    }
    parts.push({ text: input.prompt });
    return this.request(input.model, {
      contents: [{ parts }],
      generationConfig: {
        temperature: input.temperature ?? 0.3,
      },
    });
  }

  async analyzeImage(input: ProviderImageInput): Promise<ProviderTextResult> {
    const prompt = input.systemPrompt?.trim()
      ? `${input.systemPrompt.trim()}\n\n${input.prompt}`
      : input.prompt;
    return this.request(input.model, {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: input.mimeType || "image/png",
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    });
  }

  async callWithTools(input: ProviderCallWithToolsInput): Promise<ProviderToolResult> {
    const toolSpec = input.tools
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join("\n");
    const prompt = [
      input.systemPrompt?.trim() || "",
      "你是系统内 AI 中枢。请在需要时调用工具，并严格返回 JSON：",
      `{"response":"...","toolCalls":[{"name":"tool_name","arguments":{}}]}`,
      "可用工具：",
      toolSpec || "- 无",
      "用户请求：",
      input.prompt,
    ]
      .filter(Boolean)
      .join("\n\n");
    const result = await this.generateText({
      model: input.model,
      prompt,
      temperature: 0.1,
    });
    let toolCalls: ProviderToolResult["toolCalls"] = [];
    let text = result.text;
    try {
      const parsed = StructuredOutputParser.parseJson<{
        response?: string;
        toolCalls?: Array<{ name?: string; arguments?: Record<string, unknown> }>;
      }>(result.text);
      if (parsed.response) {
        text = parsed.response;
      }
      toolCalls = (parsed.toolCalls ?? [])
        .filter((call) => Boolean(call.name))
        .map((call) => ({
          name: String(call.name),
          arguments: call.arguments ?? {},
        }));
    } catch {
      toolCalls = [];
    }
    return {
      ...result,
      text,
      toolCalls,
    };
  }

  async generateStructuredOutput<T>(input: ProviderStructuredInput): Promise<ProviderStructuredResult<T>> {
    const result = await this.generateText({
      model: input.model,
      prompt: `${input.prompt}\n\n请严格返回 JSON，结构说明：${input.schemaDescription}`,
      systemPrompt: input.systemPrompt,
      temperature: 0.1,
    });
    const data = StructuredOutputParser.parseJson<T>(result.text);
    return { ...result, data };
  }
}
