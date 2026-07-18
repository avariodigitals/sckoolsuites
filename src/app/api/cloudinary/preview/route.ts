import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const download = request.nextUrl.searchParams.get("download");

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

    // Cloudinary serves raw uploads with application/octet-stream,
    // which browsers treat as a download. Force application/pdf for PDFs.
    const isPdf = url.toLowerCase().endsWith(".pdf") ||
                  url.toLowerCase().includes(".pdf") ||
                  upstream.headers.get("content-type")?.includes("pdf");
    const contentType = isPdf
      ? "application/pdf"
      : (upstream.headers.get("content-type") || "application/octet-stream");

    const contentLength = upstream.headers.get("content-length");

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
