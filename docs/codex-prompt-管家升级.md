# 给 Codex 的指令：AI Council 方案升级

## 背景

AI Council 目前已经开发到 Phase 2 的第 5-6 步（Session 层，数据重构还没做）。现在整体方案有一个重大升级：**引入 DeepSeek API 作为"管家"角色**，负责所有流程控制。

这不是推翻之前的开发，而是在现有基础上加一层"大脑"。之前做好的网页自动化、@mention、线程健康度等全部保留。

## 核心变更：加入管家系统

### 什么是管家

管家 = 一个后台模块，通过 DeepSeek API 调用，承担以下职责：

1. **转述编排** — 用户说话后，管家生成实际要发给各模型的内容（不是用户原文直接转发）
2. **上下文压缩** — 每条模型回复到达后，管家压缩成 2-3 句摘要，下一轮只发摘要不发原文
3. **防吵架检测** — 检测模型回复是否在无意义争论，标注并在下轮过滤
4. **额度管理** — 追踪各模型的使用量，预警额度不足，建议分配策略
5. **讨论质量概览** — 每轮结束给用户 2 句话总结：有没有进展、建议下一步

### 管家的技术实现

- 每项职责 = 一次独立的 DeepSeek API 调用
- 每次调用有固定的 system prompt 和输出 JSON schema
- 所有调用走 `https://api.deepseek.com/v1`，model 用 `deepseek-chat`
- API key 从本地配置文件读取

### 管家在消息流中的位置

```
用户说话
  ↓
管家：根据用户指令 + 当前 transcript + 额度状态，生成各成员的消息（转述编排）
  ↓
管家：检查额度，决定本轮发给哪些成员（额度管理）
  ↓
系统：通过网页自动化发送
  ↓
等待回复
  ↓
回复到达
  ↓
管家：压缩回复为摘要（上下文压缩）
管家：检测是否在吵架（防吵架）
  ↓
管家：生成本轮讨论概览（讨论质量）
  ↓
展示给用户，等用户下一步指令
```

## 新增模块清单

以下模块需要新建：

### 模块 1：管家服务（steward.ts 或 steward/）

```typescript
// 核心接口
interface StewardService {
  // 转述编排：用户说话后，生成各成员的消息
  composeMessages(input: {
    topic: string;
    userMessage: string;
    currentRound: number;
    members: string[];
    latestReplies: Record<string, string>;  // 成员名 → 上轮摘要
    quotaStatus: Record<string, QuotaInfo>;
  }): Promise<{
    messages: Record<string, string>;  // 成员名 → 要发的内容
    skip: string[];                    // 本轮跳过的成员
  }>;

  // 上下文压缩：模型回复 → 摘要
  compressReply(input: {
    provider: string;
    fullReply: string;
    topic: string;
  }): Promise<string>;  // 返回 2-3 句摘要

  // 防吵架检测
  detectArguing(input: {
    provider: string;
    reply: string;
    previousReplies: Record<string, string>;
  }): Promise<{
    isArguing: boolean;
    reason: string;
    suggestion: string;
  }>;

  // 额度预警
  evaluateQuota(input: {
    quotaTrackers: Record<string, QuotaTracker>;
    estimatedRoundsLeft: number;
  }): Promise<{
    warnings: string[];
    recommendedOrder: string[];
    suggestion: string;
  }>;

  // 讨论质量概览
  summarizeRound(input: {
    topic: string;
    roundNumber: number;
    replies: Record<string, string>;
    userFeedback?: string;
  }): Promise<string>;  // 返回 2 句话概览
}
```

每个方法内部 = 一次 fetch 到 DeepSeek API，system prompt 固定写死在代码里。

### 模块 2：额度管理器（quota-manager.ts）

```typescript
interface QuotaTracker {
  provider: string;
  messagesSentToday: number;
  messagesSentThisWindow: number;
  resetIntervalHours: number;
  lastResetTime: string;
  nextEstimatedReset: string;
  estimatedLimitPerWindow: number;
  consecutiveFailures: number;
  lastFailureReason: string;
  status: 'healthy' | 'warning' | 'rate_limited' | 'error';
  dailyHistory: { date: string; totalSent: number; failures: number }[];
}

// 默认配置
const DEFAULT_QUOTAS = {
  Claude: { resetIntervalHours: 4, estimatedLimitPerWindow: 40 },
  ChatGPT: { resetIntervalHours: 3, estimatedLimitPerWindow: 40 },
  Gemini: { resetIntervalHours: 24, estimatedLimitPerWindow: 50 },
};
```

功能：
- 每次发送成功/失败时更新计数
- 定时检查是否到了重置时间
- 用量超过 80% 时标记 warning
- 连续失败 2 次标记 rate_limited
- 提供 UI 用的实时数据
- 用户可手动调整上限和重置间隔

### 模块 3：额度 UI 组件

在现有成员条旁边加额度进度条：
- 绿色：正常（< 80%）
- 黄色：警告（80-100%）
- 红色：限流
- 显示：已用/上限 + 预计重置时间
- 底部 composer 上方：额度预警提示条

## 对现有开发计划的调整

原计划不变，但插入管家相关内容：

### Phase 2（当前阶段）补充

在做 Session 数据重构（第 6 步）的同时，加入：

- **6.5 管家服务** — 实现 steward 的 5 个 API 调用方法
- **6.6 额度管理器** — 本地计数 + 规则推断
- **6.7 消息编排集成** — 用户发消息后，先过管家再发给模型（替换现在的直接转发）

### Phase 2 第 7-8 步调整

Artifacts 和产物生成保持不变。

### Phase 2 第 9 步：主持人模式

原计划的"主持人模式"现在由管家承担。不需要单独指定一个模型当主持人，管家通过 DeepSeek API 就能做到：
- 判断下一轮该问谁什么
- 判断讨论是否应该收尾
- 判断某成员是否在浪费额度

## 新增的铁律（写入系统所有相关模块）

1. **一轮一停** — 所有成员回复完毕后，必须等用户说话才能进入下一轮。绝不自动继续。
2. **800 字上限** — 发给每个模型的内容不超过 800 字。管家负责压缩。
3. **主题锚定** — 每条发给模型的消息必须以【讨论主题】开头。
4. **禁止引导争论** — 管家的转述消息中不得包含引导模型互相反驳的语言。
5. **额度优先** — 如果某成员额度紧张，管家有权建议跳过该成员。用户可覆盖。

## 开发顺序建议

```
现在立刻做：
  1. 管家服务骨架（steward.ts），先实现转述编排和上下文压缩
  2. 在现有发送流程中接入管家（用户消息 → 管家编排 → 发送）
  3. 额度计数器（每次发送后 +1，失败后标记）

接着做：
  4. 额度 UI（成员条上的进度条）
  5. 防吵架检测
  6. 讨论质量概览

然后回到原计划：
  7. Session 数据重构（第 6 步）
  8. Artifacts（第 7-8 步）
  9. 继续 Phase 3
```

## DeepSeek API 调用示例

```typescript
async function callDeepSeek(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,  // 从本地配置读取
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,  // 管家需要稳定输出，不要太发散
      max_tokens: 1000,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

// 需要 JSON 输出时，在 system prompt 末尾加 "只输出 JSON，不要任何其他内容"
// 然后 JSON.parse(result)
```

## 注意事项

- 管家的所有 system prompt 写死在代码里，不需要用户配置
- 每个 API 调用独立 try-catch，某个环节失败不影响其他环节
- 如果 DeepSeek API 完全挂了，降级为"直接转发用户原文"（不经过管家编排）
- 额度数据存 IndexedDB（如果已迁移）或 localStorage（如果还没迁移）
- 管家调用本身也有成本，但 DeepSeek 很便宜，正常使用每天几毛钱

## 参考

详细的产品方案见附件：
- `ai-council-本地版方案.md` — 完整的产品设计
- `ai-council-云服务器方案.md` — 开发环境搭建
