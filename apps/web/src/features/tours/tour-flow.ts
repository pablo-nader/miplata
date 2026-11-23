import type { TourDefinition, TourStep } from "./tour-types";

export const MIN_STEPS_TO_SHOW = 2;
export const GIVE_UP_MS = 4000;
export const MAX_WAIT_MS = 10000;

export function resolveSteps(
  tour: TourDefinition,
  find: (anchor: string) => HTMLElement | null,
): TourStep[] {
  return tour.steps.filter((step) => step.anchor === undefined || find(step.anchor) !== null);
}

export function isTyping(active: Element | null) {
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  );
}

export function isBlocked(doc: Document) {
  return (
    isTyping(doc.activeElement) ||
    doc.querySelector('dialog[open], [role="dialog"], [aria-modal="true"]') !== null
  );
}
