const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-3"; // 1024 dimensions, general-purpose

/**
 * Generates embeddings for an array of text strings using the Voyage AI REST API.
 * Uses native fetch — no SDK dependency.
 *
 * @param {string[]} inputs  - Array of text strings to embed (max 128 per call)
 * @returns {Promise<number[][]>}  - Parallel array of embedding vectors
 */
export async function embed(inputs) {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set in environment.");
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input: inputs, model: EMBEDDING_MODEL }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${text}`);
  }

  const json = await res.json();

  // Voyage returns data[] sorted by index — preserve that order
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}
