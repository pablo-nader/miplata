# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React + Vite (TypeScript) frontend, Hono API, Drizzle ORM, Neon Postgres, Better Auth with Google sign-in, hosted on Vercel. Installable PWA, online only. See docs/adr.

## Users
The owner, plus family and friends. Each person uses their own account. The main situation is a person on their phone who just spent or received money and wants to record it in seconds, before forgetting. A secondary situation is reviewing their own numbers calmly on a computer or tablet.

## Product Purpose
Record personal expenses and income, and understand where the money goes and whether the balance is positive. Success means users record movements consistently because doing it is fast, and they can answer "how am I doing this month?" at a glance.

## Positioning
A private, personal finance log for a small circle of people: no ads, no bank linking, no selling of data, no commercial goals. Each user owns their data.

## Operating Context
- Mobile first, used one-handed, often on the move, right after paying.
- Also used on desktop and tablet for review.
- Installed on the phone home screen as a PWA; requires a connection.
- Sign-in with Google.

## Capabilities and Constraints
- Records expenses and income per user.
- Strict per-user data isolation: no user sees another user's data.
- Money stored as integer minor units.
- All code, UI copy source and documentation in English; the UI language for users is undecided.
- Undecided: categories, payment methods, currencies, budgets, reports, recurring movements, shared expenses (currently out of scope).

## Brand Commitments
- Name: miPlata. Logo: an "mP" monogram.
- Visual direction: Buenos Aires subway signage (see docs/business/BD-0007). Palette: Grafito, with light and dark themes (see docs/business/BD-0008).

## Evidence on Hand
No real user data, testimonials or assets exist. Do not fabricate any.

## Product Principles
1. Recording a movement must take seconds.
2. Privacy by default: each user's data belongs only to them.
3. Clarity over features: answer "how am I doing" before adding detail.
4. Calm, not anxious: present money facts without guilt or alarm.

## Accessibility & Inclusion
Target WCAG 2.1 AA. Users span ages, so legible type sizes and comfortable touch targets matter.
