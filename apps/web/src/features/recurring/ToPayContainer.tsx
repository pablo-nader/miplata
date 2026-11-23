import type { Account, Occurrence, OccurrenceList } from "@miplata/shared";
import { isoDateSchema } from "@miplata/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import type { CategoryColor } from "../../ui/atoms/CategoryBadge";
import { localeForLanguage } from "../../ui/format/money";
import { displayName, minorToUnits } from "../accounts/account-display";
import { allCategories, colorOf, useLabel } from "../categories/catalog";
import { holdsCurrency, parseAmountMinor, units } from "../movements/movement-form";
import type { MutationResult } from "../movements/movements-api";
import { useLookups } from "../movements/useLookups";
import { AdjustPanel, type AdjustValues } from "./AdjustPanel";
import { confirmOccurrence, fetchOccurrences, skipOccurrence } from "./recurring-api";
import { confirmDate, dueKind, failureKey, sectionsOf, shortDate } from "./recurring-display";
import { type ToPayRowData, ToPayScreen, type ToPaySectionData } from "./ToPayScreen";

const KNOWN_FAILURES = new Set([
  "account_inactive",
  "account_not_allowed",
  "account_not_found",
  "amount_required",
  "amount_too_small",
  "card_without_schedule",
  "category_inactive",
  "currency_not_in_account",
  "network",
  "occurrence_resolved",
]);

type Adjusting = {
  id: string;
  values: AdjustValues;
  errors: { amount?: string; date?: string };
};

function usableAccounts(accounts: readonly Account[], occurrence: Occurrence): Account[] {
  return accounts.filter(
    (account) =>
      account.type !== "person" &&
      holdsCurrency(account, occurrence.currency) &&
      (account.isActive || account.id === occurrence.accountId),
  );
}

export function ToPayContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const lookups = useLookups();
  const categoryLabel = useLabel();
  const resource = useResource(fetchOccurrences);
  const [last, setLast] = useState<OccurrenceList | null>(null);
  const [adjusting, setAdjusting] = useState<Adjusting | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resource.state.status === "ready") {
      setLast(resource.state.data);
    }
  }, [resource.state]);

  const list = resource.state.status === "ready" ? resource.state.data : last;
  const loadFailed = resource.state.status === "error" || lookups.status === "error";
  const status = loadFailed ? "error" : list && lookups.status === "ready" ? "ready" : "loading";

  const accountById = new Map(lookups.accounts.map((account) => [account.id, account]));
  const categoryById = new Map(
    (lookups.catalog ? allCategories(lookups.catalog) : []).map((category) => [
      category.id,
      category,
    ]),
  );
  const today = list?.today ?? "";

  function failureText(error: string): string {
    return t(`toPay.failures.${failureKey(error, KNOWN_FAILURES, "failed")}`);
  }

  async function run(action: () => Promise<MutationResult<unknown>>) {
    setBusy(true);
    setFailure(null);
    const result = await action();
    setBusy(false);
    if (result.ok || result.error === "occurrence_resolved") {
      setAdjusting(null);
      resource.reload();
    }
    if (!result.ok) {
      setFailure(failureText(result.error));
    }
  }

  function find(id: string): Occurrence | undefined {
    return list?.items.find((item) => item.id === id);
  }

  function open(id: string) {
    const occurrence = find(id);
    if (!occurrence) {
      return;
    }
    setFailure(null);
    setAdjusting({
      id,
      values: {
        amount:
          occurrence.suggestedAmountMinor === null ? "" : units(occurrence.suggestedAmountMinor),
        accountId: occurrence.accountId,
        date: confirmDate(occurrence, today),
      },
      errors: {},
    });
  }

  function confirmQuick(id: string) {
    const occurrence = find(id);
    if (occurrence) {
      void run(() => confirmOccurrence(id, { occurredOn: confirmDate(occurrence, today) }));
    }
  }

  function confirmAdjusted() {
    const occurrence = adjusting ? find(adjusting.id) : undefined;
    if (!adjusting || !occurrence) {
      return;
    }
    const amountMinor = parseAmountMinor(adjusting.values.amount, occurrence.currency);
    const dateValid = isoDateSchema.safeParse(adjusting.values.date).success;
    if (amountMinor === null || !dateValid) {
      setAdjusting({
        ...adjusting,
        errors: {
          ...(amountMinor === null ? { amount: t("toPay.adjust.errors.amount") } : {}),
          ...(dateValid ? {} : { date: t("toPay.adjust.errors.date") }),
        },
      });
      return;
    }
    void run(() =>
      confirmOccurrence(occurrence.id, {
        amountMinor,
        accountId: adjusting.values.accountId,
        occurredOn: adjusting.values.date,
      }),
    );
  }

  function rowFor(occurrence: Occurrence): ToPayRowData {
    const category = categoryById.get(occurrence.categoryId);
    const account = accountById.get(occurrence.accountId);
    const categoryName = category ? categoryLabel(category) : "";
    const title = occurrence.description ?? categoryName;
    const kind = dueKind(occurrence.dueOn, today);
    const date = shortDate(occurrence.dueOn, locale);
    const dueText =
      kind === "today"
        ? t("toPay.due.today")
        : kind === "overdue"
          ? t("toPay.due.overdue", { date })
          : date;
    const caption = [
      dueText,
      account ? displayName(account, t) : null,
      occurrence.amountMode === "variable" ? t("toPay.variable") : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const color: CategoryColor = category ? colorOf(category) : 1;
    const active = adjusting?.id === occurrence.id ? adjusting : null;
    return {
      id: occurrence.id,
      title,
      caption,
      badge: { name: categoryName, icon: category?.icon ?? null, color },
      amount:
        occurrence.suggestedAmountMinor === null
          ? null
          : {
              amount: minorToUnits(occurrence.suggestedAmountMinor),
              currency: occurrence.currency,
              locale,
              direction: occurrence.type === "income" ? "income" : "neutral",
            },
      variable: occurrence.amountMode === "variable",
      labels: {
        confirm: t("toPay.confirmFor", { name: title }),
        adjust: t("toPay.adjustFor", { name: title }),
        skip: t("toPay.skipFor", { name: title }),
      },
      panel: active ? (
        <AdjustPanel
          copy={{
            title: t("toPay.adjust.title", { name: title }),
            amount: t("toPay.adjust.amount"),
            account: t("toPay.adjust.account"),
            date: t("toPay.adjust.date"),
            confirm: t("toPay.actions.confirm"),
            skip: t("toPay.actions.skip"),
            cancel: t("toPay.actions.cancel"),
          }}
          currency={occurrence.currency}
          values={active.values}
          accounts={usableAccounts(lookups.accounts, occurrence).map((item) => ({
            value: item.id,
            label: displayName(item, t),
          }))}
          errors={active.errors}
          busy={busy}
          onChange={(patch) =>
            setAdjusting({ ...active, values: { ...active.values, ...patch }, errors: {} })
          }
          onConfirm={confirmAdjusted}
          onSkip={() => void run(() => skipOccurrence(occurrence.id))}
          onCancel={() => setAdjusting(null)}
        />
      ) : null,
    };
  }

  const grouped = list ? sectionsOf(list.items, list.today) : null;
  const sections: ToPaySectionData[] =
    status === "ready" && grouped
      ? (
          [
            ["due", grouped.due],
            ["upcoming", grouped.upcoming],
            ["receivable", grouped.receivable],
          ] as const
        )
          .filter(([, items]) => items.length > 0)
          .map(([key, items]) => ({
            key,
            label: t(`toPay.sections.${key}`),
            rows: items.map(rowFor),
          }))
      : [];

  return (
    <ToPayScreen
      title={t("screens.toPay.title")}
      back={{ to: "/home", label: t("nav.backHome") }}
      status={status}
      sections={sections}
      failure={failure}
      busy={busy}
      messages={{
        loading: t("toPay.loading"),
        loadFailed: t("toPay.loadFailed"),
        retry: t("toPay.retry"),
        emptyTitle: t("toPay.emptyTitle"),
        emptyDescription: t("toPay.emptyDescription"),
        noAmount: t("toPay.noAmount"),
        confirm: t("toPay.actions.confirm"),
        adjust: t("toPay.actions.adjust"),
        skip: t("toPay.actions.skip"),
      }}
      onConfirm={confirmQuick}
      onAdjust={open}
      onSkip={(id) => void run(() => skipOccurrence(id))}
      onRetry={() => {
        lookups.reload();
        resource.reload();
      }}
    />
  );
}
