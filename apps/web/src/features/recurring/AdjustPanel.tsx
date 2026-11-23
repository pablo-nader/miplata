import type { Currency } from "@miplata/shared";
import { Button } from "../../ui/atoms/Button";
import { Field } from "../../ui/molecules/Field";
import { MoneyField } from "../../ui/molecules/MoneyField";
import { SelectField, type SelectOption } from "../../ui/molecules/SelectField";
import "./to-pay-screen.css";

export type AdjustValues = { amount: string; accountId: string; date: string };

export type AdjustCopy = {
  title: string;
  amount: string;
  account: string;
  date: string;
  confirm: string;
  skip: string;
  cancel: string;
};

export type AdjustPanelProps = {
  copy: AdjustCopy;
  currency: Currency;
  values: AdjustValues;
  accounts: SelectOption[];
  errors: { amount?: string; date?: string };
  busy: boolean;
  onChange: (patch: Partial<AdjustValues>) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
};

export function AdjustPanel({
  copy,
  currency,
  values,
  accounts,
  errors,
  busy,
  onChange,
  onConfirm,
  onSkip,
  onCancel,
}: AdjustPanelProps) {
  return (
    <section className="adjust-panel" aria-label={copy.title}>
      <MoneyField
        label={copy.amount}
        value={values.amount}
        currency={currency}
        error={errors.amount}
        onValueChange={(amount) => onChange({ amount })}
      />
      <SelectField
        label={copy.account}
        value={values.accountId}
        options={accounts}
        onChange={(accountId) => onChange({ accountId })}
      />
      <Field
        type="date"
        label={copy.date}
        value={values.date}
        error={errors.date}
        onChange={(event) => onChange({ date: event.target.value })}
      />
      <div className="adjust-panel__actions">
        <Button onClick={onConfirm} disabled={busy}>
          {copy.confirm}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={busy}>
          {copy.skip}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {copy.cancel}
        </Button>
      </div>
    </section>
  );
}
