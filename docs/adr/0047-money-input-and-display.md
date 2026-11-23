# 0047. Money input and display follow the user's language

- Status: Accepted
- Date: 2026-11-23
- Extends: [0013](0013-internationalization.md)

## Context
Amounts were displayed with locale separators but typed as plain text that assumed a decimal comma. In English, typing `1.234` was read as 1234, and nothing showed the currency while typing. The owner asked for the symbol and the language's separators everywhere an amount is entered or read.

## Decision
- One `MoneyInput` (`apps/web/src/ui/atoms`) and a `MoneyField` with a label replace every money input. They show the currency symbol (`$`, `US$`), group thousands and place the decimal separator live (`1.234,56` in Spanish, `1,234.56` in English), keep the caret next to the digit being edited, allow clearing, cap at 11 integer digits and 2 decimals, and accept pastes in either format.
- The value that forms hold and that the component emits is a canonical string: digits, an optional `.` and at most 2 decimals, with a leading `-` only where the field allows negatives. It is independent of the language, so the existing builders keep parsing it with `parseMoney` and minor units stay the only value sent to the API.
- A group separator typed by hand is ignored; only the language's decimal separator starts the decimals. A pasted text with both separators takes the last one as decimal; with one separator it is thousands when repeated or followed by exactly three digits, and decimal otherwise.
- All displayed amounts use `formatMoney`; percentages and exchange rates have their own helpers in the same module. A unit test fails when `toFixed`, `toLocaleString` or `Intl.NumberFormat` appear outside those modules.

## Alternatives considered
- Emit integer minor units from the input: form state, drafts and tests would all change shape for no user-visible gain; `canonicalToMinor` and `minorToCanonical` convert at the edges instead.
- `type="number"`: no live grouping and locale-dependent browser behavior.
- Treat a typed `.` as decimal in Spanish: ambiguous with the group separator the field itself inserts.

## Consequences
- The English `1.234` bug is gone: parsing no longer depends on a comma convention.
- Fields hold text in the canonical format, so tests read formatted values (`350.000`) from the input.
