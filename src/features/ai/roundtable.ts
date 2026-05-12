import { getAppSetting, setAppSetting } from "@/features/integrations/api";

export const DEFAULT_LLM_RELAY_URL = "http://127.0.0.1:8080";
const LLM_RELAY_URL_KEY = "llm_relay_base_url";

export type RelayProviderRecord = {
  id: string;
  family: string;
  configured: boolean;
  defaultModel: string;
  apiStyle: string;
  stream: string;
};

export type RoundtableProviderDraft = {
  provider: string;
  label?: string;
  model?: string;
  stancePrompt?: string;
};

export type RoundtableTranscriptEntry = {
  round: number;
  speaker: string;
  provider: string;
  model?: string;
  content: string;
  usage?: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    totalTokens?: number | null;
  };
};

export type RoundtableResponse = {
  ok: boolean;
  objective: string;
  rounds: number;
  providers: RoundtableProviderDraft[];
  transcript: RoundtableTranscriptEntry[];
  roundResults: Array<{
    round: number;
    responses: Array<
      | (RoundtableTranscriptEntry & {
          ok: true;
          raw?: unknown;
        })
      | {
          ok: false;
          round: number;
          speaker: string;
          provider: string;
          model: string | null;
          message: string;
        }
    >;
  }>;
  summary:
    | {
        ok: true;
        provider: string;
        model: string;
        text: string;
        usage?: {
          inputTokens?: number | null;
          outputTokens?: number | null;
          totalTokens?: number | null;
        };
      }
    | {
        ok: false;
        provider: string;
        model: string | null;
        message: string;
      }
    | null;
};

export async function getRelayBaseUrl() {
  const saved = await getAppSetting(LLM_RELAY_URL_KEY);
  return saved?.trim() || DEFAULT_LLM_RELAY_URL;
}

export async function setRelayBaseUrl(value: string) {
  const normalized = value.trim() || DEFAULT_LLM_RELAY_URL;
  await setAppSetting(LLM_RELAY_URL_KEY, normalized);
  return normalized;
}

export async function listRelayProviders(baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/providers`);
  if (!response.ok) {
    throw new Error(`Relay providers request failed: ${response.status}`);
  }
  const payload = (await response.json()) as {
    ok: boolean;
    providers: RelayProviderRecord[];
  };
  return payload.providers ?? [];
}

export async function runRelayRoundtable(
  baseUrl: string,
  payload: {
    topic: string;
    rounds: number;
    temperature: number;
    maxTokens: number;
    providers: RoundtableProviderDraft[];
    summaryProvider?: { provider: string; model?: string } | string | null;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  },
) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/roundtable`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || `Roundtable request failed: ${response.status}`);
  }
  return data as RoundtableResponse;
}

export async function streamRelayRoundtable(
  baseUrl: string,
  payload: {
    topic: string;
    rounds: number;
    temperature: number;
    maxTokens: number;
    providers: RoundtableProviderDraft[];
    summaryProvider?: { provider: string; model?: string } | string | null;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  },
  handlers: {
    onEvent?: (event: string, data: unknown) => void;
  } = {},
) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/llm/roundtable/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Roundtable stream request failed: ${response.status}`);
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary < 0) break;
      const raw = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const lines = raw.split(/\r?\n/);
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim() || "message";
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
      if (!dataLines.length) continue;
      const data = JSON.parse(dataLines.join("\n"));
      handlers.onEvent?.(eventName, data);
    }
  }
}
