"use client";

import { ExternalLink, Users, Eye, Activity, HardDrive, ArrowUpRight } from "lucide-react";
import { SitePreview } from "./site-preview";
import { UptimeBadge } from "./uptime-badge";
import { MiniSparkline } from "./analytics-chart";
import { formatNumber, formatBytes, getCustomDomain } from "@/lib/utils";
import type { PagesProject, AnalyticsData, UptimeStatus, UptimeHistory } from "@/types/cloudflare";

interface SiteCardProps {
  project: PagesProject;
  analytics: AnalyticsData;
  uptime: UptimeStatus;
  uptimeHistory?: UptimeHistory;
  onExpand: () => void;
}

function UptimeBar({ history }: { history?: UptimeHistory }) {
  if (!history || history.totalChecks === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Uptime</span>
          <span className="text-[10px] text-zinc-600 font-mono">No data</span>
        </div>
        <div className="flex gap-[1.5px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="h-3 flex-1 rounded-[2px] bg-zinc-800/40" />
          ))}
        </div>
      </div>
    );
  }

  const recentChecks = history.checks.slice(-30);
  const pct = history.uptimePercentage;
  const color = pct >= 99.5 ? "text-emerald-400" : pct >= 95 ? "text-amber-400" : "text-red-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Uptime</span>
        <span className={`text-[11px] font-mono font-semibold ${color}`}>
          {pct.toFixed(2)}%
        </span>
      </div>
      <div className="flex gap-[1.5px]">
        {Array.from({ length: 30 }).map((_, i) => {
          const check = recentChecks[i];
          if (!check) {
            return <div key={i} className="h-3 flex-1 rounded-[2px] bg-zinc-800/40" />;
          }
          return (
            <div
              key={i}
              className={`h-3 flex-1 rounded-[2px] transition-colors ${
                check.status === "up" ? "bg-emerald-500/60" : "bg-red-500/70 uptime-incident"
              }`}
              title={`${check.status === "up" ? "Up" : "Down"} — ${new Date(check.checkedAt).toLocaleString()}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SiteCard({ project, analytics, uptime, uptimeHistory, onExpand }: SiteCardProps) {
  const domain = getCustomDomain(project);
  const primaryUrl = `https://${domain}`;

  const metrics = [
    { icon: Users, label: "Visitors", value: formatNumber(analytics.totalVisitors) },
    { icon: Eye, label: "Views", value: formatNumber(analytics.totalPageViews) },
    { icon: Activity, label: "Requests", value: formatNumber(analytics.totalRequests) },
    { icon: HardDrive, label: "BW", value: formatBytes(analytics.totalBandwidth) },
  ];

  return (
    <div
      onClick={onExpand}
      className="cursor-pointer group rounded-xl border border-zinc-800/60 bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-zinc-700/60 card-glow overflow-hidden"
    >
      {/* Site Preview */}
      <SitePreview projectName={project.name} url={primaryUrl} />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-zinc-100 truncate tracking-tight">
              {project.name}
            </h3>
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5"
            >
              {domain}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          <UptimeBadge status={uptime} />
        </div>

        {/* Metrics — 2x2 grid, always */}
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-zinc-800/20 border border-zinc-800/40 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <m.icon className="h-3 w-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                  {m.label}
                </span>
              </div>
              <p className="text-sm font-mono font-semibold text-zinc-200 tabular-nums">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Uptime history bar */}
        <UptimeBar history={uptimeHistory} />

        {/* Sparkline + CTA */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <MiniSparkline data={analytics} metric="visitors" color="#3b82f6" />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0 pb-0.5">
            <span className="font-medium">View</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
