import { z } from "zod";
import { isoDateSchema, yearMonthSchema } from "./calendar";
import { currencySchema } from "./money";

export const MOVEMENT_TYPES = ["income", "expense", "transfer"] as const;
export const ENTRY_TYPES = ["income", "expense"] as const;
export const MAX_INSTALLMENTS = 60;
export const DESCRIPTION_MAX_LENGTH = 200;

export const movementTypeSchema = z.enum(MOVEMENT_TYPES);
export type MovementType = z.infer<typeof movementTypeSchema>;

const positiveMinorSchema = z.int().min(1);

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

const legRequestSchema = z.object({
  accountId: z.uuid(),
  currency: currencySchema,
  amountMinor: positiveMinorSchema,
});
export type LegRequest = z.infer<typeof legRequestSchema>;

export const personShareRequestSchema = z.object({
  personId: z.uuid(),
  ownAmountMinor: z.int().min(0),
});
export type PersonShareRequest = z.infer<typeof personShareRequestSchema>;

export const entryRequestSchema = z.object({
  type: z.enum(ENTRY_TYPES),
  occurredOn: isoDateSchema,
  description: descriptionSchema,
  categoryId: z.uuid(),
  accountId: z.uuid(),
  currency: currencySchema,
  amountMinor: positiveMinorSchema,
  installments: z.int().min(1).max(MAX_INSTALLMENTS).default(1),
  person: personShareRequestSchema.nullish().transform((value) => value ?? null),
});
export type EntryRequest = z.infer<typeof entryRequestSchema>;

export const transferRequestSchema = z.object({
  type: z.literal("transfer"),
  occurredOn: isoDateSchema,
  description: descriptionSchema,
  from: legRequestSchema,
  to: legRequestSchema,
});
export type TransferRequest = z.infer<typeof transferRequestSchema>;

export const movementRequestSchema = z.discriminatedUnion("type", [
  entryRequestSchema,
  transferRequestSchema,
]);
export type MovementRequest = z.infer<typeof movementRequestSchema>;

const legSchema = z.object({
  accountId: z.string().min(1),
  currency: currencySchema,
  amountMinor: z.int(),
});
export type MovementLeg = z.infer<typeof legSchema>;

export const movementInstallmentSchema = z.object({
  number: z.int().min(1),
  periodMonth: yearMonthSchema,
  statementId: z.string().nullable(),
  amountMinor: z.int(),
  ownAmountMinor: z.int(),
});
export type MovementInstallment = z.infer<typeof movementInstallmentSchema>;

export const movementSchema = z.object({
  id: z.string().min(1),
  type: movementTypeSchema,
  occurredOn: isoDateSchema,
  description: z.string().nullable(),
  categoryId: z.string().nullable(),
  account: legSchema.nullable(),
  from: legSchema.nullable(),
  to: legSchema.nullable(),
  person: z.object({ personId: z.string().min(1), ownAmountMinor: z.int() }).nullable(),
  installments: z.array(movementInstallmentSchema),
});
export type Movement = z.infer<typeof movementSchema>;

const optionalInt = (minimum: number) => z.coerce.number().int().min(minimum).optional();

export const movementQuerySchema = z.object({
  q: z.string().trim().max(DESCRIPTION_MAX_LENGTH).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  type: movementTypeSchema.optional(),
  accountId: z.uuid().optional(),
  personId: z.uuid().optional(),
  groupId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  currency: currencySchema.optional(),
  minAmountMinor: optionalInt(0),
  maxAmountMinor: optionalInt(0),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type MovementQuery = z.infer<typeof movementQuerySchema>;

export const movementListSchema = z.object({
  items: z.array(movementSchema),
  hasMore: z.boolean(),
});
export type MovementList = z.infer<typeof movementListSchema>;

export const monthSummaryQuerySchema = z.object({ month: yearMonthSchema });

export const monthSummarySchema = z.object({
  month: yearMonthSchema,
  totals: z.array(
    z.object({
      currency: currencySchema,
      inMinor: z.int(),
      outMinor: z.int(),
    }),
  ),
});
export type MonthSummary = z.infer<typeof monthSummarySchema>;
