import { NextResponse } from "next/server";
import { getProjects, getDeployments, getZones } from "@/lib/cloudflare-api";

export async function GET() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { error: "Cloudflare credentials not configured" },
      { status: 500 }
    );
  }

  try {
    const [projects, zones] = await Promise.all([
      getProjects(accountId, apiToken),
      getZones(accountId, apiToken),
    ]);

    const projectsWithDeployments = await Promise.all(
      projects.map(async (project) => {
        try {
          const deployments = await getDeployments(accountId, apiToken, project.name, 5);
          return { ...project, recent_deployments: deployments };
        } catch {
          return { ...project, recent_deployments: [] };
        }
      })
    );

    return NextResponse.json({ projects: projectsWithDeployments, zones });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sites" },
      { status: 500 }
    );
  }
}
