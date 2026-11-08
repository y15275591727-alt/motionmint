import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { UI_COPY } from "../src/i18n.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("referral payouts award four credits to both sides and keep the ten-invite limit", () => {
  const db = read("server/db.js");

  assert.match(db, /if \(Number\(rewardedThisMonth\.count \|\| 0\) >= 10\) return null;/);
  assert.match(db, /addCredits\(referral\.referrer_user_id, 4\);/);
  assert.match(db, /addCredits\(referral\.referred_user_id, 4\);/);
});

test("referral copy shows the four-credit payout and forty-credit monthly cap", () => {
  const app = read("src/App.jsx");
  const readme = read("README.md");
  const en = UI_COPY.en;
  const zh = UI_COPY.zh;

  assert.match(app, /Win 4 credits when an invited creator completes their first generation\. They get 4 too\./);
  assert.match(app, /好友完成首次生成后，你和好友各得 4 积分。/);
  assert.match(app, /<h2>4 credits for each of you\.<\/h2>/);
  assert.match(
    app,
    /Your friend creates once, then both accounts get 4 credits\. Rewards are capped at 40 credits per month\./
  );
  assert.match(app, /Math\.min\(40, Number\(referralData\?\.rewarded \|\| 0\) \* 4\)\} \/ 40 credits/);
  assert.match(app, /Math\.min\(100, Number\(referralData\?\.rewarded \|\| 0\) \* 10\)/);

  assert.equal(
    en.growth.text,
    "They create once. You both get 4 credits, up to 40 credits in referral rewards each month."
  );
  assert.match(en.faq.items[2][1], /both accounts receive 4 credits/);
  assert.equal(en.studio.inviteReward, "You both get 4 credits");
  assert.equal(en.studio.referralTitle, "4 credits for each of you.");
  assert.match(en.studio.referralText, /get 4 credits.*capped at 40 credits per month/);

  assert.match(zh.growth.text, /各得 4 积分.*最多 40 积分/);
  assert.match(zh.faq.items[2][1], /各得 4 积分/);
  assert.equal(zh.studio.inviteReward, "双方各得 4 积分");
  assert.equal(zh.studio.referralTitle, "你们各得 4 积分。");
  assert.match(zh.studio.referralText, /各得 4 积分.*上限为 40 积分/);

  assert.match(readme, /with a 40-credit monthly cap/);
});
