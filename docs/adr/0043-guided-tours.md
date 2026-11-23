# 0043. Guided tours with driver.js and a per-device seen state

- Status: Accepted
- Date: 2026-11-23
- Implements: [BD-0031](../business/BD-0031-guided-tours.md)

## Context
[BD-0031](../business/BD-0031-guided-tours.md) asks for a short tour on the first visit to each main screen, replayable from the menu. The owner chose to follow the approach already used in the `ambos` app: the `driver.js` library, tours declared next to each screen, and the seen state kept in the browser. The tour must follow [DESIGN.md](../../DESIGN.md) (tokens only, light and dark themes, phone and desktop), be accessible, and never hide the element it explains.

## Decision
### Library
`driver.js` 1.14.0, pinned to the exact version, MIT licensed (checked on the npm registry on 2026-11-23). It draws the overlay, the highlight cut-out and the popover, handles Escape and the arrow keys, and gives the popover `role="dialog"` with its title as the accessible name. Everything else is ours.

### Declaration
Each feature exports a `TourDefinition` next to its screens (`home/home-tour.ts`, `budgets/budgets-tour.ts`, ...): a tour id, a `version`, the route it belongs to, and 3 to 5 steps. A step is an optional anchor plus the translation keys of its title and body. A step without an anchor is a centered intro step. The registry in `features/tours/tour-registry.ts` maps a path to its tour. Copy lives in the `es` and `en` files under `tours.*`, as [0013](0013-internationalization.md) requires.

### Anchors
Screens mark the elements a tour explains with `data-tour="name"`, set through `tourAnchor("name")` or the `anchor` prop of a shared component (`ui/tour/anchors.ts`). Anchors are attributes, never CSS classes or text, so restyling or translating cannot break a tour. When the same element exists twice (the new-movement button in the tab bar and in the sidebar), the first rendered one is used. A step whose anchor is not on screen (an empty list) is dropped. A unit test checks that every anchor named by a tour is rendered by a screen and that every key exists in both languages.

### When a tour starts
`TourHost`, mounted once inside the authenticated routes, reads the route, finds its tour and starts it only if the tour is not seen for the signed-in user (or a replay was requested), at least two steps resolve, and the user is not typing in a field. Screens load data after the first render, so it waits until the anchors stop changing: it starts about 0.3 seconds after the last anchor appears, or after about 1.4 seconds of no change, or after four seconds. Leaving the screen stops a running tour without marking it seen, so it does not survive navigation.

### Seen state: `localStorage`, per user and per version
- Key `miplata.tour.<userId>.<tourId>.v<version>` with the value `1`. The user id comes from the session. Bumping a tour's `version` shows it again.
- It is marked seen when the tour ends for any reason: finished, closed with the button, or Escape.
- Every read and write is wrapped in `try/catch`. If the storage is blocked, the tour simply shows again on the next visit and nothing breaks.
- There is no table and no endpoint: nothing about tours is sent to the server.

### Replay
The menu links to `/guides`, which lists every tour with a replay link. The link navigates to the screen with `state: { replayTour: id }`; the host starts that tour even if it was seen, and clears the state when it ends. The card statement guide needs a credit card, so its link points to the first one and is replaced by a note when there is none. "Show all again" removes the seen keys of the signed-in user.

### Accessibility, theme and motion
- The popover is a dialog labelled by its title; the close button has the label "Cerrar guía" or "Close guide". Escape closes and the arrow keys move between steps.
- Animations are off when the user prefers reduced motion, in the library options and in CSS.
- `features/tours/tour.css` restyles the popover, its buttons (44 px touch targets) and arrow with the design tokens only, and the overlay uses `--color-band`, so both themes work. The highlighted element is cut out of the overlay and stays visible; the popover is placed beside it by the library.

## Alternatives considered
- Server-side completion (a table and endpoints): the same tour would not repeat on another device. Rejected by the owner in favour of the simplicity of the `ambos` approach; the cost is that a tour shows once per browser.
- An in-house tour component (card, ring, placement): evaluated and built first. It needs about the same amount of code as styling and testing the library, and the owner prefers the approach already proven in `ambos`.
- react-joyride (MIT): React specific and heavier, with its own tooltip styling to override.
- Intro.js and Shepherd.js: AGPL-3.0, which does not fit a closed-source app without a commercial license.

## Consequences
- New dependency: `driver.js` 1.14.0, about 356 KB unpacked, loaded with the app.
- A tour is shown again after clearing the browser data, on another browser or device, or when its version changes.
- Adding a tour means a definition next to its feature, anchors in its screen, copy in both translation files and an entry in the registry; the registry test fails if any piece is missing.
- End-to-end tests start with every tour already seen so they are not interrupted; the tour tests opt out with `freshTours`.
