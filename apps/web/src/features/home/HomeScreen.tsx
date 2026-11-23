import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import type { MoneyLocale } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList } from "../../ui/molecules/MovementRow";
import { PendingBanner } from "../../ui/molecules/PendingBanner";
import type { NavAction } from "../../ui/organisms/nav";
import { SignageBand, type SignageBandProps } from "../../ui/organisms/SignageBand";
import { BudgetList, type BudgetRowData } from "../budgets/BudgetList";
import { MovementRowView } from "../movements/MovementsScreen";
import type { RowData } from "../movements/present-movement";

type HomeScreenProps = {
  brandName: string;
  menu: NavAction;
  installHint?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  balance?: SignageBandProps["balance"];
  income?: SignageBandProps["income"];
  expense?: SignageBandProps["expense"];
  pending?: { to: string; title: string; caption: string };
  budgets?: { label: string; rows: BudgetRowData[] };
  latest?: { label: string; locale: MoneyLocale; rows: RowData[] };
};

export function HomeScreen({
  brandName,
  menu,
  installHint,
  emptyTitle,
  emptyDescription,
  balance,
  income,
  expense,
  pending,
  budgets,
  latest,
}: HomeScreenProps) {
  return (
    <>
      <SignageBand
        brandName={brandName}
        menu={menu}
        {...(balance ? { balance } : {})}
        {...(income && expense ? { income, expense } : {})}
      />
      {installHint}
      {pending ? <PendingBanner {...pending} /> : null}
      {budgets && budgets.rows.length > 0 ? (
        <section aria-label={budgets.label}>
          <SectionLabel as="h2">{budgets.label}</SectionLabel>
          <BudgetList rows={budgets.rows} />
        </section>
      ) : null}
      {latest && latest.rows.length > 0 ? (
        <section aria-label={latest.label}>
          <SectionLabel as="h2">{latest.label}</SectionLabel>
          <MovementList>
            {latest.rows.map((row) => (
              <MovementRowView
                key={row.id}
                row={row}
                locale={latest.locale}
                to={`/movements/${row.id}/edit`}
              />
            ))}
          </MovementList>
        </section>
      ) : null}
      {latest && latest.rows.length === 0 ? (
        <EmptyState icon={<Wallet />} title={emptyTitle} description={emptyDescription} />
      ) : null}
    </>
  );
}
