import { CategoryBadge, type CategoryColor } from "../../ui/atoms/CategoryBadge";
import { MoneyAmount, type MoneyAmountProps } from "../../ui/atoms/MoneyAmount";
import { MovementList, MovementRow } from "../../ui/molecules/MovementRow";
import { type PanelMessages, PanelState, type PanelStatus } from "./PanelState";

export type ChangeRowData = {
  key: string;
  name: string;
  icon: string | null;
  color: CategoryColor;
  amount: MoneyAmountProps;
  caption: string;
  percentText: string;
};

type ChangesPanelProps = {
  status: PanelStatus;
  messages: PanelMessages;
  rows: ChangeRowData[];
  note: string;
  onRetry: () => void;
};

export function ChangesPanel({ status, messages, rows, note, onRetry }: ChangesPanelProps) {
  return (
    <PanelState status={status} empty={rows.length === 0} messages={messages} onRetry={onRetry}>
      <p className="report-note">{note}</p>
      <MovementList>
        {rows.map((row) => (
          <MovementRow
            key={row.key}
            badge={<CategoryBadge name={row.name} icon={row.icon} color={row.color} />}
            title={row.name}
            caption={row.caption}
            amount={<MoneyAmount {...row.amount} />}
            amountNote={row.percentText}
          />
        ))}
      </MovementList>
    </PanelState>
  );
}
