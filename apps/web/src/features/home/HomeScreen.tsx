import { Wallet } from "lucide-react";
import { EmptyState } from "../../ui/molecules/EmptyState";
import type { NavAction } from "../../ui/organisms/nav";
import { SignageBand } from "../../ui/organisms/SignageBand";

type HomeScreenProps = {
  brandName: string;
  menu: NavAction;
  emptyTitle: string;
  emptyDescription: string;
};

export function HomeScreen({ brandName, menu, emptyTitle, emptyDescription }: HomeScreenProps) {
  return (
    <>
      <SignageBand brandName={brandName} menu={menu} />
      <EmptyState icon={<Wallet />} title={emptyTitle} description={emptyDescription} />
    </>
  );
}
