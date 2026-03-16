"use client";

import { useEffect, useState, useCallback } from "react";
import { SiteCard } from "@/components/dashboard/site-card";
import { SiteDetailPanel } from "@/components/dashboard/site-detail-panel";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import type { PagesProject, PagesDeployment, AnalyticsData, UptimeStatus, UptimeHistory } from "@/types/cloudflare";

interface SiteWithData {
  project: PagesProject & { recent_deployments?: PagesDeployment[] };
  analytics: AnalyticsData;
  uptime: UptimeStatus;
  uptimeHistory?: UptimeHistory;
}

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

export default function DashboardPage() {
  const [sites, setSites] = useState<SiteWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      const data = await res.json();

      const sitesData: SiteWithData[] = (data.sites ?? []).map(
        (s: { project: PagesProject & { recent_deployments?: PagesDeployment[] }; analytics?: AnalyticsData; uptime?: UptimeStatus; uptimeHistory?: UptimeHistory }) => ({
          project: s.project,
          analytics: s.analytics ?? emptyAnalytics,
          uptime: s.uptime ?? {
            url: "",
            status: "unknown" as const,
            statusCode: null,
            responseTime: null,
            checkedAt: new Date().toISOString(),
          },
          uptimeHistory: s.uptimeHistory,
        })
      );

      setSites(sitesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[88px] rounded-lg border border-zinc-800/80 bg-zinc-900/30 shimmer"
            />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[320px] rounded-lg border border-zinc-800/80 bg-zinc-900/30 shimmer"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-6 py-4 mb-4 max-w-sm">
          <p className="text-sm text-red-400">{error}</p>
        </div>
        <button
          onClick={fetchData}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-zinc-500">No Cloudflare Pages projects found.</p>
        <p className="text-xs text-zinc-700 mt-1">
          Check your API token permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
          Overview
        </h2>
        <p className="text-sm text-zinc-500 mt-0.5">
          Last 7 days across {sites.length} site{sites.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <StatsOverview analyticsArray={sites.map((s) => s.analytics)} />

      {/* Sites */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-4">Sites</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site, i) => (
            <div
              key={site.project.id}
              className="animate-in-view"
              style={{ animationDelay: `${0.1 + i * 0.05}s` }}
            >
              <SiteCard
                project={site.project}
                analytics={site.analytics}
                uptime={site.uptime}
                uptimeHistory={site.uptimeHistory}
                onExpand={() => setExpandedIndex(i)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expandedIndex !== null && sites[expandedIndex] && (
        <SiteDetailPanel
          project={sites[expandedIndex].project}
          analytics={sites[expandedIndex].analytics}
          uptime={sites[expandedIndex].uptime}
          uptimeHistory={sites[expandedIndex].uptimeHistory}
          onClose={() => setExpandedIndex(null)}
        />
      )}
    </div>
  );
}
