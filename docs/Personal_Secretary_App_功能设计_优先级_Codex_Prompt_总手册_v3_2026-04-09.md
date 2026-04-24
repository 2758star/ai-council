# Personal Secretary App  
功能设计、优先级与 Codex Prompt 总手册（更新版）

版本：`v0.3.2`  
更新日期：`2026-04-11`  
基线文档：`v2（2026-04-05）`

## 1. 本次更新说明
本版是基于当前仓库实际实现状态生成的“开发进度版手册”，用于替代 v2 的“计划主导视角”。  
重点变化：
- 把“计划项”升级为“已实现 / 部分实现 / 未开始”的工程视角。
- 明确已落地的数据表与页面入口。
- 标注下一轮开发的关键决策点（需你确认）。

## 2. 关键能力落地状态（截至 2026-04-11）

### A. 已实现（可用）
1. 学习分析闭环（Step 1 主体）
- `study_analysis_logs` 已扩展并兼容迁移（含 module/input_summary/analysis_summary/tomorrow_adjustment/adoption_status/updated_at）。
- `weekly_growth_reviews` 已扩展并兼容迁移（week_range/linked_log_ids_json/weekly_summary 等）。
- AI 页支持：
  - `Screenshot Analysis Entry`（截图分析入库）
  - `Import Analysis`（JSON/半结构化文本导入）
  - Study Analysis Log 写入与回看。

2. 计划版本化（Step 1 主体）
- 新增 `daily_plan_versions`、`daily_plan_items`。
- 支持：
  - 生成每日计划版本草案
  - 接纳版本（accepted）与 superseded 流转
  - 子项完成勾选（落库）。

3. Web Capture & Watch 引擎（Step 3 主体）
- 已有数据层：`web_sources` / `web_watchers` / `web_change_logs` / `web_clippings` / `web_presets`。
- 已有能力：
  - URL 抓取保存
  - watcher 创建/启停/检查
  - 变化日志记录与 processed 状态
  - 从变化一键转任务。

4. 学校/学习预设底座（Step 4/5 的基础）
- `web_presets` 已支持默认分类与 seed 机制。
- Settings、AI、Dashboard 已出现“网页变化 -> 任务/处理”的统一入口。

5. AI 中枢入口（Step 6 部分）
- AI Console 已接入工具化调用界面（Draft-write 优先）。
- Provider 配置位已具备（Gemini/OpenAI 占位 + 本地规则引擎）。

### B. 部分实现（可用但仍需补强）
1. 资料库主动收纳（Step 2）
- 已有：web capture 入库联动、资料关联、预览/标签/批量操作。
- 已增强：`files_fts` 全文检索与自动同步（扫描/入库/标签更新）。
- 待补：拖拽导入 + Library Inbox + ingest_history 的完整产品化闭环。

2. 学校官网预设包（Step 4）
- 已有：监控模型、项目关联、变化转任务闭环。
- 已增强：项目总览监控状态结构化、缺链清单、模板生成回执细化、详情与总览双向同步刷新。
- 待补：项目详情的模板覆盖率提示与更细粒度的地区化预设推荐。

3. 学习资料网页跟踪（Step 5）
- 已有：学习类 preset 与 web_capture 入库路径。
- 已增强：Daily Log 建议区、晨间/晚间简报纳入学习资源更新统计与建议。
- 待补：学习资源更新到周计划自动映射策略（当前仍以手动应用为主）。

4. 通知中心闭环
- 已有：筛选、动作、稍后、去重、转任务。
- 待补：通知端批量动作和跨模块一致性仍可继续精修。

### C. 未开始/低优先
1. 健康数据与 Apple 日历深度联动（按你要求可暂不做）。
2. 云端分布式抓取（当前保持本地优先 + 可选云中继）。

## 3. 你当前系统可直接使用的核心路径
1. 日常执行：`任务页 + 每日计划版本`  
2. 学习复盘：`AI 页 -> Screenshot Analysis / Import Analysis -> Study Analysis Log`  
3. 网页监控：`设置 -> Web Capture & Watch`  
4. 快速动作：`Dashboard / AI 页 / 设置页` 皆可对网页变化执行“转任务/标记已处理”。

## 4. 代码层关键落地点（便于后续追踪）
- 数据迁移与 schema：`/Users/hujunbo/Documents/Playground/src-tauri/src/db.rs`
- Tauri 命令编排：`/Users/hujunbo/Documents/Playground/src-tauri/src/lib.rs`
- AI 页面：`/Users/hujunbo/Documents/Playground/src/pages/ai/page.tsx`
- 设置页（Web/通知/集成）：`/Users/hujunbo/Documents/Playground/src/pages/settings/page.tsx`
- Dashboard 执行台：`/Users/hujunbo/Documents/Playground/src/pages/dashboard/page.tsx`

## 5. 下一阶段建议顺序（v0.3.3）
1. Step 2 收尾：资料库主动收纳完整化（拖拽导入 + Inbox + ingest_history）。
2. Step 5 深化：学习资源更新 -> 周计划自动建议映射（保留手动确认）。
3. Step 6 深化：AI Commit-write 审批链 + 回滚审计。
4. 可选云化：飞书离线补偿与定时扫描常驻化。

## 6. 给 Codex 的续开发总控 Prompt（精简版）
请在不破坏现有功能的前提下继续推进 v0.3.2：
1. 先完成 Library 主动收纳闭环（拖拽导入、Inbox、ingest_history）。
2. 补齐 School/Study 预设向导与 Daily Log 更新提示联动。
3. 强化 AI Draft Queue 的确认与回滚体验。
要求：每步都输出 migration、关键命令、页面入口、测试要点，并保持本地优先可运行。

## 7. 当前风险与注意事项
- 当前仓库仍是大规模未提交状态（`git status` 全量未跟踪），建议尽快建立里程碑提交，避免后续回滚成本。
- 现有 Rust 编译为可通过状态，但有若干 warning（不影响运行，建议后续清理）。

## 8. 结论
相较 v2，系统已从“架构计划”进入“可持续使用阶段”。  
截至 2026-04-11，`P0` 与主要 `P2` 体验收口已完成，当前最优先的是把 `资料收纳 -> 学习分析 -> 计划版本 -> 任务执行 -> 网页变化驱动` 进一步自动化，但仍保持“可解释、可回退、可手动确认”。

补充状态文档：
- `docs/p0-closure-status-v0.2.3.md`
- `docs/p2-closure-status-v0.2.4.md`
