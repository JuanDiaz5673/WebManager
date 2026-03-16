"use client";

import { ExternalLink, Users, Eye, Activity, HardDrive, ChevronRight } from "lucide-react";
import { SitePreview } from "./site-preview";
import { UptimeBadge } from "./uptime-badge";
import { MiniSparkline } from "./analytics-chart";
import type { PagesProject, AnalyticsData, UptimeStatus, UptimeHistory } from "@/types/cloudflare";

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

interface SiteCardProps {
  project: PagesProject;
  analytics: AnalyticsData;
  uptime: UptimeStatus;
  uptimeHistory?: UptimeHistory;
  onExpand: () => void;
}

function getCustomDomain(project: PagesProject): string {
  const custom = project.domains.find((d) => !d.endsWith(".pages.dev"));
  return custom || project.domains[0] || project.subdomain;
}

function UptimeBar({ history }: { history?: UptimeHistory }) {
  if (!history || history.totalChecks === 0) {
    return (
      <div className="rounded-md bg-zinc-800/30 px-3 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Uptime</span>
          <span className="text-[10px] text-zinc-600 font-mono">No data</span>
        </div>
        <div className="flex gap-[2px]">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="h-4 flex-1 rounded-[2px] bg-zinc-800/60" />
          ))}
        </div>
      </div>
    );
  }

  // Show last 30 time slots
  const recentChecks = history.checks.slice(-30);
  const pct = history.uptimePercentage;
  const color = pct >= 99.5 ? "text-emerald-400" : pct >= 95 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-md bg-zinc-800/30 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Uptime</span>
        <span className={`text-[11px] font-mono font-semibold ${color}`}>
          {pct.toFixed(2)}%
        </span>
      </div>
      <div className="flex gap-[2px]">
        {Array.from({ length: 30 }).map((_, i) => {
          const check = recentChecks[i];
          if (!check) {
            return <div key={i} className="h-4 flex-1 rounded-[2px] bg-zinc-800/60" />;
          }
          return (
            <div
              key={i}
              className={`h-4 flex-1 rounded-[2px] ${
                check.status === "up" ? "bg-emerald-500/70" : "bg-red-500/70"
              }`}
              title={`${check.status === "up" ? "Up" : "Down"} — ${new Date(check.checkedAt).toLocaleString()}`}
            />
          );
        })}
      </div>
      {history.lastIncident && (
        <p className="text-[10px] text-zinc-600 mt-1.5">
          Last incident: {new Date(history.lastIncident).toLocaleDateString()}
        </p>
      )}
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
    { icon: HardDrive, label: "Bandwidth", value: formatBytes(analytics.totalBandwidth) },
  ];

  return (
    <div
      onClick={onExpand}
      className="cursor-pointer group rounded-lg border border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-colors overflow-hidden"
    >
      {/* Site Preview */}
      <SitePreview projectName={project.name} url={primaryUrl} />

      <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
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

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-md bg-zinc-800/30 px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <m.icon className="h-3 w-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
                  {m.label}
                </span>
              </div>
              <p className="text-sm font-mono font-semibold text-zinc-200">
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Uptime history bar */}
        <UptimeBar history={uptimeHistory} />

        {/* Sparkline */}
        <div className="pt-1">
          <MiniSparkline data={analytics} metric="visitors" color="#3b82f6" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-1 border-t border-zinc-800/60">
          <span className="flex items-center gap-0.5 text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
            Details
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
