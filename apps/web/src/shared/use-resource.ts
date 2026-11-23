import { useCallback, useEffect, useRef, useState } from "react";

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: T };

export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ status: "loading" });
  const token = useRef(0);

  const run = useCallback(() => {
    token.current += 1;
    const current = token.current;
    setState({ status: "loading" });
    load().then(
      (data) => {
        if (token.current === current) {
          setState({ status: "ready", data });
        }
      },
      () => {
        if (token.current === current) {
          setState({ status: "error" });
        }
      },
    );
  }, [load]);

  useEffect(() => {
    run();
    return () => {
      token.current += 1;
    };
  }, [run]);

  return { state, reload: run };
}
