# 0012. Category icons with Lucide

- Status: Accepted
- Date: 2026-11-23

## Context
Categories need icons that users can choose from (see [BD-0010](../business/BD-0010-category-icons.md)). The icons must share one stroke and style, work at small sizes, and stay light in a mobile PWA.

## Decision
- Use [Lucide](https://lucide.dev) (ISC license) through its React package.
- A category stores the icon's name, not the image. The frontend maps that name to the component.
- The icon picker offers a curated subset relevant to personal finances, not the whole library, so the picker stays usable and the bundle stays small.
- A stored icon name that is not in the curated subset renders the first-letter fallback.
- Default categories are seeded with these icon names: Building fees `building`, Rent `key`, Maintenance `hammer`, Home insurance `shield`, Electricity `zap`, Gas `flame`, Water `droplet`, Internet `wifi`, Mobile phone `smartphone`, Subscriptions `tv`, Property tax `landmark`, Municipal tax `building-2`, Vehicle tax `id-card`, Groceries `shopping-cart`, Delivery and restaurants `utensils`, Fuel `fuel`, Car insurance `car`, Tolls and parking `square-parking`, Car maintenance `wrench`, Public transport `bus`, Health insurance `heart-pulse`, Pharmacy `pill`, Medical visits `stethoscope`, Going out `party-popper`, Clothing `shirt`, Gym `dumbbell`, Education `graduation-cap`, Gifts `gift`, Pets `paw-print`, Travel `plane`, Other `ellipsis`; Salary `briefcase`, Bonus `banknote`, Fees or freelance `laptop`, Rental income `key-round`, Investment returns `trending-up`, Refunds `undo-2`, Other `ellipsis`.

## Alternatives considered
- Emoji: no consistent style, render differently on every device, and the design system bans them as icons.
- Material Symbols or Phosphor: good sets, but Lucide's thin, even stroke fits the signage style, and its per-icon imports keep the bundle small.
- Drawing our own icons: full control, but too much effort for dozens of categories.

## Consequences
- The icon names above are checked against the installed Lucide version when the seed is implemented: an unknown name must fail the build or a test, never render empty.
- Adding an icon to the picker is a code change to the curated subset.
