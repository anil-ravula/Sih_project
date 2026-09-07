// ─── Mock analysis data ───────────────────────────────────────────────────────
// This module is the ONLY place that contains hard-coded analysis values.
// Replace getMockAnalysis() with a real API call in analysisService.ts when
// the backend is ready — no UI components need to change.

import type { SelectedArea, AnalysisResponse } from "../types";

/**
 * Default demo area shown when no search result has been selected yet.
 * The UI falls back to this on first load.
 */
export const DEMO_SELECTED_AREA: SelectedArea = {
  id: "DEMO-001",
  name: "Sardar Sarovar Reservoir",
  state: "Gujarat",
  latitude: 21.83,
  longitude: 73.75,
  boundingBox: [[21.8, 73.7], [21.86, 73.8]],
  analysisType: "water",
  changeDescription: "Water Level Change",
  beforeDate: "2026-01-15",
  afterDate: "2026-09-06",
  sensor: "Sentinel-2B (MSI)",
  confidence: 94,
  affectedArea: "33.7 km²",
  explanation:
    "Water surface area reduced from 187.4 km² to 153.7 km² — an 18% decline over the Jan–Sep 2026 period.",
};

/**
 * Generate a mock AnalysisResponse for the given SelectedArea.
 *
 * This function produces plausible demo values derived from the area's metadata.
 * It is intentionally separated from the UI so the service layer can later
 * swap it for a real HTTP call without touching any component.
 */
export function getMockAnalysis(area: SelectedArea): AnalysisResponse {
  const yearFrom = area.beforeDate.slice(0, 4);
  const yearTo = area.afterDate.slice(0, 4);
  const areaKm = parseFloat(area.affectedArea) || 10;

  const base = {
    selectedArea: area,
    location: area.name,
    state: area.state,
    area: area.affectedArea,
    changeType: area.analysisType,
    sensor: area.sensor,
    confidence: area.confidence,
    beforeDate: area.beforeDate,
    afterDate: area.afterDate,
    reportId: `RPT-${area.id}`,
  } as const;

  if (area.analysisType === "urban" || area.analysisType === "infrastructure") {
    const builtBefore = +(areaKm * 0.65).toFixed(1);
    const builtAfter = +(builtBefore + areaKm).toFixed(1);
    const pct = +((areaKm / builtBefore) * 100).toFixed(1);
    return {
      ...base,
      pageTitle: "Urban Change Analysis",
      subtitle: `${area.name}, ${area.state} · ${yearFrom}–${yearTo} · ISA Change`,
      analysisType: "Impervious Surface Area (ISA) Change Vector",
      severity: area.confidence >= 90 ? "High" : "Medium",
      beforeLabel: "Built-up Area (Before)",
      beforeValue: `${builtBefore} km²`,
      afterLabel: "Built-up Area (After)",
      afterValue: `${builtAfter} km²`,
      netChange: `+${areaKm} km²`,
      netChangePct: `+${pct}%`,
      comparisonSubtitle: `${area.name} · ${area.beforeDate} vs ${area.afterDate} · ISA Change`,
      findings: [
        { text: `Built-up area expanded from ${builtBefore} km² to ${builtAfter} km² — a ${pct}% increase over the analysis period.`, type: "critical" },
        { text: area.explanation, type: "warning" },
        { text: "Road network and utility corridor expansion detected in surrounding 2 km buffer zone.", type: "warning" },
        { text: "Designated open-space and green-belt reserves show no significant encroachment within the AOI boundary.", type: "ok" },
      ],
      statistics: [
        [`Built-up Area (${yearFrom})`, `${builtBefore} km²`],
        [`Built-up Area (${yearTo})`, `${builtAfter} km²`],
        [`Net Change`, `+${areaKm} km² (+${pct}%)`],
        [`Analysis Method`, "ISA Change Vector"],
        [`Accuracy`, `${area.confidence}%`],
        [`Kappa Coefficient`, "0.91"],
      ],
      timeline: [
        { date: area.afterDate, label: "Post-expansion scan complete", type: "scan" },
        { date: `${yearTo}-04-01`, label: "Urban growth alert issued", type: "alert" },
        { date: `${yearTo}-01-01`, label: "Annual ISA baseline update", type: "baseline" },
        { date: `${yearFrom}-06-01`, label: "Mid-period reference captured", type: "reference" },
        { date: area.beforeDate, label: "Pre-expansion baseline established", type: "baseline" },
      ],
    };
  }

  if (area.analysisType === "water") {
    const waterBefore = +(areaKm * 6).toFixed(1);
    const waterAfter = +(waterBefore - areaKm).toFixed(1);
    const pct = +((areaKm / waterBefore) * 100).toFixed(1);
    return {
      ...base,
      pageTitle: "Water Body Change Analysis",
      subtitle: `${area.name}, ${area.state} · ${yearFrom}–${yearTo} · NDWI`,
      analysisType: "NDWI Thresholding + Change Vector",
      severity: area.confidence >= 90 ? "High" : "Medium",
      beforeLabel: "Water Surface (Before)",
      beforeValue: `${waterBefore} km²`,
      afterLabel: "Water Surface (After)",
      afterValue: `${waterAfter} km²`,
      netChange: `−${areaKm} km²`,
      netChangePct: `−${pct}%`,
      comparisonSubtitle: `${area.name} · ${area.beforeDate} vs ${area.afterDate} · NDWI`,
      findings: [
        { text: `Water surface reduced from ${waterBefore} km² to ${waterAfter} km² — a ${pct}% decline over the analysis period.`, type: "critical" },
        { text: area.explanation, type: "warning" },
        { text: "Peripheral vegetation stress detected in 18% of the lake buffer zone (500 m radius).", type: "warning" },
        { text: "Northern shoreline remains stable within ±30 m of historical multi-year baseline.", type: "ok" },
      ],
      statistics: [
        [`Water Surface (${yearFrom})`, `${waterBefore} km²`],
        [`Water Surface (${yearTo})`, `${waterAfter} km²`],
        [`Net Change`, `−${areaKm} km² (−${pct}%)`],
        [`NDWI Threshold`, "0.2"],
        [`Accuracy`, `${area.confidence}%`],
        [`Kappa Coefficient`, "0.87"],
      ],
      timeline: [
        { date: area.afterDate, label: "Post-monsoon water-level scan", type: "scan" },
        { date: `${yearTo}-06-01`, label: "Water recession alert issued", type: "alert" },
        { date: `${yearTo}-01-01`, label: "Annual NDWI baseline update", type: "baseline" },
        { date: `${yearFrom}-06-01`, label: "Pre-monsoon reference captured", type: "reference" },
        { date: area.beforeDate, label: "High-water baseline established", type: "baseline" },
      ],
    };
  }

  if (area.analysisType === "vegetation-gain") {
    const vegBefore = +(areaKm * 3.5).toFixed(1);
    const vegAfter = +(vegBefore + areaKm).toFixed(1);
    const pct = +((areaKm / vegBefore) * 100).toFixed(1);
    return {
      ...base,
      pageTitle: "Vegetation Recovery Analysis",
      subtitle: `${area.name}, ${area.state} · ${yearFrom}–${yearTo} · NDVI`,
      analysisType: "NDVI Change + Phenology Analysis",
      severity: "Low",
      beforeLabel: "Canopy Cover (Before)",
      beforeValue: `${vegBefore} km²`,
      afterLabel: "Canopy Cover (After)",
      afterValue: `${vegAfter} km²`,
      netChange: `+${areaKm} km²`,
      netChangePct: `+${pct}%`,
      comparisonSubtitle: `${area.name} · ${area.beforeDate} vs ${area.afterDate} · NDVI`,
      findings: [
        { text: `Canopy cover increased from ${vegBefore} km² to ${vegAfter} km² — a ${pct}% gain over the analysis period.`, type: "ok" },
        { text: area.explanation, type: "ok" },
        { text: "Soil moisture index improvement correlates with detected reforestation effort in the zone.", type: "ok" },
        { text: "Isolated patches at northern boundary show slower recovery rate — recommended for monitoring next season.", type: "warning" },
      ],
      statistics: [
        [`Canopy Cover (${yearFrom})`, `${vegBefore} km²`],
        [`Canopy Cover (${yearTo})`, `${vegAfter} km²`],
        [`Net Change`, `+${areaKm} km² (+${pct}%)`],
        [`Mean NDVI Δ`, "+0.18"],
        [`Accuracy`, `${area.confidence}%`],
        [`Kappa Coefficient`, "0.85"],
      ],
      timeline: [
        { date: area.afterDate, label: "Post-growth season scan", type: "scan" },
        { date: `${yearTo}-04-01`, label: "Positive NDVI trend confirmed", type: "baseline" },
        { date: `${yearTo}-01-01`, label: "Annual NDVI baseline", type: "baseline" },
        { date: `${yearFrom}-06-01`, label: "Mid-period reference captured", type: "reference" },
        { date: area.beforeDate, label: "Pre-growth baseline established", type: "baseline" },
      ],
    };
  }

  // vegetation-loss (default)
  const vegBefore = +(areaKm * 4.2).toFixed(1);
  const vegAfter = +(vegBefore - areaKm).toFixed(1);
  const pct = +((areaKm / vegBefore) * 100).toFixed(1);
  return {
    ...base,
    pageTitle: "Vegetation Loss Analysis",
    subtitle: `${area.name}, ${area.state} · ${yearFrom}–${yearTo} · NDVI`,
    analysisType: "NDVI Decline + Fragmentation Index",
    severity:
      area.confidence >= 95 ? "Critical" : area.confidence >= 85 ? "High" : "Medium",
    beforeLabel: "Canopy Cover (Before)",
    beforeValue: `${vegBefore} km²`,
    afterLabel: "Canopy Cover (After)",
    afterValue: `${vegAfter} km²`,
    netChange: `−${areaKm} km²`,
    netChangePct: `−${pct}%`,
    comparisonSubtitle: `${area.name} · ${area.beforeDate} vs ${area.afterDate} · NDVI`,
    findings: [
      { text: `Canopy cover declined from ${vegBefore} km² to ${vegAfter} km² — a ${pct}% loss over the analysis period.`, type: "critical" },
      { text: area.explanation, type: "warning" },
      { text: "Soil exposure increased in the central patch. Bare soil fraction rose from 9% to 28%.", type: "warning" },
      { text: "Eastern boundary buffer zone remains stable within historical variation range.", type: "ok" },
    ],
    statistics: [
      [`Canopy Cover (${yearFrom})`, `${vegBefore} km²`],
      [`Canopy Cover (${yearTo})`, `${vegAfter} km²`],
      [`Net Change`, `−${areaKm} km² (−${pct}%)`],
      [`Mean NDVI Δ`, "−0.31"],
      [`Accuracy`, `${area.confidence}%`],
      [`Kappa Coefficient`, "0.88"],
    ],
    timeline: [
      { date: area.afterDate, label: "Post-loss scan complete", type: "scan" },
      { date: `${yearTo}-03-15`, label: "Vegetation loss alert issued", type: "alert" },
      { date: `${yearTo}-01-01`, label: "Annual NDVI baseline", type: "baseline" },
      { date: `${yearFrom}-06-01`, label: "Mid-period reference captured", type: "reference" },
      { date: area.beforeDate, label: "Healthy canopy baseline established", type: "baseline" },
    ],
  };
}
