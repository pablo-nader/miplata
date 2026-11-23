import { ArrowLeftRight } from "lucide-react";
import type { FormEvent } from "react";
import { Button } from "../../ui/atoms/Button";
import { Switch } from "../../ui/atoms/Switch";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { OfflineNote } from "../../ui/molecules/OfflineNote";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { SegmentedControl } from "../../ui/molecules/SegmentedControl";
import { SelectField, type SelectOption } from "../../ui/molecules/SelectField";
import type { NavAction } from "../../ui/organisms/nav";
import "./statement-form.css";

export type PayLeg = {
  key: string;
  caption: string;
  amount: string;
  editLabel: string;
  value: string;
  editable: boolean;
  error?: string | undefined;
  onChange: (value: string) => void;
  account: string;
};

export type PayStatementScreenProps = {
  title: string;
  back: NavAction;
  modeLabel: string;
  modes: { value: string; label: string }[];
  mode: string;
  onMode: (mode: string) => void;
  legs: PayLeg[];
  exchange: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    field: {
      label: string;
      value: string;
      error?: string | undefined;
      onChange: (v: string) => void;
    };
  } | null;
  source: {
    label: string;
    value: string;
    options: SelectOption[];
    error?: string | undefined;
    onChange: (value: string) => void;
  };
  date: { label: string; value: string; error?: string | undefined; onChange: (v: string) => void };
  amountError: string | undefined;
  note: string;
  failure: string | null;
  submit: { label: string; busy: boolean; onSubmit: () => void };
  offlineMessage: string | null;
};

export function PayStatementScreen(props: PayStatementScreenProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.submit.onSubmit();
  }
  return (
    <>
      <ScreenHeader title={props.title} back={props.back} />
      <form className="statement-form" onSubmit={handleSubmit} noValidate>
        <SegmentedControl
          label={props.modeLabel}
          value={props.mode}
          options={props.modes}
          onChange={props.onMode}
        />
        <div className="pay-legs">
          {props.legs.map((leg) => (
            <div key={leg.key} className="pay-leg">
              <small>{leg.caption}</small>
              {leg.editable ? (
                <input
                  className="pay-leg__input"
                  inputMode="decimal"
                  aria-label={leg.editLabel}
                  aria-invalid={leg.error ? true : undefined}
                  placeholder="0"
                  value={leg.value}
                  onChange={(event) => leg.onChange(event.target.value)}
                />
              ) : (
                <b>{leg.amount}</b>
              )}
              <span>{leg.account}</span>
            </div>
          ))}
          {props.exchange ? (
            <div className="pay-exchange">
              <ArrowLeftRight aria-hidden="true" />
              <span>{props.exchange.label}</span>
              <Switch
                checked={props.exchange.checked}
                label={props.exchange.label}
                onChange={props.exchange.onChange}
              />
            </div>
          ) : null}
        </div>
        {props.amountError ? (
          <p className="statement-form__error" role="alert">
            {props.amountError}
          </p>
        ) : null}
        <FieldGroup label={props.title}>
          {props.exchange?.checked ? (
            <Field
              inputMode="decimal"
              label={props.exchange.field.label}
              value={props.exchange.field.value}
              error={props.exchange.field.error}
              onChange={(event) => props.exchange?.field.onChange(event.target.value)}
            />
          ) : null}
          <SelectField
            label={props.source.label}
            value={props.source.value}
            options={props.source.options}
            error={props.source.error}
            onChange={props.source.onChange}
          />
          <Field
            type="date"
            label={props.date.label}
            value={props.date.value}
            error={props.date.error}
            onChange={(event) => props.date.onChange(event.target.value)}
          />
        </FieldGroup>
        <p className="statement-form__hint">{props.note}</p>
        {props.failure ? (
          <p className="statement-form__error" role="alert">
            {props.failure}
          </p>
        ) : null}
        {props.offlineMessage !== null ? <OfflineNote message={props.offlineMessage} /> : null}
        <div className="statement-form__submit">
          <Button type="submit" disabled={props.submit.busy || props.offlineMessage !== null}>
            {props.submit.label}
          </Button>
        </div>
      </form>
    </>
  );
}
