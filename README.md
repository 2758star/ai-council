# Personal Secretary App

Personal Secretary App is a local-first desktop software project for graduate application management, language-exam planning, local file organization, focus sessions, and future AI assistant workflows.

This repository now contains the new stage `0-1` Tauri skeleton and preserves the old Streamlit prototype under [`legacy/`](./legacy).

## Stage 0-1 Includes

- Tauri 2 desktop app scaffold
- React + TypeScript + Vite front-end
- Tailwind CSS design tokens
- shadcn-compatible component config
- Zustand UI and filter stores
- Drizzle SQLite schema blueprint
- Chinese-first navigation and page skeletons
- Light and dark themes with a restrained Memphis-inspired visual system

## Documentation

- Chinese user manual: [`docs/user-manual-zh-CN.md`](./docs/user-manual-zh-CN.md)
- Cloud relay quickstart: [`docs/cloud-deploy-quickstart.md`](./docs/cloud-deploy-quickstart.md)
- Conversation archive / build log: [`docs/conversation-archive-2026-04-01.md`](./docs/conversation-archive-2026-04-01.md)
- Current release readiness checklist: [`docs/release-readiness-v0.2.1.md`](./docs/release-readiness-v0.2.1.md)

## Quick Self-Check

Before running a new local build, use:

```bash
npm run selfcheck
```

This runs:

- TypeScript check
- Rust backend check
- Frontend production build

## Web Capture & Watch Engine

The app now includes a local-first **Web Capture & Watch Engine**.

Main capabilities:

- Capture URL -> save title/content snapshot
- Turn captured page into watcher (full page / selector / title / metadata)
- Watch frequencies: `manual` / `daily` / `every_6h` / `weekly`
- Diff logs with rule-based change labels
- Optional AI summary (Gemini configured)
- Notification center integration
- One-click convert change -> task
- Save clipping -> note or library file

Core DB tables:

- `web_sources`
- `web_watchers`
- `web_change_logs`
- `web_clippings`
- `web_presets`

## Preset Packs

### School Admissions Watch Preset Pack

Built-in templates include:

- Programme / Official Page
- Admissions / Apply Page
- Deadline / Requirement Page
- Scholarship / Fees Page
- News / Announcement Page
- Custom School Page

Project integration:

- Project detail page now has **Official Watchers** tab
- Generate School Watchers wizard (auto-fill URL, editable)
- Missing URL detection (`需补链`) behavior via partial creation + status summary
- Recent project web changes + open source page + create task

### Study Resource Tracking Pack

Built-in templates include:

- Study Resource Page
- Course Announcement Page
- Exam Info Page
- Blog / Article Tracking
- Documentation Page
- Custom Learning Page

Library integration:

- Quick capture URL in Library summary panel
- Save captured web content into local library as markdown
- Optional watcher creation for ongoing update tracking
- Journal summary includes “today learning resource update” suggestion

## AI Workspace (Stage 1-3)

The AI page now includes three local-first work modes:

1. `AI 控制台`
- Provider switch + API settings
- Daily digest generation
- Token/cost/latency logs

2. `学习分析日志`
- Save structured daily study analysis records
- Fields include exam/subject/material/performance/weak module/key errors
- One-click generate weekly growth review (rule engine + optional Gemini polish)

3. `计划草案队列`
- Generate tomorrow draft plan
- Generate next-week focus draft
- Review draft items before commit
- Apply draft -> create real tasks (Draft-Write => user-confirm commit)

New DB tables:

- `study_analysis_logs`
- `weekly_growth_reviews`
- `plan_drafts`
- `plan_draft_items`

Internal orchestrator scaffolding (`src/ai/`):

- `orchestrator/ai-orchestrator.ts`
- `providers/provider-adapter.ts`
- `providers/gemini-provider.ts`
- `providers/openai-provider.ts` (placeholder)
- `tools/tool-registry.ts`
- `policies/write-policy.ts`
- `schemas/structured-output.ts`

Permission mode:

- `read-only`: read tools only
- `draft-write`: read + draft tools (default)
- `commit-write`: commit tools require explicit confirmation

Current UI support:

- AI Console can switch orchestrator mode (`read-only` / `draft-write` / `commit-write`)
- Commit execution requires explicit checkbox confirmation
- Tool call trace is visible after each run
- Tool trace panel groups by `read / draft / commit` and surfaces blocked reason codes
- Screenshot analysis save target:
  - Study Analysis Log
  - Journal Note
  - Plan Draft

## Step 8: Mode Switch + Pomodoro Downgrade

Implemented:

- Workspace mode switch: `申请模式 / 备考模式 / 日常模式`
- Entry points:
  - top header quick switch
  - settings tab: `工作模式`
- Mode impacts:
  - Dashboard main stat cards and quick actions
  - default task section/filter behavior
  - Web Monitor default category via global defaults
- Pomodoro downgrade:
  - removed from primary left navigation
  - kept full Focus page as secondary entry
  - added lightweight timer inside `日记与灵感` page for daily use

Core commands:

- `list_study_analysis_logs`
- `create_study_analysis_log`
- `list_weekly_growth_reviews`
- `generate_weekly_growth_review`
- `list_plan_drafts`
- `list_plan_draft_items`
- `create_plan_draft`
- `update_plan_draft_status`
- `apply_plan_draft`
- `generate_tomorrow_plan_draft`
- `generate_weekly_focus_plan_draft`

## How To Use Web Monitor

### 1) Add Web Source

Go to **设置与集成 -> Web Capture & Watch**:

- Paste URL
- Choose preset/category
- Optional tags
- Click `立即抓取`

### 2) Enable Watch

- Turn on `抓取后自动创建监控`
- Or load saved source and create watcher manually
- Run `执行监控扫描` for immediate check

### 3) Review Changes

- Check `最近变化` list in Settings
- Check `Admissions Updates` card in Dashboard
- Check `Official Watchers` tab in project detail

### 4) Convert to Action

- `一键创建任务` from change log
- `存为笔记` from clipping
- `存入资料库` from clipping

## Local Prerequisites

You need these installed locally before the app can run:

1. Node.js 20+
2. Rust toolchain
3. Tauri prerequisites for macOS

Recommended commands on macOS:

```bash
brew install node
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After Rust is installed, reopen your terminal or run:

```bash
source "$HOME/.cargo/env"
```

## Install

```bash
npm install
```

## Development

Run the web shell:

```bash
npm run dev
```

Run the desktop app:

```bash
npm run tauri:dev
```

## Build

```bash
npm run build
npm run tauri:build
```

## Database Notes

- SQLite lives in the Tauri application data directory.
- The Rust backend creates initial stage tables automatically on startup.
- Drizzle schema lives in [`src/lib/db/schema.ts`](./src/lib/db/schema.ts).

## Directory Overview

```text
src/
  app/
  pages/
  components/
  features/
  stores/
  lib/
src-tauri/
drizzle/
docs/
legacy/
```
