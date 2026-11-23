import { ArrowLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, ButtonLink } from "../../ui/atoms/Button";
import { AddCategoryBadge, CategoryBadge, type CategoryColor } from "../../ui/atoms/CategoryBadge";
import { Chip } from "../../ui/atoms/Chip";
import { SectionLabel } from "../../ui/atoms/SectionLabel";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { SegmentedControl, type SegmentOption } from "../../ui/molecules/SegmentedControl";
import type { NavAction } from "../../ui/organisms/nav";
import "../placeholder/placeholder-screen.css";
import "./categories-screen.css";

export type CategoryRowView = {
  id: string;
  name: string;
  icon: string | null;
  color: CategoryColor;
  to: string;
  inactive: boolean;
};

export type CategorySectionView = {
  id: string;
  title: string | null;
  edit: NavAction | null;
  rows: CategoryRowView[];
  add: NavAction;
};

type CategoriesScreenProps = {
  title: string;
  back: NavAction;
  tabs: {
    label: string;
    options: readonly SegmentOption[];
    value: string;
    onChange: (value: string) => void;
  };
  body:
    | { status: "loading"; message: string }
    | { status: "error"; message: string; retry: { label: string; onClick: () => void } }
    | {
        status: "ready";
        sections: CategorySectionView[];
        inactiveLabel: string;
        emptyLabel: string;
        addGroup: NavAction | null;
      };
};

export function CategoriesScreen({ title, back, tabs, body }: CategoriesScreenProps) {
  return (
    <>
      <header className="placeholder-screen__header">
        <Link className="placeholder-screen__back" to={back.to} aria-label={back.label}>
          <ArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="placeholder-screen__title">{title}</h1>
      </header>
      <div className="categories-screen__tabs">
        <SegmentedControl
          label={tabs.label}
          options={tabs.options}
          value={tabs.value}
          onChange={tabs.onChange}
        />
      </div>
      {body.status === "loading" ? (
        <p role="status" className="categories-screen__status">
          {body.message}
        </p>
      ) : null}
      {body.status === "error" ? (
        <EmptyState
          title={body.message}
          action={<Button onClick={body.retry.onClick}>{body.retry.label}</Button>}
        />
      ) : null}
      {body.status === "ready" ? (
        <>
          {body.sections.map((section) => (
            <section key={section.id} className="categories-screen__section">
              {section.title ? (
                <div className="categories-screen__section-header">
                  <SectionLabel as="h2">{section.title}</SectionLabel>
                  {section.edit ? (
                    <Link
                      className="categories-screen__edit"
                      to={section.edit.to}
                      aria-label={section.edit.label}
                    >
                      <Pencil aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <ul className="categories-screen__list">
                {section.rows.length === 0 ? (
                  <li className="categories-screen__empty">{body.emptyLabel}</li>
                ) : null}
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <Link className="categories-screen__row" to={row.to}>
                      <CategoryBadge name={row.name} icon={row.icon} color={row.color} />
                      <span className="categories-screen__name">{row.name}</span>
                      {row.inactive ? <Chip>{body.inactiveLabel}</Chip> : null}
                      <ChevronRight aria-hidden="true" className="categories-screen__chevron" />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link className="categories-screen__row" to={section.add.to}>
                    <AddCategoryBadge />
                    <span className="categories-screen__name">{section.add.label}</span>
                  </Link>
                </li>
              </ul>
            </section>
          ))}
          {body.addGroup ? (
            <div className="categories-screen__add-group">
              <ButtonLink variant="ghost" to={body.addGroup.to} icon={<Plus aria-hidden="true" />}>
                {body.addGroup.label}
              </ButtonLink>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
