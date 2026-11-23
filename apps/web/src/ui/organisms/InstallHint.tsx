import { Button } from "../atoms/Button";
import "./install-hint.css";

type InstallHintProps = {
  title: string;
  instructions: string | null;
  action: { label: string; onClick: () => void } | null;
  dismissLabel: string;
  onDismiss: () => void;
};

export function InstallHint({
  title,
  instructions,
  action,
  dismissLabel,
  onDismiss,
}: InstallHintProps) {
  return (
    <aside className="install-hint">
      <p className="install-hint__title">{title}</p>
      {instructions ? <p className="install-hint__text">{instructions}</p> : null}
      <div className="install-hint__actions">
        {action ? (
          <Button variant="ghost" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onDismiss}>
          {dismissLabel}
        </Button>
      </div>
    </aside>
  );
}
