# Stitch Baseline Map (Execution OS)

This document is the implementation contract for the current UI refactor.

## 1) Master Visual Baseline (唯一主视觉)

Use only these as visual master:

- `tasks_schedule_default_state`
- `tasks_schedule_selected_date`
- `tasks_schedule_quick_add_state`
- `tasks_schedule_busy_month`
- `tasks_schedule_heavy_workload`
- `tasks_schedule_task_scheduled`

Shared language extracted:

- Light-first neutral canvas, soft panel stack, restrained blue-violet accent
- Stable desktop shell (`Sidebar + TopBar + Main + RightRail`)
- Rounded panel system with compact status tags and concise task cards
- Calendar density-first visualization (not text-heavy wall)

## 2) Secondary Structural References (仅借结构)

- `tasks_schedule_vertical_week_view`
- `today_tasks_unified_light`
- `ai_assistant_light_workspace`

Allowed usage:

- Week mode composition
- Today hierarchy and action density
- AI workspace zoning

## 3) IA-only References (禁止借视觉)

- `schedule_light`
- `planning_workload_light_enhanced_utility`
- `today_tasks_no_accent_bars`

Only keep information grouping ideas when needed.

## 4) Current Codebase Conflict Audit

### A. Shell conflicts

- Right rail width was not constrained to viewport-driven budget.
- App shell still rendered a narrow icon strip that duplicated rail semantics.
- Sidebar bottom area lacked fixed quick-entry control.

### B. Interaction conflicts

- Some complex actions still expanded directly in main canvas.
- Top bar action semantics were not fully aligned to fixed desktop controls.

### C. Consistency risks

- Mixed card/rail composition patterns across pages.
- 일부 pages still relied on legacy visual primitives.

## 5) Mandatory Decisions Applied

- Shell budget fixed:
  - TopBar `64px`
  - Sidebar `224px@1280`, `240px@1440+`
  - RightRail `336px@1280`, `360px@1440+`
- Root layout remains `h-screen w-screen overflow-hidden`
- Page shell controls right rail visibility from global UI store
- Quick add remains globally reachable from stable nav/footer zones

## 6) Next Migration Order

1. Finish Tasks & Schedule as mother page
2. Dashboard alignment to Now/Next/Risk/Reference
3. Focus and AI page normalization into same shell/component language
4. Application / Library / Settings second-layer editor enforcement

## 7) Progress Log (2026-04-11)

- Unified shell is now live (`Sidebar + TopBar + Main + RightRail`) and legacy mini icon rail has been removed.
- `SideEditor` is established as shared second-layer editor and already used by:
  - Tasks quick add/edit flow
  - Applications project/requirement heavy edits
  - Library batch tag/link operations
- Dashboard has incentive strip and tighter first-screen hierarchy.
- Focus page has been rebuilt as single-focus execution cockpit.
- AI page now includes an in-app conversation region (instead of summary-only placeholder).
- Settings page has been split into sectioned sub-modes to avoid long-form stacking:
  - Feishu: `config / command / webhook / briefing / logs`
  - Web Monitor: `overview / capture / watchers / changes`
  - Notifications: `overview / filters / list`
- Explicit `overflow-auto/scroll` usage was removed from current source to keep no-scroll layout policy enforceable.
- Applications page now moves document-version creation into `SideEditor` (main panel no longer hosts long form inputs).
- Applications list/school sections now use fixed summary blocks (no pseudo-scroll container dependency).
- Tasks Today view now has explicit empty states for `Should do` / `Later` and stable keyed timeline rows.
- Settings page default visible item density is reduced (watchers/changes/notifications), keeping first-screen decision clarity.
- AI Assistant now keeps only recent conversation on main surface; full transcript is moved into a secondary `SideEditor`.
- Dashboard first-screen density was tightened (Today/Next/Risk item caps + row height budget) for 1280x800 stability.
- Library now supports segmented browse modes (`Inbox / 搜索 / 结果`) and segmented detail modes (`信息 / 预览 / 关联`) to avoid single-screen stacking.
- Habits now uses segmented views (`Today / Manage / Logs`) to reduce same-screen decision density.
- Mistakes now uses segmented views (`快速记录 / 复习列表`) to separate capture and review contexts.
- Journal now uses segmented views (`Capture / Planning / Review`) so writing, planning, and history are no longer stacked at once.
- Settings now defaults to compact operation in heavy panels:
  - Web changes section uses `展开/收起高级操作`
  - Notifications filter section uses `展开/收起高级筛选`
  - first-screen remains focused on overview and key actions.
- Copy consistency pass completed for core pages:
  - Tasks / Dashboard / AI major labels, CTA text, and empty states now follow unified Chinese-first wording
  - Right-rail cards use consistent low-noise operational phrasing
  - `Quick Add` and task detail actions are now terminology-aligned with the rest of the system
- Extended copy consistency pass:
  - Focus / Habits / Journal / Mistakes / Math Notebook / Settings / Applications / Library page headers and key CTA labels aligned to Chinese-first display
  - Removed several remaining mixed-language primary tab/button labels that were causing visual rhythm breaks during scan
- Interaction closure enhancement (P0):
  - Notifications: idempotent action feedback + actionable receipt history + direct open-related routing
  - Web changes: unified action set (`打开原网页 / 转任务 / 标记已处理 / 稍后处理`) + batch result summary
  - AI drafts: apply-before-confirm with lightweight diff preview and standardized post-apply receipt
  - Manual E2E script added: `docs/e2e-closure-checklist-v0.2.2.md`
- Build status: `npm run build` passes after these changes.
