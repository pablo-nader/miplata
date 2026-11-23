import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  Download,
  HandCoins,
  Languages,
  LogOut,
  Repeat,
  Tags,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import type { NavAction } from "../../ui/organisms/nav";
import "../placeholder/placeholder-screen.css";
import "./menu-screen.css";

export type MenuLink = NavAction & { count: number | null };

export type InstallRow = {
  label: string;
  instructions: string | null;
  action: { label: string; onClick: () => void } | null;
};

type MenuScreenProps = {
  title: string;
  back: NavAction;
  identity: string;
  toPay: MenuLink;
  recurring: MenuLink;
  categories: MenuLink;
  budgets: MenuLink;
  loans: MenuLink;
  guides: MenuLink;
  language: NavAction & { value: string };
  install: InstallRow;
  errorMessage: string | null;
  signOut: { label: string; onClick: () => void };
};

export function MenuScreen({
  title,
  back,
  identity,
  toPay,
  recurring,
  categories,
  budgets,
  loans,
  guides,
  language,
  install,
  errorMessage,
  signOut,
}: MenuScreenProps) {
  return (
    <>
      <header className="placeholder-screen__header">
        <Link className="placeholder-screen__back" to={back.to} aria-label={back.label}>
          <ArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="placeholder-screen__title">{title}</h1>
      </header>
      <p className="menu-screen__identity">{identity}</p>
      <ul className="menu-screen__list">
        {(
          [
            [toPay, Clock],
            [recurring, Repeat],
            [categories, Tags],
            [budgets, Target],
            [loans, HandCoins],
            [guides, BookOpen],
          ] as const
        ).map(([link, Icon]) => (
          <li key={link.to} className="menu-screen__row">
            <Link className="menu-screen__link" to={link.to}>
              <Icon aria-hidden="true" />
              <span className="menu-screen__link-label">{link.label}</span>
              {link.count === null ? null : (
                <span className="menu-screen__count">{link.count}</span>
              )}
              <ChevronRight aria-hidden="true" />
            </Link>
          </li>
        ))}
        <li className="menu-screen__row">
          <Link className="menu-screen__link" to={language.to}>
            <Languages aria-hidden="true" />
            <span className="menu-screen__link-label">{language.label}</span>
            <span className="menu-screen__count">{language.value}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </li>
        <li className="menu-screen__install">
          <div className="menu-screen__install-head">
            <Download aria-hidden="true" />
            <span className="menu-screen__link-label">{install.label}</span>
          </div>
          {install.instructions ? (
            <p className="menu-screen__install-text">{install.instructions}</p>
          ) : null}
          {install.action ? (
            <Button variant="ghost" onClick={install.action.onClick}>
              {install.action.label}
            </Button>
          ) : null}
        </li>
        <li className="menu-screen__row">
          <Button variant="ghost" icon={<LogOut aria-hidden="true" />} onClick={signOut.onClick}>
            {signOut.label}
          </Button>
        </li>
      </ul>
      {errorMessage ? (
        <p role="alert" className="menu-screen__error">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
