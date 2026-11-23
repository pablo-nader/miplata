import { ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { NavAction } from "../../ui/organisms/nav";
import "../placeholder/placeholder-screen.css";
import "./menu-screen.css";

type LanguageScreenProps = {
  title: string;
  back: NavAction;
  options: readonly { value: string; label: string }[];
  value: string;
  errorMessage: string | null;
  onChange: (value: string) => void;
};

export function LanguageScreen({
  title,
  back,
  options,
  value,
  errorMessage,
  onChange,
}: LanguageScreenProps) {
  return (
    <>
      <header className="placeholder-screen__header">
        <Link className="placeholder-screen__back" to={back.to} aria-label={back.label}>
          <ArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="placeholder-screen__title">{title}</h1>
      </header>
      <ul className="menu-screen__list">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <li key={option.value} className="menu-screen__row">
              <button
                type="button"
                className="menu-screen__link menu-screen__choice"
                aria-current={selected ? "true" : undefined}
                onClick={() => onChange(option.value)}
              >
                <span className="menu-screen__link-label">{option.label}</span>
                {selected ? <Check aria-hidden="true" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {errorMessage ? (
        <p role="alert" className="menu-screen__error">
          {errorMessage}
        </p>
      ) : null}
    </>
  );
}
