import { Wallet } from "lucide-react";
import { AccountBadge, type AccountBadgeType } from "../../ui/atoms/AccountBadge";
import { Button } from "../../ui/atoms/Button";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "./screen-note.css";

export type AccountRowData = {
  id: string;
  type: AccountBadgeType;
  title: string;
  caption: string;
  amount: MoneyAmountProps;
  note?: string;
  to: string;
};

export type AccountSectionData = { key: string; label: string; rows: AccountRowData[] };

type AccountsScreenProps = {
  title: string;
  add: NavAction;
  status: "loading" | "error" | "ready";
  sections: AccountSectionData[];
  messages: {
    loading: string;
    loadFailed: string;
    retry: string;
    emptyTitle: string;
    emptyDescription: string;
  };
  onRetry: () => void;
};

export function AccountsScreen({
  title,
  add,
  status,
  sections,
  messages,
  onRetry,
}: AccountsScreenProps) {
  return (
    <>
      <ScreenHeader title={title} action={add} />
      {status === "loading" ? (
        <p className="screen-note" role="status">
          {messages.loading}
        </p>
      ) : null}
      {status === "error" ? (
        <EmptyState
          icon={<Wallet />}
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
          icon={<Wallet />}
          title={messages.emptyTitle}
          description={messages.emptyDescription}
        />
      ) : null}
      {status === "ready"
        ? sections.map((section) => (
            <section key={section.key} aria-label={section.label}>
              <SectionLabel as="h2">{section.label}</SectionLabel>
              <MovementList>
                {section.rows.map((row) => (
                  <MovementRow
                    key={row.id}
                    badge={<AccountBadge type={row.type} />}
                    title={row.title}
                    caption={row.caption}
                    amount={<MoneyAmount {...row.amount} />}
                    {...(row.note ? { amountNote: row.note } : {})}
                    to={row.to}
                  />
                ))}
              </MovementList>
            </section>
          ))
        : null}
    </>
  );
}
