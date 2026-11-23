import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { NavAction } from "../organisms/nav";
import "./screen-header.css";

type ScreenHeaderProps = {
  title: string;
  back?: NavAction;
  action?: NavAction;
};

export function ScreenHeader({ title, back, action }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      {back ? (
        <Link className="screen-header__back" to={back.to} aria-label={back.label}>
          <ArrowLeft aria-hidden="true" />
        </Link>
      ) : null}
      <h1 className="screen-header__title">{title}</h1>
      {action ? (
        <Link className="screen-header__action" to={action.to}>
          <Plus aria-hidden="true" />
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}
