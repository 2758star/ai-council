import { motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import {
  getAppSetting,
  sendFeishuTestMessage,
  setAppSetting,
} from "@/features/integrations/api";

type NavKey = "provider" | "feishu" | "exam" | "homework" | "storage";
type Provider = "claude" | "openai" | "gemini";

const models: Record<Provider, string[]> = {
  claude: ["claude-sonnet-4-5", "claude-haiku", "claude-opus"],
  openai: ["gpt-4o", "gpt-4o-mini", "o1-preview"],
  gemini: ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro"],
};

const navItems: Array<{ key: NavKey; label: string }> = [
  { key: "provider", label: "AI提供商" },
  { key: "feishu", label: "飞书推送" },
  { key: "exam", label: "考试目标" },
  { key: "homework", label: "作业基准量" },
  { key: "storage", label: "数据与存储" },
];

const secretRows = [
  { key: "gemini_api_key", label: "Gemini API Key" },
  { key: "openai_api_key", label: "OpenAI API Key（备用）" },
  { key: "feishu_webhook_url", label: "飞书 Webhook URL" },
] as const;

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`w-full rounded px-2 py-1 text-left text-[12px] ${
        active
          ? "bg-[rgba(99,102,241,0.1)] text-[#6366F1]"
          : "text-zinc-600 hover:bg-white/70"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function SettingsPage() {
  const [nav, setNav] = useState<NavKey>("provider");
  const [defaultProvider, setDefaultProvider] = useState<Provider>("gemini");
  const [model, setModel] = useState<Record<Provider, string>>({
    claude: models.claude[0],
    openai: models.openai[0],
    gemini: models.gemini[0],
  });
  const [secretStatus, setSecretStatus] = useState<Record<string, boolean>>({});
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});
  const [secretEditing, setSecretEditing] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [togglePush, setTogglePush] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  function setNoticeText(text: string | null) {
    setNotice(text);
    if (!text) return;
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 2400);
  }

  async function refreshSecretStatus() {
    const entries = await Promise.all(
      secretRows.map(async ({ key }) => {
        const value = await getAppSetting(key);
        return [key, Boolean(value && value.trim().length > 0)] as const;
      }),
    );
    const nextStatus = Object.fromEntries(entries);
    setSecretStatus(nextStatus);
    setSecretEditing((prev) => {
      const next = { ...prev };
      for (const { key } of secretRows) {
        if (!nextStatus[key]) next[key] = true;
        if (nextStatus[key] && typeof next[key] !== "boolean") next[key] = false;
      }
      return next;
    });
  }

  async function saveSecret(secretKey: string) {
    const value = secretDrafts[secretKey]?.trim() ?? "";
    if (!value) return;
    try {
      await setAppSetting(secretKey, value);
      setSecretDrafts((prev) => ({ ...prev, [secretKey]: "" }));
      setSecretEditing((prev) => ({ ...prev, [secretKey]: false }));
      setSavedMap((prev) => ({ ...prev, [secretKey]: true }));
      window.setTimeout(
        () => setSavedMap((prev) => ({ ...prev, [secretKey]: false })),
        2000,
      );
      await refreshSecretStatus();
    } catch (error) {
      setNoticeText(`保存失败：${String(error)}`);
    }
  }

  async function resetSecret(secretKey: string) {
    try {
      await setAppSetting(secretKey, "");
      setSecretDrafts((prev) => ({ ...prev, [secretKey]: "" }));
      setSecretEditing((prev) => ({ ...prev, [secretKey]: true }));
      await refreshSecretStatus();
    } catch (error) {
      setNoticeText(`重置失败：${String(error)}`);
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        await refreshSecretStatus();
        const [provider, geminiModel, feishuEnabled] = await Promise.all([
          getAppSetting("ai_provider"),
          getAppSetting("gemini_model"),
          getAppSetting("feishu_enabled"),
        ]);
        const normalizedProvider = (provider ?? "gemini").toLowerCase();
        if (normalizedProvider === "claude" || normalizedProvider === "openai" || normalizedProvider === "gemini") {
          setDefaultProvider(normalizedProvider);
        }
        if (geminiModel && models.gemini.includes(geminiModel)) {
          setModel((prev) => ({ ...prev, gemini: geminiModel }));
        }
        setTogglePush(feishuEnabled ? ["1", "true", "TRUE", "True"].includes(feishuEnabled) : true);
      } catch (error) {
        setNoticeText(`加载设置失败：${String(error)}`);
      }
    };
    load().catch(() => undefined);
  }, []);

  function SecretInput({
    secretKey,
    label,
  }: {
    secretKey: string;
    label: string;
  }) {
    const configured = Boolean(secretStatus[secretKey]);
    const editing = Boolean(secretEditing[secretKey]);
    const draft = secretDrafts[secretKey] ?? "";
    const saved = Boolean(savedMap[secretKey]);
    const showMasked = configured && !editing;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#86868B",
              marginBottom: 5,
            }}
          >
            {label}
          </div>
          {showMasked ? (
            <div
              style={{
                height: 28,
                borderRadius: 7,
                border: "0.5px solid rgba(0,0,0,0.08)",
                background: "rgba(0,0,0,0.03)",
                padding: "0 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#6366F1",
                }}
              />
              <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 500 }}>已保存</span>
              <span style={{ fontSize: 11, color: "#C7C7CC", letterSpacing: 2 }}>••••••••</span>
            </div>
          ) : (
            <input
              type="password"
              value={draft}
              onChange={(event) =>
                setSecretDrafts((prev) => ({ ...prev, [secretKey]: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  saveSecret(secretKey).catch(() => undefined);
                }
              }}
              placeholder={`输入 ${label}...`}
              style={{
                width: "100%",
                height: 28,
                borderRadius: 7,
                border: "0.5px solid rgba(0,0,0,0.12)",
                background: "rgba(255,255,255,0.8)",
                padding: "0 10px",
                fontSize: 11,
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
        </div>

        {showMasked ? (
          <button
            onClick={() => resetSecret(secretKey).catch(() => undefined)}
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 7,
              border: "0.5px solid rgba(239,68,68,0.25)",
              background: "rgba(239,68,68,0.06)",
              color: "#DC2626",
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            重置
          </button>
        ) : (
          <button
            onClick={() => saveSecret(secretKey).catch(() => undefined)}
            disabled={!draft.trim()}
            style={{
              height: 28,
              padding: "0 12px",
              borderRadius: 7,
              border: "none",
              background: draft.trim() ? "#6366F1" : "rgba(0,0,0,0.06)",
              color: draft.trim() ? "#fff" : "#C7C7CC",
              fontSize: 10,
              fontWeight: 600,
              cursor: draft.trim() ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              flexShrink: 0,
              transition: "all 0.15s",
            }}
          >
            {saved ? "✓ 已保存" : "保存"}
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full overflow-hidden bg-[#F5F5F7] p-3"
    >
      <div className="grid h-full min-h-0 grid-cols-[164px_minmax(0,1fr)] gap-3">
        <motion.aside
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.15 }}
          className="gc min-h-0 overflow-y-auto px-3 py-3"
        >
          <p className="mb-1 text-[12px] font-semibold text-zinc-700">设置</p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavButton
                key={item.key}
                active={nav === item.key}
                onClick={() => setNav(item.key)}
              >
                {item.label}
              </NavButton>
            ))}
          </div>
        </motion.aside>

        <motion.main
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.15 }}
          className="gc min-h-0 overflow-y-auto px-4 py-3"
        >
          {nav === "provider" ? (
            <div className="space-y-3">
              <article className="rounded-[12px] border border-zinc-100 bg-white/70 p-3">
                <h3 className="text-[13px] font-semibold text-zinc-700">AI Provider</h3>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    className="command-input w-[180px]"
                    value={defaultProvider}
                    onChange={(event) => {
                      const value = event.target.value as Provider;
                      setDefaultProvider(value);
                      setAppSetting("ai_provider", value).catch(() => undefined);
                    }}
                  >
                    <option value="claude">Claude</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Gemini</option>
                  </select>
                  <select
                    className="command-input w-[220px]"
                    value={model.gemini}
                    onChange={(event) => {
                      const value = event.target.value;
                      setModel((prev) => ({ ...prev, gemini: value }));
                      setAppSetting("gemini_model", value).catch(() => undefined);
                    }}
                  >
                    {models.gemini.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </article>

              <article className="rounded-[12px] border border-zinc-100 bg-white/70 p-3">
                <h3 className="mb-3 text-[13px] font-semibold text-zinc-700">密钥管理（本地设置）</h3>
                <div className="space-y-2">
                  <SecretInput secretKey="gemini_api_key" label="Gemini API Key" />
                  <SecretInput secretKey="openai_api_key" label="OpenAI API Key（备用）" />
                </div>
              </article>
            </div>
          ) : null}

          {nav === "feishu" ? (
            <div className="space-y-3">
              <article className="rounded-[12px] border border-zinc-100 bg-white/70 p-3">
                <h3 className="mb-3 text-[13px] font-semibold text-zinc-700">飞书推送配置（单向）</h3>
                <div className="space-y-2">
                  <SecretInput secretKey="feishu_webhook_url" label="飞书 Webhook URL" />
                </div>
              </article>
              <article className="rounded-[12px] border border-zinc-100 bg-white/70 p-3">
                <div className="flex items-center gap-2">
                  <button
                    className={`switch-track ${togglePush ? "on" : ""}`}
                    onClick={() => {
                      const next = !togglePush;
                      setTogglePush(next);
                      setAppSetting("feishu_enabled", next ? "true" : "false").catch(() => undefined);
                    }}
                  />
                  <span className="text-[12px] text-zinc-700">启用飞书推送</span>
                  <button
                    className="rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700"
                    onClick={() =>
                      sendFeishuTestMessage("Personal Secretary App 测试消息")
                        .then(() => setNoticeText("测试消息已发送。"))
                        .catch((error) => setNoticeText(`发送失败：${String(error)}`))
                    }
                  >
                    测试发送
                  </button>
                </div>
              </article>
            </div>
          ) : null}

          {nav === "exam" ? (
            <article className="rounded-[12px] bg-white/70 p-3 text-[12px]">
              <p>雅思日期：2026-06-05 <span className="text-rose-500">51天后</span></p>
              <input className="command-input mt-1 w-[180px]" defaultValue="7.5" />
              <p className="mt-2">GRE日期：2026-07-19 <span className="text-orange-500">95天后</span></p>
              <input className="command-input mt-1 w-[180px]" defaultValue="325" />
            </article>
          ) : null}

          {nav === "homework" ? (
            <article className="rounded-[12px] bg-white/70 p-3">
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                {["雅思听力", "雅思阅读", "雅思写作", "雅思口语", "GRE数学", "GRE阅读", "GRE填空", "GRE写作"].map((item) => (
                  <label key={item}>
                    {item}
                    <input className="command-input mt-1 w-full" defaultValue="2" />
                  </label>
                ))}
              </div>
            </article>
          ) : null}

          {nav === "storage" ? (
            <div className="space-y-3">
              <article className="rounded-[12px] bg-white/70 p-3 text-[12px] text-zinc-600">
                <p>资料库路径：~/Documents/申请助手/Library</p>
                <p className="mt-1">数据库大小：文件 1.2GB / SQLite 24MB</p>
                <div className="mt-2 flex gap-2">
                  <button className="rounded bg-zinc-100 px-2 py-1">导出备份</button>
                  <button className="rounded bg-rose-50 px-2 py-1 text-rose-600">清除所有数据</button>
                </div>
              </article>
            </div>
          ) : null}
        </motion.main>
      </div>

      {notice ? (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            borderRadius: 10,
            background: "rgba(255,255,255,0.92)",
            border: "0.5px solid rgba(0,0,0,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "8px 12px",
            fontSize: 12,
            color: "#374151",
            zIndex: 1000,
          }}
        >
          {notice}
        </div>
      ) : null}
    </motion.section>
  );
}
