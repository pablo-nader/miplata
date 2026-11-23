import { z } from "zod";
import { yearMonthSchema } from "./calendar";
import { currencySchema } from "./money";
import { MAX_AMOUNT_MINOR } from "./movements";

export const BUDGET_STATES = ["below", "warning", "reached"] as const;
export const budgetStateSchema = z.enum(BUDGET_STATES);
export type BudgetStateDto = z.infer<typeof budgetStateSchema>;

export const budgetRequestSchema = z
  .object({
    categoryId: z.uuid().nullish(),
    groupId: z.uuid().nullish(),
    currency: currencySchema,
    limitMinor: z.int().min(1).max(MAX_AMOUNT_MINOR),
  })
  .refine((body) => (body.categoryId ? 1 : 0) + (body.groupId ? 1 : 0) === 1)
  .transform((body) => ({
    categoryId: body.categoryId ?? null,
    groupId: body.groupId ?? null,
    currency: body.currency,
    limitMinor: body.limitMinor,
  }));
export type BudgetRequest = z.infer<typeof budgetRequestSchema>;

export const budgetSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().nullable(),
  groupId: z.string().nullable(),
  currency: currencySchema,
  limitMinor: z.int().min(1),
});
export type Budget = z.infer<typeof budgetSchema>;

export const budgetProgressSchema = budgetSchema.extend({
  month: yearMonthSchema,
  spentMinor: z.int().min(0),
  remainingMinor: z.int().min(0),
  overspentMinor: z.int().min(0),
  state: budgetStateSchema,
});
export type BudgetProgressDto = z.infer<typeof budgetProgressSchema>;

export const budgetsQuerySchema = z.object({
  month: yearMonthSchema,
  attention: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});
export type BudgetsQuery = z.infer<typeof budgetsQuerySchema>;

export const budgetsResponseSchema = z.object({
  month: yearMonthSchema,
  items: z.array(budgetProgressSchema),
});
export type BudgetsResponse = z.infer<typeof budgetsResponseSchema>;
