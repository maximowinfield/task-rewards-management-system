// src/components/RequireRole.tsx
//
// Purpose:
// - Route guard component that protects pages by role ("Parent" or "Kid").
// - Works with AuthContext where:
//   - auth.activeRole is the real authenticated role ("Parent" or "Kid").
//   - auth.parentToken / auth.kidToken are the stored JWT tokens.
// - If the user is not authenticated, it redirects to /login.
// - If the user is authenticated but on the wrong role route, it redirects them
//   to the mirrored route for their current activeRole (or a safe fallback).
//
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Role = "Parent" | "Kid";

/**
 * mapPathForRole
 *
 * Purpose:
 * - Mirrors known routes between /parent/* and /kid/* so the user can switch roles
 *   without getting kicked to a random page.
 *
 * Examples:
 * - /parent/kids     -> /kid/kids
 * - /parent/kids/123 -> /kid/kids/123
 * - /kid/todos       -> /parent/todos
 *
 * Returns:
 * - A mapped pathname when we recognize the route family
 * - null when we don't know how to translate the page
 */
function mapPathForRole(pathname: string, targetRole: Role): string | null {
  // If already on correct prefix, keep it
  if (targetRole === "Parent" && pathname.startsWith("/parent/")) return pathname;
  if (targetRole === "Kid" && pathname.startsWith("/kid/")) return pathname;

  // Translate parent -> kid
  if (targetRole === "Kid") {
    if (pathname.startsWith("/parent/kids")) return pathname.replace("/parent/kids", "/kid/kids");
    if (pathname.startsWith("/parent/todos")) return pathname.replace("/parent/todos", "/kid/todos");
  }

  // Translate kid -> parent
  if (targetRole === "Parent") {
    if (pathname.startsWith("/kid/kids")) return pathname.replace("/kid/kids", "/parent/kids");
    if (pathname.startsWith("/kid/todos")) return pathname.replace("/kid/todos", "/parent/todos");
  }

  // Unknown route family
  return null;
}

export default function RequireRole({
  role,
  allow,
  children,
}: {
  // "role" is a single required role, e.g. <RequireRole role="Parent" />
  role?: Role;

  // "allow" supports multiple roles, e.g. <RequireRole allow={["Parent","Kid"]} />
  allow?: Role[];

  // Protected page to render when access is allowed
  children: React.ReactElement;
}) {
  const { auth } = useAuth();
  const location = useLocation();

  /**
   * required:
   * - The list of roles that are allowed to view this page.
   * - If allow is provided, use it.
   * - Else if role is provided, make it a one-item array.
   * - Else empty array means "no role restriction" (still requires some auth below).
   */
  const required: Role[] = allow ?? (role ? [role] : []);

  // activeRole is the source of truth for what the current token represents
  const activeRole = auth?.activeRole ?? null;

  // Quick checks for whether tokens exist
  const hasParentAuth = !!auth?.parentToken;
  const hasKidAuth = !!auth?.kidToken;

  /**
   * Auth gate:
   * - If the user has no token at all, they are not logged in -> go to /login.
   * - We store "from" in router state so the Login page could optionally redirect back.
   */
  if (!hasParentAuth && !hasKidAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  /**
   * Token safety checks:
   * - If activeRole says "Kid" but kidToken is missing, something is inconsistent.
   * - If activeRole says "Parent" but parentToken is missing, also inconsistent.
   * - In either case, force re-auth by sending them to /login.
   */
  if (activeRole === "Kid" && !hasKidAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (activeRole === "Parent" && !hasParentAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  /**
   * Role enforcement:
   * - If this route requires specific roles (required.length > 0),
   *   and the current activeRole is missing or not allowed, block access.
   */
  if (required.length > 0 && (!activeRole || !required.includes(activeRole))) {
    /**
     * At this point:
     * - The user is authenticated (they have some token),
     * - but they are trying to view a page meant for a different role.
     *
     * Strategy:
     * 1) Try to mirror the current route into the user's activeRole route prefix.
     * 2) If we can't map it, fallback to a safe "home" route for the activeRole.
     */
    const mapped = activeRole ? mapPathForRole(location.pathname, activeRole) : null;

    // Fallback "home" per role, prefer the currently selected kid if available
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

  // Allowed: render the protected page
  return children;
}
