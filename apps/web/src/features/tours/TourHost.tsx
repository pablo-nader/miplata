import { type Driver, driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { findAnchor } from "../../ui/tour/anchors";
import { useSession } from "../auth/useSession";
import { isSeen, markSeen } from "./seen-store";
import { isTyping, MIN_STEPS_TO_SHOW, resolveSteps } from "./tour-flow";
import { tourForPath } from "./tour-registry";
import "./tour.css";

const POLL_MS = 150;
const QUICK_POLLS = 1;
const PATIENT_POLLS = 8;
const GIVE_UP_MS = 4000;

export function replayRequest(state: unknown): string | null {
  if (typeof state === "object" && state !== null && "replayTour" in state) {
    const value = (state as { replayTour: unknown }).replayTour;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TourHost() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const userId = user?.id ?? null;
  const translate = useRef(t);
  translate.current = t;
  const replayState = useRef(location.state);
  replayState.current = location.state;

  const tour = tourForPath(location.pathname);
  const replay = tour !== undefined && replayRequest(location.state) === tour.id;
  const pending = tour && userId && (replay || !isSeen(userId, tour)) ? tour : undefined;
  const visit = location.key;
  const { pathname, search } = location;

  useEffect(() => {
    if (!pending || !userId || !visit) {
      return;
    }
    let running: Driver | null = null;
    let stopped = false;
    let last = -1;
    let stable = 0;
    const startedAt = Date.now();
    const anchoredTotal = pending.steps.filter((step) => step.anchor !== undefined).length;

    function begin(tourToRun: NonNullable<typeof pending>, owner: string) {
      const steps = resolveSteps(tourToRun, (anchor) => findAnchor(anchor));
      if (steps.length < MIN_STEPS_TO_SHOW) {
        return;
      }
      const text = translate.current;
      running = driver({
        steps: steps.map((step) => {
          const anchor = step.anchor;
          return {
            ...(anchor ? { element: () => findAnchor(anchor) ?? document.body } : {}),
            popover: { title: text(step.title), description: text(step.body) },
          };
        }),
        animate: !prefersReducedMotion(),
        smoothScroll: false,
        allowClose: true,
        showProgress: true,
        progressText: text("tours.progress", { current: "{{current}}", total: "{{total}}" }),
        nextBtnText: text("tours.next"),
        prevBtnText: text("tours.back"),
        doneBtnText: text("tours.done"),
        closeBtnLabel: text("tours.close"),
        popoverClass: "miplata-tour",
        overlayColor: "var(--color-band)",
        overlayOpacity: 0.6,
        stagePadding: 6,
        stageRadius: 12,
        onDestroyed: () => {
          if (stopped) {
            return;
          }
          markSeen(owner, tourToRun);
          if (replayRequest(replayState.current)) {
            navigate(`${pathname}${search}`, { replace: true, state: null });
          }
        },
      });
      running.drive();
    }

    const timer = window.setInterval(() => {
      const steps = resolveSteps(pending, (anchor) => findAnchor(anchor));
      const anchored = steps.filter((step) => step.anchor !== undefined).length;
      stable = anchored === last ? stable + 1 : 0;
      last = anchored;
      const complete = anchored === anchoredTotal && stable >= QUICK_POLLS;
      const patient = stable >= PATIENT_POLLS;
      const expired = Date.now() - startedAt > GIVE_UP_MS;
      if (!(complete || patient || expired) || isTyping(document.activeElement)) {
        return;
      }
      window.clearInterval(timer);
      begin(pending, userId);
    }, POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      running?.destroy();
    };
  }, [pending, userId, visit, navigate, pathname, search]);

  return null;
}
