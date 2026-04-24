export type AiProviderConfig = {
  id: string;
  label: string;
  mode: "local" | "cloud";
  enabled: boolean;
};

export const aiProviderRegistry: AiProviderConfig[] = [
  { id: "local", label: "Local Rule Engine", mode: "local", enabled: true },
  { id: "gemini", label: "Gemini（默认）", mode: "cloud", enabled: true },
  { id: "openai", label: "OpenAI（预留）", mode: "cloud", enabled: false },
  { id: "ollama", label: "Ollama（预留）", mode: "local", enabled: false },
  { id: "lm-studio", label: "LM Studio（预留）", mode: "local", enabled: false },
];
