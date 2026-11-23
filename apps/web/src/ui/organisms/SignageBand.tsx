import markUrl from "@brand/mark-inverse.svg";
import { ChevronRight, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { LineRule } from "../atoms/LineRule";
import { MoneyAmount, type MoneyAmountProps } from "../atoms/MoneyAmount";
import type { NavAction } from "./nav";
import "./signage-band.css";

type BalanceProps = {
  label: string;
  to: string;
  pesos: MoneyAmountProps;
  dollars?: MoneyAmountProps;
};

type TotalProps = { label: string; amount: MoneyAmountProps; secondary?: MoneyAmountProps };

export type SignageBandProps = {
  brandName: string;
  menu: NavAction;
  balance?: BalanceProps;
  income?: TotalProps;
  expense?: TotalProps;
};

export function SignageBand({ brandName, menu, balance, income, expense }: SignageBandProps) {
  const hasDollars = balance?.dollars !== undefined && balance.dollars.amount !== 0;
  return (
    <header className="signage-band">
      <div className="signage-band__top">
        <img src={markUrl} alt="" width={28} height={28} />
        <h1 className="signage-band__brand">{brandName}</h1>
        <Link className="signage-band__menu" to={menu.to} aria-label={menu.label}>
          <Menu aria-hidden="true" />
        </Link>
      </div>
      {balance ? (
        <Link className="signage-band__balance" to={balance.to}>
          <span className="signage-band__balance-label">
            {balance.label}
            <ChevronRight aria-hidden="true" />
          </span>
          <strong className="signage-band__balance-amount">
            <MoneyAmount {...balance.pesos} />
          </strong>
          {hasDollars && balance.dollars ? (
            <span className="signage-band__dollars">
              <MoneyAmount {...balance.dollars} />
            </span>
          ) : null}
        </Link>
      ) : null}
      {income && expense ? (
        <div className="signage-band__rules">
          <LineRule tone="income">
            {income.label}
            <b className="signage-band__total">
              <MoneyAmount {...income.amount} />
              {income.secondary ? (
                <>
                  {" · "}
                  <MoneyAmount {...income.secondary} />
                </>
              ) : null}
            </b>
          </LineRule>
          <LineRule tone="expense">
            {expense.label}
            <b className="signage-band__total">
              <MoneyAmount {...expense.amount} />
              {expense.secondary ? (
                <>
                  {" · "}
                  <MoneyAmount {...expense.secondary} />
                </>
              ) : null}
            </b>
          </LineRule>
        </div>
      ) : null}
    </header>
  );
}
