import { z } from "zod";
import { currencySchema } from "./money";

export const MONEY_ACCOUNT_TYPES = ["cash", "bank", "wallet", "credit_card"] as const;
export const ACCOUNT_TYPES = [...MONEY_ACCOUNT_TYPES, "person"] as const;
export const INSTITUTION_KINDS = ["bank", "wallet"] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const moneyAccountTypeSchema = z.enum(MONEY_ACCOUNT_TYPES);
export type MoneyAccountType = z.infer<typeof moneyAccountTypeSchema>;

export const institutionKindSchema = z.enum(INSTITUTION_KINDS);
export type InstitutionKind = z.infer<typeof institutionKindSchema>;

const dayOfMonthSchema = z.int().min(1).max(31);
const accountNameSchema = z.string().trim().min(1).max(60);

export const accountCurrencyInputSchema = z.object({
  currency: currencySchema,
  openingBalanceMinor: z.int(),
});
export type AccountCurrencyInput = z.infer<typeof accountCurrencyInputSchema>;

const currenciesInputSchema = z
  .array(accountCurrencyInputSchema)
  .min(1)
  .max(2)
  .refine((list) => new Set(list.map((item) => item.currency)).size === list.length);

export const createAccountRequestSchema = z.object({
  type: moneyAccountTypeSchema,
  institutionId: z.uuid().nullish(),
  name: accountNameSchema.nullish(),
  closingDay: dayOfMonthSchema.nullish(),
  dueDay: dayOfMonthSchema.nullish(),
  currencies: currenciesInputSchema,
});
export type CreateAccountRequest = z.infer<typeof createAccountRequestSchema>;

export const updateAccountRequestSchema = z.object({
  institutionId: z.uuid().nullable().optional(),
  name: accountNameSchema.optional(),
  closingDay: dayOfMonthSchema.nullable().optional(),
  dueDay: dayOfMonthSchema.nullable().optional(),
  currencies: currenciesInputSchema.optional(),
});
export type UpdateAccountRequest = z.infer<typeof updateAccountRequestSchema>;

export const createPersonRequestSchema = z.object({
  name: accountNameSchema,
  currencies: currenciesInputSchema,
});
export type CreatePersonRequest = z.infer<typeof createPersonRequestSchema>;

export const updatePersonRequestSchema = z.object({
  name: accountNameSchema.optional(),
  currencies: currenciesInputSchema.optional(),
});
export type UpdatePersonRequest = z.infer<typeof updatePersonRequestSchema>;

export const institutionSchema = z.object({
  id: z.string().min(1),
  kind: institutionKindSchema,
  name: z.string(),
  logoPath: z.string().nullable(),
});
export type Institution = z.infer<typeof institutionSchema>;

export const institutionsResponseSchema = z.array(institutionSchema);

export const accountSchema = z.object({
  id: z.string().min(1),
  type: accountTypeSchema,
  name: z.string().nullable(),
  nameKey: z.string().nullable(),
  institution: institutionSchema.nullable(),
  closingDay: z.int().nullable(),
  dueDay: z.int().nullable(),
  isActive: z.boolean(),
  canDelete: z.boolean(),
  currencies: z.array(
    z.object({
      currency: currencySchema,
      openingBalanceMinor: z.int(),
      balanceMinor: z.int(),
    }),
  ),
});
export type Account = z.infer<typeof accountSchema>;

export const accountsResponseSchema = z.array(accountSchema);

export const balanceLineSchema = z.object({
  accountId: z.string().min(1),
  type: accountTypeSchema,
  name: z.string().nullable(),
  nameKey: z.string().nullable(),
  currency: currencySchema,
  balanceMinor: z.int(),
});
export type BalanceLine = z.infer<typeof balanceLineSchema>;

export const balanceResponseSchema = z.object({
  totals: z.array(z.object({ currency: currencySchema, totalMinor: z.int() })),
  lines: z.array(balanceLineSchema),
});
export type BalanceResponse = z.infer<typeof balanceResponseSchema>;
