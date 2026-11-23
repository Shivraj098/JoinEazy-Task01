import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { homePathFor, type Role } from "./types";

function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-slate-600">
      <p role="status">{children}</p>
    </div>
  );
}

/** Renders children only for a signed-in user with the given role. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageMessage>Loading…</FullPageMessage>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}

/** Login and registration are only for signed-out visitors. */
export function GuestOnly() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageMessage>Loading…</FullPageMessage>;
  if (user) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageMessage>Loading…</FullPageMessage>;
  return <Navigate to={user ? homePathFor(user.role) : "/login"} replace />;
}
