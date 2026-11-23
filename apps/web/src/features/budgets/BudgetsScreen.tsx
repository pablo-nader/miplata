import { Target } from "lucide-react";
import { Button } from "../../ui/atoms/Button";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";
import { BudgetList, type BudgetRowData } from "./BudgetList";

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
      {status === "ready" && rows.length > 0 ? <BudgetList rows={rows} /> : null}
    </>
  );
}
