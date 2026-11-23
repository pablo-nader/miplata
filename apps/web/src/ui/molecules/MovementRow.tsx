import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
  to?: string;
};

export function MovementRow({
  badge,
  title,
  caption,
  amount,
  amountNote,
  tag,
  to,
}: MovementRowProps) {
  const content = (
    <>
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
    </>
  );
  if (to) {
    return (
      <li className="movement-row movement-row--link">
        <Link className="movement-row__link" to={to}>
          {content}
        </Link>
      </li>
    );
  }
  return <li className="movement-row">{content}</li>;
}
