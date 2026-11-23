import { z } from "zod";

export const LOCALES = ["es", "en"] as const;
export const localeSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof localeSchema>;

export const meResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
  locale: localeSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;

export const updateLocaleRequestSchema = z.object({ locale: localeSchema });
export type UpdateLocaleRequest = z.infer<typeof updateLocaleRequestSchema>;
