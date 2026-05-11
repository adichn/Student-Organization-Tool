/**
 * Gemini embedding client — text-embedding-004
 *
 * Uses the Gemini REST API directly (no SDK dependency).
 * text-embedding-004 produces 768-dimensional vectors.
 *
 * Rate limits (free tier):
 *   100 RPM · 1 500 RPD · 1 M TPM
 *
 * batchEmbedContents handles up to 100 texts per HTTP request, so a
 * typical course document (≤ 60 chunks) fits in a single call.
 */

const GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta";
const MODEL         = "text-embedding-004";
const BATCH_SIZE    = 100;   // Gemini batchEmbedContents hard limit

// Retry config for 429 / transient errors
const MAX_RETRIES     = 4;
const BASE_DELAY_MS   = 3_000;   // ~100 RPM free tier → start conservative

// Small pause between batch requests when a file needs multiple batches
// (100 RPM = 1 req / 600 ms; 1 000 ms is a safe margin)
const INTER_BATCH_MS  = 1_000;

// ── Low-level: one batchEmbedContents call ─────────────────────────────────

async function batchRequest(texts, apiKey) {
  const url = `${GEMINI_BASE}/models/${MODEL}:batchEmbedContents?key=${apiKey}`;

  const body = {
    requests: texts.map((text) => ({
      model:   `models/${MODEL}`,
      content: { parts: [{ text }] },
    })),
  };

  let attempt = 0;

  while (true) {
    let res;
    try {
      res = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
    } catch (networkErr) {
      // ECONNREFUSED / DNS failure — retry with backoff, then give up
      if (attempt < MAX_RETRIES) {
        const wait = BASE_DELAY_MS * Math.pow(2, attempt++);
        console.warn(`[geminiClient] Network error — retrying in ${wait / 1000}s:`, networkErr.message);
        await sleep(wait);
        continue;
      }
      throw new Error(`Gemini network error after ${MAX_RETRIES} retries: ${networkErr.message}`);
    }

    // Rate limited — honour Retry-After if present, else exponential backoff
    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterSec = Number(res.headers.get("Retry-After")) || 0;
      const wait = retryAfterSec
        ? retryAfterSec * 1_000
        : BASE_DELAY_MS * Math.pow(2, attempt);
      attempt++;
      console.warn(
        `[geminiClient] 429 rate-limited — retrying in ${Math.round(wait / 1000)}s ` +
        `(attempt ${attempt}/${MAX_RETRIES})`
      );
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "(no body)");
      throw new Error(`Gemini API error ${res.status}: ${body}`);
    }

    const json = await res.json();

    // embeddings[] is ordered to match requests[] — no sort needed
    return json.embeddings.map((e) => e.values);
  }
}

// ── Public: embed any number of texts ─────────────────────────────────────────

/**
 * Generate embeddings for an array of text strings.
 * Splits into batches of ≤ 100, adding a small inter-batch delay so we
 * comfortably stay within the 100 RPM free-tier limit.
 *
 * @param   {string[]}          inputs  Texts to embed
 * @returns {Promise<number[][]>}        Parallel array of 768-dim vectors
 */
export async function embed(inputs) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment.");
  if (inputs.length === 0) return [];

  const results = [];

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(INTER_BATCH_MS);   // rate-limit guard between batches

    const batch = inputs.slice(i, i + BATCH_SIZE);
    const vecs  = await batchRequest(batch, apiKey);
    results.push(...vecs);
  }

  return results;
}

// ── Util ──────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
