# MIPO Color System (Generation 3 — canonical)

> This document describes what **ships**. The previous yellow/midnight document described a palette that never rendered; it is retired (audit F01).
> Source of truth for values: `src/index.css` `:root` / `.dark`. Tailwind classes: `tailwind.config.ts → colors.mipo`.

## Principles

1. **Quiet surfaces, one signature.** White/soft-gray surfaces; the pastel gradient is the only loud element.
2. **The gradient means pet identity + primary action.** Gradient ring = a pet. Gradient fill = THE primary CTA (max one per screen) and the nav active-indicator. Never for decoration, section headers, or secondary buttons.
3. **Ink on gradient.** Text on the gradient is `--mipo-ink` @ 700 (F24) — never white.
4. **Tokens only.** No raw hexes in components (`mipoTheme.ts` is the one JS exception). No `petid-*`, `ig-*`, `shop-*`, `--primary` in new code.

## Brand tokens

| Token | HSL | ≈Hex | Tailwind | Role |
|---|---|---|---|---|
| `--mipo-ink` | 240 11% 9% | #15151A | `text-mipo-ink` | Primary text, ink-on-gradient |
| `--mipo-muted` | 240 5% 44% | #6B6B76 | `text-mipo-muted` | Secondary text |
| `--mipo-surface` | 0 0% 100% | #FFFFFF | `bg-mipo-surface` | Cards, headers, bars |
| `--mipo-soft` | 60 11% 96% | #F6F6F3 | `bg-mipo-soft` | App shell, chips, wells |
| `--mipo-soft-deep` | 60 4% 92% | #EBEBE8 | `bg-mipo-soft-deep` | Media placeholders |
| `--mipo-line` | 240 8% 89% | #E1E1E6 | `border-mipo-line` | Borders, hairlines (`/60` for faint) |
| `--mipo-peach` | 30 96% 72% | #FDBA74 | `mipo-peach` | Gradient stop 1 |
| `--mipo-coral` | 350 90% 71% | #FB7185 | `mipo-coral` | Stop 2 · health accent · like-fill |
| `--mipo-violet` | 258 90% 76% | #A78BFA | `mipo-violet` | Stop 3 · documents accent · links |
| `--mipo-blue` | 213 94% 68% | #60A5FA | `mipo-blue` | Stop 4 · shop accent · poll fill |
| `--mipo-cyan` | 188 86% 53% | #22D3EE | `mipo-cyan` | Stop 5 · preferences accent · focus ring |

Accent usage: pastel accents appear at **≤16% opacity as fills** (`bg-mipo-coral/[0.12]`) with the full-strength color only on the icon/glyph inside.

## Gradients

- `--gradient-primary` — 120deg peach→coral→violet→blue→cyan. Ring, primary CTA, nav indicator.
- `--gradient-text` — deepened stops (amber-700 / rose-600 / violet-600 / blue-600 / cyan-700) for display-size gradient text on white; passes ≥3:1. Never below 24px.

## Feedback colors (kept from semantic set)

`--success` 152 60% 45% · `--warning` 38 92% 55% · `--error`/`--destructive` 350 80% 55%.

## Dark mode

Gen-3 tokens flip in `.dark` (F02): ink 0 0% 95%, muted 240 5% 64%, surface 240 7% 10%, soft 240 6% 13%, soft-deep 240 5% 17%, line 240 5% 24%. Components that use tokens need **no** dark variants. The legacy `!important` override net at the bottom of `index.css` exists only for Gen-2 screens (shop, documents) and is deleted when their re-skins land.

## Deprecation map (legacy → use instead)

| Legacy | Use |
|---|---|
| `--primary` / `petid-cyan/teal/turquoise` / `ig-blue` / `shop-*` | `--mipo-cyan` (or the screen's accent) |
| `petid-coral/pink/heart` / `ig-red` | `--mipo-coral` |
| `petid-purple` / `--accent` | `--mipo-violet` |
| `petid-gold` / `ig-orange` / `yellow-primary` | `--mipo-peach` |
| `petid-gray-*` / `bg-gray-*` / `bg-white` | `mipo-surface / soft / soft-deep / line / muted / ink` |
| raw `#F7F7F5` `#F6F6F3` `#ECECEA` | `--mipo-soft` / `--mipo-soft-deep` |

CI gate (suggested): fail on new `petid-|ig-|shop-|--primary\b|#F7F7F5|#ECECEA` matches under `src/` outside `index.css` legacy block.
