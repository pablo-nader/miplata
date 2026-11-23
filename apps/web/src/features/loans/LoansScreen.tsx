import { HandCoins } from "lucide-react";
import { AccountBadge } from "../../ui/atoms/AccountBadge";
import { Button } from "../../ui/atoms/Button";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import "../accounts/screen-note.css";
import "./loans-screen.css";

export type LoanLineView = { key: string; amount: MoneyAmountProps; details: string[] };

export type LoanPersonRow = {
  id: string;
  name: string;
  caption: string;
  to: string;
  lines: LoanLineView[];
};

export type LoanGroup = {
  key: string;
  label: string;
  totals: string;
  empty: string;
  rows: LoanPersonRow[];
};

type LoansScreenProps = {
  title: string;
  back: NavAction;
  status: "loading" | "error" | "ready";
  groups: LoanGroup[];
  messages: { loading: string; loadFailed: string; retry: string };
  onRetry: () => void;
};

export function LoansScreen({ title, back, status, groups, messages, onRetry }: LoansScreenProps) {
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
      {status === "ready"
        ? groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="loans-screen__head">
                <span className="loans-screen__head-label">{group.label}</span>
                <span>{group.totals}</span>
              </h2>
              {group.rows.length === 0 ? <p className="screen-note">{group.empty}</p> : null}
              <MovementList>
                {group.rows.map((row) => {
                  const details = row.lines.flatMap((line) => line.details);
                  return (
                    <MovementRow
                      key={row.id}
                      badge={<AccountBadge type="person" />}
                      title={row.name}
                      caption={row.caption}
                      amount={
                        <span className="loans-screen__amounts">
                          {row.lines.map((line) => (
                            <MoneyAmount key={line.key} {...line.amount} />
                          ))}
                        </span>
                      }
                      to={row.to}
                      {...(details.length > 0
                        ? {
                            footer: details.map((detail) => (
                              <span key={detail} className="loans-screen__detail">
                                {detail}
                              </span>
                            )),
                          }
                        : {})}
                    />
                  );
                })}
              </MovementList>
            </section>
          ))
        : null}
    </>
  );
}
