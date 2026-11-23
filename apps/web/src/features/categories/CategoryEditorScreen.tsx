import { ArrowLeft } from "lucide-react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { CategoryBadge, type CategoryColor } from "../../ui/atoms/CategoryBadge";
import { FilterChip } from "../../ui/atoms/Chip";
import { type ColorOption, ColorPicker } from "../../ui/molecules/ColorPicker";
import { ConfirmPanel } from "../../ui/molecules/ConfirmPanel";
import { Field } from "../../ui/molecules/Field";
import { type IconOption, IconPicker } from "../../ui/molecules/IconPicker";
import { OfflineNote } from "../../ui/molecules/OfflineNote";
import type { NavAction } from "../../ui/organisms/nav";
import "../placeholder/placeholder-screen.css";
import "./category-editor-screen.css";
import { useRestoreFocus } from "./useRestoreFocus";

export type ConfirmView = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
};

type CategoryEditorScreenProps = {
  title: string;
  back: NavAction;
  preview: { name: string; icon: string | null; color: CategoryColor };
  name: {
    label: string;
    value: string;
    error: string | undefined;
    onChange: (value: string) => void;
  };
  groups: {
    label: string;
    options: readonly { id: string; label: string }[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  } | null;
  colors: {
    label: string;
    swatchName: string;
    options: readonly ColorOption[];
    value: CategoryColor;
    onSelect: (color: CategoryColor) => void;
  };
  icons: {
    label: string;
    noIconLabel: string;
    options: readonly IconOption[];
    value: string | null;
    onSelect: (icon: string | null) => void;
  };
  save: { label: string; busy: boolean; onSubmit: () => void };
  offlineMessage: string | null;
  errorMessage: string | null;
  actions: { label: string; onClick: () => void }[];
  confirm: ConfirmView | null;
};

export function CategoryEditorScreen({
  title,
  back,
  preview,
  name,
  groups,
  colors,
  icons,
  save,
  offlineMessage,
  errorMessage,
  actions,
  confirm,
}: CategoryEditorScreenProps) {
  const heading = useRestoreFocus(confirm !== null);

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
        <h1 ref={heading} tabIndex={-1} className="placeholder-screen__title">
          {title}
        </h1>
      </header>
      {confirm ? null : (
        <form className="category-editor" onSubmit={submit} noValidate>
          <div className="category-editor__name">
            <CategoryBadge
              name={preview.name}
              icon={preview.icon}
              color={preview.color}
              size="picker"
            />
            <Field
              label={name.label}
              value={name.value}
              autoComplete="off"
              {...(name.error ? { error: name.error } : {})}
              onChange={(event) => name.onChange(event.target.value)}
            />
          </div>
          {groups ? (
            <fieldset className="category-editor__groups">
              <legend className="category-picker__legend">{groups.label}</legend>
              <div className="category-editor__chips">
                {groups.options.map((option) => (
                  <FilterChip
                    key={option.id}
                    label={option.label}
                    selected={option.id === groups.selectedId}
                    onClick={() => groups.onSelect(option.id)}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}
          <ColorPicker
            label={colors.label}
            swatchName={colors.swatchName}
            options={colors.options}
            value={colors.value}
            onSelect={colors.onSelect}
          />
          <IconPicker
            label={icons.label}
            noIconLabel={icons.noIconLabel}
            options={icons.options}
            value={icons.value}
            color={colors.value}
            fallbackName={preview.name}
            onSelect={icons.onSelect}
          />
          {errorMessage ? (
            <p role="alert" className="category-editor__error">
              {errorMessage}
            </p>
          ) : null}
          {offlineMessage !== null ? <OfflineNote message={offlineMessage} /> : null}
          <div className="category-editor__actions">
            <Button type="submit" disabled={save.busy || offlineMessage !== null}>
              {save.label}
            </Button>
          </div>
        </form>
      )}
      {confirm ? <ConfirmPanel {...confirm} /> : null}
      {actions.length > 0 && !confirm ? (
        <div className="category-editor__secondary">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              disabled={save.busy}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </>
  );
}
