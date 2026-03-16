import { NextRequest, NextResponse } from "next/server";
import { getZoneAnalytics } from "@/lib/cloudflare-graphql";

export async function GET(request: NextRequest) {
  const apiToken = process.env.CF_API_TOKEN;

  if (!apiToken) {
    return NextResponse.json(
      { error: "Cloudflare credentials not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const zoneTag = searchParams.get("zoneTag");
  const since = searchParams.get("since");
  const until = searchParams.get("until");

  if (!zoneTag) {
    return NextResponse.json(
      { error: "Missing zoneTag parameter" },
      { status: 400 }
    );
  }

  if (!since || !until) {
    return NextResponse.json(
      { error: "Missing since/until parameters" },
      { status: 400 }
    );
  }

  try {
    const data = await getZoneAnalytics(apiToken, zoneTag, since, until);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
