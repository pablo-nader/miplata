import markUrl from "@brand/mark.svg";
import { Menu, Plus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ButtonLink } from "../atoms/Button";
import type { NavAction, NavItem } from "./nav";
import "./sidebar.css";

type SidebarProps = {
  label: string;
  brandName: string;
  items: readonly NavItem[];
  action: NavAction;
  menu: NavAction;
};

export function Sidebar({ label, brandName, items, action, menu }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label={label}>
      <div className="sidebar__brand">
        <img src={markUrl} alt="" width={28} height={28} />
        <span className="sidebar__name">{brandName}</span>
      </div>
      <ButtonLink to={action.to} icon={<Plus aria-hidden="true" strokeWidth={2.5} />}>
        {action.label}
      </ButtonLink>
      <ul className="sidebar__list">
        {items.map(({ id, to, label: itemLabel, icon: Icon, end }) => (
          <li key={id}>
            <NavLink to={to} end={end ?? false} className="sidebar__item">
              <Icon aria-hidden="true" />
              <span>{itemLabel}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <NavLink to={menu.to} className="sidebar__item">
        <Menu aria-hidden="true" />
        <span>{menu.label}</span>
      </NavLink>
    </nav>
  );
}
