import { Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "../../ui/atoms/Button";
import { CategoryBadge, type CategoryColor } from "../../ui/atoms/CategoryBadge";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import { tourAnchor } from "../../ui/tour/anchors";
import "../accounts/screen-note.css";
import { RowAction } from "./RowAction";
import "./to-pay-screen.css";

export type RecurringAction = { key: string; label: string; name: string; onClick: () => void };

export type RecurringRowData = {
  id: string;
  title: string;
  caption: string;
  status: string;
  badge: { name: string; icon: string | null; color: CategoryColor };
  amount: MoneyAmountProps | null;
  to: string;
  actions: RecurringAction[];
  panel: ReactNode;
};

type RecurringListScreenProps = {
  title: string;
  back: NavAction;
  add: NavAction;
  status: "loading" | "error" | "ready";
  rows: RecurringRowData[];
  failure: string | null;
  busy: boolean;
  messages: {
    loading: string;
    loadFailed: string;
    retry: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyAdd: string;
    variable: string;
  };
  onRetry: () => void;
};

export function RecurringListScreen({
  title,
  back,
  add,
  status,
  rows,
  failure,
  busy,
  messages,
  onRetry,
}: RecurringListScreenProps) {
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
          icon={<Repeat />}
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
          icon={<Repeat />}
          title={messages.emptyTitle}
          description={messages.emptyDescription}
          action={
            <ButtonLink variant="ghost" to={add.to}>
              {messages.emptyAdd}
            </ButtonLink>
          }
        />
      ) : null}
      {failure ? (
        <p className="to-pay__failure" role="alert">
          {failure}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <div {...tourAnchor("recurring-list")}>
          <MovementList>
            {rows.map((row) => (
              <MovementRow
                key={row.id}
                badge={<CategoryBadge {...row.badge} />}
                title={row.title}
                caption={row.caption}
                tag={row.status}
                amount={
                  row.amount ? (
                    <MoneyAmount {...row.amount} />
                  ) : (
                    <span className="to-pay__none">{messages.variable}</span>
                  )
                }
                to={row.to}
                footer={
                  row.panel ??
                  (row.actions.length > 0
                    ? row.actions.map((action) => (
                        <RowAction
                          key={action.key}
                          quiet
                          label={action.label}
                          name={action.name}
                          busy={busy}
                          onClick={action.onClick}
                        />
                      ))
                    : null)
                }
              />
            ))}
          </MovementList>
        </div>
      ) : null}
    </>
  );
}
