import { localeSchema } from "@miplata/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useResource } from "../../shared/use-resource";
import { authClient } from "../auth/auth-client";
import { useSession } from "../auth/useSession";
import { fetchBudgets } from "../budgets/budgets-api";
import { allCategories } from "../categories/catalog";
import { useCategories } from "../categories/useCategories";
import { useInstall } from "../install/use-install";
import { localDate, monthOfDate } from "../movements/present-movement";
import { fetchOccurrences, fetchRecurringList } from "../recurring/recurring-api";
import { pendingExpenses } from "../recurring/recurring-display";
import { MenuScreen } from "./MenuScreen";

function fetchToPay() {
  return fetchOccurrences("expense");
}

export function MenuContainer() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const [signOutFailed, setSignOutFailed] = useState(false);
  const month = monthOfDate(localDate());
  const loadBudgets = useCallback(() => fetchBudgets(month), [month]);
  const toPayResource = useResource(fetchToPay);
  const recurringResource = useResource(fetchRecurringList);
  const budgetsResource = useResource(loadBudgets);
  const categories = useCategories();
  const install = useInstall();
  const current = localeSchema.catch("es").parse(i18n.language);

  const toPay = toPayResource.state.status === "ready" ? toPayResource.state.data : null;
  const toPayCount = toPay ? pendingExpenses(toPay.items, toPay.today).length : null;
  const recurringCount =
    recurringResource.state.status === "ready" ? recurringResource.state.data.items.length : null;
  const budgetsCount =
    budgetsResource.state.status === "ready" ? budgetsResource.state.data.items.length : null;
  const categoriesCount =
    categories.state.status === "ready" ? allCategories(categories.state.catalog).length : null;

  const instructions =
    install.state === "ios"
      ? t("install.hint.ios")
      : install.state === "browser"
        ? t("install.hint.browser")
        : install.state === "installed"
          ? t("install.installed")
          : null;

  async function signOut() {
    setSignOutFailed(false);
    const result = await authClient.signOut().catch(() => ({ error: true }));
    if (result?.error) {
      setSignOutFailed(true);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <MenuScreen
      title={t("screens.menu.title")}
      back={{ to: "/", label: t("nav.backHome") }}
      identity={user?.email ?? ""}
      toPay={{ to: "/to-pay", label: t("menu.toPay"), count: toPayCount }}
      recurring={{ to: "/recurring", label: t("menu.recurring"), count: recurringCount }}
      categories={{ to: "/categories", label: t("menu.categories"), count: categoriesCount }}
      budgets={{ to: "/budgets", label: t("menu.budgets"), count: budgetsCount }}
      language={{
        to: "/menu/language",
        label: t("menu.language"),
        value: t(`menu.languageNames.${current}`),
      }}
      install={{
        label: t("install.row"),
        instructions,
        action: install.install
          ? { label: t("install.action"), onClick: () => void install.install?.() }
          : null,
      }}
      errorMessage={signOutFailed ? t("menu.signOutFailed") : null}
      signOut={{ label: t("menu.signOut"), onClick: () => void signOut() }}
    />
  );
}
