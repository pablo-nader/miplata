import type { FormEvent } from "react";
import { Button } from "../../ui/atoms/Button";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { OfflineNote } from "../../ui/molecules/OfflineNote";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "./statement-form.css";

export type ReconcileField = {
  key: string;
  label: string;
  value: string;
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
              <Field
                key={field.key}
                inputMode="decimal"
                label={field.label}
                value={field.value}
                error={field.error}
                onChange={(event) => field.onChange(event.target.value)}
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
