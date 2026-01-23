// src/App.tsx 12/30/2025
//
// Purpose:
// - Defines the app shell (top bar + navigation) and all client-side routes.
// - Routes are separated by role ("Parent" vs "Kid") and protected by <RequireRole />.
// - Supports two concepts:
//   1) activeRole = the real authenticated role (determines which JWT token we use)
//   2) uiMode    = how the UI should behave/look (Parent Mode vs Kid Mode)
//
// Key ideas:
// - Parent logs in first -> gets parentToken.
// - Parent can start a kid session -> backend returns a kidToken (JWT with Kid role).
// - Switching modes maps the current route to a role-specific equivalent (parent/... <-> kid/...).
//
import React from "react";
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import RequireRole from "./components/RequireRole";
import { useAuth } from "./context/AuthContext";
import SelectKid from "./pages/SelectKid";

// External links shown in the top bar
const GITHUB_URL = "https://github.com/maximowinfield";
const RESUME_URL =
  "https://github.com/maximowinfield/maximowinfield/blob/main/Maximo_Winfield_Resume_Tailwind_Skills.pdf?raw=true";

/**
 * mapPathForRole
 *
 * Purpose:
 * - When the user switches modes (Parent <-> Kid), we try to keep them on the "same" page,
 *   just under the correct route prefix.
 *
 * Example:
 * - /parent/kids/123 -> /kid/kids/123
 * - /kid/todos       -> /parent/todos
 *
 * If we don't recognize the current path, return null and let the caller choose a safe fallback.
 */
function mapPathForRole(pathname: string, targetRole: "Parent" | "Kid"): string | null {
  // If already on the correct prefix, keep it
  if (targetRole === "Parent" && pathname.startsWith("/parent/")) return pathname;
  if (targetRole === "Kid" && pathname.startsWith("/kid/")) return pathname;

  // Translate known mirrored routes
  if (targetRole === "Kid") {
    if (pathname.startsWith("/parent/kids")) return pathname.replace("/parent/kids", "/kid/kids");
    if (pathname.startsWith("/parent/todos")) return pathname.replace("/parent/todos", "/kid/todos");
  }

  if (targetRole === "Parent") {
    if (pathname.startsWith("/kid/kids")) return pathname.replace("/kid/kids", "/parent/kids");
    if (pathname.startsWith("/kid/todos")) return pathname.replace("/kid/todos", "/parent/todos");
  }

  // Unknown route -> caller will decide fallback
  return null;
}

export default function App(): JSX.Element {
  // AuthContext is the source of truth for tokens and role/mode switching helpers
  const { auth, enterKidMode, enterParentMode, logout } = useAuth();

  // Router helpers (current location + ability to redirect)
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Theme detection:
   * - Reads the user's OS/browser theme preference (dark vs light).
   * - This is for styling only; it has nothing to do with authentication.
   */
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Theme palette used by inline styles (simple, no CSS framework required)
  const theme = {
    bg: isDark ? "#0b0f19" : "rgba(255,255,255,0.75)",
    text: isDark ? "#e5e7eb" : "#0f172a",
    border: isDark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.15)",
    pillBg: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.08)",
    pillActiveBg: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.18)",
  };

  /**
   * isAuthed:
   * - If either a parentToken or kidToken exists, we consider the user logged in.
   * - The API client will attach the correct token depending on activeRole.
   */
  const isAuthed = !!auth?.parentToken || !!auth?.kidToken;

  /**
   * UI Mode vs Auth Role:
   * - uiMode is just a UI choice (Kid Mode vs Parent Mode).
   * - activeRole is the actual authenticated role we currently use for API calls.
   *
   * Example:
   * - Parent may still have parentToken saved while browsing in Kid Mode,
   *   but activeRole becomes "Kid" after starting a kid session.
   */
  const isKidMode = auth?.uiMode === "Kid";
  const isParentMode = auth?.activeRole === "Parent" && auth?.uiMode === "Parent";

  // Selected kid in the UI (used for routing to the correct kid dashboard)
  const selectedKidId = auth?.selectedKidId;

  /**
   * kidsRewardsPath:
   * - Determines where the "Kids + Rewards" nav pill should send the user.
   * - Uses activeRole (not uiMode) to decide the correct route prefix.
   *
   * If we know a kidId:
   * - /parent/kids/:kidId or /kid/kids/:kidId
   *
   * If no kidId:
   * - /parent/kids or /kid/kids (page may prompt for selection or show list)
   */
  const kidsRewardsPath =
    auth?.activeRole === "Kid"
      ? selectedKidId
        ? `/kid/kids/${selectedKidId}`
        : "/kid/kids"
      : selectedKidId
        ? `/parent/kids/${selectedKidId}`
        : "/parent/kids";

  // Shared styling for top navigation pills
  const navPill: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 800,
    border: `1px solid ${theme.border}`,
    background: theme.pillBg,
    color: theme.text,
  };

  // Added on top of navPill when route is active
  const navPillActive: React.CSSProperties = {
    background: theme.pillActiveBg,
  };

  // Styles for logout button
  const dangerBtn: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(185,28,28,0.4)",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 600,
    color: "#b91c1c",
    opacity: 0.9,
  };

  // Styles for top-right buttons (Login / Kid Mode / Parent Mode / Change Kid)
  const topBtn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.pillBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  /**
   * switchToParentMode
   *
   * Purpose:
   * - Allows a kid-mode UI to be "locked" behind a simple Parent PIN gate.
   * - Only possible if a parentToken exists (meaning a parent previously logged in).
   *
   * Flow:
   * - Prompt for PIN
   * - If correct:
   *   - enterParentMode() updates AuthContext
   *   - Map current path to the parent equivalent (if possible)
   *   - Navigate there
   * - If wrong:
   *   - Keep kid mode
   */
  async function switchToParentMode() {
    if (!auth?.parentToken) return;

    const expectedPin = import.meta.env.VITE_PARENT_PIN || "1234";
    const entered = window.prompt("Enter Parent PIN:");

    if (entered === expectedPin) {
      enterParentMode();

      const mapped =
        mapPathForRole(location.pathname, "Parent") ??
        (selectedKidId ? `/parent/kids/${selectedKidId}` : "/parent/select-kid");

      navigate(mapped, { replace: true });
    } else {
      alert("Wrong PIN. Staying in Kid Mode.");
    }
  }

  /**
   * switchToKidMode
   *
   * Purpose:
   * - Starts a kid session (backend returns a Kid JWT).
   * - Updates AuthContext so activeRole becomes "Kid" (API requests use kidToken).
   *
   * Requirements:
   * - Must have a parentToken (parent must be logged in to request kid session).
   * - Must have a selectedKidId (otherwise we redirect to select one).
   */
  async function switchToKidMode() {
    if (!auth?.parentToken) return;

    const kidId = auth?.selectedKidId;
    if (!kidId) {
      // If no kid is selected, send the parent to choose one
      navigate("/parent/select-kid", { replace: true });
      return;
    }

    try {
      // Calls API: /api/kid-session -> returns kid JWT + display name
      await enterKidMode(kidId);

      const mapped = mapPathForRole(location.pathname, "Kid") ?? `/kid/kids/${kidId}`;

      // If the mapped path lands on the kid list root, prefer the specific kid dashboard
      const finalPath = mapped === "/kid/kids" ? `/kid/kids/${kidId}` : mapped;

      // Replace history entry so back button doesn't bounce between modes
      navigate(finalPath, { replace: true });
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to start kid session.");
    }
  }

  /**
   * clearAuth
   *
   * Purpose:
   * - Logs out from both roles by clearing AuthContext + localStorage tokens.
   * - Redirects user to /login.
   */
  function clearAuth() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui",
        background: isDark ? "#0b0f19" : "#f8fafc",
        color: isDark ? "#e5e7eb" : "#0f172a",
      }}
    >
      {/* Top bar: navigation + external links + mode switching */}
      <div
        style={{
          maxWidth: 980,
          margin: "16px auto 0",
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          borderRadius: 16,
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          color: theme.text,
        }}
      >
        {/* Left side: nav pills (only show when logged in) */}
        {isAuthed && (
          <>
            <Link
              to={kidsRewardsPath}
              style={{
                ...navPill,
                ...(location.pathname.startsWith("/parent/kids") ||
                location.pathname.startsWith("/kid/kids")
                  ? navPillActive
                  : {}),
              }}
            >
              Kids + Rewards
            </Link>

            <Link
              to={auth?.activeRole === "Kid" ? "/kid/todos" : "/parent/todos"}
              style={{
                ...navPill,
                ...(location.pathname.startsWith("/parent/todos") ||
                location.pathname.startsWith("/kid/todos")
                  ? navPillActive
                  : {}),
              }}
            >
              Todos
            </Link>
          </>
        )}

        {/* Center branding + external links (only show when logged in) */}
        {isAuthed && (
          <div
            style={{
              marginLeft: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 999,
              border: `1px solid ${theme.border}`,
              background: theme.pillBg,
              color: theme.text,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            <span>Maximo Winfield</span>
            <span style={{ opacity: 0.6 }}>•</span>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                color: theme.text,
                textDecoration: "none",
                fontWeight: 800,
                opacity: 0.9,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              GitHub
            </a>

            <a
              href={RESUME_URL}
              target="_blank"
              rel="noreferrer"
              style={{
                color: theme.text,
                textDecoration: "none",
                fontWeight: 800,
                opacity: 0.9,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              Resume
            </a>
          </div>
        )}

        {/* Right side: Login button OR mode buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {!isAuthed ? (
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button style={topBtn}>Login</button>
            </Link>
          ) : (
            <>
              {/* Switch UI/auth context into kid mode (requires parentToken + selectedKidId) */}
              <button onClick={switchToKidMode} style={{ ...topBtn, opacity: isKidMode ? 0.7 : 1 }}>
                Kid Mode
              </button>

              {/* Switch UI back into parent mode (PIN-gated) */}
              <button
                onClick={switchToParentMode}
                style={{ ...topBtn, opacity: isParentMode ? 0.7 : 1 }}
              >
                Parent Mode
              </button>

              {/* Parent-only shortcut to change which kid is selected */}
              {auth?.parentToken && (
                <button onClick={() => navigate("/parent/select-kid")} style={topBtn}>
                  Change Kid
                </button>
              )}

              <button onClick={clearAuth} style={dangerBtn}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* App routes */}
      <Routes>
        {/* Default route:
            - If not logged in: go to /login
            - If logged in as Kid: go to /kid/kids/:kidId (or /kid/kids if not selected)
            - If logged in as Parent: go to /parent/kids/:kidId (or /parent/select-kid if no kid selected)
        */}
        <Route
          path="/"
          element={
            isAuthed ? (
              auth?.activeRole === "Kid" ? (
                selectedKidId ? (
                  <Navigate to={`/kid/kids/${selectedKidId}`} replace />
                ) : (
                  <Navigate to="/kid/kids" replace />
                )
              ) : selectedKidId ? (
                <Navigate to={`/parent/kids/${selectedKidId}`} replace />
              ) : (
                <Navigate to="/parent/select-kid" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Parent-only routes */}
        <Route
          path="/parent/select-kid"
          element={
            <RequireRole role="Parent">
              <SelectKid />
            </RequireRole>
          }
        />

        <Route
          path="/parent/kids"
          element={
            <RequireRole role="Parent">
              <KidsRewardsPage />
            </RequireRole>
          }
        />

        <Route
          path="/parent/kids/:kidId"
          element={
            <RequireRole role="Parent">
              <KidsRewardsPage />
            </RequireRole>
          }
        />

        <Route
          path="/parent/todos"
          element={
            <RequireRole role="Parent">
              <TodosPage />
            </RequireRole>
          }
        />

        {/* Kid-only routes */}
        <Route
          path="/kid/kids"
          element={
            <RequireRole role="Kid">
              <KidsRewardsPage />
            </RequireRole>
          }
        />

        <Route
          path="/kid/kids/:kidId"
          element={
            <RequireRole role="Kid">
              <KidsRewardsPage />
            </RequireRole>
          }
        />

        <Route
          path="/kid/todos"
          element={
            <RequireRole role="Kid">
              <TodosPage />
            </RequireRole>
          }
        />

        {/* Catch-all: redirect unknown paths back to the default resolver */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
