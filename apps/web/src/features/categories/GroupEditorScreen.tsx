import { ArrowLeft } from "lucide-react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { Field } from "../../ui/molecules/Field";
import type { NavAction } from "../../ui/organisms/nav";
import "../placeholder/placeholder-screen.css";
import "./category-editor-screen.css";
import type { ConfirmView } from "./CategoryEditorScreen";

type GroupEditorScreenProps = {
  title: string;
  back: NavAction;
  name: {
    label: string;
    value: string;
    error: string | undefined;
    onChange: (value: string) => void;
  };
  save: { label: string; busy: boolean; onSubmit: () => void };
  errorMessage: string | null;
  remove: { label: string; onClick: () => void } | null;
  confirm: ConfirmView | null;
};

export function GroupEditorScreen({
  title,
  back,
  name,
  save,
  errorMessage,
  remove,
  confirm,
}: GroupEditorScreenProps) {
  function submit(event: FormEvent) {
    event.preventDefault();
    save.onSubmit();
  }

  return (
    <>
      <header className="placeholder-screen__header">
        <Link className="placeholder-screen__back" to={back.to} aria-label={back.label}>
          <ArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="placeholder-screen__title">{title}</h1>
      </header>
      <form className="category-editor" onSubmit={submit} noValidate>
        <div className="category-editor__actions">
          <Field
            label={name.label}
            value={name.value}
            autoComplete="off"
            {...(name.error ? { error: name.error } : {})}
            onChange={(event) => name.onChange(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p role="alert" className="category-editor__error">
            {errorMessage}
          </p>
        ) : null}
        <div className="category-editor__actions">
          <Button type="submit" disabled={save.busy}>
            {save.label}
          </Button>
        </div>
      </form>
      {confirm ? <ConfirmPanel {...confirm} /> : null}
      {remove && !confirm ? (
        <div className="category-editor__secondary">
          <Button variant="ghost" onClick={remove.onClick}>
            {remove.label}
          </Button>
        </div>
      ) : null}
    </>
  );
}
