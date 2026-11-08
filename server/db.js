import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "motionmint.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password_hash TEXT,
    password_salt TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'email',
    google_sub TEXT UNIQUE,
    wallet_address TEXT UNIQUE,
    stripe_customer_id TEXT UNIQUE,
    credits INTEGER NOT NULL DEFAULT 0,
    trial_used INTEGER NOT NULL DEFAULT 0,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    device_id TEXT,
    ip_hash TEXT,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS anon_usage (
    usage_key TEXT PRIMARY KEY,
    renders INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    owner_session TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    workflow TEXT NOT NULL,
    kind TEXT NOT NULL,
    mode TEXT NOT NULL,
    provider_id TEXT,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    stage TEXT,
    poster TEXT,
    result_json TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wallet_challenges (
    address TEXT PRIMARY KEY,
    nonce TEXT NOT NULL,
    message TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS processed_billing_events (
    event_key TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS referral_codes (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    code TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    rewarded_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS content_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'People',
    media_type TEXT NOT NULL DEFAULT 'image',
    media_url TEXT NOT NULL,
    poster_url TEXT,
    prompt TEXT NOT NULL DEFAULT '',
    model TEXT NOT NULL DEFAULT 'MotionMint Auto',
    aspect_ratio TEXT NOT NULL DEFAULT '16:9',
    resolution TEXT NOT NULL DEFAULT '2K',
    author TEXT NOT NULL DEFAULT 'MotionMint Creator',
    featured INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    download_enabled INTEGER NOT NULL DEFAULT 1,
    downloads INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((column) => column.name === "stripe_customer_id")) {
  db.exec("ALTER TABLE users ADD COLUMN stripe_customer_id TEXT");
}
if (!userColumns.some((column) => column.name === "status")) {
  db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
}

export function newToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function newId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

export function hashPassword(password, salt = newToken(16)) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

export function verifyPassword(password, hash, salt) {
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createSession({ userId = null, deviceId = "", ipHash = "" }) {
  const token = newToken();
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token, user_id, device_id, ip_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(token, userId, deviceId, ipHash, now, now + 365 * 24 * 60 * 60 * 1000);
  return token;
}

export function getSession(token) {
  if (!token) return null;
  return db.prepare("SELECT * FROM sessions WHERE token = ? AND expires_at > ?").get(token, Date.now()) || null;
}

export function attachUserToSession(token, userId) {
  db.prepare("UPDATE sessions SET user_id = ? WHERE token = ?").run(userId, token);
}

export function deleteSession(token) {
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function createUser({ email = null, password = null, provider = "email", googleSub = null, walletAddress = null, trialUsed = 0 }) {
  const id = newId("user");
  let passwordHash = null;
  let passwordSalt = null;
  if (password) {
    const hashed = hashPassword(password);
    passwordHash = hashed.hash;
    passwordSalt = hashed.salt;
  }
  db.prepare(`
    INSERT INTO users
      (id, email, password_hash, password_salt, auth_provider, google_sub, wallet_address, credits, trial_used, plan, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'free', ?)
  `).run(id, email, passwordHash, passwordSalt, provider, googleSub, walletAddress, Math.min(3, Number(trialUsed || 0)), Date.now());
  return getUserById(id);
}

export function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE lower(email) = lower(?)").get(email) || null;
}

export function getUserByGoogleSub(googleSub) {
  return db.prepare("SELECT * FROM users WHERE google_sub = ?").get(googleSub) || null;
}

export function getUserByWallet(address) {
  return db.prepare("SELECT * FROM users WHERE lower(wallet_address) = lower(?)").get(address) || null;
}

export function getUserByStripeCustomer(customerId) {
  return db.prepare("SELECT * FROM users WHERE stripe_customer_id = ?").get(customerId) || null;
}

export function setStripeCustomer(userId, customerId) {
  if (!customerId) return;
  db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, userId);
}

export function ensureReferralCode(userId) {
  const existing = db.prepare("SELECT * FROM referral_codes WHERE user_id = ?").get(userId);
  if (existing) return existing;
  let code;
  do {
    code = newToken(6).toUpperCase();
  } while (db.prepare("SELECT 1 FROM referral_codes WHERE code = ?").get(code));
  db.prepare("INSERT INTO referral_codes (user_id, code, created_at) VALUES (?, ?, ?)").run(userId, code, Date.now());
  return db.prepare("SELECT * FROM referral_codes WHERE user_id = ?").get(userId);
}

export function attachReferral(code, referredUserId) {
  const referralCode = db.prepare("SELECT * FROM referral_codes WHERE code = ?").get(String(code || "").toUpperCase());
  if (!referralCode || referralCode.user_id === referredUserId) return null;
  db.prepare(`
    INSERT OR IGNORE INTO referrals
      (id, code, referrer_user_id, referred_user_id, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)
  `).run(newId("ref"), referralCode.code, referralCode.user_id, referredUserId, Date.now());
  return db.prepare("SELECT * FROM referrals WHERE referred_user_id = ?").get(referredUserId) || null;
}

export function awardReferralForGeneration(referredUserId) {
  const referral = db.prepare(
    "SELECT * FROM referrals WHERE referred_user_id = ? AND status = 'pending'"
  ).get(referredUserId);
  if (!referral) return null;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const rewardedThisMonth = db.prepare(
    "SELECT count(*) as count FROM referrals WHERE referrer_user_id = ? AND status = 'rewarded' AND rewarded_at >= ?"
  ).get(referral.referrer_user_id, monthStart.getTime());
  if (Number(rewardedThisMonth.count || 0) >= 10) return null;
  db.prepare("UPDATE referrals SET status = 'rewarded', rewarded_at = ? WHERE id = ?").run(Date.now(), referral.id);
  addCredits(referral.referrer_user_id, 4);
  addCredits(referral.referred_user_id, 4);
  return referral;
}

export function getReferralSummary(userId) {
  const codeRow = ensureReferralCode(userId);
  const rows = db.prepare(
    "SELECT status, count(*) as count FROM referrals WHERE referrer_user_id = ? GROUP BY status"
  ).all(userId);
  const counted = Object.fromEntries(rows.map((row) => [row.status, row.count]));
  return {
    code: codeRow.code,
    pending: Number(counted.pending || 0),
    rewarded: Number(counted.rewarded || 0)
  };
}

export function getAnonUsage(key) {
  return db.prepare("SELECT * FROM anon_usage WHERE usage_key = ?").get(key) || { usage_key: key, renders: 0 };
}

export function incrementAnonUsage(key) {
  db.prepare(`
    INSERT INTO anon_usage (usage_key, renders, updated_at)
    VALUES (?, 1, ?)
    ON CONFLICT(usage_key) DO UPDATE SET renders = renders + 1, updated_at = excluded.updated_at
  `).run(key, Date.now());
}

export function decrementAnonUsage(key) {
  db.prepare("UPDATE anon_usage SET renders = max(0, renders - 1), updated_at = ? WHERE usage_key = ?").run(Date.now(), key);
}

export function incrementUserTrial(userId) {
  db.prepare("UPDATE users SET trial_used = min(3, trial_used + 1) WHERE id = ?").run(userId);
}

export function decrementUserTrial(userId) {
  db.prepare("UPDATE users SET trial_used = max(0, trial_used - 1) WHERE id = ?").run(userId);
}

export function consumeCredits(userId, amount) {
  const user = getUserById(userId);
  if (!user || user.credits < amount) return false;
  db.prepare("UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?").run(amount, userId, amount);
  return true;
}

export function refundCredits(userId, amount) {
  db.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").run(amount, userId);
}

const jobColumns = new Set(db.prepare("PRAGMA table_info(jobs)").all().map((column) => column.name));
if (!jobColumns.has("prompt")) db.exec("ALTER TABLE jobs ADD COLUMN prompt TEXT");
if (!jobColumns.has("aspect_ratio")) db.exec("ALTER TABLE jobs ADD COLUMN aspect_ratio TEXT");
if (!jobColumns.has("resolution")) db.exec("ALTER TABLE jobs ADD COLUMN resolution TEXT");

export function addCredits(userId, amount, plan = null) {
  db.prepare("UPDATE users SET credits = credits + ?, plan = coalesce(?, plan) WHERE id = ?").run(amount, plan, userId);
}

export function createJob(job) {
  db.prepare(`
    INSERT INTO jobs
      (id, owner_session, user_id, workflow, kind, mode, provider_id, status, progress, stage, poster, result_json, prompt, aspect_ratio, resolution, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    job.id,
    job.ownerSession,
    job.userId,
    job.workflow,
    job.kind,
    job.mode,
    job.providerId || null,
    job.status,
    job.progress || 0,
    job.stage || "queued",
    job.poster || null,
    job.resultJson || null,
    job.prompt || null,
    job.aspectRatio || null,
    job.resolution || null,
    job.createdAt || Date.now()
  );
}

export function getJob(id, ownerSession) {
  return db.prepare("SELECT * FROM jobs WHERE id = ? AND owner_session = ?").get(id, ownerSession) || null;
}

export function updateJob(id, values) {
  const assignments = [];
  const parameters = [];
  const fields = [
    ["status", "status"],
    ["progress", "progress"],
    ["stage", "stage"],
    ["resultJson", "result_json"],
    ["providerId", "provider_id"]
  ];
  for (const [key, column] of fields) {
    if (!Object.hasOwn(values, key)) continue;
    assignments.push(`${column} = ?`);
    parameters.push(values[key]);
  }
  if (!assignments.length) return;
  db.prepare(`UPDATE jobs SET ${assignments.join(", ")} WHERE id = ?`).run(...parameters, id);
}

export function saveWalletChallenge(address, nonce, message) {
  db.prepare(`
    INSERT INTO wallet_challenges (address, nonce, message, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET nonce = excluded.nonce, message = excluded.message, expires_at = excluded.expires_at
  `).run(address.toLowerCase(), nonce, message, Date.now() + 10 * 60 * 1000);
}

export function consumeWalletChallenge(address) {
  const row = db.prepare("SELECT * FROM wallet_challenges WHERE address = ? AND expires_at > ?").get(address.toLowerCase(), Date.now());
  if (row) db.prepare("DELETE FROM wallet_challenges WHERE address = ?").run(address.toLowerCase());
  return row || null;
}

export function markBillingEvent(eventKey) {
  try {
    db.prepare("INSERT INTO processed_billing_events (event_key, created_at) VALUES (?, ?)").run(eventKey, Date.now());
    return true;
  } catch {
    return false;
  }
}
