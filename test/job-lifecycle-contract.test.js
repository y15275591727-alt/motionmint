import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("live generation persists and returns the local job before provider upload", () => {
  const server = read("server/index.js");
  const generate = server.slice(server.indexOf('app.post(\n  "/api/generate"'), server.indexOf('app.get("/api/jobs"'));
  const localCreate = generate.indexOf("createJob({");
  const providerCreate = generate.indexOf("await createViggleJob(");
  const accepted = generate.indexOf("response.status(202).json({");
  const providerCreateCatch = generate.slice(
    generate.indexOf("} catch (error) {", providerCreate),
    generate.indexOf("}\n      })();", providerCreate)
  );

  assert.ok(localCreate >= 0);
  assert.ok(providerCreate >= 0);
  assert.ok(accepted >= 0);
  assert.ok(localCreate < accepted, "the local job must exist before the 202 response");
  assert.ok(accepted < providerCreate, "provider upload must continue after the 202 response");
  assert.match(generate, /updateJob\(localId, \{[\s\S]*?providerId:\s*providerJob\.id/);
  assert.match(providerCreateCatch, /status: "failed"/);
  assert.match(providerCreateCatch, /resultJson:\s*JSON\.stringify\(\{\s*error:/);
  assert.match(providerCreateCatch, /rollbackUse\(reservation\)/);
  assert.match(providerCreateCatch, /clientGenerationError\(error\)/);
  assert.match(providerCreateCatch, /operatorMessage = safeErrorMessage\(error/);
  assert.match(providerCreateCatch, /console\.error\([\s\S]*?operatorMessage/);
  assert.doesNotMatch(providerCreateCatch, /message:\s*safeErrorMessage\(error/);
});

test("provider and start failures are mapped to user-safe unavailable errors", async () => {
  let clientGenerationError;
  try {
    ({ clientGenerationError } = await import("../server/generation-errors.js"));
  } catch {
    clientGenerationError = null;
  }

  assert.equal(typeof clientGenerationError, "function");

  const unavailable = {
    code: "GENERATE_UNAVAILABLE",
    message: "Generation is temporarily unavailable. Please try again later."
  };
  const failures = [
    "insufficient credits",
    "MotionMint generation request failed (402)",
    "The render provider did not return a job identifier.",
    "fetch failed",
    "Provider error: insufficient credits"
  ];

  for (const message of failures) {
    assert.deepEqual(clientGenerationError(new Error(message)), unavailable, message);
  }

  for (const message of [
    "A prompt is required.",
    "Add a character image to continue.",
    "Add a motion or driving video to continue."
  ]) {
    assert.deepEqual(
      clientGenerationError(new Error(message)),
      { code: "GENERATE_INPUT_INVALID", message }
    );
  }
});

test("job reads persist provider progress and refresh the owner's active live jobs", () => {
  const server = read("server/index.js");
  const list = server.slice(server.indexOf('app.get("/api/jobs"'), server.indexOf('app.get("/api/jobs/:id"'));
  const detail = server.slice(server.indexOf('app.get("/api/jobs/:id"'), server.indexOf('app.get("/api/jobs/:id/download"'));
  const refresh = server.slice(server.indexOf("async function refreshProviderJob"), server.indexOf("function requireAdmin"));

  assert.match(detail, /if \(job\.mode === "live" && !job\.provider_id\)/);
  assert.match(detail, /refreshProviderJob\(job, \{ allowTerminal: true \}\)/);
  assert.match(refresh, /updateJob\(job\.id, \{\s*status:\s*providerJob\.status/);
  assert.match(refresh, /if \(!allowTerminal && \["ready", "failed"\]\.includes\(job\.status\)\)/);
  assert.match(refresh, /progress:\s*providerProgress/);
  assert.match(refresh, /stage:\s*providerStage/);
  assert.match(list, /refreshable/);
  assert.match(list, /slice\(0, 5\)/);
  assert.match(list, /Promise\.all/);
  assert.match(list, /catch/);
});
