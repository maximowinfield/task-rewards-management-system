import { Link, Routes, Route, Navigate, useLocation } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import RequireRole from "./components/RequireRole";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { auth, setAuth } = useAuth();
  const location = useLocation();

  // isDark and bar styling pills
  const isDark =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const theme = {
  bg: isDark ? "#0b0f19" : "#ffffff",
  text: isDark ? "#e5e7eb" : "#0f172a",
  border: isDark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.15)",
  pillBg: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.04)",
  pillActiveBg: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)",
};


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
// actionBtn dangerBtn style declarations
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


// shared button style
const topBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: `1px solid ${theme.border}`,
  background: theme.pillBg,
  color: theme.text,
  cursor: "pointer",
  fontWeight: 800,
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
  <button style={topBtn}>Login</button>
</Link>
          ) : (
            <>
<button onClick={switchToKidMode} style={{ ...topBtn, opacity: isKidMode ? 0.7 : 1 }}>
  Kid Mode
</button>

<button onClick={switchToParentMode} style={{ ...topBtn, opacity: isParentMode ? 0.7 : 1 }}>
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
