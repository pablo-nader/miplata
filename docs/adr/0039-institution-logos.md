# 0039. Institution logos

- Status: Accepted
- Date: 2026-11-23

## Context
[BD-0012](../business/BD-0012-institution-logos.md) decided that accounts show the logo of their bank or virtual wallet when one is available, and that logo files are added only with the owner's approval of each source. The `institution` table already has a `logo_path` column.

## Decision
- Logos are static SVG files in `apps/web/public/institutions/`, one per institution, served by the web app itself. Nothing is hotlinked at runtime.
- `institution.logo_path` stores the public path (`/institutions/galicia.svg`). Migration `0001_institution_logos` sets it for the catalog rows with an idempotent `UPDATE`, and `INSTITUTION_CATALOG` carries the same paths so a test keeps both equal.
- Sources are Simple Icons (CC0 files) for Mercado Pago and Wikimedia Commons for the banks and the other wallets. Each source and its stated license is listed in [design/brand/institution-logos.md](../../design/brand/institution-logos.md). Files are optimized with SVGO (metadata, scripts and editor data removed).
- `AccountBadge` shows the logo inside the same round badge as the type icon. The client only accepts `/institutions/*.svg` paths, hides the image from assistive technology next to the account name, and names the institution when the badge stands alone. A missing logo, an unknown path or a failed load shows the account type icon.
- The badge background is the neutral `field` token in light mode and the `ink` token in dark mode, because most logos use dark ink and would vanish on the dark `field`.
- The balance detail response now carries the account's institution, so it can show the same logos as Cuentas.
- Institutions without a reliable source keep the type icon: Banco Provincia and ICBC (approved but not yet downloaded), Brubank, Cuenta DNI, Personal Pay, Prex and Lemon.

## Alternatives considered
- Hotlinking the institutions' own sites: breaks offline, leaks the user's visits to third parties and the URLs change.
- Using a logo API or CDN: same runtime dependency and privacy issue.
- Storing the SVG in the database: heavier responses and no browser or service worker caching.
- Native `select` account pickers cannot render images, so they keep showing the account name only.

## Consequences
- Logos are trademarks of their owners and are used only to identify the institution (BD-0012). If the app is published or used commercially, BD-0012 and this record must be revisited.
- Adding a logo means adding the file, extending the migration chain with a new `UPDATE`, setting it in `INSTITUTION_CATALOG`, listing it in the brand note, and getting the owner's approval of the source.
- Most logos are wide wordmarks, so they appear small inside the round badge; they stay recognizable by color.
