import { Outlet, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { auth } = useAuth();
  const base = auth?.activeRole === "Kid" ? "/kid" : "/parent";

  return (
    <div>
      {/* simple top nav */}
      <div style={{ display: "flex", gap: 12, padding: 12 }}>
        <Link to={`${base}/kids`}>Kids</Link>
        <Link to={`${base}/todos`}>Todos</Link>
      </div>

      <Outlet />
    </div>
  );
}
