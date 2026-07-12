import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const result = await prisma.$queryRaw`
      SELECT NOW() as time, current_database() as db
    ` as { time: Date; db: string }[];
    const row = result[0];
    return NextResponse.json({
      status: "connected",
      database: row?.db,
      serverTime: row?.time,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
