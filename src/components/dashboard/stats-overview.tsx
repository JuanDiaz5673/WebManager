"use client";

import { Users, Eye, Activity, HardDrive } from "lucide-react";
import type { AnalyticsData } from "@/types/cloudflare";

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

interface StatsOverviewProps {
  analyticsArray: AnalyticsData[];
}

export function StatsOverview({ analyticsArray }: StatsOverviewProps) {
  const totals = analyticsArray.reduce(
    (acc, a) => ({
      visitors: acc.visitors + a.totalVisitors,
      pageViews: acc.pageViews + a.totalPageViews,
      requests: acc.requests + a.totalRequests,
      bandwidth: acc.bandwidth + a.totalBandwidth,
    }),
    { visitors: 0, pageViews: 0, requests: 0, bandwidth: 0 }
  );

  const stats = [
    { label: "Total Visitors", value: formatNumber(totals.visitors), icon: Users },
    { label: "Page Views", value: formatNumber(totals.pageViews), icon: Eye },
    { label: "Requests", value: formatNumber(totals.requests), icon: Activity },
    { label: "Bandwidth", value: formatBytes(totals.bandwidth), icon: HardDrive },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, i) => (
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
  );
}
