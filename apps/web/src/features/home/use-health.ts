import type { HealthResponse } from "@miplata/shared";
import { useEffect, useState } from "react";
import { fetchHealth } from "./health-client";

export type HealthState =
  | { kind: "loading" }
  | { kind: "ok"; health: HealthResponse }
  | { kind: "unavailable" };

export function useHealth(request: typeof fetch = fetch): HealthState {
  const [state, setState] = useState<HealthState>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    fetchHealth(request)
      .then((health) => active && setState({ kind: "ok", health }))
      .catch(() => active && setState({ kind: "unavailable" }));
    return () => {
      active = false;
    };
  }, [request]);

  return state;
}
