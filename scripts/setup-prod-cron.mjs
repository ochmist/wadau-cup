#!/usr/bin/env node
// Create/update Cloud Scheduler jobs for the deployed Wadau Cup sync endpoint.
//
// Required env:
//   PROD_BASE_URL=https://...
//   SYNC_CRON_SECRET=...
//
// Optional env:
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID=wadau-cup
//   CLOUD_SCHEDULER_LOCATION=us-central1
//   CLOUD_SCHEDULER_TIME_ZONE=America/New_York

import { existsSync, readFileSync } from "fs";
import { execFileSync } from "child_process";

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = stripQuotes(m[2]);
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function gcloud(args) {
  return execFileSync("gcloud", ["--quiet", ...args], { stdio: "pipe", encoding: "utf8" });
}

function redact(value) {
  const secret = process.env.SYNC_CRON_SECRET;
  const text = String(value ?? "");
  return secret ? text.split(secret).join("<redacted>") : text;
}

function jobExists(name, project, location) {
  try {
    gcloud(["scheduler", "jobs", "describe", name, "--project", project, "--location", location]);
    return true;
  } catch {
    return false;
  }
}

function upsertHttpJob(job) {
  const common = [
    job.name,
    "--project", job.project,
    "--location", job.location,
    "--schedule", job.schedule,
    "--time-zone", job.timeZone,
    "--uri", job.uri,
    "--http-method", "POST",
    "--attempt-deadline", "300s",
  ];
  if (jobExists(job.name, job.project, job.location)) {
    gcloud([
      "scheduler",
      "jobs",
      "update",
      "http",
      ...common,
      "--update-headers",
      `x-cron-secret=${job.secret}`,
    ]);
    return "updated";
  }
  gcloud([
    "scheduler",
    "jobs",
    "create",
    "http",
    ...common,
    "--headers",
    `x-cron-secret=${job.secret}`,
  ]);
  return "created";
}

loadEnvLocal();

const baseUrl = requireEnv("PROD_BASE_URL").replace(/\/$/, "");
const secret = requireEnv("SYNC_CRON_SECRET");
const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "wadau-cup";
const location = process.env.CLOUD_SCHEDULER_LOCATION ?? "us-central1";
const timeZone = process.env.CLOUD_SCHEDULER_TIME_ZONE ?? "America/New_York";

const jobs = [
  {
    name: "wadau-picks-backup",
    schedule: "17 * * * *",
    uri: `${baseUrl}/api/admin/backup-picks`,
  },
  {
    name: "wadau-fixtures-daily",
    schedule: "5 6 * * *",
    uri: `${baseUrl}/api/admin/sync-results?force=1`,
  },
  {
    name: "wadau-results-poll",
    schedule: "*/5 * * * *",
    uri: `${baseUrl}/api/admin/sync-results`,
  },
];

for (const job of jobs) {
  try {
    const action = upsertHttpJob({ ...job, project, location, timeZone, secret });
    console.log(`${action} ${job.name} -> ${job.uri}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    console.error(redact(message));
    process.exit(1);
  }
}
