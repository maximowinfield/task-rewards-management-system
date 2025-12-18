import { Link, Routes, Route, Navigate } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";
import Login from "./pages/Login";
import SelectKid from "./pages/SelectKid";
import RequireRole from "./components/RequireRole";
import KidDashboard from "./components/KidDashboard";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { auth, setAuth } = useAuth();

  const isParent = !!auth?.parentToken;
  const isKid = !!auth?.kidToken;

  // Option A: kidId in the URL
  const parentKidId = auth?.selectedKidId;

  function clearAuth() {
  setAuth({
    parentToken: null,
    kidToken: null,
    activeRole: null,
    kidId: undefined,
    kidName: undefined,
    selectedKidId: undefined,
    selectedKidName: undefined,
  });
}


function switchToParent() {
  setAuth((prev) => (prev.parentToken ? { ...prev, activeRole: "Parent" } : prev));
}

function switchToKid() {
  setAuth((prev) => (prev.kidToken ? { ...prev, activeRole: "Kid" } : prev));
}


  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui", color: "#fff" }}>
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
        {/* Parent links */}
        {isParent && (
          <>
            <Link to={parentKidId ? `/parent/kids/${parentKidId}` : "/select-kid"}>
              Kids + Rewards
            </Link>
            <Link to="/parent/todos">Todos</Link>
            <Link to="/select-kid">Select Kid</Link>
          </>
        )}

        {/* Kid link */}
        {isKid && <Link to="/kid">Kid View</Link>}

        {/* Login always visible */}
        <Link to="/login">Login</Link>

        {/* Optional quick role toggle */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {isParent && (
            <button onClick={switchToParent} style={{ cursor: "pointer" }}>
              Parent Mode
            </button>
          )}
          {isKid && (
            <button onClick={switchToKid} style={{ cursor: "pointer" }}>
              Kid Mode
            </button>
          )}
        </div>
      </div>

      <Routes>
        {/* Default: if parent logged in, go to parent home (kid-specific if selected) */}
        <Route
          path="/"
          element={
            isParent ? (
              parentKidId ? (
                <Navigate to={`/parent/kids/${parentKidId}`} replace />
              ) : (
                <Navigate to="/select-kid" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/select-kid"
          element={
            <RequireRole role="Parent">
              <SelectKid />
            </RequireRole>
          }
        />

        {/* ✅ Option A route (kidId in URL) */}
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

        <Route
          path="/kid"
          element={
            <RequireRole role="Kid">
              {auth?.kidId ? (
                <KidDashboard kidId={auth.kidId} />
              ) : (
                <Navigate to="/select-kid" replace />
              )}
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
