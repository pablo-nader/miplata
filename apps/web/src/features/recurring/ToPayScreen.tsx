import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../ui/atoms/Button";
import { CategoryBadge, type CategoryColor } from "../../ui/atoms/CategoryBadge";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";
import { RowAction } from "./RowAction";
import "./to-pay-screen.css";

export type ToPayRowData = {
  id: string;
  title: string;
  caption: string;
  badge: { name: string; icon: string | null; color: CategoryColor };
  amount: MoneyAmountProps | null;
  variable: boolean;
  labels: { confirm: string; adjust: string; skip: string };
  panel: ReactNode;
};

export type ToPaySectionData = { key: string; label: string; rows: ToPayRowData[] };

type ToPayScreenProps = {
  title: string;
  back: NavAction;
  status: "loading" | "error" | "ready";
  sections: ToPaySectionData[];
  failure: string | null;
  busy: boolean;
  messages: {
    loading: string;
    loadFailed: string;
    retry: string;
    emptyTitle: string;
    emptyDescription: string;
    noAmount: string;
    confirm: string;
    adjust: string;
    skip: string;
  };
  onConfirm: (id: string) => void;
  onAdjust: (id: string) => void;
  onSkip: (id: string) => void;
  onRetry: () => void;
};

export function ToPayScreen({
  title,
  back,
  status,
  sections,
  failure,
  busy,
  messages,
  onConfirm,
  onAdjust,
  onSkip,
  onRetry,
}: ToPayScreenProps) {
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
          icon={<Clock />}
          title={messages.loadFailed}
          action={
            <Button variant="ghost" onClick={onRetry}>
              {messages.retry}
            </Button>
          }
        />
      ) : null}
      {status === "ready" && sections.length === 0 ? (
        <EmptyState
          icon={<Clock />}
          title={messages.emptyTitle}
          description={messages.emptyDescription}
        />
      ) : null}
      {failure ? (
        <p className="to-pay__failure" role="alert">
          {failure}
        </p>
      ) : null}
      {sections.map((section) => (
        <section key={section.key} aria-label={section.label}>
          <SectionLabel as="h2">{section.label}</SectionLabel>
          <MovementList>
            {section.rows.map((row) => (
              <MovementRow
                key={row.id}
                badge={<CategoryBadge {...row.badge} />}
                title={row.title}
                caption={row.caption}
                amount={
                  row.amount ? (
                    <MoneyAmount {...row.amount} />
                  ) : (
                    <span className="to-pay__none">{messages.noAmount}</span>
                  )
                }
                amountNote={
                  <RowAction
                    label={row.variable ? messages.adjust : messages.confirm}
                    name={row.variable ? row.labels.adjust : row.labels.confirm}
                    busy={busy}
                    onClick={() => (row.variable ? onAdjust(row.id) : onConfirm(row.id))}
                  />
                }
                footer={
                  row.panel ??
                  (row.variable ? null : (
                    <>
                      <RowAction
                        quiet
                        label={messages.adjust}
                        name={row.labels.adjust}
                        busy={busy}
                        onClick={() => onAdjust(row.id)}
                      />
                      <RowAction
                        quiet
                        label={messages.skip}
                        name={row.labels.skip}
                        busy={busy}
                        onClick={() => onSkip(row.id)}
                      />
                    </>
                  ))
                }
              />
            ))}
          </MovementList>
        </section>
      ))}
    </>
  );
}
