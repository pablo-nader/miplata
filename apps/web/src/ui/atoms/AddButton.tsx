import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import "./add-button.css";

type AddButtonProps = { to: string; label: string };

export function AddButton({ to, label }: AddButtonProps) {
  return (
    <Link className="add-button" to={to} aria-label={label}>
      <Plus aria-hidden="true" strokeWidth={2.5} />
    </Link>
  );
}
