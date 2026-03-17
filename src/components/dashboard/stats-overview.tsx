"use client";

import { Users, Eye, Activity, HardDrive } from "lucide-react";
import { formatNumber, formatBytes } from "@/lib/utils";
import type { AnalyticsData } from "@/types/cloudflare";

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
    { label: "Total Visitors", value: formatNumber(totals.visitors), icon: Users, accent: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/10" },
    { label: "Page Views", value: formatNumber(totals.pageViews), icon: Eye, accent: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/10" },
    { label: "Requests", value: formatNumber(totals.requests), icon: Activity, accent: "text-violet-400", bg: "bg-violet-500/5", border: "border-violet-500/10" },
    { label: "Bandwidth", value: formatBytes(totals.bandwidth), icon: HardDrive, accent: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={`relative rounded-xl border ${stat.border} ${stat.bg} p-4 animate-in-view overflow-hidden`}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`flex h-6 w-6 items-center justify-center rounded-md ${stat.bg} border ${stat.border}`}>
              <stat.icon className={`h-3 w-3 ${stat.accent}`} />
            </div>
            <span className="text-[11px] text-zinc-500 font-medium tracking-wide uppercase">
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
