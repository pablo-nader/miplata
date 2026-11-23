import { Receipt, Scale } from "lucide-react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, ButtonLink } from "../../ui/atoms/Button";
import { FilterChip } from "../../ui/atoms/Chip";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { Field, FieldGroup } from "../../ui/molecules/Field";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import { tourAnchor } from "../../ui/tour/anchors";
import "./statement-screen.css";

export type PeriodChip = { key: string; label: string; selected: boolean; onSelect: () => void };

export type SummaryRow = { key: string; label: string; value: string };

export type AdjustAction = { key: string; label: string; busy: boolean; onClick: () => void };

export type DatesEditor = {
  openLabel: string;
  open: boolean;
  onOpen: () => void;
  title: string;
  lang: string;
  closing: { label: string; value: string; onChange: (value: string) => void };
  due: { label: string; value: string; onChange: (value: string) => void };
  error: string | null;
  submit: { label: string; busy: boolean };
  cancel: { label: string; onCancel: () => void };
  onSubmit: () => void;
};

export type StatementScreenProps = {
  title: string;
  back: NavAction;
  periodsLabel: string;
  periods: PeriodChip[];
  caption: string;
  total: string;
  secondary: string | null;
  sections: { key: string; heading: string | null; rows: SummaryRow[] }[];
  bank: { lines: { key: string; text: string; status: string }[]; missing: string | null };
  adjustments: AdjustAction[];
  chargesTitle: string;
  charges: { key: string; label: string; value: string; to: string }[];
  note: string | null;
  failure: string | null;
  success: string | null;
  datesEditor: DatesEditor;
  actions: { addCharge: NavAction; reconcile: NavAction; pay: NavAction };
  editCard: NavAction;
};

function DatesPanel({ editor }: { editor: DatesEditor }) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    editor.onSubmit();
  }
  return (
    <form className="statement-screen__dates" onSubmit={handleSubmit} noValidate>
      <FieldGroup label={editor.title}>
        <Field
          type="date"
          lang={editor.lang}
          label={editor.closing.label}
          value={editor.closing.value}
          onChange={(event) => editor.closing.onChange(event.target.value)}
        />
        <Field
          type="date"
          lang={editor.lang}
          label={editor.due.label}
          value={editor.due.value}
          onChange={(event) => editor.due.onChange(event.target.value)}
        />
      </FieldGroup>
      {editor.error ? (
        <p className="statement-screen__error" role="alert">
          {editor.error}
        </p>
      ) : null}
      <div className="statement-screen__dates-actions">
        <Button type="submit" disabled={editor.submit.busy}>
          {editor.submit.label}
        </Button>
        <Button variant="ghost" onClick={editor.cancel.onCancel}>
          {editor.cancel.label}
        </Button>
      </div>
    </form>
  );
}

export function StatementScreen(props: StatementScreenProps) {
  return (
    <div className="statement-screen">
      <ScreenHeader title={props.title} back={props.back} />
      <fieldset className="statement-screen__chips" {...tourAnchor("statement-period")}>
        <legend className="visually-hidden">{props.periodsLabel}</legend>
        {props.periods.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            selected={chip.selected}
            onClick={chip.onSelect}
          />
        ))}
      </fieldset>
      <section className="statement" {...tourAnchor("statement-summary")}>
        <div className="statement__head">
          <small>{props.caption}</small>
          <strong>{props.total}</strong>
          {props.secondary ? <em>{props.secondary}</em> : null}
        </div>
        {props.sections.map((section) => (
          <div key={section.key}>
            {section.heading ? <SectionLabel as="h2">{section.heading}</SectionLabel> : null}
            <dl className="statement__lines">
              {section.rows.map((row) => (
                <div key={row.key} className="statement__line">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <div className="statement__bank">
          {props.bank.lines.map((line) => (
            <div key={line.key} className="statement__diff">
              <span>{line.text}</span>
              <span>{line.status}</span>
            </div>
          ))}
          {props.bank.missing ? <p className="statement__missing">{props.bank.missing}</p> : null}
        </div>
      </section>
      {props.adjustments.map((action) => (
        <div key={action.key} className="statement-screen__adjust">
          <Button variant="ghost" disabled={action.busy} onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ))}
      {props.failure ? (
        <p className="statement-screen__error" role="alert">
          {props.failure}
        </p>
      ) : null}
      {props.success ? (
        <p className="statement-screen__success" role="status">
          {props.success}
        </p>
      ) : null}
      {props.datesEditor.open ? (
        <DatesPanel editor={props.datesEditor} />
      ) : (
        <div className="statement-screen__adjust">
          <Button variant="ghost" onClick={props.datesEditor.onOpen}>
            {props.datesEditor.openLabel}
          </Button>
        </div>
      )}
      {props.charges.length > 0 ? (
        <section className="statement-screen__charges" aria-label={props.chargesTitle}>
          <SectionLabel as="h2">{props.chargesTitle}</SectionLabel>
          <ul>
            {props.charges.map((charge) => (
              <li key={charge.key}>
                <Link to={charge.to}>
                  <span>{charge.label}</span>
                  <span>{charge.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {props.note ? <p className="statement-screen__note">{props.note}</p> : null}
      <p className="statement-screen__edit">
        <Link to={props.editCard.to}>{props.editCard.label}</Link>
      </p>
      <div className="statement-screen__actions" {...tourAnchor("statement-actions")}>
        <div className="statement-screen__buttons">
          <ButtonLink
            variant="ghost"
            to={props.actions.addCharge.to}
            icon={<Receipt aria-hidden="true" />}
          >
            {props.actions.addCharge.label}
          </ButtonLink>
          <ButtonLink
            variant="ghost"
            to={props.actions.reconcile.to}
            icon={<Scale aria-hidden="true" />}
          >
            {props.actions.reconcile.label}
          </ButtonLink>
        </div>
        <ButtonLink to={props.actions.pay.to}>{props.actions.pay.label}</ButtonLink>
      </div>
    </div>
  );
}
