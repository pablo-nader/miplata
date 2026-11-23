import type { YearMonth } from "@miplata/shared";
import type { MoneyLocale } from "../../ui/format/money";
import type { PanelMessages } from "./PanelState";
import type { CatalogLookup } from "./report-catalog";
import type { ReportFilters } from "./reports-api";

export type PanelContainerProps = {
  month: YearMonth;
  filters: ReportFilters;
  lookup: CatalogLookup;
  locale: MoneyLocale;
  messages: PanelMessages;
};
