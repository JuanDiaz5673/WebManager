import { NextRequest, NextResponse } from "next/server";
import { getProjects } from "@/lib/cloudflare-api";
import { storeUptimeCheck } from "@/lib/uptime-kv";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { UptimeCheck } from "@/types/cloudflare";

function getCustomDomain(domains: string[], subdomain: string): string {
  const custom = domains.find((d) => !d.endsWith(".pages.dev"));
  return custom || domains[0] || subdomain;
}

async function checkSite(url: string): Promise<UptimeCheck> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    return {
      status: res.ok ? "up" : "down",
      statusCode: res.status,
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "down",
      statusCode: null,
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function GET(request: NextRequest) {
  // Protect with a secret key
  const cronSecret = request.headers.get("x-cron-secret") ?? request.nextUrl.searchParams.get("key");
  const expectedSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require it. Otherwise allow (for initial setup).
  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { env } = getCloudflareContext();
  const kv = env.UPTIME_KV;

  if (!kv) {
    return NextResponse.json({ error: "KV not bound" }, { status: 500 });
  }

  try {
    const projects = await getProjects(accountId, apiToken);

    const results = await Promise.all(
      projects.map(async (project) => {
        const domain = getCustomDomain(project.domains, project.subdomain);
        const url = `https://${domain}`;
        const check = await checkSite(url);
        await storeUptimeCheck(kv, project.name, url, check);
        return { site: project.name, url, ...check };
      })
    );

    return NextResponse.json({
      checked: results.length,
      results,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run uptime checks" },
      { status: 500 }
    );
  }
}
