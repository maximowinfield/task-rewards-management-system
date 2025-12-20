import { Link, Routes, Route, Navigate, useLocation } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import RequireRole from "./components/RequireRole";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { auth, setAuth } = useAuth();
  const location = useLocation();

  // ✅ Auth = only Parent login exists now
  const isAuthed = !!auth?.parentToken;

  // ✅ Kid vs Parent is now UI MODE (not auth role)
  const isKidMode = auth?.uiMode === "Kid";
  const isParentMode = auth?.uiMode === "Parent";

  // Option A: kidId in the URL (saved selection)
  const parentKidId = auth?.selectedKidId;

  // Declarations for background and text color
  // (Note: you aren't applying appBg/appText to the container yet; that's fine for now.)
  const appBg = isParentMode ? "#0b0f19" : "#f8fafc";
  const appText = isParentMode ? "#e5e7eb" : "#0f172a";

  // Nav pills declarations
  const navPill: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 700,
    border: "1px solid rgba(148,163,184,0.3)",
    color: appText,
  };

  const navPillActive: React.CSSProperties = {
    background: "rgba(99,102,241,0.15)",
  };

  function clearAuth() {
    setAuth({
      parentToken: null,
      activeRole: null,
      uiMode: "Kid", // ✅ safe default when logged out
      kidId: undefined,
      kidName: undefined,
      selectedKidId: undefined,
      selectedKidName: undefined,
    });
  }

  function switchToParentMode() {
    if (!auth?.parentToken) return;

    const expectedPin = import.meta.env.VITE_PARENT_PIN || "1234";
    const entered = window.prompt("Enter Parent PIN:");

    if (entered === expectedPin) {
      setAuth((prev) => ({ ...prev, uiMode: "Parent" }));
    } else {
      alert("Wrong PIN. Staying in Kid Mode.");
      setAuth((prev) => ({ ...prev, uiMode: "Kid" }));
    }
  }

  function switchToKidMode() {
    if (!auth?.parentToken) return;
    setAuth((prev) => ({ ...prev, uiMode: "Kid" }));
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui" }}>
      {/* Top bar */}
      <div
        style={{
          maxWidth: 860,
          margin: "20px auto 0",
          padding: "0 16px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        {/* Left side: nav pills (ONLY when logged in) */}
        {isAuthed && (
          <>
            <Link
              to={parentKidId ? `/parent/kids/${parentKidId}` : "/parent/kids"}
              style={{
                ...navPill,
                ...(location.pathname.startsWith("/parent/kids") ? navPillActive : {}),
              }}
            >
              Kids + Rewards
            </Link>

            <Link
              to="/parent/todos"
              style={{
                ...navPill,
                ...(location.pathname.startsWith("/parent/todos") ? navPillActive : {}),
              }}
            >
              Todos
            </Link>
          </>
        )}

        {/* Right side: login OR mode buttons */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {!isAuthed ? (
            <Link to="/login" style={{ textDecoration: "none" }}>
              <button style={{ cursor: "pointer" }}>Login</button>
            </Link>
          ) : (
            <>
              <button
                onClick={switchToKidMode}
                style={{
                  cursor: "pointer",
                  opacity: isKidMode ? 0.7 : 1,
                }}
              >
                Kid Mode
              </button>

              <button
                onClick={switchToParentMode}
                style={{
                  cursor: "pointer",
                  opacity: isParentMode ? 0.7 : 1,
                }}
              >
                Parent Mode
              </button>

              <button onClick={clearAuth} style={{ cursor: "pointer" }}>
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
              parentKidId ? (
                <Navigate to={`/parent/kids/${parentKidId}`} replace />
              ) : (
                <Navigate to="/parent/kids" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<Login />} />

        {/* Parent-only pages (auth role check) */}
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
