"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { UptimeBadge } from "@/components/dashboard/uptime-badge";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import {
  ArrowLeft,
  ExternalLink,
  Users,
  Eye,
  Activity,
  HardDrive,
  GitBranch,
  Clock,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import type {
  PagesProject,
  PagesDeployment,
  AnalyticsData,
  UptimeStatus,
} from "@/types/cloudflare";

type DateRange = "24h" | "7d" | "30d";

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

function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [project, setProject] = useState<
    PagesProject & { recent_deployments?: PagesDeployment[] }
  >();
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [uptime, setUptime] = useState<UptimeStatus>();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("7d");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sitesRes = await fetch("/api/sites");
      if (!sitesRes.ok) throw new Error("Failed to fetch sites");
      const sitesData = await sitesRes.json();
      const proj = sitesData.projects?.find(
        (p: PagesProject) => p.name === slug
      );
      if (!proj) return;
      setProject(proj);

      const zones: { id: string; name: string }[] = sitesData.zones ?? [];
      let zoneId: string | null = null;
      for (const domain of proj.domains) {
        const zone = zones.find((z: { id: string; name: string }) => domain === z.name || domain.endsWith(`.${z.name}`));
        if (zone) { zoneId = zone.id; break; }
      }

      const days = dateRange === "24h" ? 1 : dateRange === "7d" ? 7 : 30;
      const since = format(subDays(new Date(), days), "yyyy-MM-dd");
      const until = format(new Date(), "yyyy-MM-dd");
      const customDomain = proj.domains.find((d: string) => !d.endsWith(".pages.dev"));
      const primaryDomain = customDomain || proj.domains[0] || proj.subdomain;
      const primaryUrl = `https://${primaryDomain}`;

      const analyticsPromise = zoneId
        ? fetch(`/api/analytics?zoneTag=${zoneId}&since=${since}&until=${until}`)
            .then((r) => (r.ok ? r.json() : emptyAnalytics))
            .catch(() => emptyAnalytics)
        : Promise.resolve(emptyAnalytics);

      const [analyticsData, uptimeData] = await Promise.all([
        analyticsPromise,
        fetch(`/api/uptime?urls=${encodeURIComponent(primaryUrl)}`)
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] })),
      ]);

      setAnalytics(analyticsData);
      setUptime(
        uptimeData.results?.[0] ?? {
          url: primaryUrl,
          status: "unknown",
          statusCode: null,
          responseTime: null,
          checkedAt: new Date().toISOString(),
        }
      );
    } finally {
      setLoading(false);
    }
  }, [slug, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-zinc-900/40 shimmer" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-lg border border-zinc-800/80 bg-zinc-900/30 shimmer"
            />
          ))}
        </div>
        <div className="h-[280px] rounded-lg border border-zinc-800/80 bg-zinc-900/30 shimmer" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-24 text-center">
        <p className="text-zinc-500">Site not found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const customDomain = project.domains.find((d) => !d.endsWith(".pages.dev"));
  const displayDomain = customDomain || project.domains[0] || project.subdomain;
  const primaryUrl = `https://${displayDomain}`;

  const statCards = [
    { label: "Visitors", value: formatNumber(analytics.totalVisitors), icon: Users },
    { label: "Page Views", value: formatNumber(analytics.totalPageViews), icon: Eye },
    { label: "Requests", value: formatNumber(analytics.totalRequests), icon: Activity },
    { label: "Bandwidth", value: formatBytes(analytics.totalBandwidth), icon: HardDrive },
  ];

  const ranges: { label: string; value: DateRange }[] = [
    { label: "24h", value: "24h" },
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              {project.name}
            </h1>
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {displayDomain}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
        {uptime && <UptimeBadge status={uptime} />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 animate-in-view"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500 font-medium">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-semibold text-zinc-100 tracking-tight font-mono">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-sm font-medium text-zinc-300">
            Visitors
          </h3>
          <div className="flex items-center gap-0.5 rounded-md bg-zinc-800/60 p-0.5">
            {ranges.map((r) => (
              <button
                key={r.value}
                onClick={() => setDateRange(r.value)}
                className={`rounded px-2.5 py-1 text-[11px] font-mono font-medium transition-colors ${
                  dateRange === r.value
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 pt-3">
          <AnalyticsChart
            data={analytics}
            metric="visitors"
            height={260}
            showAxes
            color="#3b82f6"
          />
        </div>
      </div>

      {/* Secondary charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          <div className="px-5 pt-5">
            <h3 className="text-sm font-medium text-zinc-300">
              Page Views
            </h3>
          </div>
          <div className="p-5 pt-3">
            <AnalyticsChart
              data={analytics}
              metric="pageViews"
              height={180}
              showAxes
              color="#f59e0b"
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          <div className="px-5 pt-5">
            <h3 className="text-sm font-medium text-zinc-300">
              Bandwidth
            </h3>
          </div>
          <div className="p-5 pt-3">
            <AnalyticsChart
              data={analytics}
              metric="bandwidth"
              height={180}
              showAxes
              color="#34d399"
            />
          </div>
        </div>
      </div>

      {/* Deployments */}
      {project.recent_deployments && project.recent_deployments.length > 0 && (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h3 className="text-sm font-medium text-zinc-300">
              Recent Deployments
            </h3>
          </div>
          <div className="px-5 pb-5 space-y-1.5">
            {(
              project as PagesProject & {
                recent_deployments: PagesDeployment[];
              }
            ).recent_deployments.map((dep) => {
              const lastStage = dep.stages[dep.stages.length - 1];
              const isSuccess = lastStage?.status === "success";
              const isFailed = lastStage?.status === "failure";

              return (
                <div
                  key={dep.id}
                  className="flex items-center justify-between rounded-md bg-zinc-800/30 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GitBranch className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-zinc-300 truncate">
                        {dep.deployment_trigger?.metadata?.commit_message ||
                          dep.short_id}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-600 mt-0.5">
                        {dep.deployment_trigger?.metadata?.branch || "main"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      className={`text-[10px] font-mono ${
                        isSuccess
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/40"
                          : isFailed
                          ? "bg-red-950/40 text-red-400 border-red-900/40"
                          : "bg-amber-950/40 text-amber-400 border-amber-900/40"
                      }`}
                    >
                      {isSuccess ? "Success" : isFailed ? "Failed" : "Building"}
                    </Badge>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-600">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(dep.created_on), "MMM d, HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
