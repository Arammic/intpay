import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getStoredUserId } from "@/lib/currentUserContext";

/**
 * Gate for the app routes. If the URL doesn't carry an explicit user id and
 * nothing is stored, send the user to /login. If something is stored but the
 * route is the bare /app or /profile, redirect to the user-scoped variant so
 * everything stays consistent.
 */
export default function RequireUser() {
  const { pathname, search, hash } = useLocation();
  const hasUrlUser = /\/(?:app\/user|u|profile)\/(\d+)/.test(pathname);
  const stored = getStoredUserId();

  if (!hasUrlUser && !stored) {
    return <Navigate to="/login" replace />;
  }

  // /app (no user id) → /app/user/:id
  if (!hasUrlUser && stored && pathname === "/app") {
    return (
      <Navigate to={`/app/user/${stored}${search}${hash}`} replace />
    );
  }

  return <Outlet />;
}
