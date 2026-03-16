"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AnalyticsData } from "@/types/cloudflare";
import { format, parseISO } from "date-fns";

interface AnalyticsChartProps {
  data: AnalyticsData;
  metric?: "visitors" | "pageViews" | "requests" | "bandwidth";
  height?: number;
  showAxes?: boolean;
  color?: string;
}

const metricLabels: Record<string, string> = {
  visitors: "Visitors",
  pageViews: "Page Views",
  requests: "Requests",
  bandwidth: "Bandwidth",
};

function formatBandwidth(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function AnalyticsChart({
  data,
  metric = "visitors",
  height = 120,
  showAxes = false,
  color = "#3b82f6",
}: AnalyticsChartProps) {
  const chartData = data.dates.map((date, i) => ({
    date,
    value: data[metric][i],
  }));

  if (chartData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-600 text-xs font-mono"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`gradient-${metric}-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxes && (
          <>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e1e22"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#52525b", fontFamily: "JetBrains Mono, monospace" }}
              tickFormatter={(val) => format(parseISO(val), "MMM d")}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#52525b", fontFamily: "JetBrains Mono, monospace" }}
              tickFormatter={(val) =>
                metric === "bandwidth" ? formatBandwidth(val) : val.toLocaleString()
              }
              axisLine={false}
              tickLine={false}
              width={45}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#e4e4e7",
            fontFamily: "JetBrains Mono, monospace",
            padding: "8px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
          labelFormatter={(label) => {
            try { return format(parseISO(String(label)), "MMM d, yyyy"); }
            catch { return String(label); }
          }}
          formatter={(value) => [
            metric === "bandwidth"
              ? formatBandwidth(Number(value))
              : Number(value).toLocaleString(),
            metricLabels[metric],
          ]}
          cursor={{ stroke: "#27272a" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${metric}-${color.replace('#', '')})`}
          dot={false}
          activeDot={{
            r: 3,
            stroke: color,
            strokeWidth: 2,
            fill: "#09090b",
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MiniSparkline({
  data,
  metric = "visitors",
  color = "#3b82f6",
}: {
  data: AnalyticsData;
  metric?: "visitors" | "pageViews" | "requests" | "bandwidth";
  color?: string;
}) {
  return (
    <AnalyticsChart
      data={data}
      metric={metric}
      height={40}
      showAxes={false}
      color={color}
    />
  );
}
