import { z } from "zod";
import { isoDateSchema } from "./calendar";
import { currencySchema } from "./money";
import { movementSchema } from "./movements";

export const loanLineSchema = z.object({
  currency: currencySchema,
  amountMinor: z.int().min(1),
  dueNowMinor: z.int().min(0),
  pendingTotalMinor: z.int().min(0),
});
export type LoanLine = z.infer<typeof loanLineSchema>;

export const loanPersonSchema = z.object({
  personId: z.string().min(1),
  name: z.string().nullable(),
  isActive: z.boolean(),
  lines: z.array(loanLineSchema).min(1),
});
export type LoanPerson = z.infer<typeof loanPersonSchema>;

export const loanTotalSchema = z.object({
  currency: currencySchema,
  amountMinor: z.int().min(1),
});
export type LoanTotal = z.infer<typeof loanTotalSchema>;

export const loansResponseSchema = z.object({
  owesYou: z.array(loanPersonSchema),
  youOwe: z.array(loanPersonSchema),
  owedToYouTotals: z.array(loanTotalSchema),
  youOweTotals: z.array(loanTotalSchema),
});
export type LoansResponse = z.infer<typeof loansResponseSchema>;

export const loanDetailSchema = z.object({
  personId: z.string().min(1),
  name: z.string().nullable(),
  isActive: z.boolean(),
  owesYou: z.array(loanLineSchema),
  youOwe: z.array(loanLineSchema),
  movements: z.array(movementSchema),
});
export type LoanDetail = z.infer<typeof loanDetailSchema>;

export const forgiveRequestSchema = z.object({
  currency: currencySchema,
  amountMinor: z.int().min(1),
  categoryId: z.uuid(),
  occurredOn: isoDateSchema.optional(),
});
export type ForgiveRequest = z.infer<typeof forgiveRequestSchema>;
