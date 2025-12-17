import { Link, Routes, Route, Navigate } from "react-router-dom";
import KidsRewardsPage from "./pages/KidsRewardsPage";
import TodosPage from "./pages/TodosPage";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 860, margin: "20px auto 0", padding: "0 16px", display: "flex", gap: 12 }}>
        <Link to="/kids" style={{ color: "inherit" }}>Kids + Rewards</Link>
        <Link to="/todos" style={{ color: "inherit" }}>Todos</Link>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/kids" replace />} />
        <Route path="/kids" element={<KidsRewardsPage />} />
        <Route path="/todos" element={<TodosPage />} />
        <Route path="*" element={<Navigate to="/kids" replace />} />
      </Routes>
    </div>
  );
}
