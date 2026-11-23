import type { CategoryType, LoanLine } from "@miplata/shared";

export type LoanDirection = "owesYou" | "youOwe";

export const DIRECTIONS: readonly LoanDirection[] = ["owesYou", "youOwe"];

export function repaymentPath(
  personId: string,
  direction: LoanDirection,
  line: Pick<LoanLine, "currency" | "amountMinor">,
): string {
  const params = new URLSearchParams({
    type: "transfer",
    [direction === "owesYou" ? "from" : "to"]: personId,
    currency: line.currency,
    amountMinor: String(line.amountMinor),
  });
  return `/movements/new?${params.toString()}`;
}

export function forgivenessCategoryType(direction: LoanDirection): CategoryType {
  return direction === "owesYou" ? "expense" : "income";
}
