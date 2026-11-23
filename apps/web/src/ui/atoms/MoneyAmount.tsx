import { type Currency, formatMoney, type MoneyDirection, type MoneyLocale } from "../format/money";
import "./money-amount.css";

export type MoneyAmountProps = {
  amount: number;
  currency: Currency;
  locale: MoneyLocale;
  direction?: MoneyDirection;
};

export function MoneyAmount({ amount, currency, locale, direction = "neutral" }: MoneyAmountProps) {
  const income = direction === "income" && amount !== 0;
  return (
    <span className={income ? "money money--income" : "money"}>
      {formatMoney(amount, currency, locale, direction)}
    </span>
  );
}
