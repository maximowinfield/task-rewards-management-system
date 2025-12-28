export type Role = "Parent" | "Kid";

export function mapPathForRole(pathname: string, targetRole: Role): string | null {
  if (targetRole === "Parent" && pathname.startsWith("/parent/")) return pathname;
  if (targetRole === "Kid" && pathname.startsWith("/kid/")) return pathname;

  if (targetRole === "Kid") {
    if (pathname.startsWith("/parent/kids")) return pathname.replace("/parent/kids", "/kid/kids");
    if (pathname.startsWith("/parent/todos")) return pathname.replace("/parent/todos", "/kid/todos");
  }

  if (targetRole === "Parent") {
    if (pathname.startsWith("/kid/kids")) return pathname.replace("/kid/kids", "/parent/kids");
    if (pathname.startsWith("/kid/todos")) return pathname.replace("/kid/todos", "/parent/todos");
  }

  return null;
}
