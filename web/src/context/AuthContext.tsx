import { createContext, useContext, useEffect, useState } from "react";
import { setApiToken } from "../api";

type Role = "Parent" | "Kid";

export interface AuthState {
  parentToken: string | null;
  kidToken: string | null;
  activeRole: Role | null;

  kidId?: string;
  kidName?: string;

  // ✅ Parent can “select a kid” without becoming Kid
  selectedKidId?: string;
  selectedKidName?: string;
}

type AuthContextValue = {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    parentToken: null,
    kidToken: null,
    activeRole: null,
    kidId: undefined,
    kidName: undefined,
    selectedKidId: undefined,
    selectedKidName: undefined,
  });

  // ✅ Always point Axios at the token for the active role
  useEffect(() => {
    const token =
      auth.activeRole === "Parent"
        ? auth.parentToken
        : auth.activeRole === "Kid"
        ? auth.kidToken
        : null;

    setApiToken(token ?? undefined);
  }, [auth.activeRole, auth.parentToken, auth.kidToken]);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

