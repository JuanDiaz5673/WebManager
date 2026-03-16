export interface PagesProject {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  production_branch: string;
  created_on: string;
  latest_deployment?: PagesDeployment;
}

export interface PagesDeployment {
  id: string;
  short_id: string;
  project_name: string;
  environment: string;
  url: string;
  created_on: string;
  modified_on: string;
  production_branch: string;
  deployment_trigger: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
    };
  };
  stages: DeploymentStage[];
  is_skipped: boolean;
}

export interface DeploymentStage {
  name: string;
  started_on: string | null;
  ended_on: string | null;
  status: "active" | "success" | "failure" | "idle";
}

export interface AnalyticsData {
  dates: string[];
  visitors: number[];
  pageViews: number[];
  requests: number[];
  bandwidth: number[];
  totalVisitors: number;
  totalPageViews: number;
  totalRequests: number;
  totalBandwidth: number;
}

export interface UptimeStatus {
  url: string;
  status: "up" | "down" | "unknown";
  statusCode: number | null;
  responseTime: number | null;
  checkedAt: string;
}

export interface UptimeCheck {
  status: "up" | "down";
  statusCode: number | null;
  responseTime: number | null;
  checkedAt: string;
}

export interface UptimeHistory {
  url: string;
  checks: UptimeCheck[];
  uptimePercentage: number;
  totalChecks: number;
  totalUp: number;
  totalDown: number;
  lastIncident: string | null;
}

export interface SiteData {
  project: PagesProject;
  analytics: AnalyticsData;
  uptime: UptimeStatus;
  uptimeHistory?: UptimeHistory;
}

export interface CloudflareAPIResponse<T> {
  success: boolean;
  errors: { code: number; message: string }[];
  messages: string[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
  };
}
