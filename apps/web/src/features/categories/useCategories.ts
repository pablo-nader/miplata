import type { CategoriesResponse } from "@miplata/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { categoriesApi } from "./categories-api";

export type CatalogState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; catalog: CategoriesResponse };

export function useCategories() {
  const [state, setState] = useState<CatalogState>({ status: "loading" });
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const result = await categoriesApi.list();
    if (mounted.current) {
      setState(result.ok ? { status: "ready", catalog: result.value } : { status: "error" });
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  return { state, reload };
}
