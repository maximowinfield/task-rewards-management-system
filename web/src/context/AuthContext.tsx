import { createContext, useContext, useEffect, useState } from "react";
import { setApiRoleToken, setApiToken, startKidSession } from "../api";


export type ActiveRole = "Parent" | "Kid";
export type UiMode = "Parent" | "Kid";


export interface AuthState {
  parentToken: string | null;
  kidToken: string | null;

  activeRole: ActiveRole | null; // ✅ SOURCE OF TRUTH
  uiMode: UiMode;                // ✅ UI ONLY

  selectedKidId?: string;
  selectedKidName?: string;

  kidId?: string;
  kidName?: string;
}


type AuthContextValue = {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;

  // ✅ helpers to switch modes properly
  enterParentMode: () => void;
  enterKidMode: (kidId: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "kidsrewards.auth.v1";

function emptyAuth(): AuthState {
  return {
    parentToken: null,
    kidToken: null,
    activeRole: null,
    uiMode: "Kid",
    selectedKidId: undefined,
    selectedKidName: undefined,
    kidId: undefined,
    kidName: undefined,
  };
}


function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAuth();

    const parsed = JSON.parse(raw) as Partial<AuthState>;

    const parentToken =
      typeof parsed.parentToken === "string" && parsed.parentToken.length > 0
        ? parsed.parentToken
        : null;

    const kidToken =
      typeof parsed.kidToken === "string" && parsed.kidToken.length > 0
        ? parsed.kidToken
        : null;

    // UI mode: keep if valid, else default based on parentToken existence
    const uiMode: UiMode =
      parsed.uiMode === "Parent" || parsed.uiMode === "Kid"
        ? parsed.uiMode
        : parentToken
          ? "Parent"
          : "Kid";

    // ✅ AUTH role: based ONLY on which token exists
    const activeRole: ActiveRole | null =
      kidToken ? "Kid" : parentToken ? "Parent" : null;

    return {
      parentToken,
      kidToken,
      activeRole,
      uiMode,
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
  const [auth, setAuth] = useState<AuthState>(() => {
    const initial = loadAuth();

    // ✅ Set axios token based on activeRole
    if (initial.activeRole) {
      setApiRoleToken(initial.activeRole, initial);
    } else {
      setApiToken(undefined);
    }

    return initial;
  });

  // ✅ Persist auth changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // ignore
    }
  }, [auth]);

  // ✅ Keep axios token in sync when role/tokens change
  useEffect(() => {
    if (auth.activeRole) {
      setApiRoleToken(auth.activeRole, auth);
    } else {
      setApiToken(undefined);
    }
  }, [auth.activeRole, auth.parentToken, auth.kidToken]);

const enterParentMode = () => {
  setAuth((prev) => ({
    ...prev,
    uiMode: "Parent",
    activeRole: prev.parentToken ? "Parent" : prev.activeRole, // keep safe
  }));
};



  const enterKidMode = async (kidId: string) => {
    // must have parent token to start kid session
    if (!auth.parentToken) throw new Error("Parent must be logged in to start a kid session.");

    // ✅ call API to get kid JWT
    const res = await startKidSession({ kidId });

    setAuth((prev) => ({
      ...prev,
      uiMode: "Kid",
      activeRole: "Kid",
      kidToken: res.token,            // ✅ store kid token
      selectedKidId: kidId,         // use the argument you passed in
      selectedKidName: res.displayName,
      kidId: res.kidId,
      kidName: res.displayName,
    }));
  };

  const logout = () => {
    setAuth(emptyAuth());
    localStorage.removeItem(STORAGE_KEY);
    setApiToken(undefined);
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, enterParentMode, enterKidMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
