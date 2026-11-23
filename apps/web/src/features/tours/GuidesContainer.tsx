import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { fetchAccounts } from "../accounts/accounts-api";
import { useSession } from "../auth/useSession";
import { type GuideRow, GuidesScreen } from "./GuidesScreen";
import { clearSeen } from "./seen-store";
import { TOURS } from "./tour-registry";

export function GuidesContainer() {
  const { t } = useTranslation();
  const { user } = useSession();
  const accounts = useResource(fetchAccounts);
  const [message, setMessage] = useState<"done" | "failed" | null>(null);

  const card =
    accounts.state.status === "ready"
      ? accounts.state.data.find((account) => account.type === "credit_card")
      : undefined;

  const rows: GuideRow[] = TOURS.map((tour) => {
    const name = t(`tours.names.${tour.id}`);
    const needsCard = tour.id === "statement";
    const to = needsCard ? (card ? `/accounts/${card.id}/statement` : null) : tour.route;
    return {
      id: tour.id,
      name,
      to,
      replayState: { replayTour: tour.id },
      viewLabel: t("guides.view"),
      viewName: t("guides.viewNamed", { name }),
      unavailable: needsCard && !card ? t("guides.needsCard") : null,
    };
  });

  function resetAll() {
    const done = user ? clearSeen(user.id, TOURS) : false;
    setMessage(done ? "done" : "failed");
  }

  return (
    <GuidesScreen
      title={t("guides.title")}
      back={{ to: "/menu", label: t("guides.back") }}
      intro={t("guides.intro")}
      rows={rows}
      reset={{ label: t("guides.reset"), busy: false, onClick: resetAll }}
      message={
        message === "done"
          ? { kind: "status", text: t("guides.resetDone") }
          : message === "failed"
            ? { kind: "alert", text: t("guides.resetFailed") }
            : null
      }
    />
  );
}
