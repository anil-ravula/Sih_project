// ─── Analysis service ─────────────────────────────────────────────────────────
// Connects to the FastAPI backend without mock runtime fallback.

import type { SelectedArea, AnalysisResponse } from "../types"

export async function getAnalysis(
  area: SelectedArea,
): Promise<AnalysisResponse> {
  const res = await fetch("/api/analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(area),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => "")
    throw new Error(
      `Analysis API error (${res.status}): ${errorText || res.statusText}`,
    )
  }

  const data = (await res.json()) as AnalysisResponse
  return data
}
