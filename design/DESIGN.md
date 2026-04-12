# Design System Strategy: The Architectural Shadow

## 1. Overview & Creative North Star
This design system moves away from the "neon-on-black" hacker trope and toward **"The Architectural Shadow."** The vision is a workspace that feels like a high-end, dimly lit physical studio—an environment where productivity is quiet, focused, and tactile. 

We break the "template" look by eschewing standard grids in favor of **Intentional Asymmetry**. Large, airy margins and deliberate "negative space" are used as structural elements, not just gaps. By leveraging the geometric rigor of Space Grotesk against the soft, organic utility of Inter, we create a tension that feels editorial rather than purely utilitarian. The system prioritizes tonal depth over structural lines, creating a sense of "digital sculpture."

---

## 2. Colors: Tonal Depth & Atmospheric Greens
Our palette is a study in muted sophistication. We replace aggressive high-contrast greens with a desaturated sage and mint spectrum that recedes into the deep charcoal background rather than vibrating against it.

### The "No-Line" Rule
Standard 1px solid borders are strictly prohibited for sectioning. Structural definition must be achieved through **Background Color Shifts**. 
*   **Application:** Place a `surface-container-low` section against a `background` base. The transition should be felt, not seen as a line. This mimics how light hits a matte surface in the physical world.

### Surface Hierarchy & Nesting
Treat the UI as a series of nested, translucent layers.
*   **Base Layer:** `surface-dim` (#0d0f0f) for the primary workspace.
*   **Secondary Layer:** `surface-container` (#171a1a) for sidebars or navigation.
*   **Elevated Elements:** `surface-container-high` (#1d2020) for floating panels.
*   **Nesting Logic:** Always move "up" the tier (lower to higher) as you go deeper into child containers to create a natural, "built-up" feel.

### The "Glass & Gradient" Rule
To add soul to the interface, use Glassmorphism for floating overlays. Apply a 20px `backdrop-blur` with a semi-transparent `surface-variant` fill. For primary Action Buttons or Hero highlights, use a subtle linear gradient from `primary` (#aacfbc) to `primary-container` (#38594a) at a 135-degree angle. This prevents the "flat" look of generic UI kits.

---

## 3. Typography: The Editorial Balance
The system uses a high-contrast typographic scale to differentiate "Display" moments from "Operational" tasks.

*   **Space Grotesk (The Voice):** Used for `display`, `headline`, and `title` levels. Its geometric, slightly wider stance provides a modern, architectural feel. 
    *   *Strategic Note:* Use `display-lg` (3.5rem) with tighter letter-spacing (-0.02em) to create authoritative headers that anchor the page.
*   **Inter (The Tool):** Used for `body` and `label` levels. Inter provides the legibility required for high-density information.
    *   *Strategic Note:* All `body-md` text should use `on_surface_variant` (#a8acab) to reduce eye strain, reserving the pure `on_surface` (#e3e6e6) for active reading or high-priority data.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to "lift" objects; we use color to "place" them.

*   **The Layering Principle:** Depth is achieved by "stacking" the surface-container tiers. For example, a card component should use `surface-container-lowest` (#000000) placed on top of a `surface-container-low` (#111414) section. This "recessed" look provides a high-end, minimalist aesthetic.
*   **Ambient Shadows:** If a floating menu requires a shadow, it must be an "Ambient Shadow": `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow should not be grey; it should be a darkened version of the background it sits on.
*   **The "Ghost Border" Fallback:** Where accessibility requires a container edge, use a "Ghost Border": `outline-variant` (#444949) at **15% opacity**. This provides a hint of a boundary without breaking the atmospheric flow.

---

## 5. Components

### Buttons
*   **Primary:** A soft gradient from `primary` to `primary-dim`. Use `md` (0.375rem) roundedness. Text is `on_primary` (dark sage). No border.
*   **Secondary:** Ghost style. No background fill. A `Ghost Border` (15% opacity `outline`) that becomes 40% on hover.
*   **Tertiary:** Plain text in `primary` with no container, used for low-priority actions.

### Cards & Lists
*   **The No-Divider Rule:** Forbid 1px horizontal lines between list items. Use 16px of vertical whitespace (`Spacing Scale`) or alternating `surface-container` shifts to separate content.
*   **Clipboard Items:** Use `surface-container-lowest` with a subtle `primary` tint on the left edge (2px width) to indicate the active selection.

### Input Fields
*   **Static State:** Background is `surface-container-high`. No border. Placeholder text in `on_surface_variant`.
*   **Focus State:** The container transitions to `surface-bright`. A 1px `Ghost Border` appears using the `primary` color at 30% opacity.

### Chips
*   **Action Chips:** High-pill (`full` roundedness). Use `secondary-container` background with `on_secondary_container` text. This provides a soft, tonal "sage" bubble that doesn't distract from the main content.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. If a column is 8 units wide, let the right margin be 4 units wide. It feels more like a custom-designed magazine than a bootstrap site.
*   **Do** use `tertiary` (#ecfcff) for extremely subtle "cooling" highlights in data visualizations to contrast the warmth of the sage greens.
*   **Do** prioritize "Breathing Room." If you think there’s enough padding, add 8px more.

### Don't:
*   **Don't** use 100% white (#FFFFFF). It breaks the dark-theme immersion. Use `on_surface` (#e3e6e6).
*   **Don't** use "hacker" effects like glow, scanlines, or monospace fonts for body text. We are building an executive tool, not a terminal emulator.
*   **Don't** use sharp 90-degree corners. Even a `sm` (0.125rem) radius is necessary to soften the architectural feel.