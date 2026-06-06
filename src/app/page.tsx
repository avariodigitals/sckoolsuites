import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { roleDefaultRoute } from "@/lib/constants";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// Trigger deployment after DATABASE_URL fix
export default async function Home() {
  // Check if setup is complete first
  const school = await queryOne<{ is_setup: boolean }>(
    'SELECT is_setup FROM school WHERE id = $1',
    ['default']
  );
  
  const admin = await queryOne<{ id: string }>(
    `SELECT u.id FROM "user" u 
     JOIN role r ON u.role_id = r.id 
     WHERE r.name = 'SCHOOL_ADMIN' LIMIT 1`
  );

  // If setup not complete, redirect to setup
  if (!school?.is_setup || !admin) {
    redirect("/setup");
  }

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(roleDefaultRoute[session.user.role] ?? "/login");
}
