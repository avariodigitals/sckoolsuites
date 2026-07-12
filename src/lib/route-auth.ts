import { auth } from "@/auth";
import { checkPrivilege, PrivilegeCode } from "@/lib/privileges";

/**
 * Enforce CRUD privileges on an API route.
 * GET -> <resource>.view
 * POST / PATCH / PUT / DELETE -> <resource>.manage
 */
export async function crudPrivilege(session: any, methodOrRequest: string | Request, resource: string) {
  if (!session?.user?.id) return false;
  const method = typeof methodOrRequest === "string" ? methodOrRequest : methodOrRequest.method;
  const code: PrivilegeCode = method === "GET"
    ? (`${resource}.view` as PrivilegeCode)
    : (`${resource}.manage` as PrivilegeCode);
  return checkPrivilege(session.user.id, code);
}

export async function requirePrivilege(code: PrivilegeCode) {
  const session = await auth();
  if (!session?.user?.id) {
    return { user: null, response: new Response("Unauthorized", { status: 401 }) };
  }
  const allowed = await checkPrivilege(session.user.id, code);
  if (!allowed) {
    return { user: session.user, response: new Response("Forbidden", { status: 403 }) };
  }
  return { user: session.user, response: null };
}
