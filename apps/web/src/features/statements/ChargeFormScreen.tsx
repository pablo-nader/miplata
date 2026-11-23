import { DESCRIPTION_MAX_LENGTH } from "@miplata/shared";
import type { FormEvent } from "react";
import { Button } from "../../ui/atoms/Button";
import { FilterChip } from "../../ui/atoms/Chip";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { SelectField, type SelectOption } from "../../ui/molecules/SelectField";
import type { NavAction } from "../../ui/organisms/nav";
import "./statement-form.css";

export type ChargeFormScreenProps = {
  title: string;
  back: NavAction;
  category: {
    label: string;
    value: string;
    options: SelectOption[];
    error?: string | undefined;
    onChange: (value: string) => void;
  };
  currency: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
  };
  amount: {
    label: string;
    value: string;
    error?: string | undefined;
    onChange: (value: string) => void;
  };
  description: { label: string; value: string; onChange: (value: string) => void };
  date: { label: string; value: string; error?: string | undefined; onChange: (v: string) => void };
  hint: string;
  failure: string | null;
  submit: { label: string; busy: boolean; onSubmit: () => void };
  remove?:
    | {
        label: string;
        onRemove: () => void;
        confirm: {
          title: string;
          body: string;
          confirmLabel: string;
          cancelLabel: string;
          onConfirm: () => void;
          onCancel: () => void;
        } | null;
      }
    | undefined;
};

export function ChargeFormScreen(props: ChargeFormScreenProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.submit.onSubmit();
  }
  return (
    <>
      <ScreenHeader title={props.title} back={props.back} />
      <form className="statement-form" onSubmit={handleSubmit} noValidate>
        {props.currency.options.length > 1 ? (
          <fieldset className="statement-form__currencies">
            <legend className="visually-hidden">{props.currency.label}</legend>
            {props.currency.options.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                selected={option.value === props.currency.value}
                onClick={() => props.currency.onChange(option.value)}
              />
            ))}
          </fieldset>
        ) : null}
        <div className="statement-form__amount">
          <input
            className="statement-form__amount-input"
            inputMode="decimal"
            aria-label={props.amount.label}
            aria-invalid={props.amount.error ? true : undefined}
            placeholder="0"
            value={props.amount.value}
            onChange={(event) => props.amount.onChange(event.target.value)}
          />
          {props.amount.error ? (
            <p className="statement-form__error" role="alert">
              {props.amount.error}
            </p>
          ) : null}
        </div>
        <FieldGroup label={props.title}>
          <SelectField
            label={props.category.label}
            value={props.category.value}
            options={props.category.options}
            error={props.category.error}
            onChange={props.category.onChange}
          />
          <Field
            label={props.description.label}
            value={props.description.value}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(event) => props.description.onChange(event.target.value)}
          />
          <Field
            type="date"
            label={props.date.label}
            value={props.date.value}
            error={props.date.error}
            onChange={(event) => props.date.onChange(event.target.value)}
          />
        </FieldGroup>
        <p className="statement-form__hint">{props.hint}</p>
        {props.failure ? (
          <p className="statement-form__error" role="alert">
            {props.failure}
          </p>
        ) : null}
        <div className="statement-form__submit">
          <Button type="submit" disabled={props.submit.busy}>
            {props.submit.label}
          </Button>
        </div>
      </form>
      {props.remove ? (
        <section className="statement-form__manage">
          {props.remove.confirm ? (
            <ConfirmPanel
              title={props.remove.confirm.title}
              body={props.remove.confirm.body}
              confirmLabel={props.remove.confirm.confirmLabel}
              cancelLabel={props.remove.confirm.cancelLabel}
              onConfirm={props.remove.confirm.onConfirm}
              onCancel={props.remove.confirm.onCancel}
              busy={props.submit.busy}
            />
          ) : (
            <Button variant="ghost" onClick={props.remove.onRemove}>
              {props.remove.label}
            </Button>
          )}
        </section>
      ) : null}
    </>
  );
}
