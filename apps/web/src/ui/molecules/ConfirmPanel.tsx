import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";
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
  const bodyId = useId();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !busy) {
      onCancel();
      return;
    }
    if (event.key !== "Tab" || !ref.current) return;
    const focusable = Array.from(
      ref.current.querySelectorAll<HTMLElement>("button:not([disabled])"),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <section
      ref={ref}
      className="confirm-panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <h2 id={titleId} className="confirm-panel__title">
        {title}
      </h2>
      <p id={bodyId} className="confirm-panel__body">
        {body}
      </p>
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
