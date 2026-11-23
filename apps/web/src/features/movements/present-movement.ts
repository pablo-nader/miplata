import type { Account, CategoryDto, Currency, Movement } from "@miplata/shared";
import type { TFunction } from "i18next";
import type { AccountBadgeType } from "../../ui/atoms/AccountBadge";
import type { CategoryColor } from "../../ui/atoms/CategoryBadge";
import type { MoneyDirection, MoneyLocale } from "../../ui/format/money";
import { colorOf } from "../categories/catalog";

export type BadgeSpec =
  | { kind: "category"; name: string; icon: string | null; color: CategoryColor }
  | { kind: "account"; type: AccountBadgeType };

export type RowAmount = { amount: number; currency: Currency; direction: MoneyDirection };

export type RowData = {
  id: string;
  occurredOn: string;
  badge: BadgeSpec;
  title: string;
  caption: string;
  amount: RowAmount;
  note?: RowAmount | string;
  tag?: string;
  impact: { currency: Currency; minor: number } | null;
  to: string;
};

export type PresentContext = {
  t: TFunction;
  account: (id: string) => Account | undefined;
  category: (id: string) => CategoryDto | undefined;
  accountName: (account: Account) => string;
  categoryName: (category: CategoryDto) => string;
};

const toUnits = (minor: number) => minor / 100;

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function transferRow(movement: Movement, ctx: PresentContext): Omit<RowData, "to"> {
  const { from, to } = movement;
  const name = (leg: NonNullable<Movement["from"]>) => {
    const account = ctx.account(leg.accountId);
    const base = account ? ctx.accountName(account) : "";
    return leg.currency === "USD" ? `${base} US$` : base;
  };
  const exchange = from && to && from.currency !== to.currency;
  const dollars = from?.currency === "USD" ? from : to;
  const pesos = from?.currency === "USD" ? to : from;
  const main = exchange ? dollars : from;
  const note: RowAmount | undefined =
    exchange && pesos
      ? { amount: toUnits(pesos.amountMinor), currency: pesos.currency, direction: "neutral" }
      : undefined;
  return {
    id: movement.id,
    occurredOn: movement.occurredOn,
    badge: { kind: "account", type: "transfer" },
    title: movement.description ?? ctx.t("movements.transfer"),
    caption: from && to ? `${name(from)} → ${name(to)}` : "",
    amount: {
      amount: toUnits(main?.amountMinor ?? 0),
      currency: main?.currency ?? "ARS",
      direction: "neutral",
    },
    ...(note ? { note } : {}),
    impact: null,
  };
}

function entryRow(movement: Movement, ctx: PresentContext): Omit<RowData, "to"> {
  const leg = movement.account;
  const category = movement.categoryId ? ctx.category(movement.categoryId) : undefined;
  const account = leg ? ctx.account(leg.accountId) : undefined;
  const person = movement.person ? ctx.account(movement.person.personId) : undefined;
  const personName = person ? ctx.accountName(person) : "";
  const parts = movement.installments;
  const multi = parts.length > 1;
  const first = parts[0];
  const ownTotal = sum(parts.map((part) => part.ownAmountMinor));
  const currency = leg?.currency ?? "ARS";
  const isIncome = movement.type === "income";
  const categoryName = category ? ctx.categoryName(category) : "";
  const accountName = account ? ctx.accountName(account) : "";
  const wholly = movement.person !== null && ownTotal === 0;
  const shownMinor = wholly
    ? ((multi ? first?.amountMinor : leg?.amountMinor) ?? 0)
    : multi
      ? (first?.ownAmountMinor ?? 0)
      : ownTotal;
  const direction: MoneyDirection = wholly ? "neutral" : isIncome ? "income" : "expense";
  const tags = [multi ? `1/${parts.length}` : null, movement.person ? personName : null].filter(
    (value): value is string => Boolean(value),
  );
  const impactMinor = multi ? (first?.ownAmountMinor ?? 0) : ownTotal;
  return {
    id: movement.id,
    occurredOn: movement.occurredOn,
    badge: wholly
      ? { kind: "account", type: "person" }
      : {
          kind: "category",
          name: categoryName,
          icon: category?.icon ?? null,
          color: category ? colorOf(category) : 1,
        },
    title: movement.description ?? categoryName,
    caption: `${wholly ? ctx.t("movements.loan") : categoryName} · ${accountName}`,
    amount: { amount: toUnits(shownMinor), currency, direction },
    ...(wholly ? { note: ctx.t("movements.notExpense") } : {}),
    ...(tags.length > 0 ? { tag: tags.join(" · ") } : {}),
    impact: wholly ? null : { currency, minor: isIncome ? impactMinor : -impactMinor },
  };
}

export function statementPathOf(movement: Movement): string | null {
  const { statement } = movement;
  if (!statement) {
    return null;
  }
  const base = `/accounts/${statement.accountId}/statement`;
  const query = `?period=${statement.periodMonth}`;
  return movement.type === "expense" ? `${base}/charges/${movement.id}${query}` : `${base}${query}`;
}

export function presentMovement(movement: Movement, ctx: PresentContext): RowData {
  const row = movement.type === "transfer" ? transferRow(movement, ctx) : entryRow(movement, ctx);
  return { ...row, to: statementPathOf(movement) ?? `/movements/${movement.id}/edit` };
}

export type DayGroup = {
  date: string;
  rows: RowData[];
  totals: { currency: Currency; amount: number }[];
};

export function groupByDay(rows: readonly RowData[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    let group = groups.at(-1);
    if (!group || group.date !== row.occurredOn) {
      group = { date: row.occurredOn, rows: [], totals: [] };
      groups.push(group);
    }
    group.rows.push(row);
    if (row.impact) {
      const { currency, minor } = row.impact;
      const existing = group.totals.find((entry) => entry.currency === currency);
      if (existing) {
        existing.amount += toUnits(minor);
      } else {
        group.totals.push({ currency, amount: toUnits(minor) });
      }
    }
  }
  return groups;
}

export function localDate(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function shiftDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function dayLabel(isoDate: string, today: string, locale: MoneyLocale, t: TFunction) {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${isoDate}T00:00:00Z`))
    .replace(".", "");
  if (isoDate === today) {
    return t("movements.today", { date: formatted });
  }
  return isoDate === shiftDays(today, -1)
    ? t("movements.yesterday", { date: formatted })
    : formatted;
}

export function monthOfDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthRange(month: string): { from: string; to: string } {
  const [year, number] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
