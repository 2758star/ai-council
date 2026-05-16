// 上下文压缩管理
// 策略：滑动窗口 + 渐进压缩（最省 token）
//
// 结构：
// - 完整层：最近 3 轮原文保留
// - 摘要层：3-10 轮前 → DeepSeek 压缩为 200 字
// - 骨架层：10 轮以前 → 合并为 1 段核心结论
//
// 发给各模型的 prompt 固定结构：
// 【背景总纲】骨架层（约 100 字）
// 【前情摘要】摘要层（约 200 字）
// 【最近讨论】完整层最近 3 轮
// 【本轮任务】当前 prompt

export interface MemoryItem {
  id: string;
  type: 'raw' | 'summary' | 'skeleton';
  content: string;
  round: number;
  provider?: string;
  createdAt: number;
}

export interface ContextPackage {
  skeleton: string;
  summary: string;
  recentRounds: string;
}

export class ContextManager {
  private items: MemoryItem[] = [];
  private maxRawRounds = 3;
  private maxSummaryItems = 7;

  addRound(round: number, messages: Record<string, string>) {
    Object.entries(messages).forEach(([provider, content]) => {
      this.items.push({
        id: `${round}-${provider}`,
        type: 'raw',
        content,
        round,
        provider,
        createdAt: Date.now(),
      });
    });
    this.compress();
  }

  private compress() {
    const rawItems = this.items.filter(i => i.type === 'raw');
    const rounds = [...new Set(rawItems.map(i => i.round))].sort((a, b) => b - a);

    if (rounds.length > this.maxRawRounds) {
      const oldRounds = rounds.slice(this.maxRawRounds);
      oldRounds.forEach(round => {
        const items = this.items.filter(i => i.type === 'raw' && i.round === round);
        items.forEach(i => { i.type = 'summary'; });
      });
    }
  }

  getRecentRounds(n = 3): string {
    const rawItems = this.items.filter(i => i.type === 'raw');
    const rounds = [...new Set(rawItems.map(i => i.round))].sort((a, b) => b - a).slice(0, n);
    return rounds.reverse().map(round => {
      const msgs = rawItems.filter(i => i.round === round);
      return `第${round}轮：\n` + msgs.map(m => `【${m.provider}】${m.content}`).join('\n');
    }).join('\n\n');
  }

  getSummaryText(): string {
    return this.items
      .filter(i => i.type === 'summary')
      .map(i => i.content)
      .join(' ');
  }

  getSkeletonText(): string {
    return this.items
      .filter(i => i.type === 'skeleton')
      .map(i => i.content)
      .join(' ');
  }

  buildContextPackage(): ContextPackage {
    return {
      skeleton: this.getSkeletonText(),
      summary: this.getSummaryText(),
      recentRounds: this.getRecentRounds(3),
    };
  }

  // 由外部（steward）调用，将 DeepSeek 生成的摘要存入
  addStewardSummary(round: number, summaryText: string) {
    this.items = this.items.filter(i => !(i.type === 'summary' && i.round === round));
    this.items.push({
      id: `summary-${round}`,
      type: 'summary',
      content: summaryText,
      round,
      createdAt: Date.now(),
    });
  }

  clear() {
    this.items = [];
  }
}
