// ─── Analysis service ─────────────────────────────────────────────────────────
// This is the single swap point for the analysis API.
//
// To integrate the real backend:
//   1. Replace the getMockAnalysis() call below with a fetch call, e.g.:
//
//      const res = await fetch("/api/analysis", {
//        method: "POST",
//        headers: { "Content-Type": "application/json" },
//        body: JSON.stringify(area),
//      });
//      return res.json() as Promise<AnalysisResponse>;
//
//   2. Make getAnalysis() async (return Promise<AnalysisResponse>).
//   3. Update App.tsx to await it (useEffect + state, or a data-loading hook).
//   No UI components need to change.

import { getMockAnalysis } from "../data/mockAnalysisData";
import type { SelectedArea, AnalysisResponse } from "../types";

export function getAnalysis(area: SelectedArea): AnalysisResponse {
  return getMockAnalysis(area);
}
