import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Landmark,
  type LucideIcon,
  User,
  Wallet,
} from "lucide-react";
import { useState } from "react";
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

export type AccountLogo = { name: string; logoPath: string | null };

const LOGO_PREFIX = "/institutions/";

export function logoSource(logo: AccountLogo | null | undefined): string | null {
  const path = logo?.logoPath;
  return path?.startsWith(LOGO_PREFIX) && path.endsWith(".svg") ? path : null;
}

type AccountBadgeProps = {
  type: AccountBadgeType;
  logo?: AccountLogo | null;
  standalone?: boolean;
};

export function AccountBadge({ type, logo, standalone = false }: AccountBadgeProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = logoSource(logo);
  const Icon = icons[type];
  if (logo && source && source !== failedSource) {
    const accessibility = standalone
      ? ({ role: "img", "aria-label": logo.name } as const)
      : ({ "aria-hidden": true } as const);
    return (
      <span className="account-badge account-badge--logo" {...accessibility}>
        <img src={source} alt="" onError={() => setFailedSource(source)} />
      </span>
    );
  }
  return (
    <span className="account-badge" aria-hidden="true">
      <Icon aria-hidden="true" strokeWidth={2} />
    </span>
  );
}
