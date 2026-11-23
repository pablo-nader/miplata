import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "./useSession";

export function RequireAuth() {
  const { status } = useSession();
  if (status === "loading") {
    return null;
  }
  if (status === "signedOut") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
