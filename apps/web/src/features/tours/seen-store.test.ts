import { describe, expect, it } from "vitest";
import { clearSeen, isSeen, markSeen, seenKey, type TourStorage } from "./seen-store";

const tour = { id: "budgets", version: 1 } as const;

function memoryStorage(): TourStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const blocked: TourStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("seenKey", () => {
  it("includes the user, the tour and its version", () => {
    // Arrange
    const userId = "user-1";

    // Act
    const key = seenKey(userId, { id: "home", version: 2 });

    // Assert
    expect(key).toBe("miplata.tour.user-1.home.v2");
  });
});

describe("seen state", () => {
  it("is not seen until it is marked", () => {
    // Arrange
    const storage = memoryStorage();

    // Act
    const before = isSeen("ana", tour, storage);
    markSeen("ana", tour, storage);
    const after = isSeen("ana", tour, storage);

    // Assert
    expect([before, after]).toEqual([false, true]);
  });

  it("is kept apart for each user", () => {
    // Arrange
    const storage = memoryStorage();
    markSeen("ana", tour, storage);

    // Act
    const other = isSeen("luis", tour, storage);

    // Assert
    expect(other).toBe(false);
  });

  it("shows the tour again when its version changes", () => {
    // Arrange
    const storage = memoryStorage();
    markSeen("ana", tour, storage);

    // Act
    const next = isSeen("ana", { ...tour, version: 2 }, storage);

    // Assert
    expect(next).toBe(false);
  });

  it("clears only the given tours of one user", () => {
    // Arrange
    const storage = memoryStorage();
    markSeen("ana", tour, storage);
    markSeen("ana", { id: "home", version: 1 }, storage);
    markSeen("luis", tour, storage);

    // Act
    const cleared = clearSeen("ana", [tour], storage);

    // Assert
    expect(cleared).toBe(true);
    expect(isSeen("ana", tour, storage)).toBe(false);
    expect(isSeen("ana", { id: "home", version: 1 }, storage)).toBe(true);
    expect(isSeen("luis", tour, storage)).toBe(true);
  });

  it("treats blocked storage as not seen and never throws", () => {
    // Arrange
    const storage = blocked;

    // Act
    const seen = isSeen("ana", tour, storage);
    markSeen("ana", tour, storage);
    const cleared = clearSeen("ana", [tour], storage);

    // Assert
    expect(seen).toBe(false);
    expect(cleared).toBe(false);
  });

  it("treats missing storage as not seen", () => {
    // Arrange
    const storage = null;

    // Act
    const seen = isSeen("ana", tour, storage);
    const cleared = clearSeen("ana", [tour], storage);

    // Assert
    expect(seen).toBe(false);
    expect(cleared).toBe(false);
  });
});
