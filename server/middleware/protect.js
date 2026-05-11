import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * protect — JWT authentication gate for all private routes.
 *
 * Reads the Bearer token from the Authorization header, verifies it with
 * JWT_SECRET, fetches the owning user, and attaches the Mongoose document to
 * `req.user`.
 *
 * Schema-level `select: false` on `passwordHash` and `customApiKey` means
 * neither sensitive field is loaded unless a downstream caller explicitly
 * requests it with `.select("+passwordHash")`.
 *
 * Ordering contract
 * ─────────────────
 *   protect  →  aiGatekeeper  →  controller
 *
 * `aiGatekeeper` needs `req.user._id` for its rate-limit key, so `protect`
 * must always run first on any route that uses AI.
 */
export default async function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = header.slice(7);

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(id);
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Session expired. Please sign in again."
        : "Invalid token.";
    return res.status(401).json({ error: message });
  }
}
