# BD-0031. Guided tours

- Status: Accepted
- Date: 2026-11-23
- Refines: [BD-0004](BD-0004-mobile-first-installable-app.md), [BD-0019](BD-0019-spanish-and-english.md)

## Context
miPlata is used by the owner, family and friends, and not all of them are comfortable with a finance app. Each screen has a few elements that are easy to miss: where the balance comes from, what the filters do, what "Por pagar" asks for. A short explanation at the right moment helps, as long as it is calm, short and easy to dismiss. The owner asked to follow the approach of the `ambos` app.

## Decision
- **First visit.** The first time a user opens each of these screens, a tour of 3 to 5 steps highlights the key elements and explains them in plain language, in the user's language: Inicio, new movement, Movimientos, Cuentas, card statement, Por pagar, Gastos fijos, Presupuestos, Reportes, Categorías.
- **Always dismissible.** Every tour can be skipped or closed at any step. Finished or closed, it does not show again for that screen.
- **Never in the way.** The highlighted element stays visible; the explanation sits beside it. A step about something that is not on screen (for example an empty list) is left out.
- **Replay.** The menu has "Ver guías", which lists every tour and replays any of them, and a way to show all of them again.
- **Remembered on the device.** What a user has already seen is remembered in the browser, separately for each user. A tour seen on the phone shows once more on the computer, and again after clearing the browser data. If the browser does not allow storing it, the tour just shows again.
- **Tone.** Short, concrete and neutral, in Spanish and English. The Spanish copy is neutral (tuteo) rather than voseo, as the owner asked for neutral Spanish. A tour never pushes the user to act.
- **When a tour changes.** A tour can be marked as renewed so that everyone sees it once more; this is not done for small wording fixes.

## Why
- Showing a tour once, at the moment the screen is first opened, explains the screen when it matters and then gets out of the way.
- Letting the user close it at any step, and replay it later, keeps control with the user.
- Remembering on the device keeps the app simple: nothing about tours is stored on the server. Seeing a tour once per device is an acceptable cost for a short explanation.

## Alternatives considered
- Remembering on the server so a tour never repeats across devices: more to build and store for a small benefit. Not chosen.
- One long onboarding tour on first sign-in: it explains screens the user has not seen yet and is forgotten by the time they get there.
- Always-visible help text on each screen: adds noise for users who already know the screen.

## Consequences
- Each new main screen can ship with its own tour; it shows once per user and device.
- The technical choices are in [0043](../adr/0043-guided-tours.md).
