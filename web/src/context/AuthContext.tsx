import { createContext, useContext, useState, useEffect } from "react";
import { setApiToken } from "../api";

type Role = "Parent" | "Kid";

interface AuthState {
  token: string | null;
  role: Role | null;
  kidName?: string;
}

interface AuthContextType {
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    role: null,
  });

  // 🔑 Keep Axios Authorization header in sync with auth state
  useEffect(() => {
    setApiToken(auth.token ?? undefined);
  }, [auth.token]);

  function logout() {
    setAuth({ token: null, role: null });
    setApiToken(undefined);
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
