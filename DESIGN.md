# miPlata Design System

The visual source of truth for miPlata. Product context lives in [PRODUCT.md](PRODUCT.md); the decisions behind this system live in [BD-0007](docs/business/BD-0007-visual-direction-transit-signage.md), [BD-0008](docs/business/BD-0008-graphite-palette-with-dark-theme.md) and [ADR 0011](docs/adr/0011-design-system-source-of-truth.md).

Machine-readable tokens: [design/tokens.json](design/tokens.json). Brand sources: [design/brand/](design/brand/).

## Direction

Buenos Aires subway signage, in the Grafito palette. Signage is designed to be read in a second while moving, which is exactly how a movement gets recorded: on the phone, right after paying.

- The **signage band** is a charcoal panel that holds the total balance.
- **Line rules** under the balance: teal for money in, orange for money out.
- Each **category is a line**: a round badge with a letter, in its own color.
- **Movements read like a list of stations.**
- **Signal orange is the exit sign**: reserved for the one main action on screen.

## Principles

1. **Readable in one second.** Large balance, clear hierarchy, no decoration competing with numbers.
2. **Calm, not anxious.** Expenses are never shown in alarm red. Orange marks the action and the expense rule, never a warning about spending.
3. **One main action per screen**, always in signal orange.
4. **Color carries meaning, the icon carries identity.** Every category badge shows an icon, or the first letter of its name when it has none, so it still works for color-blind users and when colors repeat.
5. **Mobile first**, one-handed: primary actions at the bottom, within thumb reach.

## Themes

The app ships a light and a dark theme and follows the device setting (`prefers-color-scheme`). Every color is a token with both values; components never use literal colors.

## Color tokens

| Token | Use | Light | Dark |
| --- | --- | --- | --- |
| `surface` | Screen background | `#FFFFFF` | `#111315` |
| `band` | Signage band, selected segment | `#202428` | `#23282D` |
| `on-band` | Text on the band | `#FFFFFF` | `#F2F3F4` |
| `ink` | Primary text | `#1C1F22` | `#E8EAEC` |
| `muted` | Secondary text, captions | `#5F666D` | `#9AA2A9` |
| `field` | Inputs and controls background | `#F3F4F5` | `#1B1F23` |
| `rule` | Dividers | `#E6E8EA` | `#24292E` |
| `action` | Main action, expense rule | `#FF7A1A` | `#FF8A33` |
| `on-action` | Text on the main action | `#1A1A1A` | `#1A1A1A` |
| `line-income` | Income rule under the balance | `#3FB6A8` | `#4CC9BA` |
| `income` | Income amounts | `#1F8A5B` | `#3DBE82` |

Expense amounts use `ink`. Only income amounts get a color.

### Category colors

Deep tones with a **white letter**, identical in both themes.

| Token | Default category | Color | White letter | Against dark surface |
| --- | --- | --- | --- | --- |
| `category-1` | Food | `#1D7A70` | 5.2 : 1 | 3.6 : 1 |
| `category-2` | Income | `#1F7A4F` | 5.3 : 1 | 3.5 : 1 |
| `category-3` | Car | `#4F5BD5` | 5.5 : 1 | 3.4 : 1 |
| `category-4` | Health | `#B3366B` | 5.7 : 1 | 3.2 : 1 |
| `category-5` | Home | `#5E6873` | 5.7 : 1 | 3.3 : 1 |

Rules:
- A category color must reach **at least 4.5 : 1 against white** (WCAG AA for text) and **at least 3 : 1 against the dark surface** (WCAG AA for UI components). Check every new color before adding it.
- Category badges never use `action` orange.
- When users create more categories than colors, colors repeat; the icon or letter keeps each badge distinct.
- The "add category" badge is not a color: a dashed `muted` ring with a `+` in `ink`.

## Typography

| Role | Face | Weight | Size / line height |
| --- | --- | --- | --- |
| Balance | Schibsted Grotesk | 800 | 37 / 37 px, tracking -0.02em |
| Amount input | Schibsted Grotesk | 800 | 45 / 45 px, tracking -0.02em |
| Screen title, brand | Schibsted Grotesk | 800 | 18 / 24 px |
| Main action | Schibsted Grotesk | 800 | 16 / 20 px |
| Body, row title | Public Sans | 600 | 15 / 20 px |
| Amount in rows | Public Sans | 700 | 15 / 20 px |
| Caption, meta | Public Sans | 400 | 12 / 16 px |

- All digits use `font-variant-numeric: tabular-nums` so amounts align.
- Both faces are open source (OFL) and are self-hosted with the app; no runtime request to Google Fonts.
- Money format follows the user's language (see [ADR 0013](docs/adr/0013-internationalization.md)). In Spanish (`es-AR`, the default): `$ 1.250.000`, `− $ 48.300`, `+ $ 1.250.000`, and dollars as `US$ 1.000`. The minus sign is U+2212.

## Spacing, radius and size

- Spacing scale (px): 4, 8, 12, 16, 20, 24, 32. Screen side padding is 16–18 px.
- Radius: controls and fields 12 px, segmented control track 12 px with 9 px segments, badges fully round. No radius on the signage band.
- Touch targets are at least 44 × 44 px.
- Elevation is avoided; separation comes from the band, the rules and the `rule` dividers.

## Components

**Signage band.** `band` background, `on-band` text. Contains the brand row (mark, name, month), the total balance in pesos with the total in dollars below it in caption size (only when it is not zero), and the two line rules (3 px top border, `line-income` and `action`) with the month's "In" and "Out" totals. The balance is a button that opens the balance detail screen, with one row per account and currency. Pesos and dollars are never added together (see [BD-0013](docs/business/BD-0013-currencies-and-exchange.md)).

**Movement row.** Grid of badge (32 px), title with caption below (category · date), amount aligned right. Separated by a 1 px `rule` divider. Income amounts in `income` with a leading `+`; expenses in `ink` with a leading `−`.

**Category badge.** Circle in the category color with a white Lucide icon (2 px stroke, about 55% of the badge size). A category without an icon shows the first letter of its name in Schibsted Grotesk 800 instead. 32 px in lists, 38 px in pickers. Selected state: a 3 px `surface` gap and a 2 px `ink` ring. See [ADR 0012](docs/adr/0012-category-icons-with-lucide.md).

**Main action.** Full width at the bottom of the screen, `action` background, `on-action` text, 12 px radius. When it opens a form it carries a round `+` glyph. Only one per screen.

**Segmented control (Expense / Income).** `field` track; the selected segment uses `band` with an inset 3 px `action` underline.

**Field.** `field` background, 12 px radius, caption label above the value.

## Logo

- The mark is an **mP monogram inside a round line badge**: the "m" as two arches, the "P" in signal orange. It is drawn with strokes, so it renders the same at every size.
- Sources in [design/brand/](design/brand/):
  - `mark.svg`: charcoal badge, white m, orange P. Default, works on light and dark backgrounds.
  - `mark-inverse.svg`: white badge, charcoal m, orange P. For use on the signage band.
  - `favicon.svg`: same as `mark.svg`.
  - `app-icon.svg`: full-bleed square for PWA and Apple touch icons.
  - `app-icon-maskable.svg`: the same with the glyph inside the maskable safe zone.
- The wordmark "miPlata" is set in Schibsted Grotesk 800 next to the mark; it is text, not an image.
- PNG icons (192, 512, maskable and Apple touch) are generated from these SVGs at build time; they are not committed by hand.
- Do not recolor the P, stretch the mark, or place it on busy backgrounds.

## Motion

- Short and functional: 150 ms ease-out for presses (scale 0.98) and state changes.
- Respect `prefers-reduced-motion`: no transitions when it is set.

## Accessibility

- Target WCAG 2.1 AA in both themes.
- Text at least 4.5 : 1; large text and UI components at least 3 : 1.
- Visible focus ring in `ink`, 2 px with 3 px offset. Orange is not used for focus: it reaches only about 2.6 : 1 on white.
- Meaning never depends on color alone: categories have icons or letters, amounts have signs.
- Badge icons are decorative next to the category name; when a badge appears without its name, it carries the name as its accessible label.
