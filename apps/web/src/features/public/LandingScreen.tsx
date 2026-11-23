import markUrl from "@brand/mark-inverse.svg";
import { Button } from "../../ui/atoms/Button";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import "./landing-screen.css";

type LandingScreenProps = {
  brandName: string;
  tagline: string;
  signInLabel: string;
  onSignIn: () => void;
  aboutLabel: string;
  description: string;
  points: string[];
  status: string;
};

export function LandingScreen({
  brandName,
  tagline,
  signInLabel,
  onSignIn,
  aboutLabel,
  description,
  points,
  status,
}: LandingScreenProps) {
  return (
    <>
      <header className="landing__hero">
        <img src={markUrl} alt="" width={84} height={84} />
        <h1 className="landing__brand">{brandName}</h1>
        <p className="landing__tagline">{tagline}</p>
        <Button
          onClick={onSignIn}
          className="landing__google"
          icon={
            <span className="landing__google-glyph" aria-hidden="true">
              G
            </span>
          }
        >
          {signInLabel}
        </Button>
      </header>
      <section className="landing__about">
        <SectionLabel>{aboutLabel}</SectionLabel>
        <p className="landing__description">{description}</p>
        <ul className="landing__points">
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="landing__status">{status}</p>
      </section>
    </>
  );
}
