// src/App.tsx 12/30/2025
import React from "react";
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import RequireRole from "./components/RequireRole";
import { useAuth } from "./context/AuthContext";
import SelectKid from "./pages/SelectKid";

// 🔗 External links (global)
const GITHUB_URL = "https://github.com/maximowinfield";
const RESUME_URL =
  "https://github.com/maximowinfield/maximowinfield/blob/main/Maximo_Winfield_Resume_Tailwind_Skills.pdf?raw=true";


// ✅ Helper lives here (outside the component)
function mapPathForRole(
  pathname: string,
  targetRole: "Parent" | "Kid"
): string | null {
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

  // unknown page → caller decides fallback
  return null;
}

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
      enterParentMode();

      const mapped =
        mapPathForRole(location.pathname, "Parent") ??
        (selectedKidId ? `/parent/kids/${selectedKidId}` : "/parent/select-kid");

      navigate(mapped, { replace: true });
    } else {
      alert("Wrong PIN. Staying in Kid Mode.");
    }
  }

  async function switchToKidMode() {
    if (!auth?.parentToken) return;

    const kidId = auth?.selectedKidId;
    if (!kidId) {
      // ✅ Send them to selector instead of dead-ending
      navigate("/parent/select-kid", { replace: true });
      return;
    }

    try {
      await enterKidMode(kidId);

      const mapped =
        mapPathForRole(location.pathname, "Kid") ??
        `/kid/kids/${kidId}`; // fallback if unknown page

      const finalPath = mapped === "/kid/kids" ? `/kid/kids/${kidId}` : mapped;
      navigate(finalPath, { replace: true });
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
                ...(
                  location.pathname.startsWith("/parent/kids") ||
                  location.pathname.startsWith("/kid/kids")
                    ? navPillActive
                    : {}
                ),
              }}
            >
              Kids + Rewards
            </Link>

            <Link
              to={auth?.activeRole === "Kid" ? "/kid/todos" : "/parent/todos"}
              style={{
                ...navPill,
                ...(
                  location.pathname.startsWith("/parent/todos") ||
                  location.pathname.startsWith("/kid/todos")
                    ? navPillActive
                    : {}
                ),
              }}
            >
              Todos
            </Link>
          </>
        )}

{/* Center branding */}
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
      style={{ color: theme.text, textDecoration: "none", fontWeight: 800, opacity: 0.9 }}
      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
    >
      GitHub
    </a>

    <a
      href={RESUME_URL}
      target="_blank"
      rel="noreferrer"
      style={{ color: theme.text, textDecoration: "none", fontWeight: 800, opacity: 0.9 }}
      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
    >
      Resume
    </a>
  </div>
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
                // ✅ Parent with no kid selected → go pick one
                <Navigate to="/parent/select-kid" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<Login />} />

        {/* Parent-only pages */}
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

        {/* Kid-only pages */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
