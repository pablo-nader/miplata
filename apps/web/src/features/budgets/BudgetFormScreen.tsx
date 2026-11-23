import type { FormEvent } from "react";
import { Button } from "../../ui/atoms/Button";
import { FilterChip } from "../../ui/atoms/Chip";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { CategoryPicker, type PickerSection } from "../../ui/molecules/CategoryPicker";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { SegmentedControl, type SegmentOption } from "../../ui/molecules/SegmentedControl";
import type { NavAction } from "../../ui/organisms/nav";
import "./budget-form.css";

type ChoiceOption = { key: string; label: string; selected: boolean; onSelect: () => void };

type ConfirmData = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
};

export type BudgetFormScreenProps = {
  title: string;
  back: NavAction;
  target: {
    label: string;
    kindOptions: readonly SegmentOption[];
    kind: string;
    onKindChange: (value: string) => void;
    error?: string | undefined;
    category: {
      label: string;
      sections: readonly PickerSection[];
      selectedId: string | null;
      onSelect: (id: string) => void;
      allLabel: string;
      fewerLabel: string;
      emptyLabel: string;
    };
    groups: { label: string; options: ChoiceOption[] };
  };
  currency: { label: string; options: ChoiceOption[] };
  limit: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string | undefined;
  };
  submit: { label: string; onSubmit: () => void; busy: boolean };
  errorMessage?: string | undefined;
  manage?:
    | {
        error?: string | undefined;
        remove: { label: string; onClick: () => void };
        confirm?: ConfirmData | undefined;
      }
    | undefined;
};

function Choices({ label, options }: { label: string; options: ChoiceOption[] }) {
  return (
    <FieldGroup label={label}>
      <div className="budget-form__chips">
        {options.map((option) => (
          <FilterChip
            key={option.key}
            label={option.label}
            selected={option.selected}
            onClick={option.onSelect}
          />
        ))}
      </div>
    </FieldGroup>
  );
}

export function BudgetFormScreen({
  title,
  back,
  target,
  currency,
  limit,
  submit,
  errorMessage,
  manage,
}: BudgetFormScreenProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit.onSubmit();
  }

  return (
    <>
      <ScreenHeader title={title} back={back} />
      <form className="budget-form" onSubmit={handleSubmit} noValidate>
        <section>
          <SectionLabel as="h2">{target.label}</SectionLabel>
          <SegmentedControl
            label={target.label}
            options={target.kindOptions}
            value={target.kind}
            onChange={target.onKindChange}
          />
          {target.kind === "category" ? (
            <CategoryPicker
              label={target.category.label}
              sections={target.category.sections}
              selectedId={target.category.selectedId}
              onSelect={target.category.onSelect}
              allLabel={target.category.allLabel}
              fewerLabel={target.category.fewerLabel}
              emptyLabel={target.category.emptyLabel}
            />
          ) : (
            <Choices label={target.groups.label} options={target.groups.options} />
          )}
          {target.error ? (
            <p className="budget-form__error" role="alert">
              {target.error}
            </p>
          ) : null}
        </section>
        <section>
          <SectionLabel as="h2">{currency.label}</SectionLabel>
          <Choices label={currency.label} options={currency.options} />
        </section>
        <Field
          label={limit.label}
          value={limit.value}
          inputMode="decimal"
          onChange={(event) => limit.onChange(event.target.value)}
          {...(limit.error ? { error: limit.error } : {})}
        />
        {errorMessage ? (
          <p className="budget-form__error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="budget-form__submit">
          <Button type="submit" disabled={submit.busy}>
            {submit.label}
          </Button>
        </div>
      </form>
      {manage ? (
        <section className="budget-form__manage">
          {manage.error ? (
            <p className="budget-form__error" role="alert">
              {manage.error}
            </p>
          ) : null}
          {manage.confirm ? (
            <ConfirmPanel {...manage.confirm} />
          ) : (
            <Button variant="ghost" onClick={manage.remove.onClick}>
              {manage.remove.label}
            </Button>
          )}
        </section>
      ) : null}
    </>
  );
}
