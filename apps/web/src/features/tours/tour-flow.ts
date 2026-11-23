import type { TourDefinition, TourStep } from "./tour-types";

export const MIN_STEPS_TO_SHOW = 2;

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
