import type { TourId } from "./tour-ids";

export type TourStep = { anchor?: string; title: string; body: string };

export type TourDefinition = {
  id: TourId;
  version: number;
  route: string;
  steps: readonly TourStep[];
};

export function tourStep(tour: TourId, name: string, anchor?: string): TourStep {
  return {
    ...(anchor ? { anchor } : {}),
    title: `tours.${tour}.${name}.title`,
    body: `tours.${tour}.${name}.body`,
  };
}
