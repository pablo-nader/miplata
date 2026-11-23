import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "../atoms/Button";
import "./confirm-panel.css";

type ConfirmPanelProps = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
};

export function ConfirmPanel({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
  confirmDisabled = false,
  children,
}: ConfirmPanelProps) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <section
      ref={ref}
      className="confirm-panel"
      role="alertdialog"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) onCancel();
      }}
    >
      <h2 id={titleId} className="confirm-panel__title">
        {title}
      </h2>
      <p className="confirm-panel__body">{body}</p>
      {children}
      <div className="confirm-panel__actions">
        <Button onClick={onConfirm} disabled={busy || confirmDisabled}>
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
      </div>
    </section>
  );
}
