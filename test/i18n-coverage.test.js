import assert from "node:assert/strict";
import test from "node:test";

import { LEGAL_COPY, TOOL_COPY, UI_COPY } from "../src/i18n.js";

test("both languages cover every creation tool", () => {
  const toolIds = ["mix", "motion", "remake", "video", "image", "character"];

  for (const toolId of toolIds) {
    for (const language of ["en", "zh"]) {
      const copy = TOOL_COPY[language][toolId];
      assert.ok(copy?.name, `${language}.${toolId}.name`);
      assert.ok(copy?.description, `${language}.${toolId}.description`);
      assert.ok(copy?.imageLabel, `${language}.${toolId}.imageLabel`);
    }
  }
});

test("Chinese UI covers community, pricing, studio, and account flows", () => {
  const zh = UI_COPY.zh;

  assert.match(zh.community.title, /社区/);
  assert.match(zh.community.download, /下载/);
  assert.match(zh.pricing.plans[1].name, /创作者/);
  assert.match(zh.studio.generate, /生成/);
  assert.match(zh.auth.signIn, /登录/);
  assert.match(zh.billing.unavailable, /支付/);
});

test("legal routes have original MotionMint copy in both languages", () => {
  for (const language of ["en", "zh"]) {
    for (const pageId of ["privacy", "terms", "community-rules"]) {
      const page = LEGAL_COPY[language].pages[pageId];
      assert.ok(page?.title, `${language}.${pageId}.title`);
      assert.ok(page?.intro, `${language}.${pageId}.intro`);
      assert.ok(page.sections.length >= 4, `${language}.${pageId}.sections`);
    }
  }
});
