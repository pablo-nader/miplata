import { Receipt, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, ButtonLink } from "../../ui/atoms/Button";
import { FilterChip } from "../../ui/atoms/Chip";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "./statement-screen.css";

export type PeriodChip = { key: string; label: string; selected: boolean; onSelect: () => void };

export type SummaryRow = { key: string; label: string; value: string };

export type AdjustAction = { key: string; label: string; busy: boolean; onClick: () => void };

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
  actions: { addCharge: NavAction; reconcile: NavAction; pay: NavAction };
  editCard: NavAction;
};

export function StatementScreen(props: StatementScreenProps) {
  return (
    <div className="statement-screen">
      <ScreenHeader title={props.title} back={props.back} />
      <fieldset className="statement-screen__chips">
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
      <section className="statement">
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
      <div className="statement-screen__actions">
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
