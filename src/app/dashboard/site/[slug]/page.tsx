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
  AlertTriangle,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { format, subDays, parseISO, formatDistanceStrict } from "date-fns";
import { formatNumber, formatBytes } from "@/lib/utils";
import type {
  PagesProject,
  PagesDeployment,
  AnalyticsData,
  UptimeStatus,
  UptimeHistory,
  UptimeCheck,
} from "@/types/cloudflare";

interface Outage {
  startedAt: string;
  endedAt: string | null;
  duration: number; // ms
  checks: UptimeCheck[];
}

function getOutages(checks: UptimeCheck[]): Outage[] {
  const outages: Outage[] = [];
  let current: UptimeCheck[] | null = null;

  for (const check of checks) {
    if (check.status === "down") {
      if (!current) current = [];
      current.push(check);
    } else if (current) {
      const startedAt = current[0].checkedAt;
      const endedAt = check.checkedAt;
      outages.push({
        startedAt,
        endedAt,
        duration: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
        checks: current,
      });
      current = null;
    }
  }

  // If still down (ongoing outage)
  if (current && current.length > 0) {
    outages.push({
      startedAt: current[0].checkedAt,
      endedAt: null,
      duration: Date.now() - new Date(current[0].checkedAt).getTime(),
      checks: current,
    });
  }

  return outages.reverse(); // newest first
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return "< 1 min";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.round((ms % 3_600_000) / 60_000);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(ms / 86_400_000);
  const h = Math.round((ms % 86_400_000) / 3_600_000);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

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


export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [project, setProject] = useState<
    PagesProject & { recent_deployments?: PagesDeployment[] }
  >();
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);
  const [uptime, setUptime] = useState<UptimeStatus>();
  const [uptimeHistory, setUptimeHistory] = useState<UptimeHistory | null>(null);
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

      const [analyticsData, uptimeData, historyData] = await Promise.all([
        analyticsPromise,
        fetch(`/api/uptime?urls=${encodeURIComponent(primaryUrl)}`)
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] })),
        fetch(`/api/uptime-history?site=${encodeURIComponent(slug)}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      setAnalytics(analyticsData);
      setUptimeHistory(historyData);
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

      {/* Uptime History */}
      {uptimeHistory && uptimeHistory.totalChecks > 0 && (() => {
        const outages = getOutages(uptimeHistory.checks);
        const currentlyDown = outages.length > 0 && outages[0].endedAt === null;
        const longestOutage = outages.length > 0
          ? Math.max(...outages.map((o) => o.duration))
          : 0;
        const avgResponseTime = uptimeHistory.checks
          .filter((c) => c.status === "up" && c.responseTime !== null)
          .reduce((acc, c, _, arr) => acc + (c.responseTime ?? 0) / arr.length, 0);

        return (
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="h-4 w-4 text-zinc-500" />
                <h3 className="text-sm font-medium text-zinc-300">Uptime Monitor</h3>
              </div>
              <span
                className={`text-lg font-mono font-bold ${
                  uptimeHistory.uptimePercentage >= 99.5
                    ? "text-emerald-400"
                    : uptimeHistory.uptimePercentage >= 95
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              >
                {uptimeHistory.uptimePercentage.toFixed(2)}%
              </span>
            </div>

            {/* Current status banner */}
            {currentlyDown ? (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-red-400">Site is currently down</p>
                  <p className="text-[11px] text-red-400/60 mt-0.5">
                    Since {format(parseISO(outages[0].startedAt), "MMM d, HH:mm")} ({formatDuration(outages[0].duration)})
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/15 px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-emerald-400">All systems operational</p>
                  {uptimeHistory.lastIncident && (
                    <p className="text-[11px] text-emerald-400/60 mt-0.5">
                      Last incident {formatDistanceStrict(parseISO(uptimeHistory.lastIncident), new Date(), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Status bar */}
            <div className="flex gap-[2px]">
              {uptimeHistory.checks.slice(-90).map((check, i) => (
                <div
                  key={i}
                  className={`h-6 flex-1 rounded-[2px] ${
                    check.status === "up" ? "bg-emerald-500/70" : "bg-red-500/70"
                  }`}
                  title={`${check.status === "up" ? "Up" : "Down"} — ${new Date(check.checkedAt).toLocaleString()}${
                    check.responseTime ? ` (${check.responseTime}ms)` : ""
                  }`}
                />
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-md bg-zinc-800/30 px-3 py-2">
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-0.5">Total Checks</p>
                <p className="text-sm font-mono font-semibold text-zinc-200">{uptimeHistory.totalChecks}</p>
              </div>
              <div className="rounded-md bg-zinc-800/30 px-3 py-2">
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-0.5">Outages</p>
                <p className={`text-sm font-mono font-semibold ${outages.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {outages.length}
                </p>
              </div>
              <div className="rounded-md bg-zinc-800/30 px-3 py-2">
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-0.5">Longest Outage</p>
                <p className="text-sm font-mono font-semibold text-zinc-200">
                  {longestOutage > 0 ? formatDuration(longestOutage) : "None"}
                </p>
              </div>
              <div className="rounded-md bg-zinc-800/30 px-3 py-2">
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider mb-0.5">Avg Response</p>
                <p className="text-sm font-mono font-semibold text-zinc-200">
                  {avgResponseTime > 0 ? `${Math.round(avgResponseTime)}ms` : "—"}
                </p>
              </div>
            </div>

            {/* Outage log */}
            {outages.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">Outage Log</h4>
                <div className="space-y-1.5">
                  {outages.slice(0, 10).map((outage, i) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md bg-zinc-800/30 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${outage.endedAt === null ? "text-red-400" : "text-amber-500"}`} />
                        <div className="min-w-0">
                          <p className="text-[13px] text-zinc-300">
                            {outage.endedAt === null ? (
                              <span className="text-red-400 font-medium">Ongoing</span>
                            ) : (
                              <>Down for <span className="font-mono font-medium">{formatDuration(outage.duration)}</span></>
                            )}
                          </p>
                          <p className="text-[11px] text-zinc-600 mt-0.5">
                            {format(parseISO(outage.startedAt), "MMM d, yyyy HH:mm")}
                            {outage.endedAt && (
                              <> — {format(parseISO(outage.endedAt), "HH:mm")}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pl-6 sm:pl-0">
                        <span className="text-[11px] font-mono text-zinc-600">
                          {outage.checks.length} failed check{outage.checks.length !== 1 ? "s" : ""}
                        </span>
                        {outage.endedAt === null ? (
                          <span className="inline-flex items-center rounded-full bg-red-950/40 border border-red-900/40 px-2 py-0.5 text-[10px] font-mono font-medium text-red-400">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-zinc-800/60 border border-zinc-700/40 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-500">
                            RESOLVED
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {outages.length > 10 && (
                    <p className="text-[11px] text-zinc-600 text-center py-1">
                      + {outages.length - 10} more outages
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* No outages message */}
            {outages.length === 0 && (
              <div className="text-center py-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500/50 mx-auto mb-2" />
                <p className="text-[12px] text-zinc-600">No outages recorded</p>
              </div>
            )}
          </div>
        );
      })()}

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
