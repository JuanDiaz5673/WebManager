import { NextResponse } from "next/server";
import { getProjects, getDeployments, getZones, checkUptime } from "@/lib/cloudflare-api";
import { getZoneAnalytics } from "@/lib/cloudflare-graphql";
import { getUptimeHistory, storeUptimeCheck } from "@/lib/uptime-kv";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { format, subDays } from "date-fns";
import type { AnalyticsData } from "@/types/cloudflare";

const emptyAnalytics: AnalyticsData = {
  dates: [],
  visitors: [],
  pageViews: [],
  requests: [],
  bandwidth: [],
  totalVisitors: 0,
  totalPageViews: 0,
  totalRequests: 0,
  totalBandwidth: 0,
};

// Simple in-memory cache
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

function getCustomDomain(domains: string[], subdomain: string): string {
  const custom = domains.find((d) => !d.endsWith(".pages.dev"));
  return custom || domains[0] || subdomain;
}

export async function GET() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare credentials not configured" },
      { status: 500 }
    );
  }

  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    // Step 1: Fetch projects and zones in parallel
    const [projects, zones] = await Promise.all([
      getProjects(accountId, apiToken),
      getZones(accountId, apiToken),
    ]);

    const since = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const until = format(new Date(), "yyyy-MM-dd");

    // Get KV binding for uptime history (optional — works without it)
    let kv: CloudflareEnv["UPTIME_KV"];
    try {
      const { env } = getCloudflareContext();
      kv = env.UPTIME_KV;
    } catch {
      // KV not available (e.g., local dev)
    }

    // Step 2: For each project, fetch deployments + analytics + uptime in parallel
    const sitesData = await Promise.all(
      projects.map(async (project) => {
        const primaryUrl = `https://${getCustomDomain(project.domains, project.subdomain)}`;

        // Find matching zone
        let zoneId: string | null = null;
        for (const domain of project.domains) {
          const zone = zones.find(
            (z) => domain === z.name || domain.endsWith(`.${z.name}`)
          );
          if (zone) {
            zoneId = zone.id;
            break;
          }
        }

        // Fetch all data in parallel per site
        const [deployments, analytics, uptime, uptimeHistory] = await Promise.all([
          getDeployments(accountId, apiToken, project.name, 5).catch(() => []),
          zoneId
            ? getZoneAnalytics(apiToken, zoneId, since, until).catch(() => emptyAnalytics)
            : Promise.resolve(emptyAnalytics),
          checkUptime(primaryUrl).catch(() => ({
            url: primaryUrl,
            status: "unknown" as const,
            statusCode: null,
            responseTime: null,
            checkedAt: new Date().toISOString(),
          })),
          kv ? getUptimeHistory(kv, project.name).catch(() => null) : Promise.resolve(null),
        ]);

        // Also store this check in KV for history tracking
        if (kv && uptime.status !== "unknown") {
          storeUptimeCheck(kv, project.name, primaryUrl, {
            status: uptime.status,
            statusCode: uptime.statusCode,
            responseTime: uptime.responseTime,
            checkedAt: uptime.checkedAt,
          }).catch(() => {});
        }

        return {
          project: { ...project, recent_deployments: deployments },
          analytics,
          uptime,
          uptimeHistory,
        };
      })
    );

    const responseData = { sites: sitesData, fetchedAt: new Date().toISOString() };

    // Cache the result
    cache = { data: responseData, timestamp: Date.now() };

    return NextResponse.json(responseData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
