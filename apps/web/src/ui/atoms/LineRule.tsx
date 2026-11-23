import type { ReactNode } from "react";
import "./line-rule.css";

export type LineRuleTone = "income" | "expense";

type LineRuleProps = { tone: LineRuleTone; children?: ReactNode };

export function LineRule({ tone, children }: LineRuleProps) {
  return <div className={`line-rule line-rule--${tone}`}>{children}</div>;
}
