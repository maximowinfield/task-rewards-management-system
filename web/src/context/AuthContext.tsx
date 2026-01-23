import { createContext, useContext, useEffect, useState } from "react";
import { setApiRoleToken, setApiToken, startKidSession } from "../api";

// ============================================================
// Auth Context (Frontend)
// - Central place to store auth/session state for Parent + Kid.
// - Persists tokens in localStorage so refresh doesn't log you out.
// - Keeps the API client (axios/fetch wrapper) in sync with the active token.
// ============================================================

// ActiveRole = what the API should treat you as (real auth role)
export type ActiveRole = "Parent" | "Kid";

// UiMode = what the UI is currently displaying (visual mode)
export type UiMode = "Parent" | "Kid";

// ============================================================
// AuthState: single source of truth for session/tokens
// - parentToken: JWT used for parent-only endpoints
// - kidToken: JWT used for kid-only endpoints
// - activeRole: which token we are currently using for API requests (SOURCE OF TRUTH)
// - uiMode: which UI we are showing (UI ONLY)
// - selectedKid*: which kid the parent selected in the UI
// - kidId/kidName: info for current kid session
// ============================================================
export interface AuthState {
  parentToken: string | null;
  kidToken: string | null;

  activeRole: ActiveRole | null; // ✅ SOURCE OF TRUTH (drives API auth)
  uiMode: UiMode;                // ✅ UI ONLY (drives what components render)

  selectedKidId?: string;
  selectedKidName?: string;

  kidId?: string;
  kidName?: string;
}

// ============================================================
// AuthContextValue: what components can access via useAuth()
// - auth: current session state
// - setAuth: state setter (rarely used directly; prefer helpers)
// - enterParentMode: switch UI back to parent view safely
// - enterKidMode: starts a kid session by calling backend + storing kid JWT
// - logout: clears tokens + local storage + api header
// ============================================================
type AuthContextValue = {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;

  // ✅ helpers to switch modes properly
  enterParentMode: () => void;
  enterKidMode: (kidId: string) => Promise<void>;
  logout: () => void;
};

// The React Context itself (starts as null until provider mounts)
const AuthContext = createContext<AuthContextValue | null>(null);

// localStorage key for persistence across refresh / tab reopen
const STORAGE_KEY = "kidsrewards.auth.v1";

// ============================================================
// emptyAuth()
// - Returns a clean "logged out" state.
// - uiMode defaults to Parent (so the app shows the parent UI by default).
// ============================================================
function emptyAuth(): AuthState {
  return {
    parentToken: null,
    kidToken: null,
    activeRole: null,
    uiMode: "Parent",
    selectedKidId: undefined,
    selectedKidName: undefined,
    kidId: undefined,
    kidName: undefined,
  };
}

// ============================================================
// loadAuth()
// - Reads auth state from localStorage on initial load.
// - Validates token strings (must be non-empty).
// - Derives activeRole ONLY from tokens (kidToken > parentToken).
// - Keeps uiMode if valid; otherwise picks a safe default.
// ============================================================
function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAuth();

    const parsed = JSON.parse(raw) as Partial<AuthState>;

    // Validate parent token
    const parentToken =
      typeof parsed.parentToken === "string" && parsed.parentToken.length > 0
        ? parsed.parentToken
        : null;

    // Validate kid token
    const kidToken =
      typeof parsed.kidToken === "string" && parsed.kidToken.length > 0
        ? parsed.kidToken
        : null;

    // UI mode is "display preference" (not security)
    // Keep it if it's valid, else pick a default.
    const uiMode: UiMode =
      parsed.uiMode === "Parent" || parsed.uiMode === "Kid"
        ? parsed.uiMode
        : parentToken
          ? "Parent"
          : "Kid";

    // ✅ Active role is AUTH (security): determined by which token exists.
    // Kid token wins if both exist, because kid mode requires kid JWT.
    const activeRole: ActiveRole | null =
      kidToken ? "Kid" : parentToken ? "Parent" : null;

    // Return hydrated state
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
    // If parsing fails, wipe storage and fall back to empty state
    localStorage.removeItem(STORAGE_KEY);
    return emptyAuth();
  }
}

// ============================================================
// AuthProvider
// - Wraps your app so any component can call useAuth().
// - Initializes state from localStorage.
// - Keeps localStorage and API auth headers in sync.
// ============================================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize auth once (lazy initializer runs only on first render)
  const [auth, setAuth] = useState<AuthState>(() => {
    const initial = loadAuth();

    // ✅ Sync API token immediately on startup (refresh safe)
    // setApiRoleToken chooses kidToken or parentToken based on role.
    if (initial.activeRole) {
      setApiRoleToken(initial.activeRole, initial);
    } else {
      // No role = no Authorization header
      setApiToken(undefined);
    }

    return initial;
  });

  // ------------------------------------------------------------
  // Persist auth changes to localStorage
  // - Runs whenever auth object changes
  // - Makes refresh / reopen keep session
  // ------------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // Ignore storage errors (private mode / quota issues)
    }
  }, [auth]);

  // ------------------------------------------------------------
  // Keep API Authorization header in sync with tokens/role changes
  // - If activeRole changes, swap which JWT is attached to requests.
  // - This prevents "wrong token" bugs (Parent UI accidentally using Kid JWT).
  // ------------------------------------------------------------
  useEffect(() => {
    if (auth.activeRole) {
      setApiRoleToken(auth.activeRole, auth);
    } else {
      setApiToken(undefined);
    }
  }, [auth.activeRole, auth.parentToken, auth.kidToken]);

  // ============================================================
  // enterParentMode()
  // - Switches UI to Parent view.
  // - Also ensures activeRole is Parent if we have a parentToken.
  // - We DO NOT delete kidToken here; we just stop using it.
  //   (This allows fast switching back/forth if you want that behavior.)
  // ============================================================
  const enterParentMode = () => {
    setAuth((prev) => ({
      ...prev,
      uiMode: "Parent",
      activeRole: prev.parentToken ? "Parent" : prev.activeRole, // keep safe if no parent token
    }));
  };

  // ============================================================
  // enterKidMode(kidId)
  // - Requires parentToken because only parents can start kid sessions.
  // - Calls backend /kid-session to mint a Kid JWT.
  // - Stores kidToken + kid identity info.
  // - Sets activeRole to Kid so API requests use kidToken.
  // ============================================================
  const enterKidMode = async (kidId: string) => {
    // Parent must be logged in to request a kid session
    if (!auth.parentToken) {
      throw new Error("Parent must be logged in to start a kid session.");
    }

    // ✅ Backend returns: { token, role, kidId, displayName }
    const res = await startKidSession({ kidId });

    setAuth((prev) => ({
      ...prev,
      uiMode: "Kid",
      activeRole: "Kid",
      kidToken: res.token,         // ✅ store kid JWT for future requests
      selectedKidId: kidId,        // store the kid you selected in the UI
      selectedKidName: res.displayName,
      kidId: res.kidId,
      kidName: res.displayName,
    }));
  };

  // ============================================================
  // logout()
  // - Clears all auth state
  // - Removes localStorage entry
  // - Removes Authorization header from API client
  // ============================================================
  const logout = () => {
    setAuth(emptyAuth());
    localStorage.removeItem(STORAGE_KEY);
    setApiToken(undefined);
  };

  // Provide auth state + helpers to the entire app tree
  return (
    <AuthContext.Provider value={{ auth, setAuth, enterParentMode, enterKidMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// useAuth()
// - Convenience hook so components can do:
//     const { auth, enterKidMode, logout } = useAuth();
// - Throws if used outside AuthProvider (helps catch setup bugs).
// ============================================================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
