import { NextResponse } from "next/server";
import { RoleType } from "@/lib/db-types";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// This endpoint wipes all data except admin users and school records
// Only SUPER_ADMIN can access this

export async function POST() {
  const session = await auth();
  
  // Only SUPER_ADMIN can perform cleanup
  if (!session?.user?.role || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Super Admin only" }, { status: 401 });
  }

  try {
    // Delete in reverse dependency order (child tables first)
    
    // 1. Financial data
    await prisma.receipt.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    
    // 2. Fee profiling data
    await prisma.feeProfileItem.deleteMany();
    await prisma.feeProfileClass.deleteMany();
    await prisma.feeProfileArm.deleteMany();
    await prisma.feeProfile.deleteMany();
    await prisma.feeComponent.deleteMany();
    await prisma.feeItem.deleteMany();
    await prisma.feeGroup.deleteMany();
    
    // 3. Academic/Attendance data
    await prisma.score.deleteMany();
    await prisma.result.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.onlineClass.deleteMany();
    
    // 4. Communication data
    await prisma.announcement.deleteMany();
    await prisma.parentMessage.deleteMany();
    await prisma.parentComplaint.deleteMany();
    
    // 5. Transport data
    await prisma.routeStop.deleteMany();
    await prisma.route.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.driver.deleteMany();
    
    // 6. Reception data
    await prisma.visitor.deleteMany();
    
    // 7. Settings and config
    await prisma.schoolSetting.deleteMany();
    await prisma.schoolConfigVersion.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.invoiceContestAudit.deleteMany();
    await prisma.paymentProof.deleteMany();
    
    // 8. Class structure
    await prisma.classArm.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.class.deleteMany();
    await prisma.classGroup.deleteMany();
    
    // 9. Academic terms/sessions
    await prisma.term.deleteMany();
    await prisma.session.deleteMany();
    
    // 10. Delete non-admin users only
    // Keep: SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, ACCOUNTANT
    // Delete: TEACHER, PARENT, STUDENT
    const adminRoles: RoleType[] = [RoleType.SUPER_ADMIN, RoleType.SCHOOL_ADMIN, RoleType.PRINCIPAL, RoleType.ACCOUNTANT];
    
    // Get admin role IDs
    const adminRoleRecords = await prisma.role.findMany({
      where: { name: { in: adminRoles } },
      select: { id: true, name: true },
    });
    
    const adminRoleIds = adminRoleRecords.map((r) => r.id);
    
    // Delete students first (they have users)
    await prisma.student.deleteMany();
    
    // Delete parents (they have users)
    await prisma.parent.deleteMany();
    
    // Delete teachers (they have users)
    await prisma.teacher.deleteMany();
    
    // Delete non-admin users
    await prisma.user.deleteMany({
      where: {
        roleId: {
          notIn: adminRoleIds,
        },
      },
    });
    
    // Delete school branding (will be recreated)
    await prisma.schoolBranding.deleteMany();
    
    // Get remaining data counts for verification
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.school.count(),
      prisma.role.count(),
      prisma.student.count(),
      prisma.parent.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.feeGroup.count(),
      prisma.feeProfile.count(),
      prisma.invoice.count(),
    ]);

    return NextResponse.json({
      success: true,
      message: "System cleaned successfully. Only admin users and school records preserved.",
      stats: {
        users: stats[0],
        schools: stats[1],
        roles: stats[2],
        students: stats[3],
        parents: stats[4],
        teachers: stats[5],
        classes: stats[6],
        feeGroups: stats[7],
        feeProfiles: stats[8],
        invoices: stats[9],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint to check current data stats before cleanup
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.role || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized - Super Admin only" }, { status: 401 });
  }

  try {
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.school.count(),
      prisma.student.count(),
      prisma.parent.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.classArm.count(),
      prisma.subject.count(),
      prisma.session.count(),
      prisma.term.count(),
      prisma.feeGroup.count(),
      prisma.feeItem.count(),
      prisma.feeProfile.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
      prisma.announcement.count(),
    ]);

    return NextResponse.json({
      stats: {
        users: stats[0],
        schools: stats[1],
        students: stats[2],
        parents: stats[3],
        teachers: stats[4],
        classes: stats[5],
        classArms: stats[6],
        subjects: stats[7],
        sessions: stats[8],
        terms: stats[9],
        feeGroups: stats[10],
        feeItems: stats[11],
        feeProfiles: stats[12],
        invoices: stats[13],
        payments: stats[14],
        announcements: stats[15],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
