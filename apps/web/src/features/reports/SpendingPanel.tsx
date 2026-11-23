import { ArrowLeft } from "lucide-react";
import { CategoryBadge, type CategoryColor } from "../../ui/atoms/CategoryBadge";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { type PanelMessages, PanelState, type PanelStatus } from "./PanelState";

export type BarRowData = {
  key: string;
  name: string;
  color: CategoryColor;
  amount: string;
  share: string;
  percent: number;
  onSelect: () => void;
};

export type SpendingMovementRowData = {
  key: string;
  title: string;
  caption: string;
  amount: MoneyAmountProps;
  badge: { name: string; icon: string | null; color: CategoryColor };
};

type SpendingPanelProps = {
  status: PanelStatus;
  messages: PanelMessages;
  totalLabel: string;
  crumb: { label: string; onBack: () => void } | null;
  rows: BarRowData[];
  movements: SpendingMovementRowData[] | null;
  movementsStatus: PanelStatus;
  onRetry: () => void;
};

export function SpendingPanel({
  status,
  messages,
  totalLabel,
  crumb,
  rows,
  movements,
  movementsStatus,
  onRetry,
}: SpendingPanelProps) {
  const showingMovements = movements !== null;
  return (
    <PanelState
      status={status}
      empty={rows.length === 0 && !showingMovements}
      messages={messages}
      onRetry={onRetry}
    >
      <p className="report-total">{totalLabel}</p>
      {crumb ? (
        <button type="button" className="report-back" onClick={crumb.onBack}>
          <ArrowLeft aria-hidden="true" />
          {crumb.label}
        </button>
      ) : null}
      {showingMovements ? (
        <PanelState
          status={movementsStatus}
          empty={movements.length === 0}
          messages={messages}
          onRetry={onRetry}
        >
          <MovementList>
            {movements.map((row) => (
              <MovementRow
                key={row.key}
                badge={<CategoryBadge {...row.badge} />}
                title={row.title}
                caption={row.caption}
                amount={<MoneyAmount {...row.amount} />}
              />
            ))}
          </MovementList>
        </PanelState>
      ) : (
        <ul className="report-bars">
          {rows.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                className="report-bar"
                onClick={row.onSelect}
                aria-label={`${row.name}, ${row.amount}, ${row.share}`}
              >
                <span className="report-bar__head">
                  <b>
                    <i
                      className={`report-swatch report-swatch--c${row.color}`}
                      aria-hidden="true"
                    />
                    {row.name}
                  </b>
                  <span>
                    {row.amount} · {row.share}
                  </span>
                </span>
                <span className="report-bar__track" aria-hidden="true">
                  <i
                    className={`report-bar__fill report-swatch--c${row.color}`}
                    style={{ width: `${row.percent}%` }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PanelState>
  );
}
