/**
 * Search provider adapter.
 *
 * Key resolution order (first match wins):
 *   1. TAVILY_API_KEY  → Tavily Search API  (recommended: academic depth)
 *   2. SERPER_API_KEY  → Serper Google API
 *   3. (none)          → labelled placeholder results (dev/demo mode)
 *
 * All providers return the same normalised shape:
 *   { title: string, url: string, snippet: string, searchTerm: string }
 *
 * The returned object is always:
 *   { results: NormalisedResult[], isPlaceholder: boolean }
 */

const TAVILY_URL = "https://api.tavily.com/search";
const SERPER_URL = "https://google.serper.dev/search";

// ── Providers ─────────────────────────────────────────────────────────────────

async function searchTavily(term, maxResults) {
  const res = await fetch(TAVILY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query: term,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily ${res.status}: ${await res.text()}`);
  }

  const { results } = await res.json();
  return results.map((r) => ({
    title:      r.title,
    url:        r.url,
    snippet:    r.content,
    searchTerm: term,
  }));
}

async function searchSerper(term, maxResults) {
  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": process.env.SERPER_API_KEY,
    },
    body: JSON.stringify({ q: term, num: maxResults }),
  });

  if (!res.ok) {
    throw new Error(`Serper ${res.status}: ${await res.text()}`);
  }

  const { organic = [] } = await res.json();
  return organic.slice(0, maxResults).map((r) => ({
    title:      r.title,
    url:        r.link,
    snippet:    r.snippet,
    searchTerm: term,
  }));
}

// Returns clearly-labelled dummy results so the AI can still produce a
// demonstration synthesis without requiring real API keys.
function searchPlaceholder(term) {
  const slug = encodeURIComponent(term.toLowerCase().replace(/\s+/g, "-"));
  return [
    {
      title:      `[Placeholder] Introduction to ${term}`,
      url:        `https://placeholder.example.edu/intro/${slug}`,
      snippet:    `This placeholder article introduces ${term}, covering core definitions, historical context, and foundational models used in the field. Connect a real search API key to replace these results.`,
      searchTerm: term,
    },
    {
      title:      `[Placeholder] ${term}: A Systematic Review`,
      url:        `https://placeholder.example.edu/review/${slug}`,
      snippet:    `A placeholder systematic review of ${term} across 120 simulated studies. Key themes include theoretical frameworks, empirical evidence, and open research questions.`,
      searchTerm: term,
    },
    {
      title:      `[Placeholder] Recent Advances in ${term}`,
      url:        `https://placeholder.example.edu/advances/${slug}`,
      snippet:    `Placeholder coverage of recent methodological advances in ${term}, focusing on interdisciplinary applications and reproducibility challenges.`,
      searchTerm: term,
    },
    {
      title:      `[Placeholder] Practical Applications of ${term}`,
      url:        `https://placeholder.example.edu/applications/${slug}`,
      snippet:    `This placeholder examines real-world applications of ${term} in industry and academia, with case studies from multiple domains.`,
      searchTerm: term,
    },
  ];
}

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Fetch search results for a single query term.
 * Falls back to labelled placeholder data when no API key is configured.
 *
 * @param {string} term
 * @param {{ maxResults?: number }} options
 * @returns {Promise<{ results: object[], isPlaceholder: boolean }>}
 */
export async function search(term, { maxResults = 5 } = {}) {
  if (process.env.TAVILY_API_KEY) {
    const results = await searchTavily(term, maxResults);
    return { results, isPlaceholder: false };
  }
  if (process.env.SERPER_API_KEY) {
    const results = await searchSerper(term, maxResults);
    return { results, isPlaceholder: false };
  }
  return { results: searchPlaceholder(term), isPlaceholder: true };
}
