import { Button, ButtonLink } from "../../ui/atoms/Button";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import type { NavAction } from "../../ui/organisms/nav";
import type { TourId } from "./tour-ids";
import "../accounts/screen-note.css";
import "./guides-screen.css";

export type GuideRow = {
  id: TourId;
  name: string;
  to: string | null;
  replayState: { replayTour: TourId };
  viewLabel: string;
  viewName: string;
  unavailable: string | null;
};

type GuidesScreenProps = {
  title: string;
  back: NavAction;
  intro: string;
  rows: GuideRow[];
  reset: { label: string; busy: boolean; onClick: () => void };
  message: { kind: "status" | "alert"; text: string } | null;
};

export function GuidesScreen({ title, back, intro, rows, reset, message }: GuidesScreenProps) {
  return (
    <>
      <ScreenHeader title={title} back={back} />
      <p className="guides-screen__intro">{intro}</p>
      <ul className="guides-screen__list">
        {rows.map((row) => (
          <li key={row.id} className="guides-screen__row">
            <span className="guides-screen__text">
              <span className="guides-screen__name">{row.name}</span>
              {row.unavailable ? (
                <small className="guides-screen__note">{row.unavailable}</small>
              ) : null}
            </span>
            {row.to ? (
              <ButtonLink
                variant="ghost"
                className="guides-screen__view"
                to={row.to}
                state={row.replayState}
                aria-label={row.viewName}
              >
                {row.viewLabel}
              </ButtonLink>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="guides-screen__reset">
        <Button variant="ghost" disabled={reset.busy} onClick={reset.onClick}>
          {reset.label}
        </Button>
      </div>
      {message ? (
        <p className="screen-note" role={message.kind}>
          {message.text}
        </p>
      ) : null}
    </>
  );
}
