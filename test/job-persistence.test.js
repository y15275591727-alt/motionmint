import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = mkdtempSync(path.join(tmpdir(), "motionmint-job-persistence-"));
process.env.DATA_DIR = dataDir;

const {
  createJob,
  db,
  getJob,
  updateJob
} = await import("../server/db.js");

test.after(() => {
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

function seedJob() {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  createJob({
    id,
    ownerSession: "owner-session",
    userId: null,
    workflow: "mix",
    kind: "video",
    mode: "live",
    status: "processing",
    progress: 0,
    stage: "analyzing",
    resultJson: JSON.stringify({ retained: true }),
    createdAt: Date.now()
  });
  return id;
}

test("partial job updates preserve fields that were not supplied", () => {
  const id = seedJob();

  updateJob(id, { progress: 37 });
  let job = getJob(id, "owner-session");

  assert.equal(job.status, "processing");
  assert.equal(job.progress, 37);
  assert.equal(job.stage, "analyzing");
  assert.deepEqual(JSON.parse(job.result_json), { retained: true });

  updateJob(id, { stage: "rendering", progress: 0 });
  job = getJob(id, "owner-session");

  assert.equal(job.stage, "rendering");
  assert.equal(job.progress, 0);
  assert.deepEqual(JSON.parse(job.result_json), { retained: true });
});

test("provider identifiers and terminal results persist without wiping earlier data", () => {
  const id = seedJob();

  updateJob(id, { providerId: "provider-local-123", status: "queued", progress: 5, stage: "queued" });
  let job = getJob(id, "owner-session");

  assert.equal(job.provider_id, "provider-local-123");
  assert.equal(job.status, "queued");
  assert.deepEqual(JSON.parse(job.result_json), { retained: true });

  updateJob(id, {
    status: "ready",
    progress: 100,
    stage: "ready",
    resultJson: JSON.stringify({ video_url: "https://example.test/result.mp4" })
  });
  job = getJob(id, "owner-session");

  assert.equal(job.status, "ready");
  assert.equal(job.progress, 100);
  assert.equal(job.stage, "ready");
  assert.deepEqual(JSON.parse(job.result_json), { video_url: "https://example.test/result.mp4" });
});
