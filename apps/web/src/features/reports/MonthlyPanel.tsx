import { type PanelMessages, PanelState, type PanelStatus } from "./PanelState";
import { type ChartBar, chartBars } from "./report-view";

export type MonthlyRowData = {
  month: string;
  shortLabel: string;
  fullLabel: string;
  inMinor: number;
  outMinor: number;
  resultMinor: number;
  inText: string;
  outText: string;
  resultText: string;
};

type MonthlyPanelProps = {
  status: PanelStatus;
  messages: PanelMessages;
  rows: MonthlyRowData[];
  labels: {
    chart: string;
    inLabel: string;
    outLabel: string;
    resultLabel: string;
    monthLabel: string;
    table: string;
  };
  onRetry: () => void;
};

const SLOT = 28;
const BAR = 10;
const GAP = 2;
const PLOT = 120;
const AXIS = 16;

function barLabel(bar: ChartBar, row: MonthlyRowData, labels: MonthlyPanelProps["labels"]) {
  return bar.kind === "in"
    ? `${row.fullLabel} · ${labels.inLabel} ${row.inText}`
    : `${row.fullLabel} · ${labels.outLabel} ${row.outText}`;
}

export function MonthlyPanel({ status, messages, rows, labels, onRetry }: MonthlyPanelProps) {
  const bars = chartBars(
    rows.map((row) => ({
      month: row.month,
      inMinor: row.inMinor,
      outMinor: row.outMinor,
      resultMinor: row.resultMinor,
    })),
    { plotHeight: PLOT, slotWidth: SLOT, barWidth: BAR, gap: GAP },
  );
  const width = rows.length * SLOT;
  const empty = rows.every((row) => row.inMinor === 0 && row.outMinor === 0);
  return (
    <PanelState status={status} empty={empty} messages={messages} onRetry={onRetry}>
      <ul className="report-legend" aria-hidden="true">
        <li>
          <i className="report-swatch report-swatch--in" />
          {labels.inLabel}
        </li>
        <li>
          <i className="report-swatch report-swatch--out" />
          {labels.outLabel}
        </li>
      </ul>
      <svg
        className="report-chart"
        viewBox={`0 0 ${width} ${PLOT + AXIS}`}
        role="img"
        aria-label={labels.chart}
      >
        <line className="report-chart__base" x1={0} x2={width} y1={PLOT} y2={PLOT} />
        {bars.map((bar) => {
          const row = rows.find((item) => item.month === bar.month);
          return (
            <rect
              key={`${bar.month}-${bar.kind}`}
              className={`report-chart__bar report-chart__bar--${bar.kind}`}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={3}
            >
              {row ? <title>{barLabel(bar, row, labels)}</title> : null}
            </rect>
          );
        })}
        {rows.map((row, index) => (
          <text
            key={row.month}
            className="report-chart__axis"
            x={index * SLOT + SLOT / 2}
            y={PLOT + 12}
            textAnchor="middle"
          >
            {row.shortLabel}
          </text>
        ))}
      </svg>
      <table className="report-table">
        <caption className="visually-hidden">{labels.table}</caption>
        <thead>
          <tr>
            <th scope="col">{labels.monthLabel}</th>
            <th scope="col">{labels.inLabel}</th>
            <th scope="col">{labels.outLabel}</th>
            <th scope="col">{labels.resultLabel}</th>
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((row) => (
            <tr key={row.month}>
              <th scope="row">{row.fullLabel}</th>
              <td>{row.inText}</td>
              <td>{row.outText}</td>
              <td
                className={
                  row.resultMinor > 0 ? "report-result report-result--positive" : "report-result"
                }
              >
                {row.resultText}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PanelState>
  );
}
