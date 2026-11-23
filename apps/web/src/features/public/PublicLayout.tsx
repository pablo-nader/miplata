import { Link, Outlet } from "react-router-dom";
import type { NavAction } from "../../ui/organisms/nav";
import "./public-layout.css";

export type LanguageOption = {
  code: string;
  label: string;
  active: boolean;
  onSelect: () => void;
};

type PublicLayoutProps = {
  footerLabel: string;
  privacy: NavAction;
  terms: NavAction;
  languageLabel: string;
  languages: LanguageOption[];
};

export function PublicLayout({
  footerLabel,
  privacy,
  terms,
  languageLabel,
  languages,
}: PublicLayoutProps) {
  return (
    <div className="public-layout">
      <main className="public-layout__main">
        <Outlet />
      </main>
      <footer className="public-layout__footer">
        <nav className="public-layout__links" aria-label={footerLabel}>
          <Link to={privacy.to}>{privacy.label}</Link>
          <Link to={terms.to}>{terms.label}</Link>
        </nav>
        <fieldset className="public-layout__languages">
          <legend className="visually-hidden">{languageLabel}</legend>
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              lang={language.code}
              aria-pressed={language.active}
              className="public-layout__language"
              onClick={language.onSelect}
            >
              {language.label}
            </button>
          ))}
        </fieldset>
      </footer>
    </div>
  );
}
