import type { AnalyticsData } from "@/types/cloudflare";

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";

interface DailyGroup {
  sum: { requests: number; pageViews: number; bytes: number };
  uniq: { uniques: number };
  dimensions: { date: string };
}

interface GraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        httpRequests1dGroups?: DailyGroup[];
      }>;
    };
  };
  errors?: Array<{ message: string }> | null;
}

async function queryGraphQL(
  apiToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<GraphQLResponse> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL API error: ${res.status}`);
  }

  return res.json();
}

export async function getZoneAnalytics(
  apiToken: string,
  zoneTag: string,
  since: string,
  until: string
): Promise<AnalyticsData> {
  const query = `
    query GetZoneAnalytics($zoneTag: string!, $since: Date!, $until: Date!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1dGroups(
            filter: { date_geq: $since, date_leq: $until }
            limit: 1000
            orderBy: [date_ASC]
          ) {
            sum {
              requests
              pageViews
              bytes
            }
            uniq {
              uniques
            }
            dimensions {
              date
            }
          }
        }
      }
    }
  `;

  const result = await queryGraphQL(apiToken, query, { zoneTag, since, until });

  if (result.errors?.length) {
    console.error("GraphQL errors:", result.errors);
  }

  const groups = result.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];

  return aggregateGroups(groups);
}

function aggregateGroups(groups: DailyGroup[]): AnalyticsData {
  const dates: string[] = [];
  const visitors: number[] = [];
  const pageViews: number[] = [];
  const requests: number[] = [];
  const bandwidth: number[] = [];
  let totalVisitors = 0;
  let totalPageViews = 0;
  let totalRequests = 0;
  let totalBandwidth = 0;

  for (const group of groups) {
    dates.push(group.dimensions.date);
    visitors.push(group.uniq.uniques);
    pageViews.push(group.sum.pageViews);
    requests.push(group.sum.requests);
    bandwidth.push(group.sum.bytes);
    totalVisitors += group.uniq.uniques;
    totalPageViews += group.sum.pageViews;
    totalRequests += group.sum.requests;
    totalBandwidth += group.sum.bytes;
  }

  return {
    dates,
    visitors,
    pageViews,
    requests,
    bandwidth,
    totalVisitors,
    totalPageViews,
    totalRequests,
    totalBandwidth,
  };
}
