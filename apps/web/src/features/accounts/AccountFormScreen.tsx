import { type FormEvent, useEffect, useId, useRef } from "react";
import { Button } from "../../ui/atoms/Button";
import { FilterChip } from "../../ui/atoms/Chip";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { Switch } from "../../ui/atoms/Switch";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { OfflineNote } from "../../ui/molecules/OfflineNote";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "./account-form.css";

type TextFieldData = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
};

type ChoiceGroup = {
  label: string;
  options: { key: string; label: string; selected: boolean; onSelect: () => void }[];
};

type CurrencyRow = {
  key: string;
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  amount: TextFieldData;
};

type ConfirmData = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
};

type ManageData = {
  hint?: string | undefined;
  error?: string | undefined;
  toggle: { label: string; onClick: () => void };
  remove?: { label: string; onClick: () => void } | undefined;
  confirm?: ConfirmData | undefined;
};

export type AccountFormScreenProps = {
  title: string;
  back: NavAction;
  types?: ChoiceGroup | undefined;
  institutions?: ChoiceGroup | undefined;
  name: TextFieldData;
  currencies: { label: string; error?: string | undefined; rows: CurrencyRow[] };
  personHint?: string | undefined;
  cardDays?: { closing: TextFieldData; due: TextFieldData } | undefined;
  submit: { label: string; onSubmit: () => void; busy: boolean };
  offlineMessage: string | null;
  errorMessage?: string | undefined;
  manage?: ManageData | undefined;
};

function ConfirmPanel({ confirm }: { confirm: ConfirmData }) {
  const panel = useRef<HTMLDivElement>(null);

  const bodyId = useId();

  useEffect(() => {
    panel.current?.focus();
    return () => {
      document.querySelector<HTMLElement>(".account-form__manage")?.focus();
    };
  }, []);

  return (
    <div
      ref={panel}
      tabIndex={-1}
      className="account-form__confirm"
      role="alertdialog"
      aria-label={confirm.title}
      aria-describedby={bodyId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          confirm.onCancel();
        }
      }}
    >
      <h2 className="account-form__confirm-title">{confirm.title}</h2>
      <p id={bodyId}>{confirm.body}</p>
      <Button disabled={confirm.busy} onClick={confirm.onConfirm}>
        {confirm.confirmLabel}
      </Button>
      <Button variant="ghost" disabled={confirm.busy} onClick={confirm.onCancel}>
        {confirm.cancelLabel}
      </Button>
    </div>
  );
}

function Choices({ group }: { group: ChoiceGroup }) {
  return (
    <section>
      <SectionLabel as="h2">{group.label}</SectionLabel>
      <FieldGroup label={group.label}>
        <div className="account-form__chips">
          {group.options.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              selected={option.selected}
              onClick={option.onSelect}
            />
          ))}
        </div>
      </FieldGroup>
    </section>
  );
}

function TextField({
  data,
  inputMode,
}: {
  data: TextFieldData;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <Field
      label={data.label}
      value={data.value}
      onChange={(event) => data.onChange(event.target.value)}
      {...(inputMode ? { inputMode } : {})}
      {...(data.error ? { error: data.error } : {})}
    />
  );
}

export function AccountFormScreen(props: AccountFormScreenProps) {
  const { title, back, types, institutions, name, currencies, cardDays, submit, manage } = props;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit.onSubmit();
  }

  return (
    <>
      <ScreenHeader title={title} back={back} />
      <form className="account-form" onSubmit={handleSubmit} noValidate>
        {types ? <Choices group={types} /> : null}
        {institutions ? <Choices group={institutions} /> : null}
        <FieldGroup label={name.label}>
          <TextField data={name} />
        </FieldGroup>
        <section>
          <SectionLabel as="h2">{currencies.label}</SectionLabel>
          <FieldGroup label={currencies.label}>
            {currencies.rows.map((row) => (
              <div key={row.key} className="account-form__currency">
                <div className="account-form__currency-head">
                  <span>{row.label}</span>
                  <Switch checked={row.enabled} onChange={row.onToggle} label={row.label} />
                </div>
                {row.enabled ? <TextField data={row.amount} /> : null}
              </div>
            ))}
            {currencies.error ? (
              <p className="account-form__error" role="alert">
                {currencies.error}
              </p>
            ) : null}
            {props.personHint ? <p className="account-form__hint">{props.personHint}</p> : null}
          </FieldGroup>
        </section>
        {cardDays ? (
          <FieldGroup label={cardDays.closing.label}>
            <TextField data={cardDays.closing} inputMode="numeric" />
            <TextField data={cardDays.due} inputMode="numeric" />
          </FieldGroup>
        ) : null}
        {props.errorMessage ? (
          <p className="account-form__error" role="alert">
            {props.errorMessage}
          </p>
        ) : null}
        {props.offlineMessage !== null ? <OfflineNote message={props.offlineMessage} /> : null}
        <div className="account-form__submit">
          <Button type="submit" disabled={submit.busy || props.offlineMessage !== null}>
            {submit.label}
          </Button>
        </div>
      </form>
      {manage ? (
        <section className="account-form__manage" tabIndex={-1}>
          {manage.error ? (
            <p className="account-form__error" role="alert">
              {manage.error}
            </p>
          ) : null}
          {manage.hint ? <p className="account-form__hint">{manage.hint}</p> : null}
          {manage.confirm ? (
            <ConfirmPanel confirm={manage.confirm} />
          ) : (
            <>
              <Button variant="ghost" onClick={manage.toggle.onClick}>
                {manage.toggle.label}
              </Button>
              {manage.remove ? (
                <Button variant="ghost" onClick={manage.remove.onClick}>
                  {manage.remove.label}
                </Button>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
