import { AiOrchestrator } from "@/ai/orchestrator/ai-orchestrator";
import { GeminiProvider } from "@/ai/providers/gemini-provider";
import { LocalRuleProvider } from "@/ai/providers/local-provider";
import { OpenAIProvider } from "@/ai/providers/openai-provider";
import type { WritePermissionMode } from "@/ai/policies/write-policy";
import { getAppSetting } from "@/features/integrations/api";

export async function createInternalOrchestrator(mode: WritePermissionMode = "draft-write") {
  const [provider, geminiApiKey, openaiApiKey] = await Promise.all([
    getAppSetting("ai_provider"),
    getAppSetting("gemini_api_key"),
    getAppSetting("openai_api_key"),
  ]);
  const normalized = (provider || "local").trim().toLowerCase();
  if (normalized === "openai") {
    return new AiOrchestrator(new OpenAIProvider(openaiApiKey ?? ""), undefined, mode);
  }
  if (normalized === "gemini") {
    return new AiOrchestrator(new GeminiProvider(geminiApiKey ?? ""), undefined, mode);
  }
  return new AiOrchestrator(new LocalRuleProvider(), undefined, mode);
}
