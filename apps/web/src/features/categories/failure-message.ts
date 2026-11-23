import type { TFunction } from "i18next";
import type { ApiFailure } from "./categories-api";

const keys: Record<ApiFailure | "no_group", string> = {
  name_taken: "categories.errors.nameTaken",
  category_in_use: "categories.errors.inUse",
  group_not_empty: "categories.errors.groupNotEmpty",
  not_found: "categories.errors.notFound",
  invalid_request: "categories.errors.generic",
  unauthorized: "categories.errors.generic",
  network: "categories.errors.generic",
  unknown: "categories.errors.generic",
  no_group: "categories.errors.noGroup",
};

export function failureMessage(failure: ApiFailure | "no_group", t: TFunction): string {
  return t(keys[failure]);
}
