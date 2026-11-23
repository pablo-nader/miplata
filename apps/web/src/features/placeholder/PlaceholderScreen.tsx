import { Construction } from "lucide-react";
import { EmptyState } from "../../ui/molecules/EmptyState";
import "./placeholder-screen.css";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  note: string;
};

export function PlaceholderScreen({ title, description, note }: PlaceholderScreenProps) {
  return (
    <>
      <header className="placeholder-screen__header">
        <h1 className="placeholder-screen__title">{title}</h1>
      </header>
      <EmptyState icon={<Construction />} title={note} description={description} />
    </>
  );
}
