import type { BalanceResponse } from "@miplata/shared";
import { balanceLines, balanceTotals } from "../domain/balance";
import type { AccountRepository } from "./accounts";

export async function getBalance(
  accounts: AccountRepository,
  userId: string,
): Promise<BalanceResponse> {
  const lines = balanceLines(await accounts.list(userId));
  return { totals: balanceTotals(lines), lines };
}
