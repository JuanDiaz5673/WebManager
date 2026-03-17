import type {
  CloudflareAPIResponse,
  PagesProject,
  PagesDeployment,
  UptimeStatus,
} from "@/types/cloudflare";

const CF_API_BASE = "https://api.cloudflare.com/client/v4";

function getHeaders(apiToken: string) {
  return {
    Authorization: `Bearer ${apiToken}`,
    "Content-Type": "application/json",
  };
}

export async function getProjects(
  accountId: string,
  apiToken: string
): Promise<PagesProject[]> {
  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/pages/projects`,
    { headers: getHeaders(apiToken) }
  );

  if (!res.ok) {
    throw new Error(`Cloudflare API error: ${res.status} ${res.statusText}`);
  }

  const data: CloudflareAPIResponse<PagesProject[]> = await res.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${data.errors.map((e) => e.message).join(", ")}`);
  }

  return data.result;
}

export async function getDeployments(
  accountId: string,
  apiToken: string,
  projectName: string,
  limit = 5
): Promise<PagesDeployment[]> {
  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=${limit}`,
    { headers: getHeaders(apiToken) }
  );

  if (!res.ok) {
    throw new Error(`Cloudflare API error: ${res.status} ${res.statusText}`);
  }

  const data: CloudflareAPIResponse<PagesDeployment[]> = await res.json();
  if (!data.success) {
    throw new Error(`Cloudflare API error: ${data.errors.map((e) => e.message).join(", ")}`);
  }

  return data.result;
}

export interface Zone {
  id: string;
  name: string;
  status: string;
}

export async function getZones(
  accountId: string,
  apiToken: string
): Promise<Zone[]> {
  const res = await fetch(
    `${CF_API_BASE}/zones?account.id=${accountId}`,
    { headers: getHeaders(apiToken) }
  );

  if (!res.ok) return [];

  const data: CloudflareAPIResponse<Zone[]> = await res.json();
  return data.success ? data.result : [];
}

export async function checkUptime(url: string): Promise<UptimeStatus> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    return {
      url,
      status: res.ok ? "up" : "down",
      statusCode: res.status,
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      url,
      status: "down",
      statusCode: null,
      responseTime: Date.now() - start,
      checkedAt: new Date().toISOString(),
    };
  }
}
