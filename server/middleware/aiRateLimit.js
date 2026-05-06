import rateLimit from "express-rate-limit";

/**
 * AI quota limiter — applied to every route that calls Claude with the
 * server's shared Anthropic key.
 *
 * Quota  : 10 requests per user per hour
 * Scope  : per authenticated user ID (not IP — users behind NAT / campus Wi-Fi
 *           share IPs and must not share a quota)
 * Bypass : requests where `req.aiKeySource === "client"` are skipped entirely,
 *           meaning users who supply their own key via `x-user-api-key` are
 *           never counted or blocked.
 *
 * IMPORTANT: this middleware must be placed AFTER both `auth` (sets req.user)
 * and `aiProvider` (sets req.aiKeySource) in the middleware chain.
 *
 * Response headers (IETF draft-7):
 *   RateLimit-Limit     – quota ceiling
 *   RateLimit-Remaining – requests left in the current window
 *   RateLimit-Reset     – seconds until the window resets
 */
const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour rolling window
  max: 10,                   // 10 Claude calls per window per user

  // Skip the limiter entirely for users paying with their own key.
  // aiProvider runs first and stamps req.aiKeySource before we get here.
  skip: (req) => req.aiKeySource !== "server",

  // Key by user ID so every account gets its own counter.
  keyGenerator: (req) => `ai_quota:${req.user._id}`,

  // Friendly 429 with enough information for the client to act on.
  handler: (req, res) => {
    const resetMs      = req.rateLimit.resetTime
      ? req.rateLimit.resetTime.getTime() - Date.now()
      : 60 * 60 * 1000;
    const resetMinutes = Math.max(1, Math.ceil(resetMs / 60_000));

    return res.status(429).json({
      error:             `Free AI quota reached: ${req.rateLimit.limit} requests per hour.`,
      hint:              "Supply your own Anthropic key via the x-user-api-key header to remove this limit.",
      retryAfterMinutes: resetMinutes,
    });
  },

  standardHeaders: "draft-7", // emit RateLimit-* headers (IETF standard)
  legacyHeaders:   false,      // suppress deprecated X-RateLimit-* headers
});

export default aiRateLimit;
