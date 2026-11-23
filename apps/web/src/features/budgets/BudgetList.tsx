import { Link } from "react-router-dom";
import { ProgressBar } from "../../ui/atoms/ProgressBar";
import "./budgets-screen.css";

export type BudgetRowData = {
  id: string;
  title: string;
  amounts: string;
  note: string;
  spentMinor: number;
  limitMinor: number;
  progressLabel: string;
  to: string;
};

export function BudgetList({ rows }: { rows: BudgetRowData[] }) {
  return (
    <ul className="budgets-screen__list">
      {rows.map((row) => (
        <li key={row.id}>
          <Link className="budgets-screen__item" to={row.to}>
            <span className="budgets-screen__head">
              <b className="budgets-screen__title">{row.title}</b>
              <span className="budgets-screen__amounts">{row.amounts}</span>
            </span>
            <ProgressBar value={row.spentMinor} max={row.limitMinor} label={row.progressLabel} />
            <span className="budgets-screen__note">{row.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
