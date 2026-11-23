import type { Currency, LoanLine } from "@miplata/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useResource } from "../../shared/use-resource";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { CategoryPickerContainer } from "../categories/CategoryPickerContainer";
import { localDate } from "../movements/present-movement";
import { useLookups } from "../movements/useLookups";
import { type DetailSection, LoanDetailScreen } from "./LoanDetailScreen";
import { fetchLoanDetail, forgiveDebt } from "./loans-api";
import {
  DIRECTIONS,
  forgivenessCategoryType,
  type LoanDirection,
  repaymentPath,
} from "./loans-view";
import "./loans-screen.css";

const KNOWN_FAILURES = new Set([
  "category_type_mismatch",
  "category_inactive",
  "category_not_found",
  "nothing_owed",
  "not_found",
]);

type Forgiving = { direction: LoanDirection; currency: Currency; amountMinor: number };

export function LoanDetailContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const { personId = "" } = useParams();
  const load = useCallback(() => fetchLoanDetail(personId), [personId]);
  const { state, reload } = useResource(load);
  const lookups = useLookups();
  const [forgiving, setForgiving] = useState<Forgiving | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const detail = state.status === "ready" ? state.data : null;
  const name = detail?.name ?? "";
  const money = (minor: number, currency: Currency) => formatMoney(minor / 100, currency, locale);

  function startForgiving(next: Forgiving) {
    setCategoryId(null);
    setFailure(null);
    setForgiving(next);
  }

  async function confirmForgiving() {
    if (!forgiving || !categoryId) {
      return;
    }
    setBusy(true);
    setFailure(null);
    const result = await forgiveDebt(personId, {
      currency: forgiving.currency,
      categoryId,
      occurredOn: localDate(),
    });
    setBusy(false);
    if (result.ok) {
      setForgiving(null);
      reload();
      return;
    }
    setFailure(
      KNOWN_FAILURES.has(result.error)
        ? t(`loans.forgive.failures.${result.error}`)
        : t("loans.forgive.failures.saveFailed"),
    );
  }

  const sections: DetailSection[] = DIRECTIONS.flatMap((direction) => {
    const lines: LoanLine[] = detail?.[direction] ?? [];
    if (lines.length === 0) {
      return [];
    }
    return [
      {
        key: direction,
        heading: t(direction === "owesYou" ? "loans.personOwesYou" : "loans.personYouOwe"),
        lines: lines.map((line) => ({
          key: line.currency,
          amount: {
            amount: line.amountMinor / 100,
            currency: line.currency,
            locale,
            direction: direction === "owesYou" ? "income" : "neutral",
          },
          details: [
            ...(line.dueNowMinor > 0
              ? [t("loans.dueNow", { amount: money(line.dueNowMinor, line.currency) })]
              : []),
            ...(line.pendingTotalMinor > 0
              ? [t("loans.pendingTotal", { amount: money(line.pendingTotalMinor, line.currency) })]
              : []),
          ],
          repay: {
            to: repaymentPath(personId, direction, line),
            label: t("loans.detail.repay"),
          },
          forgive: {
            label: t(
              direction === "owesYou"
                ? "loans.detail.forgiveOwesYou"
                : "loans.detail.forgiveYouOwe",
            ),
            onClick: () =>
              startForgiving({
                direction,
                currency: line.currency,
                amountMinor: line.amountMinor,
              }),
          },
        })),
      },
    ];
  });

  const status =
    state.status === "error" || lookups.status === "error"
      ? "error"
      : state.status === "loading" || lookups.status === "loading"
        ? "loading"
        : detail === null
          ? "missing"
          : "ready";

  const amountText = forgiving ? money(forgiving.amountMinor, forgiving.currency) : "";
  const suffix = forgiving?.direction === "owesYou" ? "OwesYou" : "YouOwe";
  const panel = forgiving ? (
    <ConfirmPanel
      key={`${forgiving.direction}:${forgiving.currency}`}
      title={t(`loans.forgive.title${suffix}`, { name })}
      body={t(`loans.forgive.body${suffix}`, { name, amount: amountText })}
      confirmLabel={busy ? t("loans.forgive.working") : t("loans.forgive.confirm")}
      cancelLabel={t("loans.forgive.cancel")}
      confirmDisabled={categoryId === null}
      busy={busy}
      onConfirm={confirmForgiving}
      onCancel={() => setForgiving(null)}
    >
      <CategoryPickerContainer
        type={forgivenessCategoryType(forgiving.direction)}
        value={categoryId}
        onChange={setCategoryId}
      />
      {failure ? (
        <p role="alert" className="loans-screen__failure">
          {failure}
        </p>
      ) : null}
    </ConfirmPanel>
  ) : null;

  return (
    <LoanDetailScreen
      title={name || t("screens.loanDetail.title")}
      back={{ to: "/loans", label: t("loans.backToList") }}
      status={status}
      locale={locale}
      sections={sections}
      settled={t("loans.detail.settled")}
      movementsHeading={t("loans.detail.movements")}
      movements={
        detail && lookups.status === "ready"
          ? detail.movements.map((movement) => lookups.present(movement))
          : []
      }
      noMovements={t("loans.detail.noMovements")}
      panel={panel}
      messages={{
        loading: t("loans.loading"),
        loadFailed: t("loans.loadFailed"),
        notFound: t("loans.detail.notFound"),
        retry: t("loans.retry"),
      }}
      onRetry={() => {
        reload();
        lookups.reload();
      }}
    />
  );
}
