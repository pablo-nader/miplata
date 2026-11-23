import { Wallet } from "lucide-react";
import { EmptyState } from "../../ui/molecules/EmptyState";
import type { NavAction } from "../../ui/organisms/nav";
import { SignageBand, type SignageBandProps } from "../../ui/organisms/SignageBand";

type HomeScreenProps = {
  brandName: string;
  menu: NavAction;
  emptyTitle: string;
  emptyDescription: string;
  balance?: SignageBandProps["balance"];
};

export function HomeScreen({
  brandName,
  menu,
  emptyTitle,
  emptyDescription,
  balance,
}: HomeScreenProps) {
  return (
    <>
      <SignageBand brandName={brandName} menu={menu} {...(balance ? { balance } : {})} />
      <EmptyState icon={<Wallet />} title={emptyTitle} description={emptyDescription} />
    </>
  );
}
