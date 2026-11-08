import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("landing copy uses the locked MotionMint message", () => {
  const app = read("src/App.jsx");

  assert.match(app, /heroTitle:\s*"Make anyone move\."/);
  assert.match(
    app,
    /heroText:\s*\n?\s*"Upload a photo and a motion\. MotionMint turns them into a video you can share\."/
  );
  assert.match(app, /primary:\s*"Create a video"/);
  assert.match(app, /heroTitle:\s*"让任何人动起来。"/);
  assert.match(app, /primary:\s*"创作视频"/);
});

test("public navigation and utility links do not promise unavailable destinations", () => {
  const app = read("src/App.jsx");
  const i18n = read("src/i18n.js");

  assert.match(app, /start:\s*"Create a video"/);
  assert.match(app, /start:\s*"创作视频"/);
  assert.doesNotMatch(app, /Start creating|开始创作/);

  assert.doesNotMatch(app, /data\/admin-token\.txt/);
  assert.doesNotMatch(app, /billing-toggle|copy\.yearly/);
  assert.doesNotMatch(app, /href="#top">\{copy\.(?:about|creatorProgram|support)\}/);
  assert.doesNotMatch(app, /href="#top">(?:TikTok|Instagram|YouTube|Discord)/);

  assert.match(app, /href="#privacy"/);
  assert.match(app, /href="#terms"/);
  assert.match(app, /href="#community-rules"/);
  assert.match(i18n, /privacy:\s*\{/);
  assert.match(i18n, /terms:\s*\{/);
  assert.match(i18n, /"community-rules":\s*\{/);
});

test("scene remake reports credits without consuming the free-trial message", () => {
  const app = read("src/App.jsx");
  const i18n = read("src/i18n.js");

  assert.match(app, /trialWorkflow \? copy\.trialExpired : copy\.creditsRequired/);
  assert.match(i18n, /creditsRequired:\s*"This tool requires credits\./);
  assert.match(i18n, /creditsRequired:\s*"此工具需要积分。/);
});

test("public surfaces use MotionMint model and live/demo wording", () => {
  const app = read("src/App.jsx");
  const server = read("server/index.js");

  assert.doesNotMatch(app, /<option>\s*(?:Viggle|JST-2|PINOC|H3)/i);
  assert.doesNotMatch(server, /Live generation API connected\./i);
  assert.match(server, /Live generation available\./);
  assert.match(server, /Demo workspace/);
});

test("seeded gallery rows do not expose third-party model names", () => {
  const db = new DatabaseSync(new URL("../data/motionmint.db", import.meta.url), {
    readOnly: true
  });
  const rows = db.prepare("SELECT id, title, model FROM content_items").all();

  for (const row of rows) {
    assert.doesNotMatch(
      row.model,
      /Viggle|JST-2|PINOC|Meme Maker/i,
      `${row.id} (${row.title}) exposes a third-party model name`
    );
  }
});
