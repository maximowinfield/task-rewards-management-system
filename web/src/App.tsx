// src/App.tsx 12/28/2025
import React from "react";
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import RequireRole from "./components/RequireRole";
import { useAuth } from "./context/AuthContext";

export default function App(): JSX.Element {
  const { auth, enterKidMode, enterParentMode, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect system theme (used only for styling)
  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const theme = {
    bg: isDark ? "#0b0f19" : "rgba(255,255,255,0.75)",
    text: isDark ? "#e5e7eb" : "#0f172a",
    border: isDark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.15)",
    pillBg: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.08)",
    pillActiveBg: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.18)",
  };

  // Auth
  const isAuthed = !!auth?.parentToken || !!auth?.kidToken;

  // UI Mode (not auth)
  const isKidMode = auth?.uiMode === "Kid";
  const isParentMode = auth?.activeRole === "Parent" && auth?.uiMode === "Parent";

  const selectedKidId = auth?.selectedKidId;

  // ---- Routes based on activeRole (not uiMode) ----
const kidsRewardsPath =
  auth?.activeRole === "Kid"
    ? selectedKidId
      ? `/kid/kids/${selectedKidId}`
      : "/kid/kids"
    : selectedKidId
      ? `/parent/kids/${selectedKidId}`
      : "/parent/kids";


  // Nav pills
  const navPill: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 800,
    border: `1px solid ${theme.border}`,
    background: theme.pillBg,
    color: theme.text,
  };

  const navPillActive: React.CSSProperties = {
    background: theme.pillActiveBg,
  };

  // Buttons
  const actionBtn: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 10,
    border: `1px solid rgba(148,163,184,0.35)`,
    background: "transparent",
    cursor: "pointer",
    fontWeight: 600,
  };

  const dangerBtn: React.CSSProperties = {
    ...actionBtn,
    color: "#b91c1c",
    border: "1px solid rgba(185,28,28,0.4)",
    opacity: 0.9,
  };

  const topBtn: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    background: theme.pillBg,
    color: theme.text,
    cursor: "pointer",
    fontWeight: 800,
  };

  async function switchToParentMode() {
    if (!auth?.parentToken) return;

    const expectedPin = import.meta.env.VITE_PARENT_PIN || "1234";
    const entered = window.prompt("Enter Parent PIN:");

    if (entered === expectedPin) {
      enterParentMode(); // sets activeRole + uiMode
      navigate(selectedKidId ? `/parent/kids/${selectedKidId}` : "/parent/kids", { replace: true });
    } else {
      alert("Wrong PIN. Staying in Kid Mode.");
    }
  }

  async function switchToKidMode() {
    if (!auth?.parentToken) return;

    const kidId = auth?.selectedKidId;
    if (!kidId) {
      alert("Pick a kid first (Change Kid) before entering Kid Mode.");
      return;
    }

    try {
      await enterKidMode(kidId); // calls /kid-session and stores kidToken + activeRole
      navigate(`/kid/kids/${kidId}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? "Failed to start kid session.");
    }
  }

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
      {/* Top bar */}
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
        {/* Left side: nav pills (ONLY when logged in) */}
        {isAuthed && (
          <>
            <Link
              to={kidsRewardsPath}
              style={{
                ...navPill,
                ...((location.pathname.startsWith("/parent/kids") || location.pathname.startsWith("/kid/kids"))
  ? navPillActive
  : {}),

              }}
            >
              Kids + Rewards
            </Link>

            {/* Todos are truly parent-only; only show in Parent role */}
            {auth?.activeRole !== "Kid" && (
              <Link
                to="/parent/todos"
                style={{
                  ...navPill,
                  ...(location.pathname.startsWith("/parent/todos") ? navPillActive : {}),
                }}
              >
                Todos
              </Link>
            )}
          </>
        )}

        {/* Right side: login OR mode buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {!isAuthed ? (
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button style={topBtn}>Login</button>
            </Link>
          ) : (
            <>
              <button onClick={switchToKidMode} style={{ ...topBtn, opacity: isKidMode ? 0.7 : 1 }}>
                Kid Mode
              </button>

              <button
                onClick={switchToParentMode}
                style={{ ...topBtn, opacity: isParentMode ? 0.7 : 1 }}
              >
                Parent Mode
              </button>

              <button onClick={clearAuth} style={dangerBtn}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>

<Routes>
  {/* Default route */}
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
          <Navigate to="/parent/kids" replace />
        )
      ) : (
        <Navigate to="/login" replace />
      )
    }
  />

  <Route path="/login" element={<Login />} />

  {/* Parent-only pages */}
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

  {/* Kid-only ROUTES */}
  <Route
    path="/kid/kids"
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


  <Route
    path="/kid/kids/:kidId"
    element={
      <RequireRole role="Kid">
        <KidsRewardsPage />
      </RequireRole>
    }
  />

  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>

    </div>
  );
}
