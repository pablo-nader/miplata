# 0024. Web routing and UI foundation

- Status: Accepted
- Date: 2026-11-23

## Context
The web app needs its design system components, the app shell and routing before any feature screen exists (see [0011](0011-design-system-source-of-truth.md), [0012](0012-category-icons-with-lucide.md), [0015](0015-approved-screen-designs.md) and [0017](0017-project-structure.md)).

## Decision
- **Routing:** React Router (`react-router-dom`) with `BrowserRouter`. Vercel already rewrites every non-API path to `index.html` (see [0001](0001-hosting-on-vercel.md)), so deep links work.
- **Layouts:** the four main sections (Home, Movements, Accounts, Reports) render inside the shell with the bottom tab bar on phones and the left sidebar from 768 px up. Focused screens (sign in, balance detail, new movement, statement, pay statement, to pay, menu) render without navigation, as in the approved mockups.
- **Container and presentational split:** presentational components, including `ui/` and the shell organisms, take props only. Containers translate strings and build props; placeholder screens use one generic container until each feature stage replaces it.
- **Icons:** a curated map from the stored icon name to a Lucide component, imported by name so the bundle only carries the curated icons. Unknown names render the first-letter fallback. A test checks that every default icon name from ADR 0012 and BD-0015 exists in the installed Lucide version and in the map.
- **Money formatting:** `Intl.NumberFormat` with forced grouping (Spanish does not group four-digit numbers by default), the `$` and `US$` prefixes, U+2212 as minus sign and non-breaking spaces. It lives in `ui/format` until the shared money utilities of `packages/shared` are ready.
- **Amount units:** `formatMoney` takes the amount in major units; containers convert the integer minor units of [0023](0023-money-as-safe-integers-in-the-domain.md) before passing them.
- **Segmented control:** native radio inputs inside a fieldset, so arrow keys and focus behave natively.
- **Reduced motion:** every transition uses the `--motion-press` token, which is set to `0s` under `prefers-reduced-motion`.
- **Health check UI removed:** the stage 1 screen that called the health endpoint is replaced by the home placeholder, because the web app makes no API calls yet. The API endpoint stays.

## Alternatives considered
- TanStack Router: typed routes, but more machinery than twelve static routes need.
- ARIA radio buttons on `button` elements: more code for behavior the native element already gives.
- Loading the whole Lucide set for the icon picker: bigger bundle, against ADR 0012.

## Consequences
- Feature stages replace placeholder routes by changing `AppRoutes` and adding their container and presentational components.
- Every component receives translated strings as props, so containers own the translation keys.
