import type { Currency } from "@miplata/shared";
import type { FormEvent } from "react";
import { Button } from "../../ui/atoms/Button";
import { FieldGroup } from "../../ui/molecules/Field";
import { MoneyField } from "../../ui/molecules/MoneyField";
import { OfflineNote } from "../../ui/molecules/OfflineNote";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "./statement-form.css";

export type ReconcileField = {
  key: string;
  label: string;
  value: string;
  currency: Currency;
  error?: string | undefined;
  onChange: (value: string) => void;
};

export type ReconcileScreenProps = {
  title: string;
  back: NavAction;
  hint: string;
  groups: { key: string; calculated: string; fields: ReconcileField[] }[];
  failure: string | null;
  submit: { label: string; busy: boolean; onSubmit: () => void };
  offlineMessage: string | null;
};

export function ReconcileScreen(props: ReconcileScreenProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.submit.onSubmit();
  }
  return (
    <>
      <ScreenHeader title={props.title} back={props.back} />
      <form className="statement-form" onSubmit={handleSubmit} noValidate>
        <p className="statement-form__hint">{props.hint}</p>
        {props.groups.map((group) => (
          <FieldGroup key={group.key} label={group.calculated}>
            {group.fields.map((field) => (
              <MoneyField
                key={field.key}
                label={field.label}
                value={field.value}
                currency={field.currency}
                error={field.error}
                onValueChange={field.onChange}
              />
            ))}
            <p className="statement-form__hint">{group.calculated}</p>
          </FieldGroup>
        ))}
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
