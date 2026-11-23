import { Target } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { ProgressBar } from "../../ui/atoms/ProgressBar";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";
import "./budgets-screen.css";

export type BudgetRowData = {
  id: string;
  title: string;
  amounts: string;
  note: string;
  spentMinor: number;
  limitMinor: number;
  progressLabel: string;
  to: string;
};

type BudgetsScreenProps = {
  title: string;
  back: NavAction;
  add: NavAction;
  status: "loading" | "error" | "ready";
  rows: BudgetRowData[];
  messages: {
    loading: string;
    loadFailed: string;
    retry: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  onRetry: () => void;
};

export function BudgetsScreen({
  title,
  back,
  add,
  status,
  rows,
  messages,
  onRetry,
}: BudgetsScreenProps) {
  return (
    <>
      <ScreenHeader title={title} back={back} action={add} />
      {status === "loading" ? (
        <p className="screen-note" role="status">
          {messages.loading}
        </p>
      ) : null}
      {status === "error" ? (
        <EmptyState
          icon={<Target />}
          title={messages.loadFailed}
          action={
            <Button variant="ghost" onClick={onRetry}>
              {messages.retry}
            </Button>
          }
        />
      ) : null}
      {status === "ready" && rows.length === 0 ? (
        <EmptyState
          icon={<Target />}
          title={messages.emptyTitle}
          description={messages.emptyDescription}
        />
      ) : null}
      {status === "ready" && rows.length > 0 ? (
        <ul className="budgets-screen__list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link className="budgets-screen__item" to={row.to}>
                <span className="budgets-screen__head">
                  <b className="budgets-screen__title">{row.title}</b>
                  <span className="budgets-screen__amounts">{row.amounts}</span>
                </span>
                <ProgressBar
                  value={row.spentMinor}
                  max={row.limitMinor}
                  label={row.progressLabel}
                />
                <span className="budgets-screen__note">{row.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
