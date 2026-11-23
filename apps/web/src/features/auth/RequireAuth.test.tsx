import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderInRouter } from "../../test/render";
import { RequireAuth } from "./RequireAuth";
import type { SessionState } from "./useSession";

let state: SessionState;

vi.mock("./useSession", () => ({ useSession: () => state }));

const refresh = async () => {};

function routes() {
  return (
    <Routes>
      <Route path="/" element={<p>public</p>} />
      <Route element={<RequireAuth />}>
        <Route path="private" element={<p>private</p>} />
      </Route>
    </Routes>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    state = { status: "loading", user: null, refresh };
  });

  it("renders nothing while the session loads", () => {
    // Arrange
    state = { status: "loading", user: null, refresh };

    // Act
    renderInRouter(routes(), "/private");

    // Assert
    expect(screen.queryByText("private")).toBeNull();
    expect(screen.queryByText("public")).toBeNull();
  });

  it("sends signed-out visitors to the root", () => {
    // Arrange
    state = { status: "signedOut", user: null, refresh };

    // Act
    renderInRouter(routes(), "/private");

    // Assert
    expect(screen.getByText("public")).toBeDefined();
    expect(screen.queryByText("private")).toBeNull();
  });

  it("renders the protected route when signed in", () => {
    // Arrange
    state = {
      status: "signedIn",
      user: { id: "1", name: "Ana", email: "a@b.c", image: null, locale: "es" },
      refresh,
    };

    // Act
    renderInRouter(routes(), "/private");

    // Assert
    expect(screen.getByText("private")).toBeDefined();
  });
});
