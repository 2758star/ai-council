import { FilePlus2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Textarea } from "@/components/common/textarea";
import { captureWebUrl } from "@/features/integrations/api";
import { createTask } from "@/features/tasks/api";
import { useUiStore } from "@/stores/ui-store";

function inferDate(text: string) {
  const now = new Date();
  if (text.includes("后天")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  }
  if (text.includes("明天")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  return now.toISOString().slice(0, 10);
}

function inferMinutes(text: string) {
  const match = text.match(/(\d+)\s*分钟/);
  if (!match) return 45;
  return Math.max(10, Math.min(240, Number(match[1]) || 45));
}

export function QuickCreateModal() {
  const quickCreateOpen = useUiStore((state) => state.quickCreateOpen);
  const setQuickCreateOpen = useUiStore((state) => state.setQuickCreateOpen);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!quickCreateOpen) return null;

  async function saveQuickTask() {
    const text = `${title}\n${detail}`.trim();
    if (!text) {
      setError("请先输入任务内容。");
      return;
    }
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      setSaving(true);
      setError(null);
      try {
        await captureWebUrl({
          url: urlMatch[0],
          title: title.trim() || null,
          category: "application",
          sourceType: "web_source",
          tagsJson: JSON.stringify(["quick_capture"]),
          createWatcher: /(监控|watch|更新提醒)/i.test(text),
          presetType: /(admission|apply|requirement|deadline|scholarship|fees|news)/i.test(text) ? "admissions_page" : "custom",
          watchType: "full_page_text",
          checkFrequency: /(daily|每天|每日)/i.test(text) ? "daily" : "weekly",
          saveAsClipping: false,
          clippingHtml: false,
        });
        setMessage("已识别 URL：网页已加入监控/收藏列表（申请场景）。");
        setTitle("");
        setDetail("");
        setTimeout(() => setQuickCreateOpen(false), 450);
      } catch (reason) {
        setError(String(reason));
      } finally {
        setSaving(false);
      }
      return;
    }
    setSaving(true);
    setError(null);
    const scheduledDate = inferDate(text);
    const estimatedMinutes = inferMinutes(text);
    const priority = /(ddl|截止|紧急|马上|立刻)/i.test(text) ? "高" : "中";
    const taskType = /文书|申请|sop|ps|推荐信|面试/i.test(text) ? "申请" : "通用";
    try {
      await createTask({
        title: title.trim() || text.slice(0, 40),
        description: detail.trim() || null,
        sourceType: "quick_create",
        sourceId: null,
        taskType,
        priority,
        status: "未开始",
        estimatedMinutes,
        scheduledDate,
        reminderAt: null,
        deadline: scheduledDate,
        parentTaskId: null,
      });
      setMessage("已创建任务。");
      setTitle("");
      setDetail("");
      setTimeout(() => setQuickCreateOpen(false), 450);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-[32px] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary/80">
              Quick Create
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold">快速创建入口</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              快速新增任务或申请相关网页监控。复杂字段后续在对应模块补齐。
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setQuickCreateOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {message ? (
          <div className="mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-3 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <div className="mt-6 space-y-4">
          <Input
            placeholder="例如：明天提交 Imperial PS v2 / 贴一个官网链接并写“监控更新”"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea placeholder="补充说明（可选）" value={detail} onChange={(e) => setDetail(e.target.value)} />
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-medium text-white/80">
            <FilePlus2 className="h-4 w-4" />
            Quick add pipeline active
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setQuickCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={() => saveQuickTask().catch((reason) => setError(String(reason)))} disabled={saving}>
              {saving ? "保存中..." : "创建任务"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
