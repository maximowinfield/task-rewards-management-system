import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parentLogin } from "../api";

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  // ✅ Demo env (Vite)
  const demoEnabled = import.meta.env.VITE_DEMO_ENABLED === "true";
  const demoUser = import.meta.env.VITE_DEMO_USERNAME ?? "";
  const demoPass = import.meta.env.VITE_DEMO_PASSWORD ?? "";

  // ✅ Prefill only when demo is enabled
  const initialUsername = useMemo(() => (demoEnabled ? demoUser : ""), [demoEnabled, demoUser]);
  const initialPassword = useMemo(() => (demoEnabled ? demoPass : ""), [demoEnabled, demoPass]);

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);

  async function login() {
    try {
const data = await parentLogin({ username, password });


setAuth((prev) => ({
  ...prev,
  parentToken: data.token,
  activeRole: "Parent",
  uiMode: "Parent",
  selectedKidId: prev.selectedKidId,
  selectedKidName: prev.selectedKidName,
}));



      navigate("/parent/kids", { replace: true });
    } catch (err: any) {
      alert(err?.message || "Login failed");
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Parent Login</h2>

      {demoEnabled && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            background: "#f8fafc",
            color: "#0f172a",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Demo credentials</div>
          <div>
            <strong>Username:</strong> {demoUser}
          </div>
          <div>
            <strong>Password:</strong> {demoPass}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ padding: 10, borderRadius: 10, border: "1px solid #cbd5e1" }}
        />

        <button
          onClick={login}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Login
        </button>
      </div>
    </div>
  );
}
