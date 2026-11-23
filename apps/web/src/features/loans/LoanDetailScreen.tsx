import { HandCoins } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "../../ui/atoms/Button";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import type { MoneyLocale } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";
import { MovementRowView } from "../movements/MovementsScreen";
import type { RowData } from "../movements/present-movement";
import "./loans-screen.css";

export type DetailLine = {
  key: string;
  amount: MoneyAmountProps;
  details: string[];
  repay: NavAction;
  forgive: { label: string; onClick: () => void };
};

export type DetailSection = { key: string; heading: string; lines: DetailLine[] };

type LoanDetailScreenProps = {
  title: string;
  back: NavAction;
  status: "loading" | "error" | "missing" | "ready";
  locale: MoneyLocale;
  sections: DetailSection[];
  settled: string;
  movementsHeading: string;
  movements: RowData[];
  noMovements: string;
  panel: ReactNode;
  messages: { loading: string; loadFailed: string; notFound: string; retry: string };
  onRetry: () => void;
};

export function LoanDetailScreen({
  title,
  back,
  status,
  locale,
  sections,
  settled,
  movementsHeading,
  movements,
  noMovements,
  panel,
  messages,
  onRetry,
}: LoanDetailScreenProps) {
  return (
    <>
      <ScreenHeader title={title} back={back} />
      {status === "loading" ? (
        <p className="screen-note" role="status">
          {messages.loading}
        </p>
      ) : null}
      {status === "error" ? (
        <EmptyState
          icon={<HandCoins />}
          title={messages.loadFailed}
          action={
            <Button variant="ghost" onClick={onRetry}>
              {messages.retry}
            </Button>
          }
        />
      ) : null}
      {status === "missing" ? <EmptyState icon={<HandCoins />} title={messages.notFound} /> : null}
      {status === "ready" ? (
        <>
          {sections.length === 0 ? <p className="screen-note">{settled}</p> : null}
          {sections.map((section) => (
            <section key={section.key} aria-label={section.heading}>
              <SectionLabel as="h2">{section.heading}</SectionLabel>
              {section.lines.map((line) => (
                <div key={line.key} className="loans-line">
                  <span className="loans-line__amount">
                    <MoneyAmount {...line.amount} />
                  </span>
                  {line.details.map((detail) => (
                    <span key={detail} className="loans-screen__detail">
                      {detail}
                    </span>
                  ))}
                  <div className="loans-line__actions">
                    <ButtonLink to={line.repay.to}>{line.repay.label}</ButtonLink>
                    <Button variant="ghost" onClick={line.forgive.onClick}>
                      {line.forgive.label}
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          ))}
          {panel}
          <section aria-label={movementsHeading}>
            <SectionLabel as="h2">{movementsHeading}</SectionLabel>
            {movements.length === 0 ? <p className="screen-note">{noMovements}</p> : null}
            <MovementList>
              {movements.map((row) => (
                <MovementRowView
                  key={row.id}
                  row={row}
                  locale={locale}
                  to={`/movements/${row.id}/edit`}
                />
              ))}
            </MovementList>
          </section>
        </>
      ) : null}
    </>
  );
}
