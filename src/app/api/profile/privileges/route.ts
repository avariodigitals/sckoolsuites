import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserPrivileges } from "@/lib/privileges";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const privileges = await getUserPrivileges(session.user.id);
  return NextResponse.json({ privileges });
}
