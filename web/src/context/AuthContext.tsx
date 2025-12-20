import { createContext, useContext, useEffect, useState } from "react";
import { setApiToken } from "../api";

type Role = "Parent" | "Kid";

export interface AuthState {
  parentToken: string | null;
  activeRole: Role | null;

  kidId?: string;
  kidName?: string;

  selectedKidId?: string;
  selectedKidName?: string;
}

type AuthContextValue = {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "kidsrewards.auth.v1";

// ✅ Single token for API calls (Kid mode is UI-only)
function getApiToken(a: AuthState) {
  return a.parentToken ?? undefined;
}

function emptyAuth(): AuthState {
  return {
    parentToken: null,
    activeRole: null,
    kidId: undefined,
    kidName: undefined,
    selectedKidId: undefined,
    selectedKidName: undefined,
  };
}

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAuth();

    const parsed = JSON.parse(raw) as Partial<AuthState>;

    // ✅ If activeRole is missing in older saved data, default sensibly
    const activeRole: Role | null =
      (parsed.activeRole as Role | null) ??
      (parsed.parentToken ? "Parent" : null);

    return {
      parentToken: parsed.parentToken ?? null,
      activeRole,
      kidId: parsed.kidId,
      kidName: parsed.kidName,
      selectedKidId: parsed.selectedKidId,
      selectedKidName: parsed.selectedKidName,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return emptyAuth();
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ Load auth AND immediately set axios token during initialization
  const [auth, setAuth] = useState<AuthState>(() => {
    const initial = loadAuth();
    setApiToken(getApiToken(initial));
    return initial;
  });

  // ✅ Persist auth changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // ignore storage errors
    }
  }, [auth]);

  // ✅ Keep axios token in sync when token changes
  useEffect(() => {
    setApiToken(getApiToken(auth));
  }, [auth.parentToken]);

  return <AuthContext.Provider value={{ auth, setAuth }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
