import { NextRequest, NextResponse } from "next/server";
import { getUptimeHistory } from "@/lib/uptime-kv";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  const siteName = request.nextUrl.searchParams.get("site");

  if (!siteName) {
    return NextResponse.json({ error: "Missing site parameter" }, { status: 400 });
  }

  try {
    const { env } = getCloudflareContext();
    const kv = env.UPTIME_KV;

    if (!kv) {
      return NextResponse.json({ error: "KV not configured" }, { status: 500 });
    }

    const history = await getUptimeHistory(kv, siteName);
    return NextResponse.json(history ?? { checks: [], uptimePercentage: 100, totalChecks: 0, totalUp: 0, totalDown: 0, lastIncident: null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch uptime history" },
      { status: 500 }
    );
  }
}
