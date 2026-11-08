import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const FORBIDDEN_PUBLIC_MODEL = /viggle|jst-2|pinoc|\bh3\b/i;
const port = 19000 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
let server;

async function waitForServer() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test server did not become ready.");
}

before(async () => {
  server = spawn(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      VIGGLE_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_WEBHOOK_SECRET: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForServer();
});

after(async () => {
  if (!server || server.killed) return;
  server.kill();
  await new Promise((resolve) => server.once("exit", resolve));
});

test("public status and health expose brand-neutral generation modes", async () => {
  const statusResponse = await fetch(`${baseUrl}/api/status`);
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const status = await statusResponse.json();
  const health = await healthResponse.json();

  assert.equal(status.provider, "demo");
  assert.equal(health.provider, "demo");
  assert.doesNotMatch(status.message, FORBIDDEN_PUBLIC_MODEL);
});

test("public gallery contains only original MotionMint model labels", async () => {
  const response = await fetch(`${baseUrl}/api/public/gallery`);
  const payload = await response.json();

  for (const item of payload.items) {
    assert.doesNotMatch(item.model, FORBIDDEN_PUBLIC_MODEL, item.id);
    assert.match(item.model, /^MotionMint /);
  }
});

test("paid checkout reports that billing is not connected", async () => {
  const response = await fetch(`${baseUrl}/api/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "creator" })
  });
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.match(payload.error, /billing is not connected yet/i);
});
