import { z } from "zod";
import { isoDateSchema, yearMonthSchema } from "./calendar";
import { currencySchema } from "./money";
import { MAX_AMOUNT_MINOR } from "./movements";

export const FINANCIAL_CHARGES_GROUP_KEY = "defaults.group.financialCharges";
export const ADJUSTMENT_CATEGORY_KEY = "defaults.category.adjustment";

const positiveMinorSchema = z.int().min(1).max(MAX_AMOUNT_MINOR);
const nonNegativeMinorSchema = z.int().min(0).max(MAX_AMOUNT_MINOR);
const optionalMinorSchema = nonNegativeMinorSchema.nullish().transform((value) => value ?? null);

const descriptionSchema = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((value) => (value ? value : null));

export const statementDatesRequestSchema = z.object({
  closingDate: isoDateSchema,
  dueDate: isoDateSchema,
});
export type StatementDatesRequest = z.infer<typeof statementDatesRequestSchema>;

export const bankFiguresRequestSchema = z.object({
  bankTotalArsMinor: optionalMinorSchema,
  bankTotalUsdMinor: optionalMinorSchema,
  minimumArsMinor: optionalMinorSchema,
  minimumUsdMinor: optionalMinorSchema,
});
export type BankFiguresRequest = z.infer<typeof bankFiguresRequestSchema>;

export const chargeRequestSchema = z.object({
  categoryId: z.uuid(),
  currency: currencySchema,
  amountMinor: positiveMinorSchema,
  description: descriptionSchema,
  occurredOn: isoDateSchema.nullish().transform((value) => value ?? null),
});
export type ChargeRequest = z.infer<typeof chargeRequestSchema>;

export const adjustmentRequestSchema = z.object({ currency: currencySchema });
export type AdjustmentRequest = z.infer<typeof adjustmentRequestSchema>;

export const USD_SOURCES = ["usd", "ars"] as const;

export const statementPaymentRequestSchema = z
  .object({
    fromAccountId: z.uuid(),
    occurredOn: isoDateSchema,
    arsMinor: nonNegativeMinorSchema.default(0),
    usdMinor: nonNegativeMinorSchema.default(0),
    usdSource: z.enum(USD_SOURCES).default("usd"),
    usdSourceAmountMinor: positiveMinorSchema.nullish().transform((value) => value ?? null),
  })
  .refine((body) => body.arsMinor > 0 || body.usdMinor > 0)
  .refine((body) =>
    body.usdSource === "ars"
      ? body.usdMinor > 0 && body.usdSourceAmountMinor !== null
      : body.usdSourceAmountMinor === null,
  );
export type StatementPaymentRequest = z.infer<typeof statementPaymentRequestSchema>;

export const statementListQuerySchema = z.object({ accountId: z.uuid() });

export const statementTotalsSchema = z.object({
  currency: currencySchema,
  previousBalanceMinor: z.int(),
  ownMinor: z.int(),
  othersMinor: z.int(),
  chargesMinor: z.int(),
  paymentsMinor: z.int(),
  totalMinor: z.int(),
  minimumMinor: z.int().nullable(),
  bankTotalMinor: z.int().nullable(),
  differenceMinor: z.int().nullable(),
});
export type StatementTotals = z.infer<typeof statementTotalsSchema>;

export const statementSummarySchema = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  periodMonth: yearMonthSchema,
  closingDate: isoDateSchema,
  dueDate: isoDateSchema,
  totals: z.array(statementTotalsSchema),
});
export type StatementSummary = z.infer<typeof statementSummarySchema>;

export const statementListSchema = z.object({ items: z.array(statementSummarySchema) });
export type StatementList = z.infer<typeof statementListSchema>;

export const statementPurchaseLineSchema = z.object({
  movementId: z.string().min(1),
  description: z.string().nullable(),
  categoryId: z.string().nullable(),
  occurredOn: isoDateSchema,
  number: z.int().min(1),
  installmentCount: z.int().min(1),
  currency: currencySchema,
  ownAmountMinor: z.int(),
});
export type StatementPurchaseLine = z.infer<typeof statementPurchaseLineSchema>;

export const statementOtherLineSchema = z.object({
  movementId: z.string().min(1),
  description: z.string().nullable(),
  personId: z.string().nullable(),
  number: z.int().min(1),
  installmentCount: z.int().min(1),
  currency: currencySchema,
  amountMinor: z.int(),
});
export type StatementOtherLine = z.infer<typeof statementOtherLineSchema>;

export const statementChargeLineSchema = z.object({
  movementId: z.string().min(1),
  categoryId: z.string().nullable(),
  description: z.string().nullable(),
  occurredOn: isoDateSchema,
  currency: currencySchema,
  amountMinor: z.int(),
  isAdjustment: z.boolean(),
});
export type StatementChargeLine = z.infer<typeof statementChargeLineSchema>;

export const statementPaymentLineSchema = z.object({
  movementId: z.string().min(1),
  occurredOn: isoDateSchema,
  currency: currencySchema,
  amountMinor: z.int(),
});
export type StatementPaymentLine = z.infer<typeof statementPaymentLineSchema>;

export const statementDetailSchema = statementSummarySchema.extend({
  purchases: z.array(statementPurchaseLineSchema),
  others: z.array(statementOtherLineSchema),
  charges: z.array(statementChargeLineSchema),
  payments: z.array(statementPaymentLineSchema),
});
export type StatementDetail = z.infer<typeof statementDetailSchema>;
