import { Plus, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { AccountBadge, type AccountBadgeType, type AccountLogo } from "../../ui/atoms/AccountBadge";
import { Button } from "../../ui/atoms/Button";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import { tourAnchor } from "../../ui/tour/anchors";
import "./accounts-screen.css";
import "./screen-note.css";

export type AccountRowData = {
  id: string;
  type: AccountBadgeType;
  institution: AccountLogo | null;
  title: string;
  caption: string;
  amount: MoneyAmountProps;
  note?: string;
  to: string;
};

export type AccountSectionData = {
  key: string;
  label: string;
  rows: AccountRowData[];
  add?: NavAction;
  emptyNote?: string;
};

type AccountsScreenProps = {
  title: string;
  menu: NavAction;
  add: NavAction;
  status: "loading" | "error" | "ready";
  isEmpty: boolean;
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
  menu,
  add,
  status,
  isEmpty,
  sections,
  messages,
  onRetry,
}: AccountsScreenProps) {
  return (
    <>
      <ScreenHeader title={title} action={add} menu={menu} />
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
      {status === "ready" && isEmpty ? (
        <EmptyState
          icon={<Wallet />}
          title={messages.emptyTitle}
          description={messages.emptyDescription}
        />
      ) : null}
      {status === "ready"
        ? sections.map((section, index) => (
            <section
              key={section.key}
              aria-label={section.label}
              {...(index === 0 ? tourAnchor("accounts-list") : {})}
            >
              {section.add ? (
                <div className="accounts-screen__heading">
                  <SectionLabel as="h2">{section.label}</SectionLabel>
                  <Link className="accounts-screen__add" to={section.add.to}>
                    <Plus aria-hidden="true" />
                    {section.add.label}
                  </Link>
                </div>
              ) : (
                <SectionLabel as="h2">{section.label}</SectionLabel>
              )}
              {section.rows.length === 0 && section.emptyNote ? (
                <p className="accounts-screen__note">{section.emptyNote}</p>
              ) : null}
              <MovementList>
                {section.rows.map((row) => (
                  <MovementRow
                    key={row.id}
                    badge={<AccountBadge type={row.type} logo={row.institution} />}
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
