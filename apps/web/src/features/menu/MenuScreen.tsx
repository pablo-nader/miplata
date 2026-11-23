import { ArrowLeft, ChevronRight, Languages, LogOut, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { SegmentedControl, type SegmentOption } from "../../ui/molecules/SegmentedControl";
import type { NavAction } from "../../ui/organisms/nav";
import "../placeholder/placeholder-screen.css";
import "./menu-screen.css";

type MenuScreenProps = {
  title: string;
  back: NavAction;
  identity: string;
  categories: NavAction;
  language: {
    label: string;
    options: readonly SegmentOption[];
    value: string;
    onChange: (value: string) => void;
  };
  errorMessage: string | null;
  signOut: { label: string; onClick: () => void };
};

export function MenuScreen({
  title,
  back,
  identity,
  categories,
  language,
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
        <li className="menu-screen__row">
          <Link className="menu-screen__link" to={categories.to}>
            <Tags aria-hidden="true" />
            <span className="menu-screen__link-label">{categories.label}</span>
            <ChevronRight aria-hidden="true" />
          </Link>
        </li>
        <li className="menu-screen__row">
          <Languages aria-hidden="true" />
          <SegmentedControl
            label={language.label}
            options={language.options}
            value={language.value}
            onChange={language.onChange}
          />
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
