import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId) {
  return jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

function safeUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
export async function register(req, res) {
  const { name, email, password } = req.body ?? {};

  if (!name?.trim())             return res.status(400).json({ error: "Name is required." });
  if (!email?.trim())            return res.status(400).json({ error: "Email is required." });
  if (!EMAIL_RE.test(email))     return res.status(400).json({ error: "Invalid email address." });
  if (!password)                 return res.status(400).json({ error: "Password is required." });
  if (password.length < 8)       return res.status(400).json({ error: "Password must be at least 8 characters." });

  // Constant-time check — the 409 response reveals that the email exists, which
  // is acceptable here (registration forms commonly do this).
  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const user  = await User.create({ name: name.trim(), email, password });
  const token = signToken(user._id);

  res.status(201).json({ token, user: safeUser(user) });
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export async function login(req, res) {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Use a constant-time comparison even when the user is not found, to prevent
  // timing-based user-enumeration attacks.
  const DUMMY_HASH = "$2b$12$invalidhashpadding000000000000000000000000000000000000";
  const match = user
    ? await user.matchPassword(password)
    : await import("bcryptjs").then(({ default: b }) => b.compare(password, DUMMY_HASH));

  if (!user || !match) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user._id);
  res.json({ token, user: safeUser(user) });
}
