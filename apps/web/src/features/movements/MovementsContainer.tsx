import type { Movement } from "@miplata/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { localeForLanguage } from "../../ui/format/money";
import { MovementFiltersPanel, type UiFilters } from "./MovementFiltersPanel";
import { MovementsScreen } from "./MovementsScreen";
import {
  activeChips,
  defaultFilters,
  emptyFilters,
  isInvertedRange,
  toQuery,
} from "./movement-filters";
import { fetchMovements, PAGE_SIZE } from "./movements-api";
import { dayLabel, groupByDay, localDate, monthOfDate } from "./present-movement";
import { useLookups } from "./useLookups";

const SEARCH_DELAY_MS = 300;

type ListState = {
  status: "loading" | "error" | "ready";
  items: Movement[];
  hasMore: boolean;
};

export function MovementsContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const lookups = useLookups();
  const today = localDate();
  const [filters, setFilters] = useState<UiFilters>(() => defaultFilters(monthOfDate(today)));
  const [searchText, setSearchText] = useState("");
  const [q, setQ] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [list, setList] = useState<ListState>({ status: "loading", items: [], hasMore: false });
  const token = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setQ(searchText), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = useMemo(() => toQuery(filters, q), [filters, q]);

  const inverted = isInvertedRange(filters);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(() => {
    token.current += 1;
    const current = token.current;
    setLoadingMore(false);
    if (inverted) {
      setList({ status: "ready", items: [], hasMore: false });
      return;
    }
    setList((previous) => ({ ...previous, status: "loading" }));
    fetchMovements(query).then(
      (page) => {
        if (token.current === current) {
          setList({ status: "ready", items: page.items, hasMore: page.hasMore });
        }
      },
      () => {
        if (token.current === current) {
          setList({ status: "error", items: [], hasMore: false });
        }
      },
    );
  }, [query, inverted]);

  useEffect(() => {
    load();
    return () => {
      token.current += 1;
    };
  }, [load]);

  function loadMore() {
    if (loadingMore) {
      return;
    }
    setLoadingMore(true);
    const current = token.current;
    fetchMovements(query, PAGE_SIZE, list.items.length).then(
      (page) => {
        if (token.current === current) {
          setList((previous) => ({
            status: "ready",
            items: [...previous.items, ...page.items],
            hasMore: page.hasMore,
          }));
          setLoadingMore(false);
        }
      },
      () => {
        if (token.current === current) {
          setLoadingMore(false);
        }
      },
    );
  }

  const chips = activeChips(filters, {
    t,
    locale: i18n.language,
    accounts: lookups.accounts,
    catalog: lookups.catalog,
  });
  const lookupsReady = lookups.status === "ready";
  const rows = lookupsReady ? list.items.map((movement) => lookups.present(movement)) : [];
  const groups = groupByDay(rows).map((group) => ({
    ...group,
    label: dayLabel(group.date, today, locale, t),
  }));

  function clearAll() {
    setFilters(emptyFilters());
    setSearchText("");
    setQ("");
  }

  return (
    <MovementsScreen
      title={t("screens.movements.title")}
      locale={locale}
      search={{ label: t("movements.search"), value: searchText, onChange: setSearchText }}
      chips={[
        ...chips.map((chip) => ({
          key: chip.key,
          label: chip.label,
          selected: true,
          kind: "active" as const,
          ariaLabel: t("movements.filters.remove", { label: chip.label }),
          onClick: () => setFilters({ ...filters, ...chip.clear }),
        })),
        {
          key: "toggle",
          label: t("movements.filters.title"),
          selected: panelOpen,
          kind: "toggle" as const,
          onClick: () => setPanelOpen(!panelOpen),
        },
      ]}
      filters={
        panelOpen ? (
          <MovementFiltersPanel
            value={filters}
            onChange={setFilters}
            onClear={clearAll}
            accounts={lookups.accounts}
            catalog={lookups.catalog}
          />
        ) : null
      }
      groups={groups}
      status={lookups.status === "error" ? "error" : lookupsReady ? list.status : "loading"}
      hasMore={list.hasMore && !loadingMore}
      messages={{
        loading: t("movements.loading"),
        loadFailed: t("movements.loadFailed"),
        retry: t("movements.retry"),
        emptyTitle: inverted ? t("movements.filters.invalidRange") : t("movements.emptyTitle"),
        emptyDescription: t("movements.emptyDescription"),
        more: t("movements.more"),
      }}
      onRetry={load}
      onMore={loadMore}
    />
  );
}
