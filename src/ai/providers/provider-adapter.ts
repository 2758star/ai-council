export type ProviderUsage = {
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
};

export type ProviderTextInput = {
  model: string;
  prompt: string;
  temperature?: number;
  systemPrompt?: string;
};

export type ProviderImageInput = {
  model: string;
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  systemPrompt?: string;
};

export type ProviderToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ProviderTextResult = {
  text: string;
  usage?: ProviderUsage;
  raw?: unknown;
};

export type ProviderToolResult = ProviderTextResult & {
  toolCalls: ProviderToolCall[];
};

export type ProviderStructuredResult<T> = ProviderTextResult & {
  data: T;
};

export type ProviderToolDefinition = {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
};

export type ProviderCallWithToolsInput = {
  model: string;
  prompt: string;
  tools: ProviderToolDefinition[];
  systemPrompt?: string;
};

export type ProviderStructuredInput = {
  model: string;
  prompt: string;
  schemaDescription: string;
  systemPrompt?: string;
};

export interface ProviderAdapter {
  readonly id: string;
  generateText(input: ProviderTextInput): Promise<ProviderTextResult>;
  analyzeImage(input: ProviderImageInput): Promise<ProviderTextResult>;
  callWithTools(input: ProviderCallWithToolsInput): Promise<ProviderToolResult>;
  generateStructuredOutput<T>(input: ProviderStructuredInput): Promise<ProviderStructuredResult<T>>;
}
