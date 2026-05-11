import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

// ── AES-256-GCM helpers ───────────────────────────────────────────────────────
// The encryption key is derived once from JWT_SECRET via SHA-256.
// Stored format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
//
// NOTE: if JWT_SECRET ever rotates, all stored customApiKey values must be
// re-encrypted. Treat that env var as immutable once users start saving keys.

function deriveKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("[User] JWT_SECRET must be set to encrypt API keys.");
  return crypto.createHash("sha256").update(secret).digest(); // 32-byte Buffer
}

function encryptApiKey(plaintext) {
  const key    = deriveKey();
  const iv     = crypto.randomBytes(12);                       // 96-bit nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag    = cipher.getAuthTag();                          // 128-bit auth tag
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decryptApiKey(stored) {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("[User] Malformed encrypted API key.");
  const [ivHex, tagHex, dataHex] = parts;
  const key      = deriveKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return (
    decipher.update(Buffer.from(dataHex, "hex"), undefined, "utf8") + decipher.final("utf8")
  );
}

// ── Schema ────────────────────────────────────────────────────────────────────

const UserSchema = new Schema(
  {
    name: { type: String, trim: true },

    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },

    // bcrypt hash — never store the raw password
    passwordHash: { type: String, required: true, select: false },

    // Encrypted Anthropic API key the user optionally provides.
    // Stored as "iv:tag:ciphertext" (AES-256-GCM).
    // Never returned in API responses — only decrypted server-side when
    // building req.aiClient via the aiProvider middleware.
    customApiKey: { type: String, default: null, select: false },
  },
  { timestamps: true }
);

// ── Password middleware ───────────────────────────────────────────────────────
// Hash whenever passwordHash is touched (register, password-change).
UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Instance methods ──────────────────────────────────────────────────────────

/** Constant-time password comparison. */
UserSchema.methods.matchPassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

/**
 * Encrypt and store a plaintext Anthropic API key.
 * Call `user.save()` afterwards to persist.
 */
UserSchema.methods.setApiKey = function (plaintext) {
  this.customApiKey = encryptApiKey(plaintext);
};

/**
 * Decrypt and return the stored API key, or null if none is saved.
 * Only call server-side — never forward the result to the client.
 */
UserSchema.methods.getDecryptedApiKey = function () {
  if (!this.customApiKey) return null;
  return decryptApiKey(this.customApiKey);
};

export default model("User", UserSchema);
