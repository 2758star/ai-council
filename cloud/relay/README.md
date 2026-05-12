# Unified LLM Relay

This relay now exposes a small multi-provider API layer for `OpenAI`, `Anthropic`, and `Gemini`.

## Endpoints

- `GET /api/llm/providers`
- `POST /api/llm/chat`
- `POST /api/llm/chat/stream`
- `POST /api/llm/fanout`
- `POST /api/llm/roundtable`
- `POST /api/llm/roundtable/stream`

## Request Shape

```json
{
  "provider": "openai",
  "model": "gpt-5",
  "system": "You are a careful reviewer.",
  "messages": [
    { "role": "user", "content": "Give me three options." }
  ],
  "temperature": 0.3,
  "maxTokens": 800
}
```

`/api/llm/fanout` accepts a shared request body plus:

```json
{
  "providers": [
    { "provider": "openai", "model": "gpt-5" },
    { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
    { "provider": "gemini", "model": "gemini-2.5-flash" }
  ],
  "messages": [
    { "role": "user", "content": "Discuss this product direction." }
  ]
}
```

`/api/llm/roundtable` is the orchestration endpoint for multi-model discussion:

```json
{
  "topic": "讨论一个 AI 群聊产品应该先做网页版还是桌面版",
  "rounds": 2,
  "providers": [
    { "provider": "openai", "label": "GPT", "model": "gpt-5" },
    { "provider": "anthropic", "label": "Claude", "model": "claude-sonnet-4-20250514" },
    { "provider": "gemini", "label": "Gemini", "model": "gemini-2.5-flash" }
  ],
  "summaryProvider": { "provider": "openai", "model": "gpt-5" },
  "messages": [
    { "role": "user", "content": "目标用户是想低成本同时参考多个模型的人。" }
  ]
}
```

It returns:

- full transcript
- per-round grouped responses
- optional summary / recommendation

`/api/llm/roundtable/stream` returns SSE events for live UI playback:

- `session`
- `round_start`
- `speaker_start`
- `speaker_meta`
- `speaker_delta`
- `speaker_done`
- `speaker_error`
- `round_done`
- `summary_start`
- `summary_done`
- `summary_error`
- `complete`

## Stream Shape

`/api/llm/chat/stream` returns normalized SSE events:

- `meta`
- `delta`
- `done`
- `error`

## Env

Copy `.env.example` and fill whichever providers you want:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Each provider also supports `*_MODEL` and `*_BASE_URL` overrides.

## Add More Providers

Use `LLM_EXTRA_PROVIDERS_JSON` for providers such as `DeepSeek`, `GLM`, `Kimi`, or other OpenAI-compatible services.

Example:

```json
[
  {
    "id": "deepseek",
    "family": "openai_compatible",
    "apiKeyEnv": "DEEPSEEK_API_KEY",
    "baseUrl": "https://api.deepseek.com",
    "model": "deepseek-chat"
  },
  {
    "id": "glm",
    "family": "openai_compatible",
    "apiKeyEnv": "GLM_API_KEY",
    "baseUrl": "https://open.bigmodel.cn/api/paas/v4",
    "path": "/chat/completions",
    "model": "glm-4.5"
  },
  {
    "id": "kimi",
    "family": "openai_compatible",
    "apiKeyEnv": "KIMI_API_KEY",
    "baseUrl": "https://api.moonshot.cn/v1",
    "path": "/chat/completions",
    "model": "moonshot-v1-8k"
  }
]
```
