# Repair Queue — visual thesis

## Direction: the midnight card orchard

Repair Queue uses **surreal editorial scenery** to make a dry diagnosis task feel like careful restoration. A floating index card has grown into a small landscape: one torn question becomes two healthy cards, while a copper measuring ribbon traces the evidence beneath them. It frames a forgotten prompt as an object that can be repaired—not a verdict on the learner.

This is intentionally a focused, single-mode nocturne. The explicit ink-dark background reduces glare during long review sessions and lets the paper workspace read as the source of light. It is not an operating-system dark theme or a generic gradient hero.

## Tokens

| Role | Token | Value | Rationale |
| --- | --- | --- | --- |
| Night background | `--night` | `#11171a` | Blue-black study room |
| Raised night | `--night-2` | `#192126` | Quiet interface depth |
| Paper | `--paper` | `#f2ead8` | Warm archival index stock |
| Paper shade | `--paper-2` | `#ded2bc` | Section separation without card chrome |
| Ink | `--ink` | `#182126` | Editorial body copy on paper |
| Chalk | `--chalk` | `#f7f1e6` | Primary text on night |
| Muted night | `--mist` | `#b9c4c2` | Secondary text, 7:1 on night |
| Copper | `--copper` | `#e87845` | Repair action and measuring line |
| Copper dark | `--copper-deep` | `#9f3e1f` | Accessible text and pressed states |
| Lichen | `--lichen` | `#b5cc86` | Complete / healthy signal |
| Amber | `--amber` | `#f1bd62` | Needs-attention signal |
| Red | `--red` | `#d86b62` | Destructive / failure signal |
| Focus | `--focus` | `#8fd4dc` | High-contrast keyboard outline |

All semantic distinctions also use words and shapes. Body copy is checked at 4.5:1 or better.

## Type

- Display: Georgia, Cambria, `Times New Roman`, serif. Its bookish, slightly strange proportions give scores and section titles an editorial voice without downloading a font.
- Interface: Inter-like system stack (`ui-sans-serif`, system UI, Segoe UI, sans-serif). It keeps CSV labels and dense evidence legible.
- Scale: 13 / 16 / 20 / 28 / clamp(40–72) px; body stays at 16px minimum. Numeric evidence uses tabular figures.

No web fonts are loaded. This is faster, private, and keeps first paint stable.

## Space and composition

The unit is 4px; core intervals are 8, 12, 16, 24, 32, 48, 72. The landing view is an asymmetric editorial spread: copy and action on the left, the card orchard on the right. The workbench changes to a measured three-column scene (queue / evidence / decision), collapsing in that order on narrow screens. Hairlines and open space organize related controls; containers are used only for independent cards or the current repair object.

At 390px the ornamental caption and secondary hero detail drop, the import controls stack, queue rows remain 56px tall, and the decision dock follows the evidence rather than fixing to the viewport.

## Interaction grammar

- Copper underlines and short rules mean “inspect or change.”
- The queue is numbered like an editor’s correction list; the selected item carries a copper notch.
- Evidence is written as a sentence first and a compact meter second so no chart is required to understand the score.
- Repair decisions are verbs. Potentially destructive statuses are reversible via Undo.
- Import is a visible three-step path: choose → preview mapping → analyse. The user always sees what columns were recognized.

## Motion

Motion has editorial physical logic: the scene settles by 10px on first view (240ms), the active card slides horizontally from the queue (180ms), and score meters grow from zero (220ms). Nothing loops. With `prefers-reduced-motion: reduce`, transforms and transitions are removed and every state change is immediate; information remains identical.

## Original asset plan and provenance

### Hero: `public/art/card-orchard.webp`

- Use case: surreal editorial hero; decorative mood plus an understandable “split a broken prompt” metaphor.
- Subject: a floating cream index card as a miniature night landscape, a precise tear dividing one tangled question into two orderly cards, copper measuring ribbon, small paper plants.
- World/materials: cut paper, graphite, dry pastel, oxidized copper, subtle editorial grain.
- Light/lens: moonlit tabletop, soft long shadows, orthographic three-quarter view, generous dark negative space on the left.
- Palette words: ink blue-black, archival cream, burnt copper, pale lichen, restrained amber.
- Negative list: no people, hands, faces, letters, numbers, logos, watermarks, UI screenshots, neon gradients, glossy 3D plastic, medical symbolism.
- Full generation prompt is stored beside the source image in `assets/src/card-orchard.prompt.json`.
- Generator: Azure OpenAI factory image deployment via `/opt/fleet/lib/gen-image.sh`; generated 2026-08-28. Original work produced for this product. No third-party visual assets.

Hand-authored SVG icons and PWA marks use the same card/notch geometry. Generated imagery is disclosed in the site footer.
