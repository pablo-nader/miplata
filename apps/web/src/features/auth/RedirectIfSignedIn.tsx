import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "./useSession";

export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { status } = useSession();
  if (status === "signedIn") {
    return <Navigate to="/home" replace />;
  }
  return children;
}
