import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Validates the Bearer JWT in the Authorization header and attaches the
 * Mongoose user document to `req.user` (password field excluded).
 *
 * Every protected route must run this middleware before any controller that
 * touches user-owned data. The controllers then use `req.user._id` to scope
 * all Mongoose queries — data from other users is structurally unreachable.
 */
export default async function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const token = header.slice(7);

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Session expired. Please sign in again." :
                                         "Invalid token.";
    return res.status(401).json({ error: message });
  }
}
