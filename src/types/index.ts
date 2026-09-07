// ─── Shared domain types ──────────────────────────────────────────────────────
// These types define the data contracts between the UI and the future backend.
// The frontend reads these; the backend will eventually produce them.

export type AnalysisType =
  | "urban"
  | "water"
  | "vegetation-loss"
  | "vegetation-gain"
  | "infrastructure";

/**
 * The area the user selected for analysis.
 * Flows from Search → Area Details → Map → Change Detection → Comparison → Report.
 * When the backend is integrated, this object will be posted to the analysis API.
 */
export interface SelectedArea {
  id: string;
  name: string;                               // display name, e.g. "Cyberabad IT Corridor"
  state: string;                              // e.g. "Telangana"
  latitude: number;
  longitude: number;
  boundingBox?: [[number, number], [number, number]]; // [[south, west], [north, east]]
  analysisType: AnalysisType;
  changeDescription: string;                  // e.g. "Urban Expansion"
  beforeDate: string;                         // ISO date, e.g. "2023-01-15"
  afterDate: string;                          // ISO date, e.g. "2026-09-06"
  sensor: string;
  confidence: number;                         // 0–100
  affectedArea: string;                       // e.g. "22.6 km²"
  explanation: string;
}

/**
 * The analysis result returned by the service layer.
 * Shape mirrors what the backend API will eventually return.
 * The UI reads all display fields from this object — no hard-coded locations.
 */
export interface AnalysisResponse {
  /** The area this analysis is for */
  selectedArea: SelectedArea;

  // ── Convenience fields (copied / derived from selectedArea) ─────────────────
  // Kept flat so existing UI components can read them without path changes.
  location: string;           // = selectedArea.name
  state: string;
  area: string;               // = selectedArea.affectedArea
  changeType: AnalysisType;   // = selectedArea.analysisType
  sensor: string;
  confidence: number;
  beforeDate: string;
  afterDate: string;

  // ── Display / page content ──────────────────────────────────────────────────
  pageTitle: string;          // e.g. "Urban Change Analysis"
  subtitle: string;           // shown under the page heading
  reportId: string;
  analysisType: string;       // human-readable method, e.g. "NDWI Thresholding + Change Vector"
  severity: string;           // "Critical" | "High" | "Medium" | "Low"

  // ── Before / after comparison ───────────────────────────────────────────────
  beforeLabel: string;
  beforeValue: string;
  afterLabel: string;
  afterValue: string;
  netChange: string;
  netChangePct: string;
  comparisonSubtitle: string;

  // ── Structured analysis content ─────────────────────────────────────────────
  findings: Array<{ text: string; type: "critical" | "warning" | "ok" }>;
  statistics: [string, string][];
  timeline: Array<{ date: string; label: string; type: string }>;
}
