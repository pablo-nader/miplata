import { type Currency, DESCRIPTION_MAX_LENGTH } from "@miplata/shared";
import { type FormEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "../../ui/atoms/Button";
import { FilterChip } from "../../ui/atoms/Chip";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { Switch } from "../../ui/atoms/Switch";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { SegmentedControl } from "../../ui/molecules/SegmentedControl";
import { SelectField, type SelectOption } from "../../ui/molecules/SelectField";
import type { NavAction } from "../../ui/organisms/nav";
import {
  type FormErrorKey,
  type FormState,
  type FormType,
  NEW_PERSON_OPTION,
} from "./movement-form";
import "./movement-form-screen.css";

export type FormCopy = {
  typeLabel: string;
  types: Record<FormType, string>;
  amount: string;
  currency: string;
  account: string;
  installments: string;
  description: string;
  date: string;
  forOther: string;
  person: string;
  share: string;
  from: string;
  to: string;
  accountFrom: string;
  accountTo: string;
  amountFrom: string;
  amountTo: string;
  transferNote: string;
  submit: string;
  saving: string;
  remove?: string;
};

export type NewPersonDraft = { name: string; error: string | undefined; busy: boolean };

export type NewPersonPanel = {
  draft: NewPersonDraft | null;
  copy: { name: string; create: string; creating: string; cancel: string };
  onOpen: () => void;
  onNameChange: (name: string) => void;
  onCreate: () => void;
  onCancel: () => void;
};

export type ConfirmCopy = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
};

export type MovementFormScreenProps = {
  title: string;
  back: NavAction;
  copy: FormCopy;
  values: FormState;
  onChange: (patch: Partial<FormState>) => void;
  errors: Partial<Record<FormErrorKey, string>>;
  entryAccounts: SelectOption[];
  transferAccounts: SelectOption[];
  personOptions: SelectOption[];
  newPerson: NewPersonPanel;
  entryCurrencies: Currency[];
  fromCurrencies: Currency[];
  toCurrencies: Currency[];
  installments: { options: SelectOption[]; hint: string | null } | null;
  categoryPicker: ReactNode;
  categoryError: string | undefined;
  rateText: string | null;
  failure: string | null;
  busy: boolean;
  onSubmit: () => void;
  onRemove?: (() => void) | undefined;
  confirm?: (ConfirmCopy & { onConfirm: () => void; onCancel: () => void }) | undefined;
};

type CurrencyChipsProps = {
  label: string;
  currencies: readonly Currency[];
  value: Currency;
  onChange: (currency: Currency) => void;
};

function CurrencyChips({ label, currencies, value, onChange }: CurrencyChipsProps) {
  if (currencies.length < 2) {
    return currencies[0] ? <p className="movement-form__hint">{currencies[0]}</p> : null;
  }
  return (
    <fieldset className="movement-form__currencies">
      <legend className="visually-hidden">{label}</legend>
      {currencies.map((currency) => (
        <FilterChip
          key={currency}
          label={currency}
          selected={currency === value}
          onClick={() => onChange(currency)}
        />
      ))}
    </fieldset>
  );
}

type AmountInputProps = {
  label: string;
  value: string;
  error: string | undefined;
  onChange: (value: string) => void;
  large?: boolean;
};

function AmountInput({ label, value, error, onChange, large = false }: AmountInputProps) {
  const errorId = useId();
  return (
    <div
      className={
        large ? "movement-form__amount movement-form__amount--large" : "movement-form__amount"
      }
    >
      <input
        className="movement-form__amount-input"
        inputMode="decimal"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={errorId} className="movement-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NewPersonFields({ panel }: { panel: NewPersonPanel }) {
  const container = useRef<HTMLDivElement>(null);
  const { draft, copy } = panel;
  const open = draft !== null;
  useEffect(() => {
    if (open) {
      container.current?.querySelector<HTMLElement>("input")?.focus();
    }
  }, [open]);
  if (!draft) {
    return null;
  }
  return (
    <div className="movement-form__new-person" ref={container}>
      <Field
        label={copy.name}
        value={draft.name}
        maxLength={60}
        error={draft.error}
        onChange={(event) => panel.onNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            panel.onCreate();
          }
        }}
      />
      <div className="movement-form__new-person-actions">
        <Button type="button" onClick={panel.onCreate} disabled={draft.busy}>
          {draft.busy ? copy.creating : copy.create}
        </Button>
        <Button type="button" variant="ghost" onClick={panel.onCancel} disabled={draft.busy}>
          {copy.cancel}
        </Button>
      </div>
    </div>
  );
}

export function MovementFormScreen(props: MovementFormScreenProps) {
  const { copy, values, onChange, errors, back, title } = props;
  const isTransfer = values.type === "transfer";
  const removeRef = useRef<HTMLDivElement>(null);

  const hadConfirm = useRef(false);
  useEffect(() => {
    if (hadConfirm.current && !props.confirm) {
      removeRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
    hadConfirm.current = Boolean(props.confirm);
  }, [props.confirm]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    props.onSubmit();
  }

  return (
    <>
      <ScreenHeader title={title} back={back} />
      <form className="movement-form" onSubmit={handleSubmit} noValidate>
        <SegmentedControl
          label={copy.typeLabel}
          value={values.type}
          options={(["expense", "income", "transfer"] as const).map((type) => ({
            value: type,
            label: copy.types[type],
          }))}
          onChange={(value) => onChange({ type: value as FormType })}
        />
        {isTransfer ? (
          <>
            <section className="movement-form__leg" aria-label={copy.from}>
              <SectionLabel as="h2">{copy.from}</SectionLabel>
              <SelectField
                label={copy.accountFrom}
                value={values.fromAccountId ?? ""}
                options={props.transferAccounts}
                error={errors.fromAccount}
                onChange={(value) => onChange({ fromAccountId: value || null })}
              />
              <CurrencyChips
                label={copy.currency}
                currencies={props.fromCurrencies}
                value={values.fromCurrency}
                onChange={(currency) => onChange({ fromCurrency: currency })}
              />
              <AmountInput
                label={copy.amountFrom}
                value={values.fromAmount}
                error={errors.fromAmount}
                onChange={(value) => onChange({ fromAmount: value })}
              />
            </section>
            <section className="movement-form__leg" aria-label={copy.to}>
              <SectionLabel as="h2">{copy.to}</SectionLabel>
              <SelectField
                label={copy.accountTo}
                value={values.toAccountId ?? ""}
                options={props.transferAccounts}
                error={errors.toAccount}
                onChange={(value) => onChange({ toAccountId: value || null })}
              />
              <CurrencyChips
                label={copy.currency}
                currencies={props.toCurrencies}
                value={values.toCurrency}
                onChange={(currency) => onChange({ toCurrency: currency })}
              />
              <AmountInput
                label={copy.amountTo}
                value={values.toAmount}
                error={errors.toAmount}
                onChange={(value) => onChange({ toAmount: value })}
              />
            </section>
            {props.rateText ? (
              <p className="movement-form__rate" role="status">
                {props.rateText}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <CurrencyChips
              label={copy.currency}
              currencies={props.entryCurrencies}
              value={values.currency}
              onChange={(currency) => onChange({ currency })}
            />
            <AmountInput
              large
              label={copy.amount}
              value={values.amount}
              error={errors.amount}
              onChange={(value) => onChange({ amount: value })}
            />
            <div className="movement-form__category">
              {props.categoryPicker}
              {props.categoryError ? (
                <p className="movement-form__error" role="alert">
                  {props.categoryError}
                </p>
              ) : null}
            </div>
            <FieldGroup label={copy.account}>
              <SelectField
                label={copy.account}
                value={values.accountId ?? ""}
                options={props.entryAccounts}
                error={errors.account}
                onChange={(value) => onChange({ accountId: value || null })}
              />
              {props.installments ? (
                <>
                  <SelectField
                    label={copy.installments}
                    value={String(values.installments)}
                    options={props.installments.options}
                    onChange={(value) => onChange({ installments: Number(value) })}
                  />
                  {props.installments.hint ? (
                    <p className="movement-form__hint">{props.installments.hint}</p>
                  ) : null}
                </>
              ) : null}
            </FieldGroup>
          </>
        )}
        <FieldGroup label={copy.description}>
          <Field
            label={copy.description}
            value={values.description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            onChange={(event) => onChange({ description: event.target.value })}
          />
          <Field
            type="date"
            label={copy.date}
            value={values.date}
            error={errors.date}
            onChange={(event) => onChange({ date: event.target.value })}
          />
          {values.type === "expense" ? (
            <div className="movement-form__other">
              <span>{copy.forOther}</span>
              <Switch
                checked={values.forOther}
                label={copy.forOther}
                onChange={(checked) => onChange({ forOther: checked })}
              />
            </div>
          ) : null}
          {values.type === "expense" && values.forOther ? (
            <>
              <SelectField
                label={copy.person}
                value={values.personId ?? ""}
                options={props.personOptions}
                error={errors.person}
                onChange={(value) =>
                  value === NEW_PERSON_OPTION
                    ? props.newPerson.onOpen()
                    : onChange({ personId: value || null })
                }
              />
              <NewPersonFields panel={props.newPerson} />
              <Field
                inputMode="decimal"
                label={copy.share}
                value={values.ownShare}
                error={errors.share}
                onChange={(event) => onChange({ ownShare: event.target.value })}
              />
            </>
          ) : null}
        </FieldGroup>
        {isTransfer ? <p className="movement-form__hint">{copy.transferNote}</p> : null}
        {props.failure ? (
          <p className="movement-form__error" role="alert">
            {props.failure}
          </p>
        ) : null}
        <div className="movement-form__submit">
          <Button type="submit" disabled={props.busy}>
            {props.busy ? copy.saving : copy.submit}
          </Button>
        </div>
      </form>
      {props.onRemove && copy.remove ? (
        <section className="movement-form__manage" ref={removeRef}>
          {props.confirm ? (
            <ConfirmPanel
              title={props.confirm.title}
              body={props.confirm.body}
              confirmLabel={props.confirm.confirmLabel}
              cancelLabel={props.confirm.cancelLabel}
              onConfirm={props.confirm.onConfirm}
              onCancel={props.confirm.onCancel}
              busy={props.busy}
            />
          ) : (
            <Button variant="ghost" onClick={props.onRemove}>
              {copy.remove}
            </Button>
          )}
        </section>
      ) : null}
    </>
  );
}
