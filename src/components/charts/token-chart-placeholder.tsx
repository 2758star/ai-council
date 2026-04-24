import type { AiLogRecord } from "@/features/ai/types";

type TokenChartProps = {
  logs?: AiLogRecord[];
  title?: string;
};

export function TokenChartPlaceholder({ logs = [], title = "Token 使用看板" }: TokenChartProps) {
  const recent = logs.slice(0, 7).reverse();
  const totals = recent.map((item) => item.inputTokens + item.outputTokens);
  const max = totals.length > 0 ? Math.max(...totals, 1) : 1;
  const sumInput = logs.reduce((acc, item) => acc + item.inputTokens, 0);
  const sumOutput = logs.reduce((acc, item) => acc + item.outputTokens, 0);
  const sumCost = logs.reduce((acc, item) => acc + item.estimatedCost, 0);

  return (
    <div className="panel-soft rounded-[24px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="mt-1 break-words font-display text-xl font-bold">
            {logs.length === 0 ? "暂无 AI 调用记录" : `最近 ${Math.min(7, logs.length)} 次调用`}
          </h3>
        </div>
        <span className="rounded-full border border-border/70 bg-muted/70 px-3 py-1 text-xs font-semibold text-foreground">
          实时
        </span>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2">
        {(recent.length > 0 ? recent : Array.from({ length: 7 }).map((_, idx) => ({ id: idx, inputTokens: 0, outputTokens: 0 }))).map((item, idx) => {
          const total = "id" in item ? item.inputTokens + item.outputTokens : 0;
          const height = Math.max(8, Math.round((total / max) * 100));
          return (
            <div key={"id" in item ? item.id : idx} className="flex h-28 items-end">
              <div
                className="w-full rounded-t-2xl bg-gradient-to-t from-foreground via-primary to-secondary"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        输入 {sumInput} tokens · 输出 {sumOutput} tokens · 估算成本 ${sumCost.toFixed(4)}
      </p>
    </div>
  );
}
