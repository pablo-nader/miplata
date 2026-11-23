import type { Account, CategoriesResponse } from "@miplata/shared";
import { categoryLabel } from "@miplata/shared";
import type { TFunction } from "i18next";
import { displayName } from "../accounts/account-display";
import { allCategories } from "../categories/catalog";
import type { UiFilters } from "./MovementFiltersPanel";
import { parseAmountMinor } from "./movement-form";
import type { MovementFilters } from "./movements-api";
import { monthRange } from "./present-movement";

export function defaultFilters(month: string): UiFilters {
  const range = monthRange(month);
  return {
    from: range.from,
    to: range.to,
    type: "",
    accountId: "",
    personId: "",
    groupId: "",
    categoryId: "",
    currency: "",
    min: "",
    max: "",
  };
}

export function emptyFilters(): UiFilters {
  return { ...defaultFilters("2000-01"), from: "", to: "" };
}

export function isInvertedRange(ui: UiFilters): boolean {
  const min = ui.min.trim() ? parseAmountMinor(ui.min, "ARS") : null;
  const max = ui.max.trim() ? parseAmountMinor(ui.max, "ARS") : null;
  const dates = ui.from !== "" && ui.to !== "" && ui.from > ui.to;
  return dates || (min !== null && max !== null && min > max);
}

export function toQuery(ui: UiFilters, q: string): MovementFilters {
  const min = ui.min.trim() ? parseAmountMinor(ui.min, "ARS") : null;
  const max = ui.max.trim() ? parseAmountMinor(ui.max, "ARS") : null;
  return {
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(ui.from ? { from: ui.from } : {}),
    ...(ui.to ? { to: ui.to } : {}),
    ...(ui.type ? { type: ui.type } : {}),
    ...(ui.accountId ? { accountId: ui.accountId } : {}),
    ...(ui.personId ? { personId: ui.personId } : {}),
    ...(ui.groupId ? { groupId: ui.groupId } : {}),
    ...(ui.categoryId ? { categoryId: ui.categoryId } : {}),
    ...(ui.currency ? { currency: ui.currency } : {}),
    ...(min !== null ? { minAmountMinor: min } : {}),
    ...(max !== null ? { maxAmountMinor: max } : {}),
  };
}

export type ActiveChip = {
  key: keyof UiFilters | "period";
  label: string;
  clear: Partial<UiFilters>;
};

type ChipContext = {
  t: TFunction;
  locale: string;
  accounts: readonly Account[];
  catalog: CategoriesResponse | null;
};

function periodLabel(ui: UiFilters, locale: string): string {
  const range = ui.from ? monthRange(ui.from.slice(0, 7)) : null;
  if (range && range.from === ui.from && range.to === ui.to) {
    const name = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
      new Date(`${ui.from}T00:00:00Z`),
    );
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  }
  return `${ui.from || "…"} – ${ui.to || "…"}`;
}

export function activeChips(ui: UiFilters, ctx: ChipContext): ActiveChip[] {
  const { t, locale, accounts, catalog } = ctx;
  const chips: ActiveChip[] = [];
  const accountName = (id: string) => {
    const account = accounts.find((item) => item.id === id);
    return account ? displayName(account, t) : id;
  };
  if (ui.from || ui.to) {
    chips.push({ key: "period", label: periodLabel(ui, locale), clear: { from: "", to: "" } });
  }
  if (ui.type) {
    chips.push({ key: "type", label: t(`movements.types.${ui.type}`), clear: { type: "" } });
  }
  if (ui.accountId) {
    chips.push({ key: "accountId", label: accountName(ui.accountId), clear: { accountId: "" } });
  }
  if (ui.personId) {
    chips.push({ key: "personId", label: accountName(ui.personId), clear: { personId: "" } });
  }
  if (ui.groupId) {
    const group = catalog?.expenseGroups.find((item) => item.id === ui.groupId);
    chips.push({
      key: "groupId",
      label: group ? categoryLabel(group, (key) => t(key)) : ui.groupId,
      clear: { groupId: "" },
    });
  }
  if (ui.categoryId) {
    const category = catalog
      ? allCategories(catalog).find((item) => item.id === ui.categoryId)
      : null;
    chips.push({
      key: "categoryId",
      label: category ? categoryLabel(category, (key) => t(key)) : ui.categoryId,
      clear: { categoryId: "" },
    });
  }
  if (ui.currency) {
    chips.push({ key: "currency", label: ui.currency, clear: { currency: "" } });
  }
  if (ui.min.trim() && parseAmountMinor(ui.min, "ARS") !== null) {
    chips.push({
      key: "min",
      label: t("movements.filters.minChip", { amount: ui.min.trim() }),
      clear: { min: "" },
    });
  }
  if (ui.max.trim() && parseAmountMinor(ui.max, "ARS") !== null) {
    chips.push({
      key: "max",
      label: t("movements.filters.maxChip", { amount: ui.max.trim() }),
      clear: { max: "" },
    });
  }
  return chips;
}
