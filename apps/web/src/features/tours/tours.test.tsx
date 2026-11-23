import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n, type Language } from "../../app/i18n";
import { tourAnchor } from "../../ui/tour/anchors";
import { GuidesContainer } from "./GuidesContainer";
import { isSeen, markSeen } from "./seen-store";
import { TourHost } from "./TourHost";
import { TOURS } from "./tour-registry";

type FakeDriver = {
  config: {
    steps: { element?: () => Element; popover: { title: string; description: string } }[];
    onDestroyed: () => void;
    [key: string]: unknown;
  };
  drive: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const drivers: FakeDriver[] = [];

vi.mock("driver.js", () => ({
  driver: (config: FakeDriver["config"]) => {
    const instance: FakeDriver = {
      config,
      drive: vi.fn(),
      destroy: vi.fn(() => config.onDestroyed()),
    };
    drivers.push(instance);
    return instance;
  },
}));

vi.mock("../auth/useSession", () => ({
  useSession: () => ({ status: "signedIn", user: { id: "ana" }, refresh: vi.fn() }),
}));

const budgets = TOURS.find((tour) => tour.id === "budgets");
const home = TOURS.find((tour) => tour.id === "home");

function Page({
  lateAnchors = false,
  dialogOpen = false,
}: {
  lateAnchors?: boolean;
  dialogOpen?: boolean;
}) {
  const [late, setLate] = useState(!lateAnchors);
  useEffect(() => {
    const timer = setTimeout(() => setLate(true), 500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <main>
      <input aria-label="typing" />
      {dialogOpen ? <div role="dialog" aria-label="other" /> : null}
      <Link to="/elsewhere">leave</Link>
      <Link to="/home?period=1">refine</Link>
      <p {...tourAnchor("home-balance")}>balance</p>
      <p {...tourAnchor("home-menu")}>menu</p>
      {late ? <p {...tourAnchor("home-month")}>month</p> : null}
      <p {...tourAnchor("nav-new-movement")}>add</p>
    </main>
  );
}

function renderAt(
  path: string,
  options: {
    state?: unknown;
    language?: Language;
    lateAnchors?: boolean;
    dialogOpen?: boolean;
  } = {},
) {
  return render(
    <I18nextProvider i18n={createI18n(options.language ?? "es")}>
      <MemoryRouter initialEntries={[{ pathname: path, state: options.state }]}>
        <Routes>
          <Route
            path="/home"
            element={
              <Page
                lateAnchors={options.lateAnchors ?? false}
                dialogOpen={options.dialogOpen ?? false}
              />
            }
          />
          <Route
            path="/elsewhere"
            element={
              <>
                <p>elsewhere</p>
                <Link to="/home">back</Link>
              </>
            }
          />
        </Routes>
        <TourHost />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const STARTED = { timeout: 3000 };

async function idle(ms = 700) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

beforeEach(() => {
  drivers.length = 0;
  window.localStorage.clear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 10,
    left: 10,
    width: 80,
    height: 30,
    right: 90,
    bottom: 40,
    x: 10,
    y: 10,
    toJSON: () => ({}),
  });
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tour on first visit", () => {
  it("starts with translated steps, progress and a close label", async () => {
    // Arrange
    renderAt("/home");

    // Act
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Assert
    const { config } = drivers[0] as FakeDriver;
    expect(drivers[0]?.drive).toHaveBeenCalledOnce();
    expect(config.steps).toHaveLength(home?.steps.length ?? -1);
    expect(config.steps[0]?.popover.title).toBe("Tu plata de un vistazo");
    expect(config).toMatchObject({
      allowClose: true,
      showProgress: true,
      progressText: "Paso {{current}} de {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Atrás",
      doneBtnText: "Listo",
      closeBtnLabel: "Cerrar guía",
      animate: true,
    });
  });

  it("explains in English when the app is in English", async () => {
    // Arrange
    renderAt("/home", { language: "en" });

    // Act
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Assert
    expect(drivers[0]?.config.steps[0]?.popover.title).toBe("Your money at a glance");
    expect(drivers[0]?.config.closeBtnLabel).toBe("Close guide");
  });

  it("points each anchored step at the rendered element", async () => {
    // Arrange
    renderAt("/home");
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Act
    const element = drivers[0]?.config.steps[1]?.element?.();

    // Assert
    expect(element?.getAttribute("data-tour")).toBe("home-balance");
  });

  it("turns animation off when the user prefers reduced motion", async () => {
    // Arrange
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    renderAt("/home");

    // Act
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Assert
    expect(drivers[0]?.config.animate).toBe(false);
  });

  it("waits for anchors that appear after the first render", async () => {
    // Arrange
    renderAt("/home", { lateAnchors: true });

    // Act
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Assert
    expect(drivers[0]?.config.steps).toHaveLength(home?.steps.length ?? -1);
  });

  it("does not take the focus while the user is typing", async () => {
    // Arrange
    renderAt("/home");
    screen.getByLabelText("typing").focus();

    // Act
    await idle();

    // Assert
    expect(drivers).toHaveLength(0);
    screen.getByLabelText("typing").blur();
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);
  });
});

describe("closing and replaying", () => {
  it("records the tour as seen when it is closed or finished", async () => {
    // Arrange
    renderAt("/home");
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Act
    act(() => drivers[0]?.config.onDestroyed());

    // Assert
    expect(home && isSeen("ana", home)).toBe(true);
  });

  it("does not start again once it was seen", async () => {
    // Arrange
    if (home) markSeen("ana", home);

    // Act
    renderAt("/home");
    await idle();

    // Assert
    expect(drivers).toHaveLength(0);
  });

  it("starts again for another user of the same browser", async () => {
    // Arrange
    if (home) markSeen("luis", home);

    // Act
    renderAt("/home");

    // Assert
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);
  });

  it("replays a seen tour on request", async () => {
    // Arrange
    if (home) markSeen("ana", home);

    // Act
    renderAt("/home", { state: { replayTour: "home" } });

    // Assert
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);
  });

  it("stops the tour without recording it when the user leaves the screen", async () => {
    // Arrange
    renderAt("/home");
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Act
    await userEvent.click(screen.getByRole("link", { name: "leave" }));

    // Assert
    expect(drivers[0]?.destroy).toHaveBeenCalled();
    expect(home && isSeen("ana", home)).toBe(false);
  });

  it("keeps the tour running when only the query string changes", async () => {
    // Arrange
    renderAt("/home");
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Act
    await userEvent.click(screen.getByRole("link", { name: "refine" }));
    await idle();

    // Assert
    expect(drivers).toHaveLength(1);
    expect(drivers[0]?.destroy).not.toHaveBeenCalled();
  });

  it("does not start again in the same session after it ended with blocked storage", async () => {
    // Arrange
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderAt("/home", { state: { replayTour: "home" } });
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);

    // Act
    act(() => drivers[0]?.config.onDestroyed());
    await idle();

    // Assert
    expect(drivers).toHaveLength(1);
  });

  it("waits while a dialog is open", async () => {
    // Arrange
    renderAt("/home", { dialogOpen: true });

    // Act
    await idle();

    // Assert
    expect(drivers).toHaveLength(0);
  });

  it("shows the tour again in the same session after the guides are reset", async () => {
    // Arrange
    renderAt("/home");
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);
    act(() => drivers[0]?.config.onDestroyed());
    await userEvent.click(screen.getByRole("link", { name: "leave" }));

    // Act
    window.localStorage.clear();
    await userEvent.click(screen.getByRole("link", { name: "back" }));

    // Assert
    await waitFor(() => expect(drivers).toHaveLength(2), STARTED);
  });

  it("starts again on a later visit when the storage is blocked", async () => {
    // Arrange
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const first = renderAt("/home");
    await waitFor(() => expect(drivers).toHaveLength(1), STARTED);
    act(() => drivers[0]?.config.onDestroyed());
    first.unmount();

    // Act
    renderAt("/home");

    // Assert
    await waitFor(() => expect(drivers).toHaveLength(2), STARTED);
  });
});

describe("guides screen", () => {
  function renderGuides() {
    return render(
      <I18nextProvider i18n={createI18n("es")}>
        <MemoryRouter initialEntries={["/guides"]}>
          <Routes>
            <Route path="/guides" element={<GuidesContainer />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>,
    );
  }

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/accounts" || url === "/api/people"
          ? Response.json([])
          : new Response(null, { status: 404 }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers a replay link for every screen with a guide", async () => {
    // Arrange
    renderGuides();

    // Act
    const links = await screen.findAllByRole("link", { name: /^Ver la guía de/ });

    // Assert
    expect(links.map((link) => link.getAttribute("href"))).toContain("/budgets");
    expect(links).toHaveLength(TOURS.length - 1);
  });

  it("explains that the card guide needs a credit card", async () => {
    // Arrange
    renderGuides();

    // Act
    const note = await screen.findByText("Necesitas una tarjeta de crédito para verla.");

    // Assert
    expect(note).toBeDefined();
  });

  it("shows every guide again after the reset", async () => {
    // Arrange
    for (const tour of TOURS) markSeen("ana", tour);
    markSeen("luis", TOURS[0] ?? (budgets as NonNullable<typeof budgets>));
    renderGuides();
    await screen.findAllByRole("link", { name: /^Ver la guía de/ });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Mostrar todas de nuevo" }));

    // Assert
    expect((await screen.findByRole("status")).textContent).toContain("Listo.");
    expect(TOURS.some((tour) => isSeen("ana", tour))).toBe(false);
    expect(isSeen("luis", TOURS[0] as NonNullable<typeof budgets>)).toBe(true);
  });

  it("warns when the storage is blocked", async () => {
    // Arrange
    renderGuides();
    await screen.findAllByRole("link", { name: /^Ver la guía de/ });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Mostrar todas de nuevo" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos restablecer");
  });
});
