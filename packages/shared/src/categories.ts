import { z } from "zod";

export const CATEGORY_ICON_NAMES = [
  "building",
  "key",
  "hammer",
  "shield",
  "zap",
  "flame",
  "droplet",
  "wifi",
  "smartphone",
  "tv",
  "landmark",
  "building-2",
  "id-card",
  "shopping-cart",
  "utensils",
  "fuel",
  "car",
  "square-parking",
  "wrench",
  "bus",
  "heart-pulse",
  "pill",
  "stethoscope",
  "party-popper",
  "shirt",
  "dumbbell",
  "graduation-cap",
  "gift",
  "paw-print",
  "plane",
  "ellipsis",
  "briefcase",
  "banknote",
  "laptop",
  "key-round",
  "trending-up",
  "undo-2",
  "percent",
  "receipt",
  "badge-dollar-sign",
  "shield-check",
  "scale",
  "house",
  "heart",
  "book-open",
  "coffee",
  "music",
  "baby",
  "bike",
  "camera",
  "film",
  "gamepad-2",
  "glasses",
  "phone",
  "piggy-bank",
  "scissors",
  "shopping-bag",
  "sparkles",
  "train-front",
  "umbrella",
  "wallet",
  "trophy",
] as const;

export const CATEGORY_TYPES = ["expense", "income"] as const;
export const categoryTypeSchema = z.enum(CATEGORY_TYPES);
export type CategoryType = z.infer<typeof categoryTypeSchema>;

export const CATEGORY_COLORS = [1, 2, 3, 4, 5] as const;
export const NAME_MAX_LENGTH = 40;

export const categoryIconSchema = z.enum(CATEGORY_ICON_NAMES);
export const categoryColorSchema = z.number().int().min(1).max(5);

export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export const categoryNameSchema = z
  .string()
  .transform(normalizeName)
  .pipe(z.string().min(1).max(NAME_MAX_LENGTH));

export const categorySchema = z.object({
  id: z.string().min(1),
  type: categoryTypeSchema,
  groupId: z.string().nullable(),
  nameKey: z.string().nullable(),
  name: z.string().nullable(),
  icon: z.string().nullable(),
  color: categoryColorSchema,
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});
export type CategoryDto = z.infer<typeof categorySchema>;

export const categoryGroupSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().nullable(),
  name: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type CategoryGroupDto = z.infer<typeof categoryGroupSchema>;

export const categoryGroupWithCategoriesSchema = categoryGroupSchema.extend({
  categories: z.array(categorySchema),
});
export type CategoryGroupWithCategories = z.infer<typeof categoryGroupWithCategoriesSchema>;

export const categoriesResponseSchema = z.object({
  expenseGroups: z.array(categoryGroupWithCategoriesSchema),
  income: z.array(categorySchema),
});
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export const createCategoryRequestSchema = z.object({
  type: categoryTypeSchema,
  groupId: z.guid().optional(),
  name: categoryNameSchema,
  icon: categoryIconSchema.nullable(),
  color: categoryColorSchema,
});
export type CreateCategoryRequest = z.infer<typeof createCategoryRequestSchema>;

export const updateCategoryRequestSchema = z
  .object({
    name: categoryNameSchema.optional(),
    icon: categoryIconSchema.nullable().optional(),
    color: categoryColorSchema.optional(),
    groupId: z.guid().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined));
export type UpdateCategoryRequest = z.infer<typeof updateCategoryRequestSchema>;

export const groupRequestSchema = z.object({ name: categoryNameSchema });
export type GroupRequest = z.infer<typeof groupRequestSchema>;

export function categoryLabel(
  item: { name: string | null; nameKey: string | null },
  translate: (key: string) => string,
): string {
  if (item.name !== null) return item.name;
  return item.nameKey === null ? "" : translate(item.nameKey);
}
