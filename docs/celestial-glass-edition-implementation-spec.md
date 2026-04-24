# Personal Secretary UI Design Standards (Celestial Glass Edition)

Last updated: 2026-04-10  
Scope: React 18 + Tailwind + Framer Motion desktop app  
Constraint: UI re-architecture only, no feature/function regression

## 1. Creative North Star

- Product feeling: quiet instrument panel, not cheerful coach.
- User archetype: logic-first, autonomy-seeking, low-noise, boundary-sensitive, novelty-seeking but scatter-prone.
- Design intent: deep-space glass interface with explainable planning logic.

## 2. Non-Negotiable Product Rules

1. Dashboard is read-only command center, not CRUD workspace.
2. Today is the execution hub.
3. Chat/AI is secondary UI, not homepage.
4. Replanning must be conservative, visible, reversible.
5. AI defaults to draft-write only.
6. Every generated schedule item must expose:
   - `title`
   - `estimated_minutes`
   - `priority`
   - `output_requirement`
   - `carryover_policy`
   - `constraint_source`
   - `replan_rank`
   - `why_this_block_exists`
7. `Why this plan?` is first-class card, never hidden deep in settings.
8. Progressive disclosure:
   - Small default surface
   - Advanced behind expand/collapse
   - Novice path obvious
9. Expert operations may exist, but this branch should **not** add shortcut-driven UX by default.
10. Must always provide control affordances:
   - Back
   - Cancel
   - Undo
   - Accept/supersede versions
   - Visible diff before commit (where applicable)
11. Notification copy is factual, not emotional/guilt-based.
12. Daily check-in order: completion -> actual minutes -> blockers -> energy (emotion optional).
13. Include Curiosity Inbox / Idea Parking Lot pattern to capture tangents without derailing Today.
14. No mascot, no confetti, no noisy gamification.
15. Analytics emphasizes evidence:
   - Completion rate
   - Carryover debt
   - Output counts
   - Weak-module trend
   - Plan adherence

## 3. Visual Language (Deep Space Glassmorphism)

### 3.1 Color Tokens

- Background: `#0A0E17`
- Primary (GRE): `#B6A0FF`
- Secondary (interaction): `#00E3FD`
- Tertiary (IELTS/success): `#B5FFC2`
- Text on surface: `#EBEDFB` (never pure white)

### 3.2 Glass Rules

- Floating container base: `rgba(255,255,255,0.03)`
- Blur: `backdrop-blur-2xl` to `backdrop-blur-3xl` (~40px+)
- Grain/noise overlay: monochrome static at low opacity
- Status differentiation via glow/inner-glow, not solid color bars

### 3.3 No-Line / No-Hard-Divider Rule

- Do not use harsh sectioning dividers to structure major regions.
- Separation should come from layer shifts, blur depth, spacing rhythm, and glow.

### 3.4 Typography

- Primary typeface: `Manrope` only.
- Labels: all-caps feel via spacing and weight, not loud color.
- Strong hierarchy via size/weight/spacing, not saturation spikes.

## 4. Spatial Architecture

- Global shell: `100vh` (`h-dvh`) and `overflow-hidden` at app level.
- No full-page long scrolling dashboard/admin patterns.
- Use Bento segmentation and scoped scroll regions (`ScrollRegion`) inside cards.
- Deep navigation should prefer Miller Columns / horizontal expansion over deep nested list walls.

## 5. Motion & Feedback

- Motion should be minimal and meaningful.
- Hover: subtle lift/scale (`~1.02`) + glow increase.
- Replace `alert()` style feedback with glass Toast flow.
- Avoid decorative animation loops that increase cognitive load.

## 6. Component Standards

### 6.1 Task Cards

- Forbidden: thick/solid status side stripe.
- Required: soft glow edge by task track/type.
- Copy style:
  - concise
  - evidence-based
  - explanation-first
  - no cheerleading

### 6.2 Today Layout

- Left: timeline with 13:00 folding logic
- Middle: fixed classes/commute/watch-night/constraint chips
- Right: rule summary + carryover recommendation + `Why this plan?`
- Right-side advanced details must be progressive disclosure (expand/collapse).

### 6.3 Planner

- Weekly pressure grid with explicit pressure signaling and constraint markers.
- Show carryover and fixed constraints in the same decision surface.

### 6.4 Applications

- Horizontal Kanban shell, no vertical wall-only admin board feel.
- Click card -> detail/context view; preserve existing data actions.

### 6.5 Library

- Miller Columns shell:
  - Column 1: category
  - Column 2: files
  - Column 3: focus detail
- Keep ingest/import and detail actions unchanged.

## 7. Behavior & Safety Constraints (Engineering)

- Do not remove existing API calls, mutation handlers, or state transitions.
- Prefer additive container-layer refactor over destructive rewrite.
- Existing routes and feature paths must remain available.
- Keep existing CRUD logic; only move/surface it differently in UI.
- Any interaction flow change must preserve reversibility and visibility.

## 8. Page Standardization Status

Implemented with Celestial shell overlays:

- `dashboard`
- `tasks` (Today + Planner + Calendar shell layers)
- `applications`
- `library`

Pending same-level beautification:

- `mistakes`
- `math-notebook`
- `habits`
- `journal`
- `ai`
- `settings`
- `focus` (exists in codebase; currently not in primary nav list)

## 9. Branch Migration Pack (What to Carry)

If applying these standards to another branch, prioritize these files:

- `/Users/hujunbo/Documents/Playground/src/index.css`
- `/Users/hujunbo/Documents/Playground/src/app/layout/app-shell.tsx`
- `/Users/hujunbo/Documents/Playground/src/components/common/button.tsx`
- `/Users/hujunbo/Documents/Playground/src/components/cards/list-card.tsx`
- `/Users/hujunbo/Documents/Playground/src/components/layout/page-header.tsx`
- `/Users/hujunbo/Documents/Playground/src/components/modals/quick-create-modal.tsx`
- `/Users/hujunbo/Documents/Playground/src/components/celestial/celestial-containers.tsx`
- `/Users/hujunbo/Documents/Playground/src/pages/dashboard/page.tsx`
- `/Users/hujunbo/Documents/Playground/src/pages/tasks/page.tsx`
- `/Users/hujunbo/Documents/Playground/src/pages/applications/page.tsx`
- `/Users/hujunbo/Documents/Playground/src/pages/library/page.tsx`

## 10. Definition of Done (UI-Only Refactor)

A page is considered compliant only if all are true:

1. No feature regression (all prior actions still work).
2. No full-page overflow scroll regressions.
3. Glass layering + deep-space environment is present.
4. `Why this plan?` is visible in top decision surfaces where planning exists.
5. Default screen density is low-noise; advanced controls are collapsible.
6. Build passes (`npm run build`) with no type errors.
7. Interaction text remains factual and non-emotional.

## 11. Copywriting Rules

Use:

- “Moved GRE Reading to 14:00 because this is the highest-energy window and no commute conflict exists.”
- “2 carryovers detected. Recommend split carryover, not full rollover.”

Avoid:

- “You can do it!! Let’s crush today!!!”
- “I moved everything for you :)”

---

This document is the branch-transfer source of truth for Celestial Glass implementation.
