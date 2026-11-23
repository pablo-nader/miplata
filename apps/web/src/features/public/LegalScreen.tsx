import markUrl from "@brand/mark.svg";
import { Link } from "react-router-dom";
import type { NavAction } from "../../ui/organisms/nav";
import "./legal-screen.css";

export type LegalSection = { heading: string; body: string[] };

type LegalScreenProps = {
  home: NavAction;
  brandName: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
  contact: { heading: string; text: string; email: string };
};

export function LegalScreen({
  home,
  brandName,
  title,
  updated,
  intro,
  sections,
  contact,
}: LegalScreenProps) {
  return (
    <article className="legal">
      <Link className="legal__brand" to={home.to} aria-label={home.label}>
        <img src={markUrl} alt="" width={28} height={28} />
        <span>{brandName}</span>
      </Link>
      <h1 className="legal__title">{title}</h1>
      <p className="legal__updated">{updated}</p>
      <p>{intro}</p>
      {sections.map((section) => (
        <section key={section.heading} className="legal__section">
          <h2 className="legal__heading">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
      <section className="legal__section">
        <h2 className="legal__heading">{contact.heading}</h2>
        <p>{contact.text}</p>
        <p>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </section>
    </article>
  );
}
