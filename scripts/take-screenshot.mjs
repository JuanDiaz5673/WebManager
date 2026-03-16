#!/usr/bin/env node
// Usage: node scripts/take-screenshot.mjs [project-name]
// If no project name given, screenshots all projects missing a thumbnail.

import puppeteer from "puppeteer";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env.local
const envPath = resolve(ROOT, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .map(([k, ...v]) => [k, v.join("=")])
);

const CF_ACCOUNT_ID = env.CF_ACCOUNT_ID;
const CF_API_TOKEN = env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error("Missing CF_ACCOUNT_ID or CF_API_TOKEN in .env.local");
  process.exit(1);
}

async function getProjects() {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`,
    { headers: { Authorization: `Bearer ${CF_API_TOKEN}` } }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.errors.map((e) => e.message).join(", "));
  return data.result;
}

async function screenshot(browser, url, outPath) {
  console.log(`  Screenshotting ${url} ...`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 768 });
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await page.screenshot({ path: outPath, type: "png" });
    console.log(`  Saved → ${outPath}`);
  } catch (err) {
    console.error(`  Failed to screenshot ${url}: ${err.message}`);
  } finally {
    await page.close();
  }
}

const targetProject = process.argv[2] ?? null;

const projects = await getProjects();
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

for (const project of projects) {
  if (targetProject && project.name !== targetProject) continue;

  const outPath = resolve(ROOT, "public", "thumbnails", `${project.name}.png`);

  if (!targetProject && existsSync(outPath)) {
    console.log(`Skipping ${project.name} (thumbnail already exists)`);
    continue;
  }

  // Prefer custom domain, fall back to .pages.dev domain
  const customDomain = project.domains?.find((d) => !d.endsWith(".pages.dev"));
  const pagesDev = project.domains?.find((d) => d.endsWith(".pages.dev")) ?? project.subdomain;
  const url = `https://${customDomain ?? pagesDev}`;

  console.log(`Processing ${project.name} (${url})`);
  await screenshot(browser, url, outPath);
}

await browser.close();
console.log("Done.");
