import { ArrowLeft, Construction } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../ui/molecules/EmptyState";
import type { NavAction } from "../../ui/organisms/nav";
import "./placeholder-screen.css";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  note: string;
  back?: NavAction;
};

export function PlaceholderScreen({ title, description, note, back }: PlaceholderScreenProps) {
  return (
    <>
      <header className="placeholder-screen__header">
        {back ? (
          <Link className="placeholder-screen__back" to={back.to} aria-label={back.label}>
            <ArrowLeft aria-hidden="true" />
          </Link>
        ) : null}
        <h1 className="placeholder-screen__title">{title}</h1>
      </header>
      <EmptyState icon={<Construction />} title={note} description={description} />
    </>
  );
}
