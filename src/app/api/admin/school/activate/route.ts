import { NextResponse } from "next/server";
import { requirePrivilege } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const user = await requirePrivilege("settings.manage");
    
    // Get the school (should already be created)
    const school = await prisma.school.findFirst();
    if (!school) {
      return NextResponse.json(
        { error: "No school found" },
        { status: 400 }
      );
    }

    // Find the current session and term
    const currentSession = await prisma.session.findFirst({
      where: { schoolId: school.id, isCurrent: true },
    });
    const currentTerm = await prisma.term.findFirst({
      where: { schoolId: school.id, isCurrent: true },
    });

    // Set active session and term settings
    if (currentSession) {
      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId: school.id, key: "active_session_id" } },
        update: { value: String(currentSession.id) },
        create: { schoolId: school.id, key: "active_session_id", value: String(currentSession.id) },
      });
    }

    if (currentTerm) {
      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId: school.id, key: "active_term_id" } },
        update: { value: String(currentTerm.id) },
        create: { schoolId: school.id, key: "active_term_id", value: String(currentTerm.id) },
      });
    }

    // Set user context
    if (currentSession && currentTerm) {
      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId: school.id, key: `user_context_session_${user.id}` } },
        update: { value: String(currentSession.id) },
        create: { schoolId: school.id, key: `user_context_session_${user.id}`, value: String(currentSession.id) },
      });
      await prisma.schoolSetting.upsert({
        where: { schoolId_key: { schoolId: school.id, key: `user_context_term_${user.id}` } },
        update: { value: String(currentTerm.id) },
        create: { schoolId: school.id, key: `user_context_term_${user.id}`, value: String(currentTerm.id) },
      });
    }

    // Mark school as active (it already is by default, but this confirms)
    await prisma.school.update({
      where: { id: school.id },
      data: { isActive: true },
    });

    return NextResponse.json({ 
      success: true,
      message: "School activated successfully",
      session: currentSession?.id,
      term: currentTerm?.id,
    });
  } catch (error) {
    console.error("Error activating school:", error);
    return NextResponse.json(
      { error: "Failed to activate school" },
      { status: 500 }
    );
  }
}
