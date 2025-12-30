import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parentLogin } from "../api";

export default function Login(): JSX.Element {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  // ✅ Demo env (Vite)
  const demoEnabled = import.meta.env.VITE_DEMO_ENABLED === "true";
  const demoUser = import.meta.env.VITE_DEMO_USERNAME ?? "";
  const demoPass = import.meta.env.VITE_DEMO_PASSWORD ?? "";

  // ✅ Prefill only when demo is enabled
  const initialUsername = useMemo(
    () => (demoEnabled ? demoUser : ""),
    [demoEnabled, demoUser]
  );
  const initialPassword = useMemo(
    () => (demoEnabled ? demoPass : ""),
    [demoEnabled, demoPass]
  );

  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState(initialPassword);

  async function login() {
    try {
      // ✅ Mobile-proof: avoid hidden spaces / autocap issues
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      const data = await parentLogin({
        username: cleanUsername,
        password: cleanPassword,
      });

      setAuth((prev) => {
        const next = {
          ...prev,
          parentToken: data.token,
          activeRole: "Parent" as const,
          uiMode: "Parent" as const,

          // keep existing selection if present
          selectedKidId: prev.selectedKidId,
          selectedKidName: prev.selectedKidName,
        };

        // ✅ Route based on updated state (not stale auth)
        const target = next.selectedKidId
          ? `/parent/kids/${next.selectedKidId}`
          : "/parent/select-kid";

        queueMicrotask(() => navigate(target, { replace: true }));

        return next;
      });
    } catch (err: any) {
      // ✅ Better debugging for 401s (especially on mobile)
      const status = err?.response?.status;
      const body = err?.response?.data;

      alert(
        `Login failed\n\nstatus: ${status ?? "unknown"}\nAPI_URL: ${
          import.meta.env.VITE_API_URL || "/api"
        }\n\n${
          typeof body === "string" ? body : JSON.stringify(body, null, 2)
        }`
      );
    }
  }

  return (
    <div
      style={{
        fontFamily: "system-ui",
        maxWidth: 420,
        margin: "60px auto",
        padding: 16,
      }}
    >
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
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Demo credentials
          </div>
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
          }}
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
