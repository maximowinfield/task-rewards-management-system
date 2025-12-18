import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { parentLogin, setApiToken } from "../api";

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

async function login() {
  try {
    const data = await parentLogin({ username, password });

    setAuth((prev: any) => ({
      ...prev,
      parentToken: data.token,
      activeRole: "Parent",

      // optional: if switching accounts, clear kid mode
      kidToken: null,
      kidId: undefined,
      kidName: undefined,
    }));

    navigate("/parent/kids", { replace: true });
  } catch (err: any) {
    alert(err?.message || "Login failed");
  }
}


  return (
    <div>
      <h2>Parent Login</h2>
      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={login}>Login</button>
    </div>
  );
}
