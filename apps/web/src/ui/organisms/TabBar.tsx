import { NavLink } from "react-router-dom";
import { AddButton } from "../atoms/AddButton";
import type { NavAction, NavItem } from "./nav";
import "./tab-bar.css";

type TabBarProps = {
  label: string;
  items: readonly NavItem[];
  action: NavAction;
};

export function TabBar({ label, items, action }: TabBarProps) {
  const half = Math.ceil(items.length / 2);
  const tabs = (list: readonly NavItem[]) =>
    list.map(({ id, to, label: itemLabel, icon: Icon, end }) => (
      <NavLink key={id} to={to} end={end ?? false} className="tab-bar__item">
        <Icon aria-hidden="true" />
        <span>{itemLabel}</span>
      </NavLink>
    ));

  return (
    <nav className="tab-bar" aria-label={label}>
      {tabs(items.slice(0, half))}
      <span className="tab-bar__add">
        <AddButton to={action.to} label={action.label} />
      </span>
      {tabs(items.slice(half))}
    </nav>
  );
}
