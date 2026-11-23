import { z } from "zod";
import { isoDateSchema, yearMonthSchema } from "./calendar";
import { currencySchema } from "./money";

export const COMMITTED_MONTHS_MAX = 12;
export const COMMITTED_MONTHS_DEFAULT = 6;

const filterShape = {
  currency: currencySchema.default("ARS"),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
};

export const spendingQuerySchema = z.object({ month: yearMonthSchema, ...filterShape });
export type SpendingQuery = z.infer<typeof spendingQuerySchema>;

export const spendingMovementsQuerySchema = z.object({
  month: yearMonthSchema,
  currency: currencySchema.default("ARS"),
  accountId: z.uuid().optional(),
  categoryId: z.uuid(),
});
export type SpendingMovementsQuery = z.infer<typeof spendingMovementsQuerySchema>;

export const monthlyQuerySchema = z.object({ to: yearMonthSchema, ...filterShape });
export type MonthlyQuery = z.infer<typeof monthlyQuerySchema>;

export const changesQuerySchema = z.object({
  month: yearMonthSchema,
  currency: currencySchema.default("ARS"),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
});
export type ChangesQuery = z.infer<typeof changesQuerySchema>;

export const committedQuerySchema = z.object({
  from: yearMonthSchema,
  months: z.coerce
    .number()
    .int()
    .min(1)
    .max(COMMITTED_MONTHS_MAX)
    .default(COMMITTED_MONTHS_DEFAULT),
  ...filterShape,
});
export type CommittedQuery = z.infer<typeof committedQuerySchema>;

const percentSchema = z.number();

export const spendingCategorySchema = z.object({
  categoryId: z.string().min(1),
  totalMinor: z.int(),
  sharePercent: percentSchema,
});

export const spendingGroupSchema = z.object({
  groupId: z.string().nullable(),
  totalMinor: z.int(),
  sharePercent: percentSchema,
  categories: z.array(spendingCategorySchema),
});

export const spendingReportSchema = z.object({
  month: yearMonthSchema,
  currency: currencySchema,
  totalMinor: z.int(),
  groups: z.array(spendingGroupSchema),
});
export type SpendingReport = z.infer<typeof spendingReportSchema>;

export const spendingMovementSchema = z.object({
  movementId: z.string().min(1),
  occurredOn: isoDateSchema,
  description: z.string().nullable(),
  categoryId: z.string().min(1),
  ownAmountMinor: z.int(),
  installmentNumber: z.int().nullable(),
  installmentCount: z.int(),
});

export const spendingMovementsSchema = z.object({
  items: z.array(spendingMovementSchema),
});
export type SpendingMovements = z.infer<typeof spendingMovementsSchema>;

export const monthlyReportSchema = z.object({
  currency: currencySchema,
  months: z.array(
    z.object({
      month: yearMonthSchema,
      inMinor: z.int(),
      outMinor: z.int(),
      resultMinor: z.int(),
    }),
  ),
});
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

export const changesReportSchema = z.object({
  month: yearMonthSchema,
  currency: currencySchema,
  categories: z.array(
    z.object({
      categoryId: z.string().min(1),
      currentMinor: z.int(),
      previousAverageMinor: z.int(),
      percentChange: percentSchema.nullable(),
    }),
  ),
});
export type ChangesReport = z.infer<typeof changesReportSchema>;

export const committedReportSchema = z.object({
  currency: currencySchema,
  months: z.array(
    z.object({
      month: yearMonthSchema,
      installmentsMinor: z.int(),
      recurringMinor: z.int(),
      totalMinor: z.int(),
    }),
  ),
});
export type CommittedReport = z.infer<typeof committedReportSchema>;
