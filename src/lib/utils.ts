import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PagesProject } from "@/types/cloudflare"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function getCustomDomain(project: PagesProject): string {
  const custom = project.domains.find((d) => !d.endsWith(".pages.dev"));
  return custom || project.domains[0] || project.subdomain;
}
