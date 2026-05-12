import { getAppSetting, setAppSetting } from "@/features/integrations/api";

export type DiscussionMode = "api" | "web";

export type WebSessionProvider = "openai" | "anthropic" | "gemini";

export type WebSessionBinding = {
  provider: WebSessionProvider;
  label: string;
  threadUrl: string;
  homeUrl: string;
  status: "unbound" | "bound";
  note: string;
};

const MODE_KEY = "ai_roundtable_mode";
const THREAD_KEYS: Record<WebSessionProvider, string> = {
  openai: "web_session_thread_openai",
  anthropic: "web_session_thread_anthropic",
  gemini: "web_session_thread_gemini",
};

const PROVIDER_META: Record<WebSessionProvider, { label: string; homeUrl: string; note: string }> = {
  openai: {
    label: "ChatGPT",
    homeUrl: "https://chatgpt.com/",
    note: "建议绑定一个固定线程，后面继续讨论就写回同一个网页会话。",
  },
  anthropic: {
    label: "Claude",
    homeUrl: "https://claude.ai/",
    note: "Claude 也建议固定到单独线程，避免每次开新窗口丢上下文。",
  },
  gemini: {
    label: "Gemini",
    homeUrl: "https://gemini.google.com/",
    note: "Gemini 建议用专门的讨论线程，不和你日常私聊混在一起。",
  },
};

export async function getDiscussionMode() {
  const saved = await getAppSetting(MODE_KEY);
  return saved === "web" ? "web" : "api";
}

export async function setDiscussionMode(mode: DiscussionMode) {
  await setAppSetting(MODE_KEY, mode);
}

export async function listWebSessionBindings(): Promise<WebSessionBinding[]> {
  const providers = Object.keys(PROVIDER_META) as WebSessionProvider[];
  const values = await Promise.all(
    providers.map(async (provider) => {
      const threadUrl = ((await getAppSetting(THREAD_KEYS[provider])) || "").trim();
      const meta = PROVIDER_META[provider];
      return {
        provider,
        label: meta.label,
        threadUrl,
        homeUrl: meta.homeUrl,
        status: threadUrl ? "bound" : "unbound",
        note: meta.note,
      } satisfies WebSessionBinding;
    }),
  );
  return values;
}

export async function saveWebSessionBinding(provider: WebSessionProvider, threadUrl: string) {
  await setAppSetting(THREAD_KEYS[provider], threadUrl.trim());
}
