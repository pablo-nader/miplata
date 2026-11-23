import type { BrowserContext, Page } from "@playwright/test";
import { TOUR_IDS } from "../src/features/tours/tour-ids";

export async function markToursSeen(target: BrowserContext | Page, userId: string) {
  await target.addInitScript(
    ({ user, ids }) => {
      try {
        for (const id of ids) {
          window.localStorage.setItem(`miplata.tour.${user}.${id}.v1`, "1");
        }
      } catch {
        return;
      }
    },
    { user: userId, ids: [...TOUR_IDS] },
  );
}
