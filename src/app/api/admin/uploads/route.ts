import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sanitizeFolderPath(input: string) {
  return input
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9_-]/g, ""))
    .filter(Boolean)
    .join("/");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || !["SCHOOL_ADMIN", "PRINCIPAL"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = sanitizeFolderPath(String(formData.get("folder") ?? ""));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPG, and WEBP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File must be 5MB or less" }, { status: 400 });
  }

  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;
  const relativeDir = folder
    ? path.join("uploads", "default", folder)
    : path.join("uploads", "default");
  const absoluteDir = path.join(process.cwd(), "public", relativeDir);
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(absolutePath, Buffer.from(bytes));

  const publicUrl = `/${relativeDir.replace(/\\/g, "/")}/${fileName}`;
  return NextResponse.json({ ok: true, url: publicUrl });
}
