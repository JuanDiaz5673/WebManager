"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { SitePreview } from "./site-preview";
import { UptimeBadge } from "./uptime-badge";
import { AnalyticsChart } from "./analytics-chart";
import {
  X,
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

function getCustomDomain(project: PagesProject): string {
  const custom = project.domains.find((d) => !d.endsWith(".pages.dev"));
  return custom || project.domains[0] || project.subdomain;
}

interface SiteDetailPanelProps {
  project: PagesProject & { recent_deployments?: PagesDeployment[] };
  analytics: AnalyticsData;
  uptime: UptimeStatus;
  onClose: () => void;
}

export function SiteDetailPanel({
  project,
  analytics: initialAnalytics,
  uptime,
  onClose,
}: SiteDetailPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [analytics, setAnalytics] = useState<AnalyticsData>(initialAnalytics);
  const [loadingRange, setLoadingRange] = useState(false);

  const domain = getCustomDomain(project);
  const primaryUrl = `https://${domain}`;

  // Fetch analytics for different date ranges
  const fetchRangeAnalytics = useCallback(async (range: DateRange) => {
    if (range === "7d") {
      setAnalytics(initialAnalytics);
      return;
    }

    setLoadingRange(true);
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) return;
      const sitesData = await res.json();
      const zones: { id: string; name: string }[] = sitesData.zones ?? [];

      let zoneId: string | null = null;
      for (const d of project.domains) {
        const zone = zones.find(
          (z: { id: string; name: string }) =>
            d === z.name || d.endsWith(`.${z.name}`)
        );
        if (zone) {
          zoneId = zone.id;
          break;
        }
      }

      if (!zoneId) return;

      const days = range === "24h" ? 1 : 30;
      const since = format(subDays(new Date(), days), "yyyy-MM-dd");
      const until = format(new Date(), "yyyy-MM-dd");

      const analyticsRes = await fetch(
        `/api/analytics?zoneTag=${zoneId}&since=${since}&until=${until}`
      );
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
    } catch {
      // keep current data
    } finally {
      setLoadingRange(false);
    }
  }, [initialAnalytics, project.domains]);

  useEffect(() => {
    fetchRangeAnalytics(dateRange);
  }, [dateRange, fetchRangeAnalytics]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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

  const deployments = project.recent_deployments ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 md:py-12">
        <div
          className="relative w-full max-w-5xl rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preview banner */}
          <div className="relative overflow-hidden rounded-t-xl">
            <SitePreview projectName={project.name} url={primaryUrl} scrollable className="h-[560px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />

            {/* Header overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">
                  {project.name}
                </h2>
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors mt-0.5"
                >
                  {domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <UptimeBadge status={uptime} />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900/80 border border-zinc-700/50 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3.5"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <stat.icon className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <p className="text-xl font-semibold text-zinc-100 tracking-tight font-mono">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Visitors chart */}
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4">
                <h3 className="text-sm font-medium text-zinc-300">Visitors</h3>
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
              <div className={`p-4 pt-2 ${loadingRange ? "opacity-50" : ""} transition-opacity`}>
                <AnalyticsChart
                  data={analytics}
                  metric="visitors"
                  height={200}
                  showAxes
                  color="#3b82f6"
                />
              </div>
            </div>

            {/* Secondary charts */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="px-4 pt-4">
                  <h3 className="text-sm font-medium text-zinc-300">Page Views</h3>
                </div>
                <div className={`p-4 pt-2 ${loadingRange ? "opacity-50" : ""} transition-opacity`}>
                  <AnalyticsChart
                    data={analytics}
                    metric="pageViews"
                    height={140}
                    showAxes
                    color="#f59e0b"
                  />
                </div>
              </div>
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="px-4 pt-4">
                  <h3 className="text-sm font-medium text-zinc-300">Bandwidth</h3>
                </div>
                <div className={`p-4 pt-2 ${loadingRange ? "opacity-50" : ""} transition-opacity`}>
                  <AnalyticsChart
                    data={analytics}
                    metric="bandwidth"
                    height={140}
                    showAxes
                    color="#34d399"
                  />
                </div>
              </div>
            </div>

            {/* Deployments */}
            {deployments.length > 0 && (
              <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-sm font-medium text-zinc-300">
                    Recent Deployments
                  </h3>
                </div>
                <div className="px-4 pb-4 space-y-1.5">
                  {deployments.map((dep) => {
                    const lastStage = dep.stages[dep.stages.length - 1];
                    const isSuccess = lastStage?.status === "success";
                    const isFailed = lastStage?.status === "failure";

                    return (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between rounded-md bg-zinc-800/30 px-3.5 py-2.5 hover:bg-zinc-800/50 transition-colors"
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
        </div>
      </div>
    </>
  );
}
