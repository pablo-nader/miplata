import {
  type CategoryDto,
  type CategoryGroupDto,
  createCategoryRequestSchema,
  groupRequestSchema,
  updateCategoryRequestSchema,
} from "@miplata/shared";

export type FakeResponse = { status: number; body?: unknown };

export type FakeCategoriesBackend = {
  handle: (method: string, path: string, body?: unknown) => FakeResponse;
  markUsed: (categoryId: string) => void;
  groups: CategoryGroupDto[];
  categories: CategoryDto[];
  mostUsedIds: string[];
};

function sameName(left: string | null, right: string): boolean {
  return left !== null && left.toLowerCase() === right.toLowerCase();
}

export function createFakeCategoriesBackend(): FakeCategoriesBackend {
  let counter = 0;
  const nextId = () => {
    counter += 1;
    return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
  };
  const used = new Set<string>();
  const groups: CategoryGroupDto[] = [
    { id: nextId(), nameKey: "defaults.group.housing", name: null, sortOrder: 0 },
    { id: nextId(), nameKey: "defaults.group.food", name: null, sortOrder: 1 },
  ];
  const seeded = (
    nameKey: string,
    icon: string,
    color: number,
    sortOrder: number,
    groupId: string | null,
  ): CategoryDto => ({
    id: nextId(),
    type: groupId ? "expense" : "income",
    groupId,
    nameKey,
    name: null,
    icon,
    color,
    isActive: true,
    sortOrder,
  });
  const housing = groups[0]?.id ?? null;
  const food = groups[1]?.id ?? null;
  const categories: CategoryDto[] = [
    seeded("defaults.category.rent", "key", 1, 0, housing),
    seeded("defaults.category.maintenance", "hammer", 1, 1, housing),
    seeded("defaults.category.groceries", "shopping-cart", 4, 0, food),
    seeded("defaults.income.salary", "briefcase", 5, 0, null),
  ];

  const mostUsedIds: string[] = [];

  function categoryNameTaken(type: string, name: string, exceptId?: string) {
    return categories.some(
      (item) => item.type === type && item.id !== exceptId && sameName(item.name, name),
    );
  }

  function handle(method: string, path: string, body?: unknown): FakeResponse {
    const parts =
      path
        .replace(/^\/api\//, "")
        .split("?")[0]
        ?.split("/") ?? [];
    const [resource, id, action] = parts;

    if (resource === "categories") {
      if (method === "GET" && id === "most-used") {
        return { status: 200, body: { categoryIds: mostUsedIds } };
      }
      if (method === "GET" && !id) {
        return {
          status: 200,
          body: {
            expenseGroups: [...groups]
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((group) => ({
                ...group,
                categories: categories.filter((item) => item.groupId === group.id),
              })),
            income: categories.filter((item) => item.type === "income"),
          },
        };
      }
      if (method === "POST" && !id) {
        const parsed = createCategoryRequestSchema.safeParse(body);
        if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
        const { type, groupId, name, icon, color } = parsed.data;
        if (type === "expense" && !groups.some((group) => group.id === groupId)) {
          return { status: 400, body: { error: "group_not_found" } };
        }
        if (categoryNameTaken(type, name)) return { status: 409, body: { error: "name_taken" } };
        const created: CategoryDto = {
          id: nextId(),
          type,
          groupId: groupId ?? null,
          nameKey: null,
          name,
          icon,
          color,
          isActive: true,
          sortOrder: categories.length,
        };
        categories.push(created);
        return { status: 201, body: created };
      }
      const current = categories.find((item) => item.id === id);
      if (!current) return { status: 404, body: { error: "not_found" } };
      if (method === "PATCH") {
        const parsed = updateCategoryRequestSchema.safeParse(body);
        if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
        const patch = parsed.data;
        if (patch.name !== undefined && categoryNameTaken(current.type, patch.name, current.id)) {
          return { status: 409, body: { error: "name_taken" } };
        }
        Object.assign(current, {
          ...(patch.name !== undefined ? { name: patch.name, nameKey: null } : {}),
          ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
          ...(patch.color !== undefined ? { color: patch.color } : {}),
          ...(patch.groupId !== undefined ? { groupId: patch.groupId } : {}),
        });
        return { status: 200, body: current };
      }
      if (method === "POST" && action === "deactivate") {
        current.isActive = false;
        return { status: 200, body: current };
      }
      if (method === "POST" && action === "reactivate") {
        current.isActive = true;
        return { status: 200, body: current };
      }
      if (method === "DELETE") {
        if (used.has(current.id)) return { status: 409, body: { error: "category_in_use" } };
        categories.splice(categories.indexOf(current), 1);
        return { status: 204 };
      }
    }

    if (resource === "category-groups") {
      if (method === "POST" && !id) {
        const parsed = groupRequestSchema.safeParse(body);
        if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
        if (groups.some((group) => sameName(group.name, parsed.data.name))) {
          return { status: 409, body: { error: "name_taken" } };
        }
        const created = {
          id: nextId(),
          nameKey: null,
          name: parsed.data.name,
          sortOrder: groups.length,
        };
        groups.push(created);
        return { status: 201, body: created };
      }
      const group = groups.find((item) => item.id === id);
      if (!group) return { status: 404, body: { error: "not_found" } };
      if (method === "PATCH") {
        const parsed = groupRequestSchema.safeParse(body);
        if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
        group.name = parsed.data.name;
        group.nameKey = null;
        return { status: 200, body: group };
      }
      if (method === "DELETE") {
        if (categories.some((item) => item.groupId === group.id)) {
          return { status: 409, body: { error: "group_not_empty" } };
        }
        groups.splice(groups.indexOf(group), 1);
        return { status: 204 };
      }
    }
    return { status: 404, body: { error: "not_found" } };
  }

  return {
    handle,
    markUsed: (categoryId) => used.add(categoryId),
    groups,
    categories,
    mostUsedIds,
  };
}

export function stubFetchWith(backend: FakeCategoriesBackend) {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const result = backend.handle(init?.method ?? "GET", url, body);
    return new Response(result.body === undefined ? null : JSON.stringify(result.body), {
      status: result.status,
      headers: { "content-type": "application/json" },
    });
  };
}
