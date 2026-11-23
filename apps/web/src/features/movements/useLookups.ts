import type { Account, CategoriesResponse, Movement } from "@miplata/shared";
import { categoryLabel } from "@miplata/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { displayName } from "../accounts/account-display";
import { fetchAccounts } from "../accounts/accounts-api";
import { allCategories } from "../categories/catalog";
import { useCategories } from "../categories/useCategories";
import { type PresentContext, presentMovement, type RowData } from "./present-movement";

export type Lookups = {
  status: "loading" | "error" | "ready";
  accounts: Account[];
  catalog: CategoriesResponse | null;
  present: (movement: Movement) => RowData;
  reload: () => void;
};

export function useLookups(): Lookups {
  const { t } = useTranslation();
  const accountsResource = useResource(fetchAccounts);
  const categories = useCategories();
  const accounts = accountsResource.state.status === "ready" ? accountsResource.state.data : [];
  const catalog = categories.state.status === "ready" ? categories.state.catalog : null;

  const present = useMemo(() => {
    const byId = new Map(accounts.map((account) => [account.id, account]));
    const categoryById = new Map(
      (catalog ? allCategories(catalog) : []).map((category) => [category.id, category]),
    );
    const context: PresentContext = {
      t,
      account: (id) => byId.get(id),
      category: (id) => categoryById.get(id),
      accountName: (account) => displayName(account, t),
      categoryName: (category) => categoryLabel(category, (key) => t(key)),
    };
    return (movement: Movement) => presentMovement(movement, context);
  }, [accounts, catalog, t]);

  const failed = accountsResource.state.status === "error" || categories.state.status === "error";
  const ready = accountsResource.state.status === "ready" && catalog !== null;

  return {
    status: failed ? "error" : ready ? "ready" : "loading",
    accounts,
    catalog,
    present,
    reload: () => {
      accountsResource.reload();
      categories.reload();
    },
  };
}
