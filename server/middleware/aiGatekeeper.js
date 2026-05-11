import Anthropic from "@anthropic-ai/sdk";
import rateLimit from "express-rate-limit";

// ── Singleton server client ───────────────────────────────────────────────────
// Built once on first default-key request; reused for every subsequent one.
// The raw key string exists only inside this closure and inside the Anthropic
// SDK object — it is never written to req, res, res.locals, or any log line.
//
// Supports DEFAULT_AI_KEY (canonical) with ANTHROPIC_API_KEY as a fallback
// alias so existing .env files keep working during migration.
let _serverClient = null;

function getServerClient() {
  if (_serverClient) return _serverClient;
  const key = process.env.DEFAULT_AI_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _serverClient = new Anthropic({ apiKey: key });
  return _serverClient;
}

// ── Default-key rate limiter ──────────────────────────────────────────────────
// Applied exclusively on the server-key path — users who supply their own
// x-user-api-key header never touch this limiter.
//
// Quota   : 10 requests per user per hour
// Scope   : per authenticated user ID (not IP) — avoids false positives on
//           shared networks such as campus Wi-Fi
// Headers : IETF RateLimit draft-7 (RateLimit-Limit / -Remaining / -Reset)
//
// IMPORTANT: protect must run before aiGatekeeper so req.user._id is set.
const defaultKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1-hour rolling window
  max: 10,                   // 10 default-key AI requests per user per window

  // Key per user, not per IP.
  keyGenerator: (req) => `ai_default:${req.user._id}`,

  handler(req, res) {
    const resetMs = req.rateLimit.resetTime
      ? req.rateLimit.resetTime.getTime() - Date.now()
      : 60 * 60 * 1000;
    const retryAfterMinutes = Math.max(1, Math.ceil(resetMs / 60_000));

    return res.status(429).json({
      error:             `Default AI quota reached (${req.rateLimit.limit} requests / hour).`,
      hint:              "Add your own Anthropic key as the x-user-api-key request header to remove this limit.",
      retryAfterMinutes,
    });
  },

  standardHeaders: "draft-7", // emit RateLimit-Limit / -Remaining / -Reset
  legacyHeaders:   false,     // suppress deprecated X-RateLimit-* headers
});

// ── aiGatekeeper ──────────────────────────────────────────────────────────────
/**
 * Single middleware that handles both key resolution and rate limiting.
 *
 * Path 1 — user supplies their own key via x-user-api-key header:
 *   • Builds a per-request Anthropic client with that key.
 *   • Marks req.aiKeySource = "client".
 *   • Rate limiter is NOT invoked — user is billed to their own account.
 *
 * Path 2 — no header present:
 *   • Invokes defaultKeyLimiter inline.  On quota exhaustion the limiter sends
 *     a 429 and the chain stops here — req.aiClient is never set.
 *   • On success, attaches the singleton server client to req.aiClient.
 *   • Marks req.aiKeySource = "server".
 *
 * Leak-prevention guarantees
 * ──────────────────────────
 *   • DEFAULT_AI_KEY lives only inside _serverClient (an Anthropic SDK object).
 *     It is never written to req, res, res.locals, or any response body.
 *   • req.aiKeySource is "client" | "server" — safe to log or return to callers.
 *   • Controllers must only touch req.aiClient, never attempt to read back the
 *     raw key.
 *
 * Prerequisites
 * ─────────────
 *   protect must precede aiGatekeeper in every route chain (sets req.user).
 */
/**
 * aiOptional — soft version of aiGatekeeper for routes where AI is a bonus.
 * Attaches req.aiClient when a key is available (user-supplied or server default)
 * but never blocks the request or sends a 4xx/5xx if no key exists.
 * Controllers must check `if (req.aiClient)` before calling Claude.
 */
export function aiOptional(req, res, next) {
  const userKey = req.headers["x-user-api-key"]?.trim();
  if (userKey) {
    req.aiClient    = new Anthropic({ apiKey: userKey });
    req.aiKeySource = "client";
    return next();
  }
  const serverClient = getServerClient();
  if (serverClient) {
    req.aiClient    = serverClient;
    req.aiKeySource = "server";
  }
  // No key? req.aiClient stays undefined — controller skips extraction gracefully.
  next();
}

export default function aiGatekeeper(req, res, next) {
  const userKey = req.headers["x-user-api-key"]?.trim();

  // ── Path 1: caller-supplied key ─────────────────────────────────────────────
  if (userKey) {
    req.aiClient    = new Anthropic({ apiKey: userKey });
    req.aiKeySource = "client";
    return next();
  }

  // ── Path 2: server default key + rate limit ─────────────────────────────────
  const serverClient = getServerClient();

  if (!serverClient) {
    console.error(
      "[aiGatekeeper] Neither DEFAULT_AI_KEY nor ANTHROPIC_API_KEY is set."
    );
    return res.status(503).json({
      error: "AI service is currently unavailable.",
      hint:  "Supply your own Anthropic key via the x-user-api-key request header.",
    });
  }

  // Invoke the rate limiter inline.  On approval it calls the callback; on
  // exhaustion it sends a 429 itself and the callback is never reached.
  defaultKeyLimiter(req, res, () => {
    req.aiClient    = serverClient;
    req.aiKeySource = "server";
    next();
  });
}
