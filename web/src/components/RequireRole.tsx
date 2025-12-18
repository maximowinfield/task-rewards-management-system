import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Role = "Parent" | "Kid";

export default function RequireRole({
  role,
  allow,
  children,
}: {
  role?: Role;
  allow?: Role[];
  children: JSX.Element;
}) {
  const { auth } = useAuth();
  const allowed: Role[] = allow ?? (role ? [role] : ["Parent", "Kid"]);

  const hasParent = !!auth?.parentToken;
  const hasKid = !!auth?.kidToken;

  // If route allows Parent and we have parentToken -> OK
  if (allowed.includes("Parent") && hasParent) return children;

  // If route allows Kid and we have kidToken -> OK
  if (allowed.includes("Kid") && hasKid) return children;

  return <Navigate to="/login" replace />;
}
