import type { TourDefinition } from "./tour-types";

export type TourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "miplata.tour";

function defaultStorage(): TourStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function seenKey(userId: string, tour: Pick<TourDefinition, "id" | "version">) {
  return `${PREFIX}.${userId}.${tour.id}.v${tour.version}`;
}

export function isSeen(
  userId: string,
  tour: Pick<TourDefinition, "id" | "version">,
  storage: TourStorage | null = defaultStorage(),
) {
  try {
    return storage?.getItem(seenKey(userId, tour)) === "1";
  } catch {
    return false;
  }
}

export function markSeen(
  userId: string,
  tour: Pick<TourDefinition, "id" | "version">,
  storage: TourStorage | null = defaultStorage(),
) {
  try {
    storage?.setItem(seenKey(userId, tour), "1");
  } catch {
    return;
  }
}

export function clearSeen(
  userId: string,
  tours: readonly Pick<TourDefinition, "id" | "version">[],
  storage: TourStorage | null = defaultStorage(),
): boolean {
  try {
    if (!storage) {
      return false;
    }
    for (const tour of tours) {
      storage.removeItem(seenKey(userId, tour));
    }
    return true;
  } catch {
    return false;
  }
}
