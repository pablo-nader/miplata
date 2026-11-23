import type { Account, CategoriesResponse, Currency, MovementType } from "@miplata/shared";
import { categoryLabel } from "@miplata/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/atoms/Button";
import { Field } from "../../ui/molecules/Field";
import { MoneyField } from "../../ui/molecules/MoneyField";
import { SelectField, type SelectGroup, type SelectOption } from "../../ui/molecules/SelectField";
import { displayName } from "../accounts/account-display";
import { amountCurrency } from "./movement-filters";
import "./movements-screen.css";

export type UiFilters = {
  from: string;
  to: string;
  type: "" | MovementType;
  accountId: string;
  personId: string;
  groupId: string;
  categoryId: string;
  currency: "" | Currency;
  min: string;
  max: string;
};

type MovementFiltersPanelProps = {
  value: UiFilters;
  onChange: (next: UiFilters) => void;
  onClear: () => void;
  accounts: readonly Account[];
  catalog: CategoriesResponse | null;
};

export function MovementFiltersPanel({
  value,
  onChange,
  onClear,
  accounts,
  catalog,
}: MovementFiltersPanelProps) {
  const { t } = useTranslation();
  const any = (label: string): SelectOption => ({ value: "", label });
  const set = (patch: Partial<UiFilters>) => onChange({ ...value, ...patch });
  const label = (item: { name: string | null; nameKey: string | null }) =>
    categoryLabel(item, (key) => t(key));

  const accountOptions = [
    any(t("movements.filters.any")),
    ...accounts
      .filter((account) => account.type !== "person")
      .map((account) => ({ value: account.id, label: displayName(account, t) })),
  ];
  const personOptions = [
    any(t("movements.filters.any")),
    ...accounts
      .filter((account) => account.type === "person")
      .map((account) => ({ value: account.id, label: displayName(account, t) })),
  ];
  const groupOptions = [
    any(t("movements.filters.any")),
    ...(catalog?.expenseGroups ?? []).map((group) => ({ value: group.id, label: label(group) })),
  ];
  const categoryGroups: SelectGroup[] = [
    ...(catalog?.expenseGroups ?? []).map((group) => ({
      label: label(group),
      options: group.categories.map((category) => ({
        value: category.id,
        label: label(category),
      })),
    })),
    {
      label: t("movements.types.income"),
      options: (catalog?.income ?? []).map((category) => ({
        value: category.id,
        label: label(category),
      })),
    },
  ];
  const typeOptions = [
    any(t("movements.filters.any")),
    { value: "expense", label: t("movements.types.expense") },
    { value: "income", label: t("movements.types.income") },
    { value: "transfer", label: t("movements.types.transfer") },
  ];
  const currencyOptions = [
    any(t("movements.filters.any")),
    { value: "ARS", label: t("accounts.currencyNames.ARS") },
    { value: "USD", label: t("accounts.currencyNames.USD") },
  ];

  return (
    <section className="movements-filters" aria-label={t("movements.filters.title")}>
      <div className="movements-filters__row">
        <Field
          type="date"
          label={t("movements.filters.from")}
          value={value.from}
          onChange={(event) => set({ from: event.target.value })}
        />
        <Field
          type="date"
          label={t("movements.filters.to")}
          value={value.to}
          onChange={(event) => set({ to: event.target.value })}
        />
      </div>
      <SelectField
        label={t("movements.filters.type")}
        value={value.type}
        options={typeOptions}
        onChange={(next) => set({ type: next as UiFilters["type"] })}
      />
      <SelectField
        label={t("movements.filters.account")}
        value={value.accountId}
        options={accountOptions}
        onChange={(next) => set({ accountId: next })}
      />
      <SelectField
        label={t("movements.filters.group")}
        value={value.groupId}
        options={groupOptions}
        onChange={(next) => set({ groupId: next })}
      />
      <SelectField
        label={t("movements.filters.category")}
        value={value.categoryId}
        options={[any(t("movements.filters.any"))]}
        groups={categoryGroups}
        onChange={(next) => set({ categoryId: next })}
      />
      <SelectField
        label={t("movements.filters.person")}
        value={value.personId}
        options={personOptions}
        onChange={(next) => set({ personId: next })}
      />
      <SelectField
        label={t("movements.filters.currency")}
        value={value.currency}
        options={currencyOptions}
        onChange={(next) => set({ currency: next as UiFilters["currency"] })}
      />
      <div className="movements-filters__row">
        <MoneyField
          label={t("movements.filters.min", { currency: amountCurrency(value) })}
          value={value.min}
          currency={amountCurrency(value)}
          onValueChange={(min) => set({ min })}
        />
        <MoneyField
          label={t("movements.filters.max", { currency: amountCurrency(value) })}
          value={value.max}
          currency={amountCurrency(value)}
          onValueChange={(max) => set({ max })}
        />
      </div>
      <Button variant="ghost" onClick={onClear}>
        {t("movements.filters.clear")}
      </Button>
    </section>
  );
}
