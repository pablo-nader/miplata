import { type PanelMessages, PanelState, type PanelStatus } from "./PanelState";

export type CommittedRowData = {
  key: string;
  label: string;
  total: string;
  parts: string[];
  isEmpty: boolean;
};

type CommittedPanelProps = {
  status: PanelStatus;
  messages: PanelMessages;
  rows: CommittedRowData[];
  note: string;
  onRetry: () => void;
};

export function CommittedPanel({ status, messages, rows, note, onRetry }: CommittedPanelProps) {
  const empty = rows.every((row) => row.isEmpty);
  return (
    <PanelState status={status} empty={empty} messages={messages} onRetry={onRetry}>
      <p className="report-note">{note}</p>
      <ul className="report-committed">
        {rows.map((row) => (
          <li key={row.key} className="report-committed__row">
            <span className="report-committed__text">
              <span className="report-committed__month">{row.label}</span>
              {row.parts.length > 0 ? (
                <span className="report-committed__parts">{row.parts.join(" · ")}</span>
              ) : null}
            </span>
            <span className="report-committed__total">{row.total}</span>
          </li>
        ))}
      </ul>
    </PanelState>
  );
}
