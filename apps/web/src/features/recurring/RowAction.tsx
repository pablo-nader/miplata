import "./row-action.css";

type RowActionProps = {
  label: string;
  name: string;
  quiet?: boolean;
  busy: boolean;
  onClick: () => void;
};

export function RowAction({ label, name, quiet = false, busy, onClick }: RowActionProps) {
  return (
    <button
      type="button"
      className={quiet ? "row-action row-action--quiet" : "row-action"}
      aria-label={name}
      disabled={busy}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
