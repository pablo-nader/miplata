# 0023. Money as safe integers in the domain

- Status: Accepted
- Date: 2026-11-23
- Refines: [0016](0016-data-model.md)

## Context
[0016](0016-data-model.md) stores money as `bigint` minor units. Domain rules and the web share TypeScript code, and JSON has no `bigint`.

## Decision
- Domain and shared code represent amounts as JavaScript numbers holding integer minor units, limited to the safe integer range (about 90 trillion units of major currency).
- Every operation that can leave the range fails with a `RangeError`. Sums go through `sumMinorUnits`, and products and divisions use `bigint` internally.
- Persistence adapters convert between database `bigint` and number, and fail if a stored value is outside the safe range.
- Exchange rates are integers in ten-thousandths of a peso per dollar.
- Rounding is always explicit: `half-up`, `floor` or `ceil`.

## Alternatives considered
- `bigint` everywhere: exact, but not serializable in JSON and awkward in the web.
- Decimal strings: serializable, but every rule would parse and format.

## Consequences
- Amounts travel through the HTTP API and Zod schemas as plain integers.
- The range is far above any personal balance, including currencies with high inflation.
