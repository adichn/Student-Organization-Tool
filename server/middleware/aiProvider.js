import Anthropic from "@anthropic-ai/sdk";

// Singleton client for the server's own key — instantiated once on first use.
// Requests that supply their own key get a fresh, per-request client instead.
let _serverClient = null;

function getServerClient() {
  if (!_serverClient) {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    _serverClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _serverClient;
}

/**
 * Resolves which API key to use and attaches a ready-to-use Anthropic client
 * to `req.aiClient`.
 *
 * Key resolution order:
 *   1. `x-user-api-key` request header → caller supplies their own Anthropic key
 *   2. ANTHROPIC_API_KEY env var        → server's shared fallback key
 *
 * The raw key string is NEVER attached to `req`, `res`, or `res.locals`.
 * Route handlers must only interact with `req.aiClient`, not the key itself.
 *
 * `req.aiKeySource` ("client" | "server") is safe to log or surface in
 * responses — it identifies which key pool was used without leaking the value.
 * Downstream middleware (aiRateLimit) uses this field to decide whether to
 * enforce the free-tier quota.
 */
export default function aiProvider(req, res, next) {
  const clientKey = req.headers["x-user-api-key"]?.trim();

  if (clientKey) {
    // Per-request client — user is paying with their own key
    req.aiClient = new Anthropic({ apiKey: clientKey });
    req.aiKeySource = "client";
    return next();
  }

  // Fall back to the server's internal key
  const serverClient = getServerClient();

  if (!serverClient) {
    // No key anywhere — fail loudly on the server, vaguely to the caller
    console.error("[aiProvider] ANTHROPIC_API_KEY is not set in environment.");
    return res.status(503).json({
      error: "AI service is unavailable. Please provide an API key via the x-api-key header.",
    });
  }

  req.aiClient = serverClient;
  req.aiKeySource = "server";
  next();
}
