import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET() {
  try {
    const result = await queryOne("SELECT NOW() as time, current_database() as db");
    return NextResponse.json({
      status: "connected",
      database: result?.db,
      serverTime: result?.time,
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
