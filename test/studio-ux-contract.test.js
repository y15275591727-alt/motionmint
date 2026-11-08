import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { UI_COPY } from "../src/i18n.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("approved official-sample and CTA copy is present in both languages", () => {
  const app = read("src/App.jsx");

  assert.match(app, /galleryEyebrow:\s*"OFFICIAL SAMPLES"/);
  assert.match(app, /galleryEyebrow:\s*"官方示例"/);
  assert.equal(UI_COPY.en.community.eyebrow, "OFFICIAL SAMPLES");
  assert.equal(UI_COPY.zh.community.eyebrow, "官方示例");
  assert.equal(UI_COPY.en.community.title, "Official samples.");
  assert.equal(UI_COPY.zh.community.title, "官方示例。");
  assert.equal(UI_COPY.en.community.titleAccent, "See them move.");
  assert.equal(UI_COPY.zh.community.titleAccent, "看它们动起来。");
  assert.doesNotMatch(UI_COPY.en.community.description, /download/i);
  assert.doesNotMatch(UI_COPY.zh.community.description, /下载/);
  assert.doesNotMatch(UI_COPY.en.community.loadError, /community/i);
  assert.doesNotMatch(UI_COPY.zh.community.loadError, /社区/);
  assert.doesNotMatch(app, /Community portrait loaded\./);
  assert.equal(UI_COPY.en.footer.action, "Create a video");
  assert.equal(UI_COPY.zh.footer.action, "创作视频");
});

test("unauthorized logo-strip brands are absent", () => {
  const app = read("src/App.jsx");

  assert.doesNotMatch(app, />\s*(?:NOVA|PYXL|FORME|HYPER|MINT)\s*</);
});

test("motion dropzone and demo filenames use localized, honest labels", () => {
  const app = read("src/App.jsx");

  assert.equal(UI_COPY.en.studio.motionDropHint, "or use a trending clip");
  assert.equal(UI_COPY.zh.studio.motionDropHint, "或使用热门动作片段");
  assert.equal(UI_COPY.en.studio.demoCharacterFile, "Demo character");
  assert.equal(UI_COPY.zh.studio.demoCharacterFile, "示例角色");
  assert.equal(UI_COPY.en.studio.demoMotionFile, "Demo motion");
  assert.equal(UI_COPY.zh.studio.demoMotionFile, "示例动作");
  assert.match(app, /label=\{copy\.motionDropHint\}/);
  assert.match(app, /new File\(\[imageBlob\], copy\.demoCharacterFile/);
  assert.match(app, /new File\(\[motionBlob\], copy\.demoMotionFile/);
  assert.doesNotMatch(app, /motionmint-character\.jpg/);
  assert.doesNotMatch(app, /motionmint-motion\.mp4/);
});

test("trial capacity is the only highlighted quota on trial-eligible tools", () => {
  const app = read("src/App.jsx");

  assert.equal(UI_COPY.en.studio.trialLeft, "trial left");
  assert.equal(UI_COPY.en.studio.trialsLeft, "trials left");
  assert.match(app, /function trialCountLabel\(count, copy\)/);
  assert.match(app, /remaining === 1 \? copy\.trialLeft : copy\.trialsLeft/);
  assert.match(app, /trialEligible \? trialCountLabel\(trialRemaining, copy\) : `\$\{tool\.cost\} \$\{copy\.credits\}`/);
  assert.match(app, /trialEligible \? trialCountLabel\(trialRemaining, copy\) : `\$\{tool\.cost\} \$\{copy\.creditsPerRender\}`/);
  assert.match(app, /trialEligible \? copy\.freeRenders : copy\.availableCredits/);
  assert.doesNotMatch(app, /<strong>\{trialRemaining\} \/ \{trialLimit\}<\/strong>/);
});

test("priority render is an actual default-off form control", () => {
  const app = read("src/App.jsx");

  assert.match(app, /priority:\s*false/);
  assert.match(app, /data\.append\("priority", String\(form\.priority\)\)/);
  assert.match(app, /className=\{`toggle \$\{form\.priority \? "active" : ""\}`\}/);
  assert.match(app, /aria-pressed=\{form\.priority\}/);
  assert.match(app, /setForm\(\{ \.\.\.form, priority: !form\.priority \}\)/);
  assert.doesNotMatch(app, /className="toggle active" aria-pressed="true"/);
});

test("gallery defaults to People and hides zero engagement counts", () => {
  const app = read("src/App.jsx");

  assert.match(app, /const \[filter, setFilter\] = useState\("People"\)/);
  assert.match(app, /import \{ visibleDownloadCount \} from "\.\/gallery\.js"/);
  assert.match(app, /const downloadCount = visibleDownloadCount\(item\.downloads\)/);
  assert.match(app, /downloadCount !== null && \(/);
  assert.doesNotMatch(app, /Number\(item\.downloads\) > 0 && \(/);
  assert.doesNotMatch(app, /\{item\.downloads \|\| 0\}/);
});

test("Google sign-in renders only when OAuth is configured", () => {
  const app = read("src/App.jsx");

  assert.match(app, /\{providers\.googleOAuth && \(\s*<button\s+className="auth-provider"/);
  assert.doesNotMatch(app, /if \(!providers\.googleOAuth\)/);
  assert.doesNotMatch(app, /onToast\(copy\.googleUnavailable\)/);
});

test("library shows the current render before the generate request settles", () => {
  const app = read("src/App.jsx");

  const generate = app.slice(app.indexOf("async function generate("), app.indexOf("async function copyInvite("));
  assert.match(generate, /setLibraryItems\(\(current\) => mergeLibraryItems\(current, pendingItem\)\)/);
  assert.ok(generate.indexOf("mergeLibraryItems(current, pendingItem)") < generate.indexOf('apiFetch("/api/generate"'));
  assert.match(generate, /replaceLibraryItem\(current, pendingId,/);
});

test("library merges every polled status and keeps retrying transient poll failures", () => {
  const app = read("src/App.jsx");
  const generate = app.slice(app.indexOf("async function generate("), app.indexOf("async function copyInvite("));
  const openLibrary = app.slice(app.indexOf("async function openLibrary("), app.indexOf("function openLibraryItem("));

  assert.match(generate, /mergeLibraryItems\(current, jobData\)/);
  assert.match(generate, /POLL_MAX_CONSECUTIVE_FAILURES/);
  assert.match(generate, /consecutivePollFailures/);
  assert.match(openLibrary, /payload\.items \|\| \[\]/);
  assert.match(openLibrary, /mergeLibraryItems\(items, localItem\)/);
});

test("library empty copy waits for both loading and active jobs to settle", () => {
  const app = read("src/App.jsx");
  const library = app.slice(app.indexOf("async function openLibrary("), app.indexOf("function openLibraryItem("));

  assert.match(app, /const hasActiveLibraryItems = libraryItems\.some\(isActiveJob\)/);
  assert.match(app, /libraryLoading \? \(/);
  assert.match(
    app,
    /!libraryLoading && !hasActiveLibraryItems && libraryItems\.length === 0[\s\S]*?Your first finished render will appear here\./
  );
  assert.match(library, /setLibraryOpen\(true\)/);
});

test("failed library cards keep their failure status and show user-safe unavailable copy", () => {
  const app = read("src/App.jsx");
  const libraryModal = app.slice(app.indexOf("{libraryOpen && ("), app.indexOf("{referralOpen && ("));

  assert.match(libraryModal, /<em>\{item\.status\}<\/em>/);
  assert.match(libraryModal, /item\.status === "failed" && \([\s\S]*?\{copy\.generateUnavailable\}/);
  assert.doesNotMatch(libraryModal, /copy\.providerError|item\.error\.message/);
  assert.equal(
    UI_COPY.en.studio.generateUnavailable,
    "Generation is temporarily unavailable. Please try again later."
  );
  assert.equal(
    UI_COPY.zh.studio.generateUnavailable,
    "暂时无法生成，请稍后再试。"
  );
  assert.equal(UI_COPY.en.studio.toasts.generateUnavailable, UI_COPY.en.studio.generateUnavailable);
  assert.equal(UI_COPY.zh.studio.toasts.generateUnavailable, UI_COPY.zh.studio.generateUnavailable);
  assert.doesNotMatch(
    `${UI_COPY.en.studio.generateUnavailable} ${UI_COPY.en.studio.toasts.generateUnavailable}`,
    /credits?|quota|balance|provider|vendor|viggle/i
  );
});

test("accepted jobs that later fail toast localized unavailable copy instead of the raw stored reason", () => {
  const app = read("src/App.jsx");
  const generate = app.slice(app.indexOf("async function generate("), app.indexOf("async function copyInvite("));

  assert.match(
    generate,
    /if \(jobData\.status === "failed"\) \{[\s\S]*?onToast\(copy\.toasts\.generateUnavailable\);/
  );
  assert.doesNotMatch(generate, /onToast\(jobData\.error/);
});

test("start failures keep a failed optimistic card and explain that generation is unavailable", () => {
  const app = read("src/App.jsx");
  const generate = app.slice(app.indexOf("async function generate("), app.indexOf("async function copyInvite("));
  const requestFailure = generate.slice(
    generate.indexOf("if (!response.ok) {"),
    generate.indexOf("const acceptedItem")
  );
  const generateCatch = generate.slice(generate.lastIndexOf("    } catch (error) {"));

  assert.match(requestFailure, /payload\.code === "PAYMENT_REQUIRED"[\s\S]*?onAuth\(\)/);
  assert.match(generateCatch, /const unavailableItem = \{[\s\S]*?status: "failed"/);
  assert.match(generateCatch, /replaceLibraryItem\(current, pendingId, unavailableItem\)/);
  assert.match(generateCatch, /onToast\(copy\.toasts\.generateUnavailable\)/);
  assert.doesNotMatch(generateCatch, /onToast\(error\.message\)/);
});

test("studio preview uses only real workspace assets in empty-stage slots", () => {
  const app = read("src/App.jsx");
  const preview = app.slice(app.indexOf("function WorkspacePreview"), app.indexOf("function Studio("));

  assert.match(preview, /files,/);
  assert.match(preview, /form,/);
  assert.match(preview, /const sourcePreview =/);
  assert.match(preview, /const motionPreview =/);
  assert.match(preview, /src=\{sourcePreview\}/);
  assert.match(preview, /src=\{motionPreview\}/);
  assert.doesNotMatch(preview, /src="\/images\/character-one\.jpg"/);
  assert.doesNotMatch(preview, /src="\/videos\/neon-dance-1\.mp4"/);
  assert.match(app, /templateMotion:\s*""/);
  assert.match(app, /<WorkspacePreview[\s\S]*?files=\{files\}[\s\S]*?form=\{form\}/);
  assert.equal(UI_COPY.en.studio.workspaceReadyTitle, "Your assets are ready.");
  assert.equal(UI_COPY.zh.studio.workspaceReadyTitle, "素材已就绪。");
});

test("ready assets never trigger missing-asset guidance", () => {
  const app = read("src/App.jsx");

  assert.match(app, /const assetsReady = tool\.mode === "duo" \? Boolean\(sourcePreview && motionPreview\)/);
  assert.match(app, /assetsReady && tool\.mode !== "prompt"\s*\? copy\.workspaceReadyTitle\s*:/);
  assert.match(app, /assetsReady && tool\.mode !== "prompt"\s*\? copy\.workspaceReadyText\s*:/);
  assert.match(app, /const missingAssetsCopy = !sourcePreview[\s\S]*?copy\.mixAssetsMissing[\s\S]*?: copy\.motionMissing/);
  assert.match(
    app,
    /!files\.image && motionReady\s*\?\s*copy\.mixAssetsMissing\s*:\s*!files\.image\s*\?\s*copy\.characterMissing\s*:\s*copy\.motionMissing/
  );
});

test("narrow header keeps the primary CTA intrinsically sized", () => {
  const styles = read("src/styles.css");

  assert.match(
    styles,
    /\.header-actions \.button \{[\s\S]*?flex-shrink:\s*0;[\s\S]*?width:\s*max-content;[\s\S]*?min-width:\s*max-content;/
  );
  assert.doesNotMatch(
    styles,
    /\.header-actions \.button \{[\s\S]*?min-width:\s*0;[\s\S]*?\}/
  );
});

test("hero and Character Mix keep one identity and never use the unrelated dancer result", () => {
  const app = read("src/App.jsx");
  const hero = app.slice(app.indexOf("function Hero("), app.indexOf("function ToolBento("));
  const tools = app.slice(app.indexOf("function ToolBento("), app.indexOf("function MotionShowcase("));

  assert.match(hero, /src="\/images\/character-one\.jpg"/);
  assert.match(hero, /src="\/images\/scene-rave\.jpg"/);
  assert.doesNotMatch(hero, /neon-dance-1\.mp4|hero-dancer\.jpg/);

  assert.match(tools, /<img src="\/images\/character-one\.jpg"/);
  assert.match(tools, /<img src="\/images\/scene-rave\.jpg"/);
  assert.doesNotMatch(tools, /neon-dance-1\.mp4|hero-dancer\.jpg/);
});

test("both galleries fall back to categorized official samples and offer a studio CTA when empty", () => {
  const app = read("src/App.jsx");
  const gallery = app.slice(app.indexOf("function Gallery("), app.indexOf("function TemplateRail("));
  const community = app.slice(app.indexOf("function CommunityGallery("), app.indexOf("function Pricing("));

  assert.match(app, /function officialGalleryFallback\(copy\)/);
  assert.match(app, /const GALLERY_CATEGORY_ORDER = \["People", "Models", "Stylized", "Motion"\]/);
  assert.match(gallery, /items\?\.length \? items : fallbackItems/);
  assert.match(gallery, /\.filter\(\(item\) => item\.category === "People"\)/);
  assert.match(community, /items\?\.length \? items : fallbackItems/);
  assert.match(community, /const \[filter, setFilter\] = useState\("People"\)/);
  assert.match(community, /className="community-official"/);
  assert.match(community, /UI_COPY\[lang\]\.footer\.action/);
  assert.match(community, /onClick=\{\(\) => onStart\("mix"\)\}/);
  assert.equal(UI_COPY.en.community.emptyTitle, "Nothing in this collection yet.");
});

test("studio settings start collapsed and the Scene Remake notice is neutral", () => {
  const app = read("src/App.jsx");
  const creator = app.slice(app.indexOf("function CreatorPanel("), app.indexOf("function WorkspacePreview("));

  assert.match(creator, /const \[settingsOpen, setSettingsOpen\] = useState\(false\)/);
  assert.match(creator, /aria-expanded=\{settingsOpen\}/);
  assert.match(creator, /onClick=\{\(\) => setSettingsOpen\(\(open\) => !open\)\}/);
  assert.match(creator, /\{settingsOpen && <div className="settings-grid">/);
  assert.match(creator, /className="form-note">\{copy\.sceneRemakeTrialNote\}/);
  assert.equal(UI_COPY.en.studio.sceneRemakeTrialNote, "Scene Remake is not included in the free trial.");
  assert.match(app, /nav-section nav-section-next/);
});

test("auth providers are configuration-gated and guest is the visible secondary action", () => {
  const app = read("src/App.jsx");

  assert.match(app, /useState\(\{ googleOAuth: false, wallet: false, stripe: false \}\)/);
  assert.match(app, /\{providers\.wallet && \(/);
  assert.match(app, /<\/form>\s*<button className="button button-ghost button-block auth-guest"/);
  assert.equal(UI_COPY.en.auth.description, "Save projects and keep your trial history across devices.");
});

test("paid checkout is blocked client-side until Stripe is configured", () => {
  const app = read("src/App.jsx");
  const checkout = app.slice(app.indexOf("async function checkout("), app.indexOf("function authSuccess("));

  assert.match(checkout, /if \(!providers\.stripe\)\s*\{[\s\S]*?showToast\(UI_COPY\[lang\]\.billing\.soon\);[\s\S]*?return;/);
  assert.ok(checkout.indexOf("!providers.stripe") < checkout.indexOf("/api/billing/checkout"));
  assert.equal(UI_COPY.en.billing.soon, "Paid plans are coming soon. No payment was started.");
});

test("homepage responsive contracts preserve the hero title, CTA, motion title, and studio access", () => {
  const styles = read("src/styles.css");
  const app = read("src/App.jsx");

  assert.match(styles, /\.site-nav-language \{ display: none; \}/);
  assert.match(styles, /\.header-actions > \.language-button \{ display: none; \}/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\);\s*gap: 42px;/);
  assert.match(styles, /\.hero h1 \{[\s\S]*?overflow: visible;[\s\S]*?text-wrap: balance;/);
  assert.match(styles, /\.bento-motion h3 \{[\s\S]*?max-width: 68%;[\s\S]*?overflow: visible;[\s\S]*?white-space: normal;/);
  assert.match(styles, /\.sample-assets \{ order: 1; margin-top: 0; \}/);
  assert.match(styles, /\.duo-upload \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.gallery-grid \{ display: flex; flex-wrap: wrap; gap: 14px; \}/);
  assert.match(
    styles,
    /\.motion-card \{[\s\S]*?flex: 0 0 calc\(\(100% - 28px\) \/ 3\);[\s\S]*?min-height: 460px;/
  );
  assert.match(
    styles,
    /@media \(max-width: 1100px\) \{[\s\S]*?\.motion-card \{ flex-basis: calc\(\(100% - 14px\) \/ 2\); \}/
  );
  assert.match(
    styles,
    /@media \(max-width: 560px\) \{[\s\S]*?\.motion-card \{ flex-basis: 100%; \}/
  );
  assert.doesNotMatch(app, /logo-strip/);
});
