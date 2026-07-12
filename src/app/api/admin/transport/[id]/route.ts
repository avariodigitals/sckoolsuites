import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { parseNumericId } from "@/lib/id-helpers";

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "DELETE", "transport");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let parsedId: number;
  try {
    parsedId = parseNumericId(id, "transport id");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid transport id";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const schoolId = "default";

  // Get type from query param
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (!type || !["vehicle", "driver", "route", "routeStop"].includes(type)) {
    return NextResponse.json({ error: "Invalid or missing type" }, { status: 400 });
  }

  try {
    let action = "";
    let title = "";

    switch (type) {
      case "vehicle": {
        const vehicle = await prisma.vehicle.findFirst({
          where: { id: parsedId, schoolId },
        });
        if (!vehicle) {
          return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
        }
        title = vehicle.name;
        await prisma.vehicle.delete({ where: { id: parsedId } });
        action = "VEHICLE_DELETED";
        break;
      }

      case "driver": {
        const driver = await prisma.driver.findFirst({
          where: { id: parsedId, schoolId },
          include: { user: true },
        });
        if (!driver) {
          return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }
        title = driver.user.name;
        await prisma.driver.delete({ where: { id: parsedId } });
        action = "DRIVER_DELETED";
        break;
      }

      case "route": {
        const route = await prisma.route.findFirst({
          where: { id: parsedId, schoolId },
        });
        if (!route) {
          return NextResponse.json({ error: "Route not found" }, { status: 404 });
        }
        title = route.name;
        await prisma.route.delete({ where: { id: parsedId } });
        action = "ROUTE_DELETED";
        break;
      }

      case "routeStop": {
        const stop = await prisma.routeStop.findFirst({
          where: { id: parsedId, route: { schoolId } },
        });
        if (!stop) {
          return NextResponse.json({ error: "Stop not found" }, { status: 404 });
        }
        title = stop.name;
        await prisma.routeStop.delete({ where: { id: parsedId } });
        action = "ROUTE_STOP_DELETED";
        break;
      }
    }

    await createAuditLog({
      schoolId,
      actorUserId: session.user.id,
      action,
      targetType: type === "routeStop" ? "RouteStop" : type.charAt(0).toUpperCase() + type.slice(1),
      targetId: String(parsedId),
      metadata: { [type === "routeStop" ? "stopId" : `${type}Id`]: parsedId, name: title },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
