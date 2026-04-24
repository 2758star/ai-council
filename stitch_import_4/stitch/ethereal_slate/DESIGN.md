# Design System Specification: The Ethereal Professional

## 1. Overview & Creative North Star

### The Creative North Star: "The Digital Curator"
In an era of cluttered, high-intensity B2B interfaces, this design system acts as a "Digital Curator." It rejects the industrial rigidity of traditional SaaS in favor of an editorial, high-end experience that prioritizes mental clarity and focused productivity.

The system moves beyond the "template" look by utilizing **intentional asymmetry** and **tonal layering**. Rather than containing data within harsh boxes, information is presented as if it were curated on a physical desk of frosted glass and fine vellum. By leveraging wide margins, varying header scales, and overlapping surface containers, we create a rhythmic flow that feels organic yet authoritative.

---

## 2. Colors & Surface Logic

Our palette is a sophisticated blend of low-saturation tones designed to reduce eye strain while maintaining a "premium-lifestyle" aesthetic.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for primary sectioning. Structural boundaries must be defined solely through background color shifts or subtle tonal transitions. A sidebar is not "lined off"; it simply sits on `surface_container` while the main stage resides on `surface`.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Hierarchy is achieved by nesting surface tiers:
*   **Base Layer:** `background` (#f8f9fc) or `surface`.
*   **Primary Work Areas:** `surface_container_lowest` (#ffffff) to provide maximum "pop" and focus.
*   **Secondary Utility:** `surface_container` (#ebeef3) for sidebars or navigation rails.
*   **Deep Nesting:** Use `surface_container_high` (#e4e8ee) for inner-card groupings or search bars to create a "recessed" feel.

### The "Glass & Gradient" Rule
To elevate the experience, floating elements (modals, dropdowns, hovering tooltips) must utilize **Glassmorphism**.
*   **Effect:** `surface_container_lowest` at 70% opacity with a `24px` backdrop-blur.
*   **Signature Textures:** For primary CTAs or high-level dashboard summaries, use a gentle linear gradient: `primary` (#6e77d1) to `primary_container` (#959eff) at a 135-degree angle. This provides a "soul" to the interface that flat fills lack.

---

## 3. Typography

The typography strategy pairs the structural precision of **Inter** for data with the editorial elegance of **Manrope** for storytelling.

*   **Display & Headlines (Manrope):** Large, airy, and intentional. `display-lg` (3.5rem) should be used sparingly to anchor major landing views, creating a "magazine" feel.
*   **Titles & Body (Inter):** Tight, professional density. `body-md` (0.875rem) is our workhorse for B2B data, ensuring high information density without sacrificing legibility.
*   **Labeling:** `label-sm` (0.6875rem) is reserved for metadata, always set in `on_surface_variant` to keep the visual noise low.

---

## 4. Elevation & Depth

We eschew traditional "drop shadows" for **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. This creates a natural, soft lift without a single pixel of shadow.
*   **Ambient Shadows:** For floating elements, use a "Cloud Shadow":
    *   `Y: 8px, Blur: 32px, Color: on_surface @ 6% opacity`.
    *   Shadows must never be neutral gray; they should be tinted with the `on_surface` tone to feel like a natural light occlusion.
*   **The "Ghost Border" Fallback:** If accessibility requires a border (e.g., in low-contrast input states), use `outline_variant` at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `md` (0.75rem) corner radius. No border.
*   **Secondary:** `surface_container_low` fill with `primary` text.
*   **Tertiary:** Ghost style. No background; text-only using `primary`.

### Cards & Lists
*   **Constraint:** Zero dividers.
*   **Execution:** Separate list items using `8px` of vertical whitespace. For complex lists, use alternating background tints: `surface_container_lowest` for even rows and `surface` for odd rows.
*   **Radius:** Cards should default to `lg` (1rem) for a friendly, modern B2B feel.

### Input Fields
*   **Style:** Minimalist. No bottom line, no heavy border. Use a `surface_container_highest` background with a `sm` (0.25rem) radius.
*   **Active State:** The background shifts to `surface_container_lowest` with a subtle `2px` soft glow of `primary_fixed_dim` at 30% opacity.

### Navigation Rail (The "Ethereal Rail")
Instead of a solid bar, use a vertical stack of icons on a semi-transparent glass surface (`surface_variant` @ 40% + blur), floating 16px from the left edge.

---

## 6. Do's and Don'ts

### Do
*   **Do** use overlapping elements. A card slightly overhanging a section header creates an expensive, custom-built feel.
*   **Do** use "Mist" colors (mint, lavender, blush) for data visualization. A bar chart should look like a palette of watercolors, not a neon sign.
*   **Do** prioritize whitespace over containment. If you think you need a box, try adding 16px of margin instead.

### Don't
*   **Don't** use pure black (#000000). Use `inverse_surface` (#0c0f11) for deep contrast.
*   **Don't** use sharp 90-degree corners. Everything in the "Digital Curator" world is softened to evoke calm.
*   **Don't** use high-intensity "Success Green." Use the `secondary` teal (#5e9394) to signal completion in a professional, muted manner.
*   **Don't** use "Drop Shadows" for depth; use "Elevation Tones." If the background is `surface_container_low`, the card must be `surface_container_lowest`.