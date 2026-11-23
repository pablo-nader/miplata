import { DESCRIPTION_MAX_LENGTH } from "@miplata/shared";
import type { FormEvent, ReactNode } from "react";
import { Button } from "../../ui/atoms/Button";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { SegmentedControl } from "../../ui/molecules/SegmentedControl";
import { SelectField, type SelectOption } from "../../ui/molecules/SelectField";
import type { NavAction } from "../../ui/organisms/nav";
import "../movements/movement-form-screen.css";
import type { FormErrorKey, FormState } from "./recurring-form";

export type RecurringFormCopy = {
  type: string;
  types: { expense: string; income: string };
  description: string;
  amountMode: string;
  amountModes: { fixed: string; variable: string };
  amount: string;
  amountHint: string;
  currency: string;
  account: string;
  frequency: string;
  frequencies: SelectOption[];
  day: string;
  dayHint: string;
  startsOn: string;
  endsOn: string;
  submit: string;
  saving: string;
};

type RecurringFormScreenProps = {
  title: string;
  back: NavAction;
  copy: RecurringFormCopy;
  values: FormState;
  onChange: (patch: Partial<FormState>) => void;
  errors: Partial<Record<FormErrorKey, string>>;
  accounts: SelectOption[];
  currencies: SelectOption[];
  categoryPicker: ReactNode;
  categoryError: string | undefined;
  failure: string | null;
  busy: boolean;
  onSubmit: () => void;
};

export function RecurringFormScreen({
  title,
  back,
  copy,
  values,
  onChange,
  errors,
  accounts,
  currencies,
  categoryPicker,
  categoryError,
  failure,
  busy,
  onSubmit,
}: RecurringFormScreenProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <>
      <ScreenHeader title={title} back={back} />
      <form className="movement-form" onSubmit={handleSubmit} noValidate>
        <SegmentedControl
          label={copy.type}
          value={values.type}
          options={[
            { value: "expense", label: copy.types.expense },
            { value: "income", label: copy.types.income },
          ]}
          onChange={(value) => onChange({ type: value === "income" ? "income" : "expense" })}
        />
        <SegmentedControl
          label={copy.amountMode}
          value={values.amountMode}
          options={[
            { value: "fixed", label: copy.amountModes.fixed },
            { value: "variable", label: copy.amountModes.variable },
          ]}
          onChange={(value) =>
            onChange({ amountMode: value === "variable" ? "variable" : "fixed" })
          }
        />
        <FieldGroup label={copy.amount}>
          <Field
            inputMode="decimal"
            label={copy.amount}
            value={values.amount}
            error={errors.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
          />
          {values.amountMode === "variable" ? (
            <p className="movement-form__hint">{copy.amountHint}</p>
          ) : null}
          <SelectField
            label={copy.currency}
            value={values.currency}
            options={currencies}
            onChange={(value) => onChange({ currency: value === "USD" ? "USD" : "ARS" })}
          />
        </FieldGroup>
        <div className="movement-form__category">
          {categoryPicker}
          {categoryError ? (
            <p className="movement-form__error" role="alert">
              {categoryError}
            </p>
          ) : null}
        </div>
        <FieldGroup label={copy.account}>
          <SelectField
            label={copy.account}
            value={values.accountId ?? ""}
            options={accounts}
            error={errors.account}
            onChange={(value) => onChange({ accountId: value || null })}
          />
          <Field
            label={copy.description}
            value={values.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </FieldGroup>
        <FieldGroup label={copy.frequency}>
          <SelectField
            label={copy.frequency}
            value={values.frequency}
            options={copy.frequencies}
            onChange={(value) =>
              onChange({
                frequency: value === "bimonthly" || value === "yearly" ? value : "monthly",
              })
            }
          />
          <Field
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            label={copy.day}
            value={values.dayOfMonth}
            error={errors.day}
            onChange={(event) => onChange({ dayOfMonth: event.target.value })}
          />
          <p className="movement-form__hint">{copy.dayHint}</p>
          <Field
            type="date"
            label={copy.startsOn}
            value={values.startsOn}
            error={errors.startsOn}
            onChange={(event) => onChange({ startsOn: event.target.value })}
          />
          <Field
            type="date"
            label={copy.endsOn}
            value={values.endsOn}
            error={errors.endsOn}
            onChange={(event) => onChange({ endsOn: event.target.value })}
          />
        </FieldGroup>
        {failure ? (
          <p className="movement-form__error" role="alert">
            {failure}
          </p>
        ) : null}
        <div className="movement-form__submit">
          <Button type="submit" disabled={busy}>
            {busy ? copy.saving : copy.submit}
          </Button>
        </div>
      </form>
    </>
  );
}
