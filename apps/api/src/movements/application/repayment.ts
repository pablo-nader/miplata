import type { CategoryDto, TransferRequest } from "@miplata/shared";
import { monthOf } from "@miplata/shared";
import { repaymentSplit } from "../../loans/domain/loan-summary";
import type { MovementPlan, PostingPlan } from "../domain/movement-plan";
import type { MovementDependencies } from "./movement-use-cases";

const OTHER_INCOME_KEY = "defaults.income.other";

function overpaymentCategory(categories: CategoryDto[]): CategoryDto | null {
  const income = categories.filter((item) => item.type === "income" && item.isActive);
  return income.find((item) => item.nameKey === OTHER_INCOME_KEY) ?? income[0] ?? null;
}

export async function planRepayment(
  deps: MovementDependencies,
  userId: string,
  request: TransferRequest,
  plan: MovementPlan,
): Promise<MovementPlan[]> {
  if (request.from.currency !== request.to.currency) {
    return [plan];
  }
  const [payer, receiver] = await Promise.all([
    deps.accounts.find(userId, request.from.accountId),
    deps.accounts.find(userId, request.to.accountId),
  ]);
  if (payer?.type !== "person" || !receiver) {
    return [plan];
  }
  if (receiver.type === "person" || receiver.type === "credit_card") {
    return [plan];
  }
  const balance = payer.currencies.find((entry) => entry.currency === request.from.currency);
  const split = repaymentSplit(balance?.balanceMinor ?? 0, request.from.amountMinor);
  if (split.excessMinor === 0) {
    return [plan];
  }
  const category = overpaymentCategory(await deps.categories.listCategories(userId));
  if (!category) {
    return [plan];
  }
  const [from, to] = plan.postings as [PostingPlan, PostingPlan];
  const settle: MovementPlan = {
    ...plan,
    postings: [
      { ...from, amountMinor: -split.settleMinor },
      { ...to, amountMinor: split.settleMinor },
    ],
  };
  const income: MovementPlan = {
    type: "income",
    occurredOn: request.occurredOn,
    description: request.description,
    categoryId: category.id,
    postings: [
      { accountId: receiver.id, currency: request.to.currency, amountMinor: split.excessMinor },
    ],
    installments: [
      {
        number: 1,
        periodMonth: monthOf(request.occurredOn),
        currency: request.to.currency,
        amountMinor: split.excessMinor,
        ownAmountMinor: split.excessMinor,
      },
    ],
    statementPlan: null,
  };
  return [settle, income];
}
