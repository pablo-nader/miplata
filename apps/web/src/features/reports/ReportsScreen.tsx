import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useId } from "react";
import { Link } from "react-router-dom";
import { SegmentedControl, type SegmentOption } from "../../ui/molecules/SegmentedControl";
import type { NavAction } from "../../ui/organisms/nav";
import "./reports.css";

export type ReportTab = { id: string; label: string };

export type SelectOption = { value: string; label: string };

export type SelectGroup = { label: string; options: SelectOption[] };

type ReportsScreenProps = {
  title: string;
  subtitle: string;
  menu: NavAction;
  tabsLabel: string;
  tabs: readonly ReportTab[];
  activeTab: string;
  onTab: (id: string) => void;
  currency: {
    label: string;
    options: readonly SegmentOption[];
    value: string;
    onChange: (value: string) => void;
  };
  period: {
    label: string;
    value: string;
    previous: string;
    next: string;
    onPrevious: () => void;
    onNext: () => void;
  };
  account: {
    label: string;
    allLabel: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
  };
  category: {
    label: string;
    allLabel: string;
    groups: SelectGroup[];
    value: string;
    onChange: (value: string) => void;
  };
  children: ReactNode;
};

function onTabKey(
  event: KeyboardEvent<HTMLButtonElement>,
  tabs: readonly ReportTab[],
  activeTab: string,
  onTab: (id: string) => void,
) {
  const index = tabs.findIndex((tab) => tab.id === activeTab);
  const jump: Record<string, number> = { Home: 0, End: tabs.length - 1 };
  const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  const target = event.key in jump ? jump[event.key] : step === 0 ? undefined : index + step;
  if (target === undefined) {
    return;
  }
  event.preventDefault();
  const next = tabs[(target + tabs.length) % tabs.length];
  if (next) {
    onTab(next.id);
    document.getElementById(`report-tab-${next.id}`)?.focus();
  }
}

export function ReportsScreen({
  title,
  subtitle,
  menu,
  tabsLabel,
  tabs,
  activeTab,
  onTab,
  currency,
  period,
  account,
  category,
  children,
}: ReportsScreenProps) {
  const accountId = useId();
  const categoryId = useId();
  return (
    <>
      <header className="reports-header">
        <h1 className="reports-header__title">{title}</h1>
        <span className="reports-header__subtitle">{subtitle}</span>
        <Link className="reports-header__menu" to={menu.to} aria-label={menu.label}>
          <Menu aria-hidden="true" />
        </Link>
      </header>
      <div className="reports-tabs" role="tablist" aria-label={tabsLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`report-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls="report-panel"
            tabIndex={tab.id === activeTab ? 0 : -1}
            className={tab.id === activeTab ? "reports-tab reports-tab--on" : "reports-tab"}
            onClick={() => onTab(tab.id)}
            onKeyDown={(event) => onTabKey(event, tabs, activeTab, onTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <SegmentedControl
        label={currency.label}
        options={currency.options}
        value={currency.value}
        onChange={currency.onChange}
      />
      <div className="reports-filters">
        <fieldset className="reports-stepper">
          <legend className="visually-hidden">{period.label}</legend>
          <button type="button" aria-label={period.previous} onClick={period.onPrevious}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="reports-stepper__value" aria-live="polite">
            {period.value}
          </span>
          <button type="button" aria-label={period.next} onClick={period.onNext}>
            <ChevronRight aria-hidden="true" />
          </button>
        </fieldset>
        <div className="reports-select">
          <label htmlFor={accountId}>{account.label}</label>
          <select
            id={accountId}
            value={account.value}
            onChange={(event) => account.onChange(event.target.value)}
          >
            <option value="">{account.allLabel}</option>
            {account.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="reports-select">
          <label htmlFor={categoryId}>{category.label}</label>
          <select
            id={categoryId}
            value={category.value}
            onChange={(event) => category.onChange(event.target.value)}
          >
            <option value="">{category.allLabel}</option>
            {category.groups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <section
        id="report-panel"
        className="reports-panel"
        role="tabpanel"
        aria-labelledby={`report-tab-${activeTab}`}
      >
        {children}
      </section>
    </>
  );
}
