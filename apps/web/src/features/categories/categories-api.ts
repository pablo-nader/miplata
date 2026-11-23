import {
  type CategoriesResponse,
  type CategoryDto,
  type CategoryGroupDto,
  type CreateCategoryRequest,
  categoriesResponseSchema,
  categoryGroupSchema,
  categorySchema,
  type UpdateCategoryRequest,
} from "@miplata/shared";

export type ApiFailure =
  | "name_taken"
  | "category_in_use"
  | "group_not_empty"
  | "not_found"
  | "invalid_request"
  | "unauthorized"
  | "network"
  | "unknown";

export type ApiResult<Value> = { ok: true; value: Value } | { ok: false; error: ApiFailure };

type Parser<Value> = { parse: (data: unknown) => Value };

const knownFailures: readonly ApiFailure[] = [
  "name_taken",
  "category_in_use",
  "group_not_empty",
  "not_found",
  "invalid_request",
  "unauthorized",
];

async function failureOf(response: Response): Promise<ApiFailure> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  const match = knownFailures.find((failure) => failure === body?.error);
  return match ?? (response.status === 401 ? "unauthorized" : "unknown");
}

async function send<Value>(
  method: string,
  path: string,
  parser: Parser<Value>,
  body?: unknown,
): Promise<ApiResult<Value>> {
  try {
    const response = await fetch(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      return { ok: false, error: await failureOf(response) };
    }
    return { ok: true, value: parser.parse(await response.json()) };
  } catch (error) {
    return { ok: false, error: error instanceof TypeError ? "network" : "unknown" };
  }
}

async function sendForNothing(method: string, path: string): Promise<ApiResult<null>> {
  try {
    const response = await fetch(path, { method });
    return response.ok
      ? { ok: true, value: null }
      : { ok: false, error: await failureOf(response) };
  } catch {
    return { ok: false, error: "network" };
  }
}

export const categoriesApi = {
  list: (): Promise<ApiResult<CategoriesResponse>> =>
    send("GET", "/api/categories", categoriesResponseSchema),
  create: (request: CreateCategoryRequest): Promise<ApiResult<CategoryDto>> =>
    send("POST", "/api/categories", categorySchema, request),
  update: (id: string, patch: UpdateCategoryRequest): Promise<ApiResult<CategoryDto>> =>
    send("PATCH", `/api/categories/${id}`, categorySchema, patch),
  deactivate: (id: string): Promise<ApiResult<CategoryDto>> =>
    send("POST", `/api/categories/${id}/deactivate`, categorySchema),
  reactivate: (id: string): Promise<ApiResult<CategoryDto>> =>
    send("POST", `/api/categories/${id}/reactivate`, categorySchema),
  remove: (id: string): Promise<ApiResult<null>> =>
    sendForNothing("DELETE", `/api/categories/${id}`),
  createGroup: (name: string): Promise<ApiResult<CategoryGroupDto>> =>
    send("POST", "/api/category-groups", categoryGroupSchema, { name }),
  renameGroup: (id: string, name: string): Promise<ApiResult<CategoryGroupDto>> =>
    send("PATCH", `/api/category-groups/${id}`, categoryGroupSchema, { name }),
  removeGroup: (id: string): Promise<ApiResult<null>> =>
    sendForNothing("DELETE", `/api/category-groups/${id}`),
};
