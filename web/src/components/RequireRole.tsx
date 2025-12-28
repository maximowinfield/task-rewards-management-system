// src/components/RequireRole.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Role = "Parent" | "Kid";

/**
 * Mirror /parent/* <-> /kid/*
 * Return null if we don't recognize the page.
 */
function mapPathForRole(pathname: string, targetRole: Role): string | null {
  // already on correct prefix
  if (targetRole === "Parent" && pathname.startsWith("/parent/")) return pathname;
  if (targetRole === "Kid" && pathname.startsWith("/kid/")) return pathname;

  // translate known mirrored routes
  if (targetRole === "Kid") {
    if (pathname.startsWith("/parent/kids")) return pathname.replace("/parent/kids", "/kid/kids");
    if (pathname.startsWith("/parent/todos")) return pathname.replace("/parent/todos", "/kid/todos");
  }

  if (targetRole === "Parent") {
    if (pathname.startsWith("/kid/kids")) return pathname.replace("/kid/kids", "/parent/kids");
    if (pathname.startsWith("/kid/todos")) return pathname.replace("/kid/todos", "/parent/todos");
  }

  return null;
}

export default function RequireRole({
  role,
  allow,
  children,
}: {
  role?: Role;
  allow?: Role[];
  children: React.ReactElement;
}) {
  const { auth } = useAuth();
  const location = useLocation();

  const required: Role[] = allow ?? (role ? [role] : []);
  const activeRole = auth?.activeRole ?? null;

  const hasParentAuth = !!auth?.parentToken;
  const hasKidAuth = !!auth?.kidToken;

  // ✅ If no auth at all, go login
  if (!hasParentAuth && !hasKidAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ✅ Token safety: if role says Kid but kidToken missing, don't allow kid pages
  if (activeRole === "Kid" && !hasKidAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ✅ Token safety: if role says Parent but parentToken missing, don't allow parent pages
  if (activeRole === "Parent" && !hasParentAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // ✅ If route requires a role, enforce it
  if (required.length > 0 && (!activeRole || !required.includes(activeRole))) {
    // We ARE authenticated, just wrong role.
    // Redirect to the mirrored route for the user's CURRENT role so they stay on the same page.
    const mapped = activeRole ? mapPathForRole(location.pathname, activeRole) : null;

    // fallback: send them to their role's home
    const fallback =
      activeRole === "Kid"
        ? auth?.selectedKidId
          ? `/kid/kids/${auth.selectedKidId}`
          : "/kid/kids"
        : auth?.selectedKidId
          ? `/parent/kids/${auth.selectedKidId}`
          : "/parent/kids";

    return <Navigate to={mapped ?? fallback} replace />;
  }

  return children;
}
