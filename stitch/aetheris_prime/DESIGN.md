# Design System Document: Celestial Glass Edition

## 1. Overview & Creative North Star
**The Creative North Star: "The Astral Observer"**

This design system moves away from rigid, opaque software layouts and embraces the ethereal qualities of deep space. It is rooted in the "Astral Observer" philosophy: an interface that feels like looking through the viewport of a celestial observatory.

To break the template look, we reject solid containers and harsh dividers. Instead, we use full glassmorphism, intentional asymmetry, and light-emitting elements to guide the eye. This is not just a UI; it is an atmospheric environment where information floats in a vacuum of Deep Space Blue, organized by the gravitational pull of Bento Grids and Miller Columns.

---

## 2. Colors
Our palette studies contrast between the infinite void and aurora-like energy.

### Core Palette (Material Design Tokens)
- **Background:** `#0A0E17` (Deep Space Blue)
- **Primary:** `#B6A0FF` (Violet Aurora) for core GRE indicators and primary actions
- **Secondary:** `#00E3FD` (Electric Blue) for navigation and interactive highlights
- **Tertiary:** `#B5FFC2` (Emerald Aurora) for IELTS indicators and success states
- **Surface:** `#0A0E17` base layer for all glass components

### The No-Line Rule
Designers must not use 1px solid borders for sectioning/grouping.
- **Boundaries** come from `backdrop-filter: blur(40px)` and a 5% static noise texture.
- **Separation** comes from `surface-container` level shifts (for example, `surface-container-high` over `surface-container-low`).

### The Glass & Gradient Rule
All floating containers must use:
- **Background:** `rgba(255, 255, 255, 0.03)`
- **Backdrop Blur:** `40px`
- **Texture:** 5% monochromatic static noise overlay
- **Glows:** inner-shadow and drop-shadow using `primary-dim` (violet) or `tertiary-dim` (emerald)

---

## 3. Typography
Use **Manrope** exclusively.

- **Display (lg/md):** for "Moment of Zen" stats and countdown timers, with tight letter spacing `-0.02em`
- **Headlines:** asymmetrical placement is encouraged (for example far-left with generous top padding)
- **Body (lg/md):** use `on-surface-variant` for secondary text and atmospheric hierarchy
- **Labels:** all-caps with increased letter spacing `+0.05em` for an instrument-panel feel

---

## 4. Elevation & Depth
Depth is expressed through light and transparency instead of traditional shadows.

### The Layering Principle
1. **Level 0 (Deep Space):** `surface-container-lowest` (`#000000`)
2. **Level 1 (The Viewport):** `surface` (`#0A0E17`)
3. **Level 2 (The Bento Grid):** `surface-container-low` + 40px blur
4. **Level 3 (Interactive Modals/Drawers):** `surface-bright` + 60px blur

### Ambient Glows (Shadow Alternative)
When elements need lift, use tinted ambient glow.
- **Shadow Color:** 10% opacity of `primary` or `secondary`
- **Blur:** 20px-40px to mimic refracted edge light

### The Ghost Border
Input fields use `outline-variant` at 15% opacity. It should feel like lens reflection, never a hard stroke.

---

## 5. Components

### Bento Grid & Miller Columns
- **Bento Grid:** primary dashboard structure with varied cell sizes for editorial rhythm
- **Miller Columns:** deep navigation with horizontal movement and subtle selected-column highlight

### Glowing Circular Timers
- No solid tracks; use `secondary` glow for the progress arc
- Center uses deeper blur (80px) to pull attention into the remaining-time void

### Buttons
- **Primary:** gradient (`primary` to `primary-dim`) with 10px outer glow
- **Secondary:** glass-only with Ghost Border; stronger inner glow on hover
- **Tertiary:** text-only using `secondary-fixed` for high contrast

### Sleek Glass Drawers
- Drawers slide from the right with `surface-container-highest` glass tint
- Background content scales to `98%` during open to create Z-axis pushback

### Lists & Inputs
- **No dividers:** use 12px vertical whitespace and slight hover tint
- **Inputs:** `surface-container-lowest` with focus-only `secondary` glow

---

## 6. Do's and Don'ts

### Do
- Use asymmetry to guide attention to Primary Aurora actions
- Use the 5% noise texture to avoid generic gradient glass
- Overlap elements to prove transparency and depth

### Don't
- Do not use 100% opaque container fills
- Do not use sharp 0px corners; default roundedness scale is `md: 0.75rem`
- Do not use standard drop shadows; only emitting/refracting light behavior
- Do not use pure white body text; use `on-surface` (`#EBEDFB`)
