import type { ReactNode } from "react";
import { Chip } from "../atoms/Chip";
import "./movement-row.css";

type MovementListProps = { children: ReactNode };

export function MovementList({ children }: MovementListProps) {
  return <ul className="movement-list">{children}</ul>;
}

type MovementRowProps = {
  badge: ReactNode;
  title: string;
  caption: string;
  amount: ReactNode;
  amountNote?: string;
  tag?: string;
};

export function MovementRow({ badge, title, caption, amount, amountNote, tag }: MovementRowProps) {
  return (
    <li className="movement-row">
      {badge}
      <span className="movement-row__text">
        <span className="movement-row__title">
          <span className="movement-row__title-text">{title}</span>
          {tag ? <Chip>{tag}</Chip> : null}
        </span>
        <span className="movement-row__caption">{caption}</span>
      </span>
      <span className="movement-row__amount">
        {amount}
        {amountNote ? <span className="movement-row__note">{amountNote}</span> : null}
      </span>
    </li>
  );
}
