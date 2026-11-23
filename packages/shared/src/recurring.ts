import { z } from "zod";
import { isoDateSchema } from "./calendar";
import { currencySchema } from "./money";
import { DESCRIPTION_MAX_LENGTH, ENTRY_TYPES, MAX_AMOUNT_MINOR } from "./movements";

export const RECURRING_FREQUENCIES = ["monthly", "bimonthly", "yearly"] as const;
export const AMOUNT_MODES = ["fixed", "variable"] as const;
export const OCCURRENCE_STATUSES = ["pending", "confirmed", "skipped"] as const;
export const UPCOMING_DAYS = 30;

export const recurringFrequencySchema = z.enum(RECURRING_FREQUENCIES);
export type RecurringFrequencyName = z.infer<typeof recurringFrequencySchema>;

export const amountModeSchema = z.enum(AMOUNT_MODES);
export type AmountMode = z.infer<typeof amountModeSchema>;

const positiveMinorSchema = z.int().min(1).max(MAX_AMOUNT_MINOR);

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH)
  .nullish()
  .transform((value) => (value ? value : null));

export const recurringRequestSchema = z
  .object({
    type: z.enum(ENTRY_TYPES),
    frequency: recurringFrequencySchema,
    dayOfMonth: z.int().min(1).max(31),
    amountMode: amountModeSchema,
    amountMinor: positiveMinorSchema.nullish().transform((value) => value ?? null),
    currency: currencySchema,
    accountId: z.uuid(),
    categoryId: z.uuid(),
    description: descriptionSchema,
    startsOn: isoDateSchema,
    endsOn: isoDateSchema.nullish().transform((value) => value ?? null),
  })
  .refine((request) => request.amountMode !== "fixed" || request.amountMinor !== null, {
    path: ["amountMinor"],
  })
  .refine((request) => request.endsOn === null || request.endsOn >= request.startsOn, {
    path: ["endsOn"],
  });
export type RecurringRequest = z.infer<typeof recurringRequestSchema>;

export const endRecurringRequestSchema = z.object({
  endsOn: isoDateSchema.optional(),
});
export type EndRecurringRequest = z.infer<typeof endRecurringRequestSchema>;

export const recurringSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ENTRY_TYPES),
  frequency: recurringFrequencySchema,
  dayOfMonth: z.int(),
  monthOfYear: z.int().nullable(),
  amountMode: amountModeSchema,
  amountMinor: z.int().nullable(),
  currency: currencySchema,
  accountId: z.string().min(1),
  categoryId: z.string().min(1),
  description: z.string().nullable(),
  startsOn: isoDateSchema,
  endsOn: isoDateSchema.nullable(),
  isPaused: z.boolean(),
});
export type Recurring = z.infer<typeof recurringSchema>;

export const recurringListSchema = z.object({ items: z.array(recurringSchema) });
export type RecurringList = z.infer<typeof recurringListSchema>;

export const occurrenceSchema = z.object({
  id: z.string().min(1),
  recurringId: z.string().min(1),
  dueOn: isoDateSchema,
  type: z.enum(ENTRY_TYPES),
  description: z.string().nullable(),
  categoryId: z.string().min(1),
  accountId: z.string().min(1),
  currency: currencySchema,
  amountMode: amountModeSchema,
  suggestedAmountMinor: z.int().nullable(),
});
export type Occurrence = z.infer<typeof occurrenceSchema>;

export const occurrenceListSchema = z.object({
  today: isoDateSchema,
  items: z.array(occurrenceSchema),
});
export type OccurrenceList = z.infer<typeof occurrenceListSchema>;

export const occurrenceQuerySchema = z.object({
  type: z.enum(ENTRY_TYPES).optional(),
});

export const confirmOccurrenceRequestSchema = z.object({
  amountMinor: positiveMinorSchema.optional(),
  accountId: z.uuid().optional(),
  occurredOn: isoDateSchema.optional(),
});
export type ConfirmOccurrenceRequest = z.infer<typeof confirmOccurrenceRequestSchema>;
