import { List, Search, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { AccountBadge } from "../../ui/atoms/AccountBadge";
import { Button } from "../../ui/atoms/Button";
import { CategoryBadge } from "../../ui/atoms/CategoryBadge";
import { FilterChip } from "../../ui/atoms/Chip";
import { MoneyAmount } from "../../ui/atoms/MoneyAmount";
import { type Currency, formatMoney, type MoneyLocale } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";
import type { DayGroup, RowData } from "./present-movement";
import "./movements-screen.css";

export type ChipData = {
  key: string;
  label: string;
  selected: boolean;
  onClick: () => void;
  kind: "active" | "toggle";
  ariaLabel?: string;
};

export type MovementsScreenProps = {
  title: string;
  menu: NavAction;
  locale: MoneyLocale;
  search: { label: string; value: string; onChange: (value: string) => void };
  chips: ChipData[];
  filters: ReactNode;
  groups: (DayGroup & { label: string })[];
  status: "loading" | "error" | "ready";
  hasMore: boolean;
  moreFailed: boolean;
  messages: {
    loading: string;
    loadFailed: string;
    retry: string;
    emptyTitle: string;
    emptyDescription: string;
    more: string;
    moreFailed: string;
  };
  onRetry: () => void;
  onMore: () => void;
};

type MovementRowViewProps = { row: RowData; locale: MoneyLocale; to: string };

export function MovementRowView({ row, locale, to }: MovementRowViewProps) {
  const badge =
    row.badge.kind === "category" ? (
      <CategoryBadge name={row.badge.name} icon={row.badge.icon} color={row.badge.color} />
    ) : (
      <AccountBadge type={row.badge.type} />
    );
  const note =
    typeof row.note === "object"
      ? formatMoney(row.note.amount, row.note.currency, locale)
      : row.note;
  return (
    <MovementRow
      badge={badge}
      title={row.title}
      caption={row.caption}
      amount={<MoneyAmount {...row.amount} locale={locale} />}
      to={to}
      {...(note ? { amountNote: note } : {})}
      {...(row.tag ? { tag: row.tag } : {})}
    />
  );
}

type DayTotalProps = { amount: number; currency: Currency; locale: MoneyLocale };

function DayTotal({ amount, currency, locale }: DayTotalProps) {
  return (
    <MoneyAmount
      amount={amount}
      currency={currency}
      locale={locale}
      direction={amount > 0 ? "income" : "neutral"}
    />
  );
}

export function MovementsScreen({
  title,
  menu,
  locale,
  search,
  chips,
  filters,
  groups,
  status,
  hasMore,
  moreFailed,
  messages,
  onRetry,
  onMore,
}: MovementsScreenProps) {
  return (
    <>
      <ScreenHeader title={title} menu={menu} />
      <div className="movements-screen__search">
        <Search aria-hidden="true" />
        <input
          type="search"
          className="movements-screen__search-input"
          aria-label={search.label}
          placeholder={search.label}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
        />
      </div>
      <div className="movements-screen__chips">
        {chips.map((chip) => (
          <FilterChip
            key={chip.key}
            label={chip.label}
            selected={chip.selected}
            onClick={chip.onClick}
            {...(chip.ariaLabel ? { ariaLabel: chip.ariaLabel } : {})}
            {...(chip.kind === "toggle" ? { expanded: chip.selected } : {})}
            icon={
              chip.kind === "toggle" ? (
                <SlidersHorizontal aria-hidden="true" />
              ) : (
                <X aria-hidden="true" />
              )
            }
          />
        ))}
      </div>
      {filters}
      {status === "loading" ? (
        <p className="screen-note" role="status">
          {messages.loading}
        </p>
      ) : null}
      {status === "error" ? (
        <EmptyState
          icon={<List />}
          title={messages.loadFailed}
          action={
            <Button variant="ghost" onClick={onRetry}>
              {messages.retry}
            </Button>
          }
        />
      ) : null}
      {status === "ready" && groups.length === 0 ? (
        <EmptyState
          icon={<List />}
          title={messages.emptyTitle}
          description={messages.emptyDescription}
        />
      ) : null}
      {groups.map((group) => (
        <section key={group.date} className="movements-screen__day" aria-label={group.label}>
          <h2 className="movements-screen__day-head">
            <span>{group.label}</span>
            <span>
              {group.totals.map((total, index) => (
                <span key={total.currency}>
                  {index > 0 ? " · " : null}
                  <DayTotal amount={total.amount} currency={total.currency} locale={locale} />
                </span>
              ))}
            </span>
          </h2>
          <MovementList>
            {group.rows.map((row) => (
              <MovementRowView key={row.id} row={row} locale={locale} to={row.to} />
            ))}
          </MovementList>
        </section>
      ))}
      {moreFailed ? (
        <p className="screen-note" role="alert">
          {messages.moreFailed}
        </p>
      ) : null}
      {hasMore ? (
        <div className="movements-screen__more">
          <Button variant="ghost" onClick={onMore}>
            {messages.more}
          </Button>
        </div>
      ) : null}
    </>
  );
}
