import type { Account, StatementDetail, StatementSummary } from "@miplata/shared";
import { useCallback } from "react";
import { useResource } from "../../shared/use-resource";
import { fetchAccounts } from "../accounts/accounts-api";
import { localDate } from "../movements/present-movement";
import { defaultPeriod } from "./statement-view";
import { fetchStatement, fetchStatements } from "./statements-api";

export type StatementData = {
  status: "loading" | "error" | "ready";
  accounts: Account[];
  card: Account | null;
  periods: StatementSummary[];
  selected: StatementSummary | null;
  detail: StatementDetail | null;
  reload: () => void;
};

export function useStatementData(accountId: string, period: string | null): StatementData {
  const accounts = useResource(fetchAccounts);
  const loadList = useCallback(() => fetchStatements(accountId), [accountId]);
  const list = useResource(loadList);

  const periods = list.state.status === "ready" ? list.state.data : [];
  const selected =
    list.state.status === "ready"
      ? (periods.find((item) => item.periodMonth === period) ?? defaultPeriod(periods, localDate()))
      : null;
  const selectedId = selected?.id ?? null;

  const loadDetail = useCallback(
    () => (selectedId ? fetchStatement(selectedId) : Promise.resolve(null)),
    [selectedId],
  );
  const detail = useResource(loadDetail);

  const allAccounts = accounts.state.status === "ready" ? accounts.state.data : [];
  const card = allAccounts.find((account) => account.id === accountId) ?? null;
  const loadedDetail = detail.state.status === "ready" ? detail.state.data : null;
  const detailCurrent = selectedId === null || loadedDetail?.id === selectedId;
  const states = [accounts.state.status, list.state.status, detail.state.status];
  const failed = states.includes("error");
  const ready = states.every((state) => state === "ready") && detailCurrent;

  return {
    status: failed ? "error" : ready ? "ready" : "loading",
    accounts: allAccounts,
    card,
    periods,
    selected,
    detail: detailCurrent ? loadedDetail : null,
    reload: () => {
      accounts.reload();
      list.reload();
      detail.reload();
    },
  };
}
