import type { Recurring } from "@miplata/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import type { CategoryColor } from "../../ui/atoms/CategoryBadge";
import { localeForLanguage } from "../../ui/format/money";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { displayName, minorToUnits } from "../accounts/account-display";
import { allCategories, colorOf, useLabel } from "../categories/catalog";
import type { MutationResult } from "../movements/movements-api";
import { localDate } from "../movements/present-movement";
import { useLookups } from "../movements/useLookups";
import {
  type RecurringAction,
  RecurringListScreen,
  type RecurringRowData,
} from "./RecurringListScreen";
import { endRecurring, fetchRecurringList, pauseRecurring, resumeRecurring } from "./recurring-api";
import { failureKey, statusOf } from "./recurring-display";

const KNOWN_FAILURES = new Set(["network", "recurring_ended"]);

export function RecurringListContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const lookups = useLookups();
  const categoryLabel = useLabel();
  const resource = useResource(fetchRecurringList);
  const [ending, setEnding] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const today = localDate();

  const items = resource.state.status === "ready" ? resource.state.data.items : [];
  const status =
    resource.state.status === "error" || lookups.status === "error"
      ? "error"
      : resource.state.status === "ready" && lookups.status === "ready"
        ? "ready"
        : "loading";

  const accountById = new Map(lookups.accounts.map((account) => [account.id, account]));
  const categoryById = new Map(
    (lookups.catalog ? allCategories(lookups.catalog) : []).map((category) => [
      category.id,
      category,
    ]),
  );

  async function run(action: () => Promise<MutationResult<unknown>>) {
    setBusy(true);
    setFailure(null);
    const result = await action();
    setBusy(false);
    setEnding(null);
    if (result.ok) {
      resource.reload();
      return;
    }
    setFailure(t(`recurring.failures.${failureKey(result.error, KNOWN_FAILURES, "failed")}`));
  }

  function actionsFor(recurring: Recurring, name: string): RecurringAction[] {
    const state = statusOf(recurring, today);
    if (state === "ended") {
      return [];
    }
    const toggle: RecurringAction =
      state === "paused"
        ? {
            key: "resume",
            label: t("recurring.actions.resume"),
            name: t("recurring.actions.resumeFor", { name }),
            onClick: () => void run(() => resumeRecurring(recurring.id)),
          }
        : {
            key: "pause",
            label: t("recurring.actions.pause"),
            name: t("recurring.actions.pauseFor", { name }),
            onClick: () => void run(() => pauseRecurring(recurring.id)),
          };
    return [
      toggle,
      {
        key: "end",
        label: t("recurring.actions.end"),
        name: t("recurring.actions.endFor", { name }),
        onClick: () => setEnding(recurring.id),
      },
    ];
  }

  function rowFor(recurring: Recurring): RecurringRowData {
    const category = categoryById.get(recurring.categoryId);
    const account = accountById.get(recurring.accountId);
    const categoryName = category ? categoryLabel(category) : "";
    const title = recurring.description ?? categoryName;
    const color: CategoryColor = category ? colorOf(category) : 1;
    const caption = [
      t(`recurring.frequencies.${recurring.frequency}`),
      t("recurring.day", { day: recurring.dayOfMonth }),
      account ? displayName(account, t) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: recurring.id,
      title,
      caption,
      status: t(`recurring.status.${statusOf(recurring, today)}`),
      badge: { name: categoryName, icon: category?.icon ?? null, color },
      amount:
        recurring.amountMinor === null
          ? null
          : {
              amount: minorToUnits(recurring.amountMinor),
              currency: recurring.currency,
              locale,
              direction: recurring.type === "income" ? "income" : "neutral",
            },
      to: `/recurring/${recurring.id}/edit`,
      actions: actionsFor(recurring, title),
      panel:
        ending === recurring.id ? (
          <ConfirmPanel
            title={t("recurring.confirmEndTitle", { name: title })}
            body={t("recurring.confirmEndBody")}
            confirmLabel={t("recurring.actions.confirm")}
            cancelLabel={t("recurring.actions.cancel")}
            onConfirm={() => void run(() => endRecurring(recurring.id))}
            onCancel={() => setEnding(null)}
            busy={busy}
          />
        ) : null,
    };
  }

  return (
    <RecurringListScreen
      title={t("screens.recurring.title")}
      back={{ to: "/menu", label: t("nav.menu") }}
      add={{ to: "/recurring/new", label: t("recurring.add") }}
      status={status}
      rows={status === "ready" ? items.map(rowFor) : []}
      failure={failure}
      busy={busy}
      messages={{
        loading: t("recurring.loading"),
        loadFailed: t("recurring.loadFailed"),
        retry: t("recurring.retry"),
        emptyTitle: t("recurring.emptyTitle"),
        emptyDescription: t("recurring.emptyDescription"),
        emptyAdd: t("recurring.add"),
        variable: t("recurring.variable"),
      }}
      onRetry={() => {
        lookups.reload();
        resource.reload();
      }}
    />
  );
}
