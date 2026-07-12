import { NextResponse } from "next/server";
import { crudPrivilege } from "@/lib/route-auth";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";

// Vehicle schema
const vehicleSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  plateNumber: z.string().min(1).max(50),
  capacity: z.number().int().min(1),
  driverId: z.string().optional().nullable(),
});

// Driver schema
const driverSchema = z.object({
  userId: z.string().min(1),
  licenseNumber: z.string().min(1).max(100),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

// Route schema
const routeSchema = z.object({
  name: z.string().min(1).max(100),
  vehicleId: z.string().optional().nullable(),
  pickupTime: z.string().optional().nullable(),
  dropoffTime: z.string().optional().nullable(),
});

// Route Stop schema
const routeStopSchema = z.object({
  routeId: z.string().min(1),
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(255),
  order: z.number().int().min(0).default(0),
  pickupTime: z.string().optional().nullable(),
});

function isAuthorized(role?: string) {
  return role ? ["SCHOOL_ADMIN", "HEAD_OF_SCHOOL", "PRINCIPAL", "SUPER_ADMIN"].includes(role) : false;
}

export async function GET() {
  const session = await auth();
  const allowed = await crudPrivilege(session, "GET", "transport");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = "default";

  const [vehicles, drivers, routes, routeStops, availableUsers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { schoolId },
      include: { driver: { include: { user: true } }, routes: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.driver.findMany({
      where: { schoolId },
      include: { user: true, vehicles: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.route.findMany({
      where: { schoolId },
      include: { vehicle: true, stops: { orderBy: { order: "asc" } }, students: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.routeStop.findMany({
      where: { schoolId },
      orderBy: { order: "asc" },
    }),
    // Get users without drivers (available to be assigned as drivers)
    prisma.user.findMany({
      where: {
        schoolId,
        driver: null,
        isActive: true,
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    vehicles: vehicles.map((v: any) => ({
      id: v.id,
      name: v.name,
      type: v.type,
      plateNumber: v.plateNumber,
      capacity: v.capacity,
      isActive: v.isActive,
      driverId: v.driverId,
      driverName: v.driver?.user?.name ?? null,
      routeCount: v.routes.length,
    })),
    drivers: drivers.map((d: any) => ({
      id: d.id,
      userId: d.userId,
      name: d.user.name,
      email: d.user.email,
      licenseNumber: d.licenseNumber,
      phone: d.phone,
      address: d.address,
      isActive: d.isActive,
      vehicleCount: d.vehicles.length,
    })),
    routes: routes.map((r: any) => ({
      id: r.id,
      name: r.name,
      vehicleId: r.vehicleId,
      vehicleName: r.vehicle?.name ?? null,
      pickupTime: r.pickupTime,
      dropoffTime: r.dropoffTime,
      isActive: r.isActive,
      stopCount: r.stops.length,
      studentCount: r.students.length,
      stops: r.stops?.map((s: any) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        order: s.order,
        pickupTime: s.pickupTime,
      })) ?? [],
    })),
    routeStops: routeStops.map((s: any) => ({
      id: s.id,
      routeId: s.routeId,
      name: s.name,
      address: s.address,
      order: s.order,
      pickupTime: s.pickupTime,
    })),
    availableUsers,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const allowed = await crudPrivilege(session, "POST", "transport");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user || !isAuthorized(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const schoolId = "default";

  try {
    switch (body.type) {
      case "vehicle": {
        const parsed = vehicleSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;
        const vehicle = await prisma.vehicle.create({
          data: {
            schoolId,
            name: data.name.trim(),
            type: data.type.trim(),
            plateNumber: data.plateNumber.trim(),
            capacity: data.capacity,
            driverId: data.driverId || null,
          },
        });
        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "VEHICLE_CREATED",
          targetType: "Vehicle",
          targetId: vehicle.id,
          metadata: { vehicleId: vehicle.id, name: data.name, plateNumber: data.plateNumber },
        });
        return NextResponse.json({ vehicle }, { status: 201 });
      }

      case "driver": {
        const parsed = driverSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;
        const driver = await prisma.driver.create({
          data: {
            schoolId,
            userId: data.userId,
            licenseNumber: data.licenseNumber.trim(),
            phone: data.phone?.trim() || null,
            address: data.address?.trim() || null,
          },
        });
        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "DRIVER_CREATED",
          targetType: "Driver",
          targetId: driver.id,
          metadata: { driverId: driver.id, userId: data.userId, licenseNumber: data.licenseNumber },
        });
        return NextResponse.json({ driver }, { status: 201 });
      }

      case "route": {
        const parsed = routeSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;
        const route = await prisma.route.create({
          data: {
            schoolId,
            name: data.name.trim(),
            vehicleId: data.vehicleId || null,
            pickupTime: data.pickupTime || null,
            dropoffTime: data.dropoffTime || null,
          },
        });
        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "ROUTE_CREATED",
          targetType: "Route",
          targetId: route.id,
          metadata: { routeId: route.id, name: data.name },
        });
        return NextResponse.json({ route }, { status: 201 });
      }

      case "routeStop": {
        const parsed = routeStopSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        const data = parsed.data;
        const stop = await prisma.routeStop.create({
          data: {
            schoolId,
            routeId: data.routeId,
            name: data.name.trim(),
            address: data.address.trim(),
            order: data.order,
            pickupTime: data.pickupTime || null,
          },
        });
        await createAuditLog({
          schoolId,
          actorUserId: session.user.id,
          action: "ROUTE_STOP_CREATED",
          targetType: "RouteStop",
          targetId: stop.id,
          metadata: { stopId: stop.id, routeId: data.routeId, name: data.name },
        });
        return NextResponse.json({ stop }, { status: 201 });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
