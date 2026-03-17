import type { UptimeCheck, UptimeHistory } from "@/types/cloudflare";
import type { KVNamespace } from "@/types/env";

const MAX_CHECKS = 2016; // ~7 days at 5-min intervals
const KV_PREFIX = "uptime:";

function siteKey(siteName: string): string {
  return `${KV_PREFIX}${siteName}`;
}

export async function storeUptimeCheck(
  kv: KVNamespace,
  siteName: string,
  url: string,
  check: UptimeCheck
): Promise<void> {
  const key = siteKey(siteName);
  const existing = await kv.get<{ url: string; checks: UptimeCheck[] }>(key, "json");

  const checks = existing?.checks ?? [];
  checks.push(check);

  // Trim to max size
  if (checks.length > MAX_CHECKS) {
    checks.splice(0, checks.length - MAX_CHECKS);
  }

  await kv.put(key, JSON.stringify({ url, checks }));
}

export async function getUptimeHistory(
  kv: KVNamespace,
  siteName: string
): Promise<UptimeHistory | null> {
  const key = siteKey(siteName);
  const data = await kv.get<{ url: string; checks: UptimeCheck[] }>(key, "json");

  if (!data || data.checks.length === 0) return null;

  const { url, checks } = data;
  const totalChecks = checks.length;
  const totalUp = checks.filter((c) => c.status === "up").length;
  const totalDown = totalChecks - totalUp;
  const uptimePercentage = totalChecks > 0 ? (totalUp / totalChecks) * 100 : 100;

  // Find last incident (most recent "down" check)
  let lastIncident: string | null = null;
  for (let i = checks.length - 1; i >= 0; i--) {
    if (checks[i].status === "down") {
      lastIncident = checks[i].checkedAt;
      break;
    }
  }

  return {
    url,
    checks,
    uptimePercentage,
    totalChecks,
    totalUp,
    totalDown,
    lastIncident,
  };
}

export async function getAllUptimeHistories(
  kv: KVNamespace
): Promise<Map<string, UptimeHistory>> {
  const list = await kv.list({ prefix: KV_PREFIX });
  const histories = new Map<string, UptimeHistory>();

  await Promise.all(
    list.keys.map(async ({ name }) => {
      const siteName = name.slice(KV_PREFIX.length);
      const history = await getUptimeHistory(kv, siteName);
      if (history) {
        histories.set(siteName, history);
      }
    })
  );

  return histories;
}

export async function clearAllUptimeHistory(kv: KVNamespace): Promise<number> {
  const list = await kv.list({ prefix: KV_PREFIX });
  await Promise.all(list.keys.map(({ name }) => kv.delete(name)));
  return list.keys.length;
}
