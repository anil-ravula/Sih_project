// ─── Semantic Search Service ──────────────────────────────────────────────────
// Connects natural language search queries and filters to the FastAPI backend.

import type { SearchResult, SearchFilters } from "../SearchPage"

export async function searchSatelliteData(
  query: string,
  filters: SearchFilters,
  fallbackFn?: (
    query: string,
    filters: SearchFilters,
  ) => Promise<SearchResult[]>,
): Promise<SearchResult[]> {
  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        filters,
      }),
    })

    if (!res.ok) {
      throw new Error(`Search API responded with status ${res.status}`)
    }

    const data = (await res.json()) as SearchResult[]
    return data
  } catch (err) {
    console.warn(
      "Backend search API unavailable, falling back to local simulation:",
      err,
    )
    if (fallbackFn) {
      return fallbackFn(query, filters)
    }
    return []
  }
}
