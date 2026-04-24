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

export class OpenAIProvider implements ProviderAdapter {
  readonly id = "openai";

  constructor(private readonly apiKey: string) {}

  private notReady(method: string): never {
    if (!this.apiKey.trim()) {
      throw new Error(`OpenAI provider is not configured. Missing API key (${method}).`);
    }
    throw new Error(`OpenAI provider adapter placeholder: ${method} is not implemented yet.`);
  }

  async generateText(input: ProviderTextInput): Promise<ProviderTextResult> {
    void input;
    this.notReady("generateText");
  }

  async analyzeImage(input: ProviderImageInput): Promise<ProviderTextResult> {
    void input;
    this.notReady("analyzeImage");
  }

  async callWithTools(input: ProviderCallWithToolsInput): Promise<ProviderToolResult> {
    void input;
    this.notReady("callWithTools");
  }

  async generateStructuredOutput<T>(input: ProviderStructuredInput): Promise<ProviderStructuredResult<T>> {
    void input;
    this.notReady("generateStructuredOutput");
  }
}
