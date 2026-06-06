import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "PRINCIPAL", "SUPER_ADMIN", "RECEPTIONIST"].includes(role) : false;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  try {
    // Get enquiries
    const enquiries = await prisma.enquiry.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    });

    // Get visitors
    const visitors = await prisma.visitor.findMany({
      where: { schoolId },
      orderBy: { checkInTime: "desc" },
    });

    // Get gate passes
    const gatePasses = await prisma.gatePass.findMany({
      where: { schoolId },
    });

    // Get complaints
    const complaints = await prisma.receptionComplaint.findMany({
      where: { schoolId },
    });

    // Get call logs
    const callLogs = await prisma.callLog.findMany({
      where: { schoolId },
    });

    // Get students for conversion tracking
    const students = await prisma.student.findMany({
      where: { schoolId },
      select: { id: true, createdAt: true },
    });

    // Calculate date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(thisMonthStart);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    // Conversion metrics
    const thisMonthStudents = students.filter(s => new Date(s.createdAt) >= thisMonthStart).length;
    const lastMonthStudents = students.filter(s => {
      const d = new Date(s.createdAt);
      return d >= lastMonthStart && d < thisMonthStart;
    }).length;
    const thisYearStudents = students.filter(s => new Date(s.createdAt) >= thisYearStart).length;

    // Enquiry conversion rate (students created after enquiries in same period)
    const resolvedEnquiries = enquiries.filter(e => e.stage === "Resolved" || e.stage === "Closed").length;
    const conversionRate = enquiries.length > 0 ? Math.round((resolvedEnquiries / enquiries.length) * 100) : 0;

    // Admissions pipeline
    const newEnquiriesThisMonth = enquiries.filter(e => {
      const d = new Date(e.createdAt);
      return d >= thisMonthStart && e.stage === "New";
    }).length;
    const inProgressThisMonth = enquiries.filter(e => {
      const d = new Date(e.createdAt);
      return d >= thisMonthStart && e.stage === "In Progress";
    }).length;

    // Calculate date ranges for weekly data
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const lastWeekStart = new Date(weekAgo);
    const lastWeekEnd = new Date(today);

    // Process enquiry data
    const enquiriesThisWeek = enquiries.filter(e => new Date(e.createdAt) >= weekAgo);
    const enquiriesLastWeek = enquiries.filter(e => {
      const d = new Date(e.createdAt);
      return d >= lastWeekStart && d < lastWeekEnd;
    });

    const byStage: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    enquiries.forEach(e => {
      byStage[e.stage] = (byStage[e.stage] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;
      bySource[e.source] = (bySource[e.source] || 0) + 1;
    });

    // Process visitor data
    const visitorsToday = visitors.filter(v => new Date(v.checkInTime) >= today);
    const visitorsThisMonth = visitors.filter(v => {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return new Date(v.checkInTime) >= monthAgo;
    });

    const byPurpose: Record<string, number> = {};
    visitors.forEach(v => {
      byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1;
    });

    // Calculate trend
    const trend = enquiriesLastWeek.length > 0
      ? Math.round(((enquiriesThisWeek.length - enquiriesLastWeek.length) / enquiriesLastWeek.length) * 100)
      : 0;

    // Calculate avg call duration
    const avgDuration = callLogs.length > 0
      ? Math.round(callLogs.reduce((sum, c) => sum + (c.duration || 0), 0) / callLogs.length)
      : 0;

    const data = {
      enquiries: {
        total: enquiries.length,
        byStage,
        byType,
        bySource,
        thisWeek: enquiriesThisWeek.length,
        lastWeek: enquiriesLastWeek.length,
        trend,
        conversionRate,
        newThisMonth: newEnquiriesThisMonth,
        inProgressThisMonth,
      },
      admissions: {
        thisMonthStudents,
        lastMonthStudents,
        thisYearStudents,
        studentGrowth: lastMonthStudents > 0 
          ? Math.round(((thisMonthStudents - lastMonthStudents) / lastMonthStudents) * 100) 
          : 0,
      },
      gatePasses: {
        total: gatePasses.length,
        active: gatePasses.filter(g => g.status === "ACTIVE").length,
        returned: gatePasses.filter(g => g.status === "RETURNED").length,
        overdue: gatePasses.filter(g => g.status === "OVERDUE").length,
      },
      complaints: {
        total: complaints.length,
        open: complaints.filter(c => c.status === "OPEN").length,
        resolved: complaints.filter(c => c.status === "RESOLVED").length,
        inProgress: complaints.filter(c => c.status === "IN_PROGRESS").length,
      },
      callLogs: {
        total: callLogs.length,
        today: callLogs.filter(c => new Date(c.createdAt) >= today).length,
        avgDuration,
      },
      visitors: {
        today: visitorsToday.length,
        checkedIn: visitors.filter(v => v.status === "CHECKED_IN").length,
        thisMonth: visitorsThisMonth.length,
        byPurpose,
      },
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
