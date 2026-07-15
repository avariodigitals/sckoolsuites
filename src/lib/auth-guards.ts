import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleDefaultRoute } from "@/lib/constants";
import { checkPrivilege, type PrivilegeCode } from "@/lib/privileges";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/change-password");
  return session.user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) {
    const fallback = roleDefaultRoute[user.role] ?? "/login";
    redirect(fallback);
  }
  return user;
}

export async function requirePrivilege(code: PrivilegeCode) {
  const user = await requireUser();
  const allowed = await checkPrivilege(user.id, code);
  if (!allowed) {
    const fallback = roleDefaultRoute[user.role] ?? "/login";
    redirect(fallback);
  }
  return user;
}

export async function withPrivilege(code: PrivilegeCode, action: () => Promise<any>) {
  const user = await requireUser();
  const allowed = await checkPrivilege(user.id, code);
  if (!allowed) return null;
  return action();
}
