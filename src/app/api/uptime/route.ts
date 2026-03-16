import { NextRequest, NextResponse } from "next/server";
import { checkUptime } from "@/lib/cloudflare-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const urlsParam = searchParams.get("urls");

  if (!urlsParam) {
    return NextResponse.json(
      { error: "Missing urls parameter (comma-separated)" },
      { status: 400 }
    );
  }

  const urls = urlsParam.split(",").map((u) => u.trim()).filter(Boolean);

  try {
    const results = await Promise.all(urls.map(checkUptime));
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check uptime" },
      { status: 500 }
    );
  }
}
