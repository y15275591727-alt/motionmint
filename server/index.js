import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import { Readable } from "node:stream";
import Stripe from "stripe";
import { verifyMessage } from "viem";
import { createViggleJob, readViggleJob } from "./viggle.js";
import { clientGenerationError } from "./generation-errors.js";
import {
  addCredits,
  attachReferral,
  attachUserToSession,
  awardReferralForGeneration,
  consumeCredits,
  consumeWalletChallenge,
  createJob,
  createSession,
  createUser,
  db,
  decrementAnonUsage,
  decrementUserTrial,
  deleteSession,
  getAnonUsage,
  getReferralSummary,
  getSession,
  getUserByEmail,
  getUserById,
  getUserByGoogleSub,
  getUserByStripeCustomer,
  getUserByWallet,
  incrementAnonUsage,
  incrementUserTrial,
  markBillingEvent,
  refundCredits,
  saveWalletChallenge,
  setStripeCustomer,
  updateJob,
  verifyPassword
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const app = express();
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.VIGGLE_API_KEY?.trim();
const stripe = process.env.STRIPE_SECRET_KEY?.trim()
  ? new Stripe(process.env.STRIPE_SECRET_KEY.trim())
  : null;
const appUrl = process.env.APP_URL?.replace(/\/$/, "") || `http://localhost:${port}`;
const adminToken = process.env.ADMIN_TOKEN?.trim() || (() => {
  const adminPath = path.join(projectRoot, "data", "admin-token.txt");
  fs.mkdirSync(path.dirname(adminPath), { recursive: true });
  if (fs.existsSync(adminPath)) return fs.readFileSync(adminPath, "utf8").trim();
  const token = randomBytes(24).toString("base64url");
  fs.writeFileSync(adminPath, token, { encoding: "utf8", mode: 0o600 });
  return token;
})();

const RENDER_COSTS = { mix: 4, motion: 4, remake: 12, video: 8, image: 1, character: 20 };
const TRIAL_WORKFLOWS = new Set(["mix", "motion", "video", "image"]);
const SUBSCRIPTION_CREDITS = { creator: 150, studio: 600 };
const MOTION_TEMPLATE_FILES = new Set([
  "neon-dance-1.mp4",
  "neon-dance-2.mp4",
  "mirror-dance.mp4",
  "street-dance.mp4",
  "fashion-pose.mp4",
  "rolling-dance.mp4",
  "duo-motion.mp4",
  "neon-style.mp4"
]);

const DEFAULT_SETTINGS = {
  siteName: "MotionMint",
  heroTitle: "Make anyone move.",
  trialLimit: "3",
  allowRegistrations: "true",
  publicGallery: "true",
  watermarkEnabled: "true",
  supportEmail: "support@motionmint.local"
};

for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
  db.prepare("INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)").run(key, value);
}

const seededContent = [
  ["midnight-run", "Midnight Run", "A fashion portrait becomes a late-night dance film under mirrored neon.", "People", "video", "/videos/neon-dance-1.mp4", "/images/scene-rave.jpg", "A fashion portrait dancing in a mirrored room with red and blue neon, cinematic motion, 9:16.", "MotionMint Mix", "9:16", "1080p", "Ari Chen", 1, 0],
  ["afterglow", "Afterglow", "Character transfer with a clean editorial silhouette and liquid light.", "People", "video", "/videos/neon-dance-2.mp4", "/images/scene-urban.jpg", "Editorial character motion in a dark neon corridor, clean silhouette, cinematic grade.", "MotionMint Mix", "9:16", "1080p", "Mina Vale", 1, 1],
  ["electric-bloom", "Electric Bloom", "A saturated neon performance built for vertical social feeds.", "People", "video", "/videos/neon-style.mp4", "/images/editorial-04.jpg", "A performer in a saturated neon room, confident street-style movement, vertical video.", "MotionMint Motion", "9:16", "1080p", "Jules K", 0, 2],
  ["after-hours", "After Hours", "Street-dance energy with a filmic, high-contrast finish.", "People", "video", "/videos/street-dance.mp4", "/images/editorial-08.jpg", "Street dance performance with cinematic contrast and a dark urban background.", "MotionMint Motion", "9:16", "1080p", "Rae O.", 0, 3],
  ["double-take", "Double Take", "Two characters share one continuous shot and a single visual rhythm.", "People", "video", "/videos/duo-motion.mp4", "/images/editorial-07.jpg", "Two performers in a coordinated fashion motion sequence, mirrored timing, neon accents.", "MotionMint Multi", "9:16", "1080p", "Kade", 1, 4],
  ["city-signal", "City Signal", "A moving editorial frame with a built-in sense of discovery.", "Motion", "video", "/videos/fashion-pose.mp4", "/images/scene-urban.jpg", "A fashion subject moving through an urban night scene, low-angle camera, cinematic.", "MotionMint Motion", "16:9", "1080p", "Noah L.", 0, 5],
  ["mirror-step", "Mirror Step", "A clean reference performance for dance and character testing.", "Motion", "video", "/videos/mirror-dance.mp4", "/images/scene-urban.jpg", "A person dancing in a mirror room with clear full-body motion and neon light.", "MotionMint Motion", "9:16", "1080p", "RD Studio", 0, 6],
  ["rolling-shot", "Rolling Shot", "Camera movement, body motion and atmosphere compressed into one loop.", "Motion", "video", "/videos/rolling-dance.mp4", "/images/editorial-03.jpg", "Rolling camera view of a dancer with a dark cinematic atmosphere.", "MotionMint Motion", "16:9", "1080p", "Theo Park", 0, 7],
  ["polygon-study", "Polygon Study", "A soft procedural 3D form designed as a reusable hero asset.", "Models", "image", "/images/three-d-02.jpg", "/images/three-d-02.jpg", "A soft pastel 3D sculpture on a curved gradient surface, studio lighting, ultra-clean.", "MotionMint Image", "1:1", "2K", "3D Lab", 1, 8],
  ["chrome-unit", "Chrome Unit", "A character study that blends robotics, fashion and product design.", "Models", "image", "/images/three-d-04.jpg", "/images/three-d-04.jpg", "A small articulated robot model sitting on a bench, cinematic natural light, editorial product photography.", "MotionMint Image", "16:9", "2K", "M-01", 0, 9],
  ["spectral-ribbon", "Spectral Ribbon", "A bright art-direction frame for title cards and transitions.", "Models", "image", "/images/three-d-03.jpg", "/images/three-d-03.jpg", "Abstract chromatic ribbon forms with saturated cyan, yellow and red lighting, high detail.", "MotionMint Image", "16:9", "2K", "Atelier X", 0, 10],
  ["neon-idol", "Neon Idol", "A stylized fashion character designed for music and social content.", "Stylized", "image", "/images/stylized-01.jpg", "/images/stylized-01.jpg", "Anime-inspired fashion idol in red and black, dramatic stage light, graphic silhouette.", "MotionMint Image", "9:16", "2K", "Yuki N.", 1, 11],
  ["ink-muse", "Ink Muse", "Illustrated character studies pinned inside a working creator studio.", "Stylized", "image", "/images/stylized-04.jpg", "/images/stylized-04.jpg", "A wall of expressive illustrated character studies in a sunlit creative studio.", "MotionMint Image", "16:9", "2K", "Line Room", 0, 12],
  ["prism-atlas", "Prism Atlas", "A technical visual language for futuristic interfaces and title sequences.", "Models", "image", "/images/three-d-01.jpg", "/images/three-d-01.jpg", "A precise white technical illustration of geometric optics and motion diagrams.", "MotionMint Image", "1:1", "2K", "Object Office", 0, 13]
];

for (const item of seededContent) {
  db.prepare(`
    INSERT OR IGNORE INTO content_items
      (id, title, description, category, media_type, media_url, poster_url, prompt, model, aspect_ratio, resolution, author, featured, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(...item, Date.now());
}

const galleryModelRenames = [
  ["Viggle Mix", "MotionMint Mix"],
  ["Viggle Motion", "MotionMint Motion"],
  ["Viggle Multi-Character", "MotionMint Multi"],
  ["Viggle H3", "MotionMint Motion"]
];
for (const [previousName, nextName] of galleryModelRenames) {
  db.prepare("UPDATE content_items SET model = ? WHERE model = ?").run(nextName, previousName);
}
db.prepare("UPDATE content_items SET model = 'MotionMint Auto' WHERE model LIKE 'Viggle%'").run();

function getSetting(key, fallback = "") {
  return db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key)?.value ?? fallback;
}

function trialLimit() {
  return Math.max(1, Math.min(20, Number(getSetting("trialLimit", "3")) || 3));
}

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (request, response) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return response.status(503).json({ error: "Stripe webhook is not configured." });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      request.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (!markBillingEvent(`checkout:${session.id}`)) return response.json({ received: true });
    const userId = session.metadata?.userId;
    const product = session.metadata?.product;
    if (userId && session.customer) setStripeCustomer(userId, String(session.customer));
    if (userId && product === "pack100") addCredits(userId, 100, "payg");
    if (userId && SUBSCRIPTION_CREDITS[product]) addCredits(userId, SUBSCRIPTION_CREDITS[product], product);
  }
  if (event.type === "invoice.paid" && event.data.object.billing_reason === "subscription_cycle") {
    const invoice = event.data.object;
    if (!markBillingEvent(`invoice:${invoice.id}`)) return response.json({ received: true });
    const user = getUserByStripeCustomer(String(invoice.customer));
    const priceIds = invoice.lines?.data?.map((line) => line.price?.id).filter(Boolean) || [];
    const plan = priceIds.includes(process.env.STRIPE_PRICE_STUDIO) ? "studio"
      : priceIds.includes(process.env.STRIPE_PRICE_CREATOR) ? "creator"
      : null;
    if (user && plan) addCredits(user.id, SUBSCRIPTION_CREDITS[plan], plan);
  }
  response.json({ received: true });
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(projectRoot, "dist")));
app.use("/images", express.static(path.join(projectRoot, "public", "images")));
app.use("/videos", express.static(path.join(projectRoot, "public", "videos")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 10 }
});

const demoPosters = {
  mix: "/images/scene-rave.jpg",
  motion: "/images/scene-urban.jpg",
  remake: "/images/scene-urban.jpg",
  video: "/images/scene-rave.jpg",
  image: "/images/hero-portrait.jpg",
  character: "/images/character-two.jpg"
};

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1 ? [part, ""] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function sessionCookie(token) {
  return [
    `mm_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=31536000",
    process.env.COOKIE_SECURE === "true" ? "Secure" : ""
  ].filter(Boolean).join("; ");
}

function clearSessionCookie() {
  return "mm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function oauthStateCookie(state) {
  return `mm_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
}

function clearOauthStateCookie() {
  return "mm_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

function ipHash(request) {
  return createHash("sha256").update(request.ip || "unknown").digest("hex").slice(0, 24);
}

function deviceId(request) {
  return String(request.get("x-device-id") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96);
}

function guestUsageKey(session) {
  return createHash("sha256")
    .update(`${session.device_id || "unknown"}|${session.ip_hash || "unknown"}`)
    .digest("hex");
}

function ensureSession(request, response) {
  const cookies = parseCookies(request.headers.cookie);
  let token = cookies.mm_session;
  let session = getSession(token);
  if (!session) {
    token = createSession({ deviceId: deviceId(request), ipHash: ipHash(request) });
    session = getSession(token);
    response.setHeader("Set-Cookie", sessionCookie(token));
  }
  return { token, session };
}

function publicSession(session) {
  const user = session.user_id ? getUserById(session.user_id) : null;
  if (user) {
    return {
      guest: false,
      trialRemaining: Math.max(0, trialLimit() - Number(user.trial_used || 0)),
      credits: Number(user.credits || 0),
      plan: user.plan,
      status: user.status,
      user: {
        id: user.id,
        email: user.email,
        wallet: user.wallet_address,
        provider: user.auth_provider,
        displayName: user.email?.split("@")[0] || (user.wallet_address ? `${user.wallet_address.slice(0, 6)}…${user.wallet_address.slice(-4)}` : "Creator")
      }
    };
  }
  const usage = getAnonUsage(guestUsageKey(session));
  return {
    guest: true,
    trialRemaining: Math.max(0, trialLimit() - Number(usage.renders || 0)),
    credits: 0,
    plan: "free",
    user: null
  };
}

function upgradeSession(token, userId) {
  attachUserToSession(token, userId);
}

function reserveUse(session, workflow) {
  const cost = RENDER_COSTS[workflow] || RENDER_COSTS.mix;
  if (session.user_id) {
    const user = getUserById(session.user_id);
    if (user && Number(user.credits) >= cost && consumeCredits(user.id, cost)) {
      return { mode: "credits", cost, userId: user.id, trialKey: null };
    }
    if (TRIAL_WORKFLOWS.has(workflow) && Number(user?.trial_used || 0) < trialLimit()) {
      incrementUserTrial(user.id);
      return { mode: "trial", cost: 0, userId: user.id, trialKey: null };
    }
  } else if (TRIAL_WORKFLOWS.has(workflow)) {
    const key = guestUsageKey(session);
    const usage = getAnonUsage(key);
    if (Number(usage.renders || 0) < trialLimit()) {
      incrementAnonUsage(key);
      return { mode: "trial", cost: 0, userId: null, trialKey: key };
    }
  }
  return null;
}

function rollbackUse(reservation) {
  if (!reservation) return;
  if (reservation.mode === "credits" && reservation.userId) refundCredits(reservation.userId, reservation.cost);
  if (reservation.mode === "trial") {
    if (reservation.userId) decrementUserTrial(reservation.userId);
    if (reservation.trialKey) decrementAnonUsage(reservation.trialKey);
  }
}

function getAuthorizedJob(id, token, session) {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
  if (!job) return null;
  if (job.owner_session === token) return job;
  if (session.user_id && job.user_id === session.user_id) return job;
  return null;
}

function safeErrorMessage(error, fallback = "The render could not be completed.") {
  const message = String(error?.message || "")
    .replace(/https?:\/\/\S+/gi, "[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .trim()
    .slice(0, 240);
  return message || fallback;
}

function serializeStoredJob(job) {
  let result = null;
  try {
    result = job.result_json ? JSON.parse(job.result_json) : null;
  } catch {
    result = null;
  }
  const { result_json: _resultJson, provider_id: _providerId, ...safeItem } = job;
  return {
    ...safeItem,
    video_url: result?.video_url || null,
    images: result?.images || [],
    error: result?.error || null
  };
}

async function refreshProviderJob(job, { allowTerminal = false } = {}) {
  if (job.mode !== "live" || !job.provider_id) return null;
  if (!allowTerminal && ["ready", "failed"].includes(job.status)) return null;
  const providerJob = await readViggleJob({
    apiKey,
    providerId: job.provider_id,
    kind: job.kind
  });
  const providerProgress = Number.isFinite(Number(providerJob.progress))
    ? Number(providerJob.progress)
    : Number(job.progress || 0);
  const providerStage = providerJob.stage || providerJob.status || job.stage || "queued";
  const terminal = providerJob.status === "ready" || providerJob.status === "failed";
  updateJob(job.id, {
    status: providerJob.status,
    progress: providerProgress,
    stage: providerStage,
    ...(terminal ? { resultJson: JSON.stringify(providerJob) } : {})
  });
  job.status = providerJob.status;
  job.progress = providerProgress;
  job.stage = providerStage;
  if (terminal) job.result_json = JSON.stringify(providerJob);
  return providerJob;
}

function requireAdmin(request, response, next) {
  const bearer = String(request.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer || bearer !== adminToken) {
    return response.status(401).json({ error: "Admin token is invalid." });
  }
  next();
}

app.get("/api/status", (_request, response) => {
  const live = Boolean(apiKey);
  response.json({
    provider: live ? "live" : "demo",
    trials: trialLimit(),
    stripe: Boolean(stripe),
    message: live
      ? "Live generation available."
      : "Demo workspace: generation is simulated in this environment."
  });
});

app.get("/api/config", (_request, response) => {
  response.json({
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    wallet: process.env.WALLET_AUTH_ENABLED === "true",
    stripe: Boolean(stripe),
    subscriptions: {
      creator: Boolean(process.env.STRIPE_PRICE_CREATOR),
      studio: Boolean(process.env.STRIPE_PRICE_STUDIO)
    }
  });
});

app.get("/api/auth/session", (request, response) => {
  const { session } = ensureSession(request, response);
  response.json(publicSession(session));
});

app.post("/api/auth/register", (request, response) => {
  if (getSetting("allowRegistrations", "true") !== "true") {
    return response.status(403).json({ error: "New account registration is temporarily paused." });
  }
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8) {
    return response.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (getUserByEmail(email)) {
    return response.status(409).json({ error: "An account already exists for this email." });
  }

  const { token, session } = ensureSession(request, response);
  const guestUses = session.user_id ? 0 : Number(getAnonUsage(guestUsageKey(session)).renders || 0);
  const user = createUser({ email, password, provider: "email", trialUsed: guestUses });
  attachReferral(request.body.referralCode, user.id);
  upgradeSession(token, user.id);
  response.setHeader("Set-Cookie", sessionCookie(token));
  response.status(201).json(publicSession(getSession(token)));
});

app.post("/api/auth/login", (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  const user = getUserByEmail(email);
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash, user.password_salt)) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }
  if (user.status !== "active") {
    return response.status(403).json({ error: "This account is suspended. Contact support." });
  }
  const { token } = ensureSession(request, response);
  upgradeSession(token, user.id);
  response.setHeader("Set-Cookie", sessionCookie(token));
  response.json(publicSession(getSession(token)));
});

app.post("/api/auth/logout", (request, response) => {
  const { token } = ensureSession(request, response);
  deleteSession(token);
  response.setHeader("Set-Cookie", clearSessionCookie());
  response.json({ ok: true });
});

app.get("/api/referral", (request, response) => {
  const { session } = ensureSession(request, response);
  if (!session.user_id) return response.status(401).json({ error: "Sign in to create an invite link." });
  response.json(getReferralSummary(session.user_id));
});

app.get("/api/auth/google/start", (request, response) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return response.status(503).send("Google OAuth is not configured.");
  }
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`;
  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state
  });
  response.setHeader("Set-Cookie", oauthStateCookie(state));
  response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/api/auth/google/callback", async (request, response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return response.status(503).send("Google OAuth is not configured.");
  }
  try {
    const cookies = parseCookies(request.headers.cookie);
    if (!request.query.state || request.query.state !== cookies.mm_oauth_state) {
      throw new Error("Google sign-in state did not match.");
    }
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(request.query.code || ""),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokens.error_description || "Google token exchange failed.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error("Google profile could not be read.");

    let user = getUserByGoogleSub(profile.sub) || getUserByEmail(profile.email);
    if (!user) user = createUser({ email: profile.email, provider: "google", googleSub: profile.sub });
    attachReferral(parseCookies(request.headers.cookie).mm_ref, user.id);
    const { token } = ensureSession(request, response);
    upgradeSession(token, user.id);
    response.setHeader("Set-Cookie", [clearOauthStateCookie(), sessionCookie(token)]);
    response.redirect(`${appUrl}/#studio`);
  } catch (error) {
    response.redirect(`${appUrl}/?auth_error=${encodeURIComponent(error.message)}`);
  }
});

app.post("/api/auth/wallet/challenge", (request, response) => {
  const address = String(request.body.address || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return response.status(400).json({ error: "A valid EVM wallet address is required." });
  }
  const nonce = randomBytes(16).toString("hex");
  const message = [
    "Sign in to MotionMint",
    "",
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${new Date().toISOString()}`,
    "",
    "This signature is free and does not create a blockchain transaction."
  ].join("\n");
  saveWalletChallenge(address, nonce, message);
  response.json({ message });
});

app.post("/api/auth/wallet/verify", async (request, response) => {
  const address = String(request.body.address || "").trim();
  const signature = String(request.body.signature || "");
  const challenge = consumeWalletChallenge(address);
  if (!challenge) return response.status(400).json({ error: "Wallet challenge expired. Try again." });
  try {
    const valid = await verifyMessage({ address, message: challenge.message, signature });
    if (!valid) return response.status(401).json({ error: "Wallet signature could not be verified." });
    let user = getUserByWallet(address);
    if (!user) user = createUser({ provider: "wallet", walletAddress: address });
    const { token } = ensureSession(request, response);
    upgradeSession(token, user.id);
    response.setHeader("Set-Cookie", sessionCookie(token));
    response.json(publicSession(getSession(token)));
  } catch {
    response.status(401).json({ error: "Wallet signature could not be verified." });
  }
});

app.post("/api/billing/checkout", async (request, response) => {
  if (!stripe) {
    return response.status(503).json({ error: "Billing is not connected yet. No payment was started." });
  }
  const { session } = ensureSession(request, response);
  if (!session.user_id) return response.status(401).json({ error: "Sign in before checkout." });
  const user = getUserById(session.user_id);
  const product = String(request.body.product || "");
  if (!["pack100", "creator", "studio"].includes(product)) {
    return response.status(400).json({ error: "Unknown billing product." });
  }

  const lineItems = product === "pack100"
    ? [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 1000,
          product_data: { name: "MotionMint 100 credits" }
        }
      }]
    : [{
        quantity: 1,
        price: product === "creator" ? process.env.STRIPE_PRICE_CREATOR : process.env.STRIPE_PRICE_STUDIO
      }];

  if (lineItems.some((item) => item.price === undefined && item.price_data === undefined) || lineItems.some((item) => item.price === "")) {
    return response.status(503).json({ error: `Stripe price for ${product} is not configured.` });
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: product === "pack100" ? "payment" : "subscription",
      line_items: lineItems,
      customer_email: user.email || undefined,
      allow_promotion_codes: true,
      metadata: { userId: user.id, product },
      success_url: `${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}#studio`,
      cancel_url: `${appUrl}/?billing=cancel#studio`
    });
    response.json({ url: checkout.url });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post(
  "/api/generate",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "motion", maxCount: 1 },
    { name: "reference", maxCount: 8 }
  ]),
  async (request, response) => {
    const { token, session } = ensureSession(request, response);
    if (session.user_id && getUserById(session.user_id)?.status !== "active") {
      return response.status(403).json({ error: "This account is suspended." });
    }
    const workflow = request.body.workflow || "mix";
    const reservation = reserveUse(session, workflow);
    if (!reservation) {
      return response.status(402).json({
        error: TRIAL_WORKFLOWS.has(workflow)
          ? "Your 3 free creations are used. Sign in or add credits to continue."
          : "This workflow requires credits.",
        code: "PAYMENT_REQUIRED",
        session: publicSession(session)
      });
    }

    const localId = `mm_${randomBytes(18).toString("base64url")}`;
    const createdAt = Date.now();
    const kind = workflow === "image" ? "images" : "video";
    const mode = apiKey ? "live" : "demo";
    const initialStatus = apiKey ? "processing" : "queued";
    const initialStage = apiKey ? "analyzing" : "queued";

    createJob({
      id: localId,
      ownerSession: token,
      userId: reservation.userId,
      workflow,
      kind,
      mode,
      status: initialStatus,
      progress: 0,
      stage: initialStage,
      poster: demoPosters[workflow] || demoPosters.mix,
      prompt: request.body.prompt || "",
      aspectRatio: request.body.aspect || "16:9",
      resolution: request.body.displayResolution || request.body.resolution || "",
      createdAt
    });

    if (mode === "demo") {
      awardReferralForGeneration(reservation.userId);
      return response.status(202).json({
        id: localId,
        status: initialStatus,
        progress: 0,
        stage: initialStage,
        mode,
        workflow,
        created_at: createdAt,
        usage: reservation,
        session: publicSession(session)
      });
    }

    response.status(202).json({
      id: localId,
      status: initialStatus,
      progress: 0,
      stage: initialStage,
      mode,
      workflow,
      created_at: createdAt,
      usage: reservation,
      session: publicSession(session)
    });

    setImmediate(() => {
      void (async () => {
        try {
          const forwardedFiles = request.files || {};
          if (
            ["mix", "motion", "remake"].includes(workflow) &&
            !forwardedFiles.motion?.[0] &&
            MOTION_TEMPLATE_FILES.has(String(request.body.templateMotion || ""))
          ) {
            const templateName = String(request.body.templateMotion);
            forwardedFiles.motion = [{
              buffer: fs.readFileSync(path.join(projectRoot, "public", "videos", templateName)),
              originalname: templateName,
              mimetype: "video/mp4"
            }];
          }
          const providerJob = await createViggleJob({
            apiKey,
            workflow,
            prompt: request.body.prompt,
            fields: request.body,
            files: forwardedFiles
          });
          if (providerJob.status === "failed") {
            throw new Error(providerJob.error?.message || "The render could not be started.");
          }
          if (!providerJob.id) throw new Error("The render provider did not return a job identifier.");
          const providerProgress = Number.isFinite(Number(providerJob.progress))
            ? Number(providerJob.progress)
            : 0;
          const providerStage = providerJob.stage || providerJob.status || "queued";
          const terminal = providerJob.status === "ready" || providerJob.status === "failed";
          updateJob(localId, {
            providerId: providerJob.id,
            status: providerJob.status || "queued",
            progress: providerProgress,
            stage: providerStage,
            ...(terminal ? { resultJson: JSON.stringify(providerJob) } : {})
          });
          awardReferralForGeneration(reservation.userId);
        } catch (error) {
          const safeError = clientGenerationError(error);
          const operatorMessage = safeErrorMessage(error, "The render could not be started.");
          console.error(`[generate] Job ${localId} could not start: ${operatorMessage}`);
          updateJob(localId, {
            status: "failed",
            progress: 0,
            stage: "failed",
            resultJson: JSON.stringify({ error: safeError })
          });
          rollbackUse(reservation);
        }
      })();
    });
  }
);

app.get("/api/jobs", async (request, response) => {
  const { token, session } = ensureSession(request, response);
  const jobs = session.user_id
    ? db.prepare(
      "SELECT id, owner_session, provider_id, workflow, kind, mode, status, progress, stage, poster, result_json, prompt, aspect_ratio, resolution, created_at FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(session.user_id)
    : db.prepare(
      "SELECT id, owner_session, provider_id, workflow, kind, mode, status, progress, stage, poster, result_json, prompt, aspect_ratio, resolution, created_at FROM jobs WHERE owner_session = ? ORDER BY created_at DESC LIMIT 50"
    ).all(token);

  const refreshable = jobs
    .filter((job) => job.mode === "live" && job.provider_id && !["ready", "failed"].includes(job.status))
    .slice(0, 5);
  await Promise.all(refreshable.map(async (job) => {
    try {
      await refreshProviderJob(job);
    } catch {
      // Keep the stored row available when a provider refresh is temporarily unavailable.
    }
  }));

  response.json({ items: jobs.map(serializeStoredJob) });
});

app.get("/api/jobs/:id", async (request, response) => {
  const { token, session } = ensureSession(request, response);
  const job = getAuthorizedJob(request.params.id, token, session);
  if (!job) return response.status(404).json({ error: "Job not found." });

  if (job.mode === "demo") {
    const elapsed = Date.now() - Number(job.created_at);
    const progress = Math.min(100, Math.round((elapsed / 6500) * 100));
    const status = progress >= 100 ? "ready" : "processing";
    const stage = progress < 30 ? "analyzing" : progress < 78 ? "rendering" : "finishing";
    updateJob(job.id, { status, progress, stage });
    return response.json({
      id: job.id,
      status,
      progress,
      stage,
      poster: job.poster,
      video_url: job.kind === "video" ? job.poster : null,
      images: job.kind === "images" ? [{ url: job.poster, width: 1600, height: 900 }] : [],
      mode: "demo"
    });
  }

  if (job.mode === "live" && !job.provider_id) {
    return response.json({
      ...serializeStoredJob(job),
      session: publicSession(session)
    });
  }

  try {
    const providerJob = await refreshProviderJob(job, { allowTerminal: true });
    response.json({
      ...providerJob,
      id: job.id,
      workflow: job.workflow,
      poster: job.poster,
      created_at: job.created_at,
      mode: "live",
      session: publicSession(session)
    });
  } catch (error) {
    response.status(502).json({ error: safeErrorMessage(error, "Unable to refresh this render.") });
  }
});

app.get("/api/jobs/:id/download", async (request, response) => {
  const { token, session } = ensureSession(request, response);
  const job = getAuthorizedJob(request.params.id, token, session);
  if (!job) return response.status(404).json({ error: "Job not found." });
  if (job.status !== "ready") {
    return response.status(409).json({ error: "This render is not ready to download yet." });
  }

  if (job.mode === "demo") {
    return response.redirect(job.poster);
  }

  try {
    const cachedResult = job.result_json ? JSON.parse(job.result_json) : null;
    const providerJob = cachedResult || await readViggleJob({
      apiKey,
      providerId: job.provider_id,
      kind: job.kind
    });
    const assetUrl = job.kind === "images"
      ? providerJob?.images?.[0]?.url
      : providerJob?.video_url;
    if (!assetUrl) {
      return response.status(409).json({ error: "The finished asset does not have a download URL." });
    }

    const assetResponse = await fetch(assetUrl);
    if (!assetResponse.ok || !assetResponse.body) {
      throw new Error(`Asset download failed (${assetResponse.status}).`);
    }
    const extension = path.extname(new URL(assetUrl).pathname) || (job.kind === "images" ? ".png" : ".mp4");
    const filename = `motionmint-${job.workflow || "render"}-${job.id.slice(-6)}${extension}`;
    response.status(200);
    response.setHeader("Content-Type", assetResponse.headers.get("content-type") || "application/octet-stream");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const contentLength = assetResponse.headers.get("content-length");
    if (contentLength) response.setHeader("Content-Length", contentLength);
    Readable.fromWeb(assetResponse.body).pipe(response);
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
});

app.get("/api/billing/session/:id", async (request, response) => {
  if (!stripe) return response.status(503).json({ error: "Stripe is not configured." });
  const { session } = ensureSession(request, response);
  if (!session.user_id) return response.status(401).json({ error: "Sign in first." });
  try {
    const checkout = await stripe.checkout.sessions.retrieve(request.params.id);
    response.json({ status: checkout.payment_status, mode: checkout.mode });
  } catch (error) {
    response.status(404).json({ error: error.message });
  }
});

app.get("/api/templates", (_request, response) => {
  response.json({
    items: [
      { id: "spotlight", title: "Spotlight Walk", image: "/images/scene-rave.jpg", uses: "14.8K" },
      { id: "night-drive", title: "Night Drive", image: "/images/scene-urban.jpg", uses: "9.2K" },
      { id: "hero-pose", title: "Hero Pose", image: "/images/character-one.jpg", uses: "7.4K" },
      { id: "cover-star", title: "Cover Star", image: "/images/hero-portrait.jpg", uses: "6.1K" }
    ]
  });
});

app.get("/api/public/site", (_request, response) => {
  response.json({
    siteName: getSetting("siteName", "MotionMint"),
    heroTitle: getSetting("heroTitle", "Make anyone move."),
    trialLimit: trialLimit(),
    publicGallery: getSetting("publicGallery", "true") === "true",
    watermarkEnabled: getSetting("watermarkEnabled", "true") === "true",
    supportEmail: getSetting("supportEmail", "support@motionmint.local")
  });
});

app.get("/api/public/gallery", (request, response) => {
  if (getSetting("publicGallery", "true") !== "true") return response.json({ items: [] });
  const category = String(request.query.category || "").trim();
  const items = category && category !== "All"
    ? db.prepare("SELECT * FROM content_items WHERE published = 1 AND category = ? ORDER BY featured DESC, sort_order ASC LIMIT 60").all(category)
    : db.prepare("SELECT * FROM content_items WHERE published = 1 ORDER BY featured DESC, sort_order ASC LIMIT 60").all();
  response.json({ items });
});

app.get("/api/public/gallery/:id", (request, response) => {
  if (getSetting("publicGallery", "true") !== "true") return response.status(404).json({ error: "Public gallery is disabled." });
  const item = db.prepare("SELECT * FROM content_items WHERE id = ? AND published = 1").get(request.params.id);
  if (!item) return response.status(404).json({ error: "Gallery item not found." });
  response.json(item);
});

app.post("/api/public/gallery/:id/download", (request, response) => {
  const item = db.prepare("SELECT * FROM content_items WHERE id = ? AND published = 1").get(request.params.id);
  if (!item || !item.download_enabled) return response.status(403).json({ error: "Download is disabled for this item." });
  db.prepare("UPDATE content_items SET downloads = downloads + 1 WHERE id = ?").run(item.id);
  response.json({ url: item.media_url, filename: `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${item.media_type === "video" ? "mp4" : "jpg"}` });
});

app.get("/api/admin/summary", requireAdmin, (_request, response) => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const summary = {
    users: Number(db.prepare("SELECT count(*) count FROM users").get().count || 0),
    sessions: Number(db.prepare("SELECT count(*) count FROM sessions WHERE expires_at > ?").get(Date.now()).count || 0),
    jobs: Number(db.prepare("SELECT count(*) count FROM jobs").get().count || 0),
    jobsToday: Number(db.prepare("SELECT count(*) count FROM jobs WHERE created_at >= ?").get(dayStart.getTime()).count || 0),
    creditsOutstanding: Number(db.prepare("SELECT coalesce(sum(credits), 0) total FROM users").get().total || 0),
    referralsRewarded: Number(db.prepare("SELECT count(*) count FROM referrals WHERE status = 'rewarded'").get().count || 0),
    referralsPending: Number(db.prepare("SELECT count(*) count FROM referrals WHERE status = 'pending'").get().count || 0),
    jobsByStatus: db.prepare("SELECT status, count(*) count FROM jobs GROUP BY status").all(),
    jobsByWorkflow: db.prepare("SELECT workflow, count(*) count FROM jobs GROUP BY workflow ORDER BY count DESC").all()
  };
  response.json(summary);
});

app.get("/api/admin/users", requireAdmin, (_request, response) => {
  response.json({
    items: db.prepare(`
      SELECT id, email, wallet_address, auth_provider, credits, trial_used, plan, status, created_at
      FROM users ORDER BY created_at DESC LIMIT 100
    `).all()
  });
});

app.get("/api/admin/jobs", requireAdmin, (_request, response) => {
  response.json({
    items: db.prepare(`
      SELECT id, user_id, workflow, kind, mode, status, progress, created_at
      FROM jobs ORDER BY created_at DESC LIMIT 100
    `).all()
  });
});

app.get("/api/admin/content", requireAdmin, (_request, response) => {
  response.json({ items: db.prepare("SELECT * FROM content_items ORDER BY sort_order ASC, created_at DESC").all() });
});

app.post("/api/admin/content", requireAdmin, (request, response) => {
  const item = request.body;
  const id = String(item.id || `content_${randomBytes(8).toString("hex")}`);
  const values = [
    id,
    String(item.title || "Untitled"),
    String(item.description || ""),
    String(item.category || "People"),
    item.mediaType === "video" ? "video" : "image",
    String(item.mediaUrl || ""),
    String(item.posterUrl || item.mediaUrl || ""),
    String(item.prompt || ""),
    String(item.model || "MotionMint Auto"),
    String(item.aspectRatio || "16:9"),
    String(item.resolution || "2K"),
    String(item.author || "MotionMint Creator"),
    item.featured ? 1 : 0,
    item.published === false ? 0 : 1,
    item.downloadEnabled === false ? 0 : 1,
    Number(item.sortOrder || 0)
  ];
  db.prepare(`
    INSERT INTO content_items
      (id, title, description, category, media_type, media_url, poster_url, prompt, model, aspect_ratio, resolution, author, featured, published, download_enabled, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title, description=excluded.description, category=excluded.category,
      media_type=excluded.media_type, media_url=excluded.media_url, poster_url=excluded.poster_url,
      prompt=excluded.prompt, model=excluded.model, aspect_ratio=excluded.aspect_ratio,
      resolution=excluded.resolution, author=excluded.author, featured=excluded.featured,
      published=excluded.published, download_enabled=excluded.download_enabled, sort_order=excluded.sort_order
  `).run(...values, Date.now());
  response.json({ item: db.prepare("SELECT * FROM content_items WHERE id = ?").get(id) });
});

app.delete("/api/admin/content/:id", requireAdmin, (request, response) => {
  db.prepare("DELETE FROM content_items WHERE id = ?").run(request.params.id);
  response.json({ ok: true });
});

app.get("/api/admin/settings", requireAdmin, (_request, response) => {
  response.json(Object.fromEntries(db.prepare("SELECT key, value FROM site_settings").all().map((row) => [row.key, row.value])));
});

app.patch("/api/admin/settings", requireAdmin, (request, response) => {
  const allowed = new Set(Object.keys(DEFAULT_SETTINGS));
  const update = db.prepare(`
    INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  for (const [key, value] of Object.entries(request.body || {})) {
    if (allowed.has(key)) update.run(key, String(value));
  }
  response.json(Object.fromEntries(db.prepare("SELECT key, value FROM site_settings").all().map((row) => [row.key, row.value])));
});

app.post("/api/admin/users/:id/credits", requireAdmin, (request, response) => {
  const delta = Math.trunc(Number(request.body.delta || 0));
  db.prepare("UPDATE users SET credits = max(0, credits + ?) WHERE id = ?").run(delta, request.params.id);
  response.json({ user: getUserById(request.params.id) });
});

app.post("/api/admin/users/:id/status", requireAdmin, (request, response) => {
  const status = request.body.status === "suspended" ? "suspended" : "active";
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, request.params.id);
  response.json({ user: getUserById(request.params.id) });
});

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    provider: apiKey ? "live" : "demo",
    stripe: Boolean(stripe),
    database: true
  });
});

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(projectRoot, "dist", "index.html"));
});

setInterval(() => {
  db.prepare("DELETE FROM jobs WHERE created_at < ?").run(Date.now() - 7 * 24 * 60 * 60 * 1000);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  db.prepare("DELETE FROM wallet_challenges WHERE expires_at < ?").run(Date.now());
}, 60 * 60 * 1000).unref();

app.listen(port, () => {
  console.log(`MotionMint server listening on http://localhost:${port} (${apiKey ? "live" : "demo"} mode)`);
});
