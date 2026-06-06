import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { saveSetupWizardStatus } from "@/lib/setup-wizard";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL"].includes(role) : false;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    // Check if school has required data
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, email: true }
    });

    if (!school?.name || !school?.email) {
      const missingFields = [];
      if (!school?.name) missingFields.push("School Name");
      if (!school?.email) missingFields.push("School Email");
      return NextResponse.json(
        { error: `Please complete the School Profile step before activation. Missing required field(s): ${missingFields.join(" and ")}.` },
        { status: 400 }
      );
    }

    // Check for active session/term
    const activeSession = await prisma.schoolSetting.findFirst({
      where: { schoolId, key: "active_session_id" }
    });
    const activeTerm = await prisma.schoolSetting.findFirst({
      where: { schoolId, key: "active_term_id" }
    });

    if (!activeSession?.value || !activeTerm?.value) {
      return NextResponse.json(
        { error: "Please complete the Academic Session step before activation. You must create at least one session and term, then select the current ones from the dropdowns." },
        { status: 400 }
      );
    }

    // Activate the school
    await prisma.school.update({
      where: { id: schoolId },
      data: { isActive: true }
    });

    // Mark setup as complete
    await saveSetupWizardStatus(schoolId, {
      setupCompleted: true,
      lastCompletedStep: 2, // 0=school-profile, 1=academic-setup, 2=review-activate
      completedSteps: ["school-profile", "academic-setup", "review-activate"],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: "School activated successfully" 
    });
  } catch (error) {
    console.error("Failed to activate school:", error);
    return NextResponse.json(
      { error: "Failed to activate school" },
      { status: 500 }
    );
  }
}
