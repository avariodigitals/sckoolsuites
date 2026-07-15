import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!url.includes("cloudinary.com")) {
    return NextResponse.redirect(url);
  }

  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split("/");

    const uploadIdx = pathSegments.findIndex((seg) => seg === "upload");
    if (uploadIdx === -1) {
      return NextResponse.redirect(url);
    }

    let resourceType = "image";
    if (uploadIdx > 0 && pathSegments[uploadIdx - 1] === "raw") {
      resourceType = "raw";
    } else if (uploadIdx > 0 && pathSegments[uploadIdx - 1] === "video") {
      resourceType = "video";
    }

    const afterUpload = pathSegments.slice(uploadIdx + 1);

    const versionIdx = afterUpload.findIndex((seg) => /^v\d+$/.test(seg));

    const publicIdSegments = afterUpload.filter(
      (seg, idx) =>
        !(versionIdx !== -1 && idx === versionIdx) &&
        seg !== "upload" &&
        !seg.startsWith("v") &&
        seg !== ""
    );

    const lastSegment = publicIdSegments[publicIdSegments.length - 1] ?? "";
    const format = parsed.pathname.endsWith(".pdf")
      ? "pdf"
      : lastSegment.includes(".")
        ? lastSegment.split(".").pop()
        : undefined;

    const basePublicId = lastSegment.includes(".")
      ? lastSegment.split(".").slice(0, -1).join(".")
      : lastSegment;

    publicIdSegments[publicIdSegments.length - 1] = basePublicId;
    const publicId = publicIdSegments.join("/");

    const signedUrl = cloudinary.utils.private_download_url(publicId, format || "raw", {
      resource_type: resourceType as "image" | "raw" | "video",
      type: "upload",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    const upstream = await fetch(signedUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Cloudinary returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/pdf";
    const contentLength = upstream.headers.get("content-length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
