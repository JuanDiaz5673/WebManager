import type { UptimeStatus } from "@/types/cloudflare";

export function UptimeBadge({ status }: { status: UptimeStatus }) {
  if (status.status === "up") {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-[11px] font-medium text-emerald-400">
          Online
        </span>
        {status.responseTime !== null && (
          <span className="text-[10px] font-mono text-emerald-500/60 ml-0.5">
            {status.responseTime}ms
          </span>
        )}
      </div>
    );
  }

  if (status.status === "down") {
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-red-950/40 border border-red-900/40 px-2.5 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        <span className="text-[11px] font-medium text-red-400">
          Offline
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-zinc-800/40 border border-zinc-700/40 px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
      <span className="text-[11px] font-medium text-zinc-500">
        Unknown
      </span>
    </div>
  );
}
