import { useEffect, useRef } from "react";

export function useRestoreFocus(active: boolean) {
  const target = useRef<HTMLHeadingElement>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (wasActive.current && !active) {
      target.current?.focus();
    }
    wasActive.current = active;
  }, [active]);

  return target;
}
