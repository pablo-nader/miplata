import { ChartPie, House, List, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { AppShell } from "../../ui/organisms/AppShell";
import type { NavAction, NavItem } from "../../ui/organisms/nav";
import { Sidebar } from "../../ui/organisms/Sidebar";
import { TabBar } from "../../ui/organisms/TabBar";

export function ShellContainer() {
  const { t } = useTranslation();
  const items: NavItem[] = [
    { id: "home", to: "/home", label: t("nav.home"), icon: House, end: true },
    { id: "movements", to: "/movements", label: t("nav.movements"), icon: List },
    { id: "accounts", to: "/accounts", label: t("nav.accounts"), icon: Wallet },
    { id: "reports", to: "/reports", label: t("nav.reports"), icon: ChartPie },
  ];
  const action: NavAction = { to: "/movements/new", label: t("nav.newMovement") };
  const menu: NavAction = { to: "/menu", label: t("nav.menu") };
  const label = t("nav.primary");

  return (
    <AppShell
      sidebar={
        <Sidebar
          label={label}
          brandName={t("app.name")}
          items={items}
          action={action}
          menu={menu}
        />
      }
      tabBar={<TabBar label={label} items={items} action={action} />}
    >
      <Outlet />
    </AppShell>
  );
}
