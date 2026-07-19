import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const download = request.nextUrl.searchParams.get("download");
  const forcedType = request.nextUrl.searchParams.get("type");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!url.includes("cloudinary.com")) {
    if (download) {
      return NextResponse.redirect(url, { headers: { "Content-Disposition": "attachment" } });
    }
    return NextResponse.redirect(url);
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const upstreamContentType = upstream.headers.get("content-type") || "";

    // Determine the correct content type:
    // 1. Explicit ?type=pdf param from caller
    // 2. URL contains .pdf
    // 3. Upstream content-type includes pdf
    // 4. Upstream returns octet-stream (Cloudinary raw uploads) → assume PDF
    // 5. Otherwise use upstream content-type
    const isPdf =
      forcedType === "pdf" ||
      url.toLowerCase().includes(".pdf") ||
      upstreamContentType.includes("pdf") ||
      upstreamContentType === "application/octet-stream" ||
      upstreamContentType === "binary/octet-stream";

    const contentType = isPdf
      ? "application/pdf"
      : (upstreamContentType || "application/octet-stream");

    // Buffer the response body to avoid streaming/encoding issues
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentLength = buffer.length;

    // Extract filename from URL for download mode
    let filename = "document.pdf";
    try {
      const urlPath = new URL(url).pathname;
      const lastSeg = urlPath.split("/").pop();
      if (lastSeg && lastSeg.includes(".")) {
        filename = decodeURIComponent(lastSeg);
      }
    } catch {}

    const disposition = download
      ? `attachment; filename="${filename}"`
      : "inline";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(contentLength),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    };

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
