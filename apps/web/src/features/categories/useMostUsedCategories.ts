import type { CategoryType } from "@miplata/shared";
import { useEffect, useState } from "react";
import { categoriesApi } from "./categories-api";

export function useMostUsedCategories(type: CategoryType): readonly string[] | undefined {
  const [loaded, setLoaded] = useState<{ type: CategoryType; ids: readonly string[] } | null>(null);

  useEffect(() => {
    let current = true;
    void categoriesApi.mostUsed(type).then((result) => {
      if (current) {
        setLoaded({ type, ids: result.ok ? result.value.categoryIds : [] });
      }
    });
    return () => {
      current = false;
    };
  }, [type]);

  return loaded?.type === type ? loaded.ids : undefined;
}
