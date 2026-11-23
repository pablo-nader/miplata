import { Wallet } from "lucide-react";
import { AccountBadge, type AccountBadgeType, type AccountLogo } from "../../ui/atoms/AccountBadge";
import { Button } from "../../ui/atoms/Button";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";

export type BalanceRowData = {
  key: string;
  type: AccountBadgeType;
  institution: AccountLogo | null;
  title: string;
  caption: string;
  amount: MoneyAmountProps;
};

export type BalanceSectionData = { key: string; heading: string; rows: BalanceRowData[] };

type BalanceScreenProps = {
  title: string;
  back: NavAction;
  status: "loading" | "error" | "ready";
  sections: BalanceSectionData[];
  messages: { loading: string; loadFailed: string; retry: string; empty: string };
  onRetry: () => void;
};

export function BalanceScreen({
  title,
  back,
  status,
  sections,
  messages,
  onRetry,
}: BalanceScreenProps) {
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
        <EmptyState icon={<Wallet />} title={messages.empty} />
      ) : null}
      {status === "ready"
        ? sections.map((section) => (
            <section key={section.key} aria-label={section.heading}>
              <SectionLabel as="h2">{section.heading}</SectionLabel>
              <MovementList>
                {section.rows.map((row) => (
                  <MovementRow
                    key={row.key}
                    badge={<AccountBadge type={row.type} logo={row.institution} />}
                    title={row.title}
                    caption={row.caption}
                    amount={<MoneyAmount {...row.amount} />}
                  />
                ))}
              </MovementList>
            </section>
          ))
        : null}
    </>
  );
}
