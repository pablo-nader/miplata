import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  type LucideIcon,
  User,
  Wallet,
} from "lucide-react";
import "./account-badge.css";

export type AccountBadgeType = "cash" | "bank" | "wallet" | "credit_card" | "person" | "transfer";

const icons: Record<AccountBadgeType, LucideIcon> = {
  cash: Banknote,
  bank: Landmark,
  wallet: Wallet,
  credit_card: CreditCard,
  person: User,
  transfer: ArrowLeftRight,
};

type AccountBadgeProps = { type: AccountBadgeType };

export function AccountBadge({ type }: AccountBadgeProps) {
  const Icon = icons[type];
  return (
    <span className="account-badge" aria-hidden="true">
      <Icon aria-hidden="true" strokeWidth={2} />
    </span>
  );
}
