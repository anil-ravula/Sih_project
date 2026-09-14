import { useState, useRef, useEffect, useCallback } from "react"
import type { SelectedArea } from "./types"
import { searchSatelliteData } from "./services/searchService"
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet"
import { Button, Badge, SelectField } from "@figma/astraui"
import {
  Search,
  Mic,
  X,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  Globe,
  Calendar,
  Layers,
  Activity,
  Eye,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Loader2,
  SlidersHorizontal,
  Leaf,
  Waves,
  Building2,
  TreePine,
  MapPin,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchState = "idle" | "loading" | "results" | "no-results" | "error"

export interface SearchResult {
  id: string
  location: string
  state: string
  change: string
  changeType: "vegetation-loss" | "vegetation-gain" | "urban" | "water" | "infrastructure"
  dateRange: string
  area: string
  confidence: number
  explanation: string
  coords: [number, number]
  sensor: string
}

export interface SearchFilters {
  state: string
  district: string
  dateFrom: string
  dateTo: string
  changeTypes: string[]
  dataSource: string
  minConfidence: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Replace runMockSearch() with a real API call in production.

const MOCK_RESULTS: SearchResult[] = [
  {
    id: "SR-001",
    location: "Pune Rural",
    state: "Maharashtra",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "12.4 km²",
    confidence: 92,
    explanation:
      "NDVI decreased by 0.31 across agricultural fringes. Consistent with land-use conversion to built-up surfaces.",
    coords: [18.4, 73.75],
    sensor: "Sentinel-2",
  },
  {
    id: "SR-002",
    location: "Khed Taluka",
    state: "Maharashtra",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "8.7 km²",
    confidence: 87,
    explanation:
      "Significant loss of mixed shrubland detected. Bare soil fraction increased from 11% to 38%.",
    coords: [18.82, 73.99],
    sensor: "Sentinel-2",
  },
  {
    id: "SR-003",
    location: "Ambegaon Forest Reserve",
    state: "Maharashtra",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "5.1 km²",
    confidence: 94,
    explanation:
      "Canopy cover reduction near buffer zone edge. Possible encroachment detected on eastern boundary.",
    coords: [19.1, 73.7],
    sensor: "Sentinel-2 + Landsat-8",
  },
  {
    id: "SR-004",
    location: "Pimpri-Chinchwad",
    state: "Maharashtra",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "18.2 km²",
    confidence: 96,
    explanation:
      "New built-up area detected adjacent to existing industrial zones. Impervious surface fraction grew by 22%.",
    coords: [18.63, 73.8],
    sensor: "Cartosat-3",
  },
  {
    id: "SR-005",
    location: "Khadakwasla Reservoir",
    state: "Maharashtra",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "9.3 km²",
    confidence: 89,
    explanation:
      "Water extent reduced by ~15%. NDWI analysis indicates seasonal drawdown compounded by reduced inflow.",
    coords: [18.43, 73.76],
    sensor: "Sentinel-2",
  },
  {
    id: "SR-006",
    location: "Haveli District",
    state: "Maharashtra",
    change: "Vegetation Increase",
    changeType: "vegetation-gain",
    dateRange: "2023 → 2026",
    area: "4.2 km²",
    confidence: 81,
    explanation:
      "NDVI increase suggests reforestation or agricultural intensification in the southern sub-district.",
    coords: [18.5, 74.05],
    sensor: "Landsat-8",
  },
  {
    id: "SR-007",
    location: "Maval Taluka",
    state: "Maharashtra",
    change: "Infrastructure Change",
    changeType: "infrastructure",
    dateRange: "2023 → 2026",
    area: "2.8 km²",
    confidence: 91,
    explanation:
      "Linear infrastructure features detected — probable road widening or new connectivity corridor.",
    coords: [18.72, 73.55],
    sensor: "Cartosat-3",
  },
  {
    id: "SR-008",
    location: "Mulshi Valley",
    state: "Maharashtra",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "6.9 km²",
    confidence: 85,
    explanation:
      "Forest fragmentation along ridge. NDVI loss concentrated at 600–900m elevation band.",
    coords: [18.5, 73.52],
    sensor: "Sentinel-2",
  },
  {
    id: "SR-009",
    location: "Shirur",
    state: "Maharashtra",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "7.6 km²",
    confidence: 88,
    explanation:
      "Periurban growth pattern. Residential plots replacing rain-fed agriculture.",
    coords: [18.83, 74.37],
    sensor: "Sentinel-2",
  },
  {
    id: "SR-010",
    location: "Bhor Taluka",
    state: "Maharashtra",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "3.4 km²",
    confidence: 79,
    explanation:
      "Sparse scrubland thinning along south-facing slopes. Possible overgrazing or drought stress.",
    coords: [18.15, 73.85],
    sensor: "Landsat-8",
  },
  {
    id: "SR-011",
    location: "Indapur",
    state: "Maharashtra",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "11.1 km²",
    confidence: 90,
    explanation:
      "Ujani reservoir water area reduced significantly. High confidence from multi-date NDWI stack.",
    coords: [17.97, 75.03],
    sensor: "Sentinel-2",
  },
  {
    id: "SR-012",
    location: "Junnar",
    state: "Maharashtra",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "4.7 km²",
    confidence: 83,
    explanation:
      "Deciduous forest stress detected in northern patch. Cross-validated with Landsat LST anomaly.",
    coords: [19.2, 73.87],
    sensor: "Sentinel-2 + Landsat-8",
  },
]

const SUGGESTED_QUERIES = [
  "Vegetation loss around Pune",
  "Urban expansion in Hyderabad",
  "Water-body changes in Gujarat",
  "Forest cover changes in Northeast India",
  "Coastal erosion along Odisha shoreline",
  "Cropland expansion in Punjab delta",
]

const RECENT_SEARCHES = [
  "Vegetation loss around Pune",
  "Urban expansion near Hyderabad",
  "Water changes in Chilika Lake",
  "Forest loss in Hasdeo, Chhattisgarh",
]

const LOADING_MESSAGES = [
  "Parsing query intent…",
  "Searching satellite observations…",
  "Ranking matching locations…",
  "Applying temporal filters…",
  "Computing confidence scores…",
]

const CHANGE_TYPE_ICONS: Record<string, React.ElementType> = {
  "vegetation-loss": Leaf,
  "vegetation-gain": TreePine,
  urban: Building2,
  water: Waves,
  infrastructure: Activity,
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  "vegetation-loss": "text-danger",
  "vegetation-gain": "text-success",
  urban: "text-warning",
  water: "text-blue-500",
  infrastructure: "text-brand-primary",
}

const CHANGE_TYPE_BG: Record<string, string> = {
  "vegetation-loss": "bg-danger/10 border-danger/20",
  "vegetation-gain": "bg-success/10 border-success/20",
  urban: "bg-warning/10 border-warning/20",
  water: "bg-blue-500/10 border-blue-500/20",
  infrastructure: "bg-brand-primary/10 border-brand-primary/20",
}

const MARKER_COLORS: Record<string, string> = {
  "vegetation-loss": "#ef4444",
  "vegetation-gain": "#22c55e",
  urban: "#f97316",
  water: "#3b82f6",
  infrastructure: "#5250f3",
}

// ─── Construction / built-up result set ──────────────────────────────────────

const CONSTRUCTION_RESULTS: SearchResult[] = [
  {
    id: "CON-001",
    location: "GIFT City, Gandhinagar",
    state: "Gujarat",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "15.8 km²",
    confidence: 93,
    explanation:
      "Rapid expansion of the GIFT City financial district. Impervious surface fraction increased by 34%. New commercial towers and road network detected via Cartosat-3.",
    coords: [23.16, 72.68],
    sensor: "Cartosat-3",
  },
  {
    id: "CON-002",
    location: "Aerocity Cluster, Delhi",
    state: "Delhi",
    change: "Infrastructure Change",
    changeType: "infrastructure",
    dateRange: "2023 → 2026",
    area: "11.2 km²",
    confidence: 91,
    explanation:
      "New hospitality and logistics infrastructure around IGI Airport. Road and utility corridor expansion confirmed through multi-date SAR change analysis.",
    coords: [28.56, 77.11],
    sensor: "Sentinel-1 + Cartosat-3",
  },
  {
    id: "CON-003",
    location: "Whitefield IT Park",
    state: "Karnataka",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "19.4 km²",
    confidence: 95,
    explanation:
      "Large-scale IT campus construction east of Bengaluru. Bare soil and foundation activity detected at multiple new construction sites. Impervious surface grew by 29%.",
    coords: [12.97, 77.75],
    sensor: "Cartosat-3",
  },
  {
    id: "CON-004",
    location: "Navi Mumbai Expansion",
    state: "Maharashtra",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "24.7 km²",
    confidence: 88,
    explanation:
      "Periurban growth in Panvel–Uran corridor. New township layouts and residential construction identified. Coastal reclamation activity also detected.",
    coords: [18.99, 73.03],
    sensor: "Sentinel-2",
  },
  {
    id: "CON-005",
    location: "DMIC Industrial Node, Neemrana",
    state: "Rajasthan",
    change: "Infrastructure Change",
    changeType: "infrastructure",
    dateRange: "2023 → 2026",
    area: "17.1 km²",
    confidence: 90,
    explanation:
      "Delhi-Mumbai Industrial Corridor node expansion. Factory sheds, access roads and utility infrastructure detected at three separate construction sites.",
    coords: [27.98, 76.37],
    sensor: "Sentinel-2 + Cartosat-3",
  },
  {
    id: "CON-006",
    location: "Amaravati Capital Region",
    state: "Andhra Pradesh",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "31.6 km²",
    confidence: 87,
    explanation:
      "Capital city construction activity across multiple zones. Administrative buildings, residential layouts and arterial roads visible in high-resolution imagery.",
    coords: [16.51, 80.52],
    sensor: "Cartosat-3",
  },
]

// ─── Query-specific result sets ───────────────────────────────────────────────

const HYDERABAD_RESULTS: SearchResult[] = [
  {
    id: "HYD-001",
    location: "Cyberabad IT Corridor",
    state: "Telangana",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "22.6 km²",
    confidence: 95,
    explanation:
      "Rapid built-up growth west of HITECH City. Impervious surface fraction increased by 31% driven by IT park and residential development.",
    coords: [17.45, 78.37],
    sensor: "Cartosat-3",
  },
  {
    id: "HYD-002",
    location: "Shamshabad Periurban",
    state: "Telangana",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "14.1 km²",
    confidence: 91,
    explanation:
      "Airport-adjacent peri-urban sprawl. New road alignments and plot layouts detected via Cartosat-3 PAN imagery.",
    coords: [17.24, 78.42],
    sensor: "Cartosat-3",
  },
  {
    id: "HYD-003",
    location: "Malkajgiri",
    state: "Telangana",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "6.3 km²",
    confidence: 88,
    explanation:
      "Green cover reduction in transitional zones. NDVI decline of 0.27 correlates with residential layout approvals in this corridor.",
    coords: [17.46, 78.54],
    sensor: "Sentinel-2",
  },
  {
    id: "HYD-004",
    location: "Hussain Sagar Catchment",
    state: "Telangana",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "3.1 km²",
    confidence: 83,
    explanation:
      "Lake-edge encroachment reducing effective water area. NDWI boundary has receded 80–120m on the eastern shore.",
    coords: [17.43, 78.47],
    sensor: "Sentinel-2",
  },
  {
    id: "HYD-005",
    location: "Chevella Mandal",
    state: "Telangana",
    change: "Infrastructure Change",
    changeType: "infrastructure",
    dateRange: "2023 → 2026",
    area: "8.4 km²",
    confidence: 90,
    explanation:
      "New road and utility corridor detected south of Hyderabad. Bare soil disturbance pattern consistent with highway-grade construction.",
    coords: [17.3, 78.18],
    sensor: "Cartosat-3",
  },
  {
    id: "HYD-006",
    location: "Hayathnagar",
    state: "Telangana",
    change: "Urban Expansion",
    changeType: "urban",
    dateRange: "2023 → 2026",
    area: "9.8 km²",
    confidence: 87,
    explanation:
      "Eastern Hyderabad growth corridor. New townships and logistics park footprints confirmed by multi-date analysis.",
    coords: [17.37, 78.6],
    sensor: "Sentinel-2",
  },
]

const GUJARAT_WATER_RESULTS: SearchResult[] = [
  {
    id: "GUJ-001",
    location: "Sardar Sarovar Reservoir",
    state: "Gujarat",
    change: "Water Change",
    changeType: "water",
    dateRange: "Jan 2026 → Sep 2026",
    area: "33.7 km²",
    confidence: 94,
    explanation:
      "NDWI analysis confirms water surface area reduction from 187.4 km² to 153.7 km² — an 18% decline over the analysis period. Sedimentation along eastern bank also detected.",
    coords: [21.83, 73.75],
    sensor: "Sentinel-2",
  },
  {
    id: "GUJ-002",
    location: "Nal Sarovar Bird Sanctuary",
    state: "Gujarat",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "12.8 km²",
    confidence: 89,
    explanation:
      "Seasonal lake extent variability detected. Post-monsoon maximum area significantly reduced compared to 2023 baseline, suggesting reduced inflow from catchment.",
    coords: [22.75, 72.0],
    sensor: "Sentinel-2",
  },
  {
    id: "GUJ-003",
    location: "Ukai Reservoir",
    state: "Gujarat",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "18.2 km²",
    confidence: 92,
    explanation:
      "Reservoir water area declined. Tapi river inflow reduction combined with increased irrigation drawdown accounts for observed 12% surface loss.",
    coords: [21.25, 73.6],
    sensor: "Sentinel-2",
  },
  {
    id: "GUJ-004",
    location: "Little Rann of Kutch",
    state: "Gujarat",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "47.5 km²",
    confidence: 86,
    explanation:
      "Seasonal salt flat inundation area reduced. NDWI and SAR joint analysis indicates earlier-than-average desiccation onset.",
    coords: [23.5, 71.5],
    sensor: "Sentinel-1 + Sentinel-2",
  },
]

const ODISHA_COASTAL_RESULTS: SearchResult[] = [
  {
    id: "ODI-001",
    location: "Paradip Coastal Zone",
    state: "Odisha",
    change: "Coastal Erosion",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "8.4 km²",
    confidence: 93,
    explanation:
      "Shoreline recession of 35–80m detected along a 12 km stretch north of Paradip Port. Beach width reduced by ~40% relative to the 2023 baseline. Erosion correlates with post-cyclone wave action and reduced sediment supply.",
    coords: [20.32, 86.62],
    sensor: "Sentinel-2 + Sentinel-1",
  },
  {
    id: "ODI-002",
    location: "Kendrapara Mangrove Coast",
    state: "Odisha",
    change: "Coastal Erosion",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "5.1 km²",
    confidence: 90,
    explanation:
      "Mangrove fringe loss and shoreline retreat detected in Bhitarkanika buffer zone. NDVI decline of 0.29 in coastal fringe. Tidal creek migration also observed in northern sector.",
    coords: [20.72, 86.9],
    sensor: "Sentinel-2",
  },
  {
    id: "ODI-003",
    location: "Puri Beach Corridor",
    state: "Odisha",
    change: "Coastal Erosion",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "3.7 km²",
    confidence: 88,
    explanation:
      "Active beach erosion south of Puri city. Dune system lost ~25m from the seaward edge. Coastal infrastructure risk elevated. SAR coherence confirms active erosion front.",
    coords: [19.81, 85.83],
    sensor: "Sentinel-1 + Cartosat-3",
  },
  {
    id: "ODI-004",
    location: "Chilika Lake Mouth",
    state: "Odisha",
    change: "Water Change",
    changeType: "water",
    dateRange: "2023 → 2026",
    area: "11.3 km²",
    confidence: 92,
    explanation:
      "Chilika outlet channel migrated ~1.8 km southward. Sandbar accretion blocking tidal exchange detected via NDWI and SAR. Salinity gradient shift impacts aquaculture zones.",
    coords: [19.72, 85.37],
    sensor: "Sentinel-2 + Sentinel-1",
  },
  {
    id: "ODI-005",
    location: "Gopalpur-on-Sea",
    state: "Odisha",
    change: "Coastal Erosion",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "2.9 km²",
    confidence: 85,
    explanation:
      "Shoreline retreat of 20–45m along a 7 km stretch. Storm surge scour during 2025 cyclone season accelerated pre-existing erosion trend detected since 2023 baseline.",
    coords: [19.27, 84.9],
    sensor: "Sentinel-2",
  },
  {
    id: "ODI-006",
    location: "Dhamara Estuary",
    state: "Odisha",
    change: "Infrastructure Change",
    changeType: "infrastructure",
    dateRange: "2023 → 2026",
    area: "6.2 km²",
    confidence: 89,
    explanation:
      "Port expansion and reclamation activity detected at Dhamara LNG terminal. New jetty and road infrastructure identified via Cartosat-3 PAN imagery. Intertidal habitat loss confirmed.",
    coords: [20.83, 86.97],
    sensor: "Cartosat-3",
  },
]

const FOREST_RESULTS: SearchResult[] = [
  {
    id: "FOR-001",
    location: "Hasdeo Arand Forest",
    state: "Chhattisgarh",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "14.1 km²",
    confidence: 97,
    explanation:
      "Significant canopy loss in biodiversity-rich Hasdeo block. NDVI reduced by 0.38 in core zone, consistent with open-cast mining activity.",
    coords: [22.6, 82.3],
    sensor: "Sentinel-2 + Landsat-8",
  },
  {
    id: "FOR-002",
    location: "Achanakmar Tiger Reserve Buffer",
    state: "Chhattisgarh",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "7.6 km²",
    confidence: 91,
    explanation:
      "Forest fragmentation along buffer zone boundary. Clearings of 0.5–2 ha size visible in Cartosat imagery, possibly from encroachment.",
    coords: [22.1, 81.55],
    sensor: "Cartosat-3",
  },
  {
    id: "FOR-003",
    location: "Barnawapara Wildlife Sanctuary",
    state: "Chhattisgarh",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "4.9 km²",
    confidence: 85,
    explanation:
      "Peripheral NDVI decline consistent with fire-disturbed regrowth and possible grazing pressure.",
    coords: [21.55, 82.1],
    sensor: "Sentinel-2",
  },
  {
    id: "FOR-004",
    location: "Simlipal Biosphere Reserve",
    state: "Odisha",
    change: "Vegetation Loss",
    changeType: "vegetation-loss",
    dateRange: "2023 → 2026",
    area: "9.2 km²",
    confidence: 90,
    explanation:
      "Forest fire scars and post-fire succession zones identified. Thermal anomaly confirmed via Landsat-8 LST analysis.",
    coords: [21.8, 86.5],
    sensor: "Landsat-8",
  },
]

// ─── SearchResult → SelectedArea conversion ───────────────────────────────────
// Converts a UI search result into the shared SelectedArea domain object.
// This is the only place that knows about both SearchResult and SelectedArea.

function searchResultToSelectedArea(result: SearchResult): SelectedArea {
  const parts = result.dateRange
    .replace("→", "→")
    .split("→")
    .map((s) => s.trim())
  const rawFrom = parts[0] ?? "2023"
  const rawTo = parts[1] ?? "2026"
  const yearFrom = rawFrom.slice(-4)
  const yearTo = rawTo.slice(-4)
  return {
    id: result.id,
    name: result.location,
    state: result.state,
    latitude: result.coords[0],
    longitude: result.coords[1],
    boundingBox: [
      [
        Number((result.coords[0] - 0.04).toFixed(4)),
        Number((result.coords[1] - 0.04).toFixed(4)),
      ],
      [
        Number((result.coords[0] + 0.04).toFixed(4)),
        Number((result.coords[1] + 0.04).toFixed(4)),
      ],
    ],
    analysisType: result.changeType,
    changeDescription: result.change,
    beforeDate: `${yearFrom}-01-15`,
    afterDate: `${yearTo}-09-06`,
    sensor: result.sensor,
    confidence: result.confidence,
    affectedArea: result.area,
    explanation: result.explanation,
  }
}

// ─── Dynamic Location Resolution ─────────────────────────────────────────────

const GEO_LOCATIONS: Record<string, {
  state: string
  coords: [number, number]
}> = {
  // Northern
  delhi: { state: "Delhi NCR", coords: [28.6139, 77.209] },
  noida: { state: "Uttar Pradesh", coords: [28.5355, 77.391] },
  gurgaon: { state: "Haryana", coords: [28.4595, 77.0266] },
  gurugram: { state: "Haryana", coords: [28.4595, 77.0266] },
  jaipur: { state: "Rajasthan", coords: [26.9124, 75.7873] },
  jodhpur: { state: "Rajasthan", coords: [26.2389, 73.0243] },
  udaipur: { state: "Rajasthan", coords: [24.5854, 73.7125] },
  lucknow: { state: "Uttar Pradesh", coords: [26.8467, 80.9462] },
  kanpur: { state: "Uttar Pradesh", coords: [26.4499, 80.3319] },
  varanasi: { state: "Uttar Pradesh", coords: [25.3176, 82.9739] },
  agra: { state: "Uttar Pradesh", coords: [27.1767, 78.0081] },
  chandigarh: { state: "Chandigarh", coords: [30.7333, 76.7794] },
  dehradun: { state: "Uttarakhand", coords: [30.3165, 78.0322] },
  shimla: { state: "Himachal Pradesh", coords: [31.1048, 77.1734] },
  srinagar: { state: "Jammu & Kashmir", coords: [34.0837, 74.7973] },
  amritsar: { state: "Punjab", coords: [31.634, 74.8723] },
  ludhiana: { state: "Punjab", coords: [30.901, 75.8573] },

  // Western
  mumbai: { state: "Maharashtra", coords: [19.076, 72.8777] },
  thane: { state: "Maharashtra", coords: [19.2183, 72.9781] },
  nagpur: { state: "Maharashtra", coords: [21.1458, 79.0882] },
  ahmedabad: { state: "Gujarat", coords: [23.0225, 72.5714] },
  surat: { state: "Gujarat", coords: [21.1702, 72.8311] },
  vadodara: { state: "Gujarat", coords: [22.3072, 73.1812] },
  rajkot: { state: "Gujarat", coords: [22.3039, 70.8022] },
  goa: { state: "Goa", coords: [15.2993, 74.124] },
  panaji: { state: "Goa", coords: [15.4909, 73.8278] },

  // Southern
  bengaluru: { state: "Karnataka", coords: [12.9716, 77.5946] },
  bangalore: { state: "Karnataka", coords: [12.9716, 77.5946] },
  mysuru: { state: "Karnataka", coords: [12.2958, 76.6394] },
  mysore: { state: "Karnataka", coords: [12.2958, 76.6394] },
  mangalore: { state: "Karnataka", coords: [12.9141, 74.856] },
  visakhapatnam: { state: "Andhra Pradesh", coords: [17.6868, 83.2185] },
  vijayawada: { state: "Andhra Pradesh", coords: [16.5062, 80.648] },
  chennai: { state: "Tamil Nadu", coords: [13.0827, 80.2707] },
  coimbatore: { state: "Tamil Nadu", coords: [11.0168, 76.9558] },
  madurai: { state: "Tamil Nadu", coords: [9.9252, 78.1198] },
  kochi: { state: "Kerala", coords: [9.9312, 76.2673] },
  trivandrum: { state: "Kerala", coords: [8.5241, 76.9366] },
  thiruvananthapuram: { state: "Kerala", coords: [8.5241, 76.9366] },

  // Eastern & Central
  kolkata: { state: "West Bengal", coords: [22.5726, 88.3639] },
  patna: { state: "Bihar", coords: [25.5941, 85.1376] },
  bhopal: { state: "Madhya Pradesh", coords: [23.2599, 77.4126] },
  indore: { state: "Madhya Pradesh", coords: [22.7196, 75.8577] },
  raipur: { state: "Chhattisgarh", coords: [21.2514, 81.6296] },
  bhubaneswar: { state: "Odisha", coords: [20.2961, 85.8245] },
  ranchi: { state: "Jharkhand", coords: [23.3441, 85.3096] },
  jamshedpur: { state: "Jharkhand", coords: [22.8046, 86.2029] },

  // Northeast
  nagaland: { state: "Nagaland", coords: [25.67, 94.11] },
  kohima: { state: "Nagaland", coords: [25.67, 94.11] },
  dimapur: { state: "Nagaland", coords: [25.91, 93.73] },
  guwahati: { state: "Assam", coords: [26.1445, 91.7362] },
  shillong: { state: "Meghalaya", coords: [25.5788, 91.8933] },
  imphal: { state: "Manipur", coords: [24.817, 93.9368] },
  gangtok: { state: "Sikkim", coords: [27.3389, 88.6065] },

  // Northern & UTs
  ladakh: { state: "Ladakh", coords: [34.15, 77.58] },
  leh: { state: "Ladakh", coords: [34.15, 77.58] },
  kargil: { state: "Ladakh", coords: [34.56, 76.13] },

  // States
  rajasthan: { state: "Rajasthan", coords: [26.5, 74.5] },
  maharashtra: { state: "Maharashtra", coords: [19.75, 75.7] },
  karnataka: { state: "Karnataka", coords: [15.3, 75.7] },
  kerala: { state: "Kerala", coords: [10.85, 76.27] },
  "tamil nadu": { state: "Tamil Nadu", coords: [11.12, 78.65] },
  "andhra pradesh": { state: "Andhra Pradesh", coords: [15.91, 79.74] },
  telangana: { state: "Telangana", coords: [18.11, 79.01] },
  gujarat: { state: "Gujarat", coords: [22.25, 71.19] },
  "madhya pradesh": { state: "Madhya Pradesh", coords: [22.97, 78.65] },
  "uttar pradesh": { state: "Uttar Pradesh", coords: [26.84, 80.94] },
  bihar: { state: "Bihar", coords: [25.09, 85.31] },
  "west bengal": { state: "West Bengal", coords: [22.98, 87.85] },
  odisha: { state: "Odisha", coords: [20.95, 85.09] },
  chhattisgarh: { state: "Chhattisgarh", coords: [21.27, 81.86] },
  punjab: { state: "Punjab", coords: [31.14, 75.34] },
  haryana: { state: "Haryana", coords: [29.05, 76.08] },
  uttarakhand: { state: "Uttarakhand", coords: [30.06, 79.01] },
  assam: { state: "Assam", coords: [26.2, 92.93] },
}

function generateDynamicResultsForLocation(
  locName: string,
  stateName: string,
  coords: [number, number],
  query: string,
): SearchResult[] {
  const q = query.toLowerCase()
  const slug =
    locName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4) || "LOC"
  const [lat, lon] = coords

  if (
    q.includes("water") ||
    q.includes("lake") ||
    q.includes("reservoir") ||
    q.includes("river") ||
    q.includes("wetland")
  ) {
    return [
      {
        id: `${slug}-WAT-01`,
        location: `${locName} Reservoir Basin`,
        state: stateName,
        change: "Water Level Change",
        changeType: "water",
        dateRange: "2023 → 2026",
        area: "14.8 km²",
        confidence: 93,
        explanation: `NDWI analysis indicates seasonal water spread reduction and shoreline recession in ${locName} catchment.`,
        coords: [Number(lat.toFixed(4)), Number(lon.toFixed(4))],
        sensor: "Sentinel-2",
      },
      {
        id: `${slug}-WAT-02`,
        location: `${locName} Wetland Zone`,
        state: stateName,
        change: "Water Change",
        changeType: "water",
        dateRange: "2023 → 2026",
        area: "8.2 km²",
        confidence: 89,
        explanation: `Peripheral wetland boundary contraction detected along ${locName} water bodies.`,
        coords: [
          Number((lat + 0.03).toFixed(4)),
          Number((lon - 0.02).toFixed(4)),
        ],
        sensor: "Sentinel-2",
      },
    ]
  }

  if (
    q.includes("forest") ||
    q.includes("deforestation") ||
    q.includes("loss") ||
    q.includes("tree") ||
    q.includes("canopy")
  ) {
    return [
      {
        id: `${slug}-FOR-01`,
        location: `${locName} Forest Fringe`,
        state: stateName,
        change: "Vegetation Loss",
        changeType: "vegetation-loss",
        dateRange: "2023 → 2026",
        area: "12.6 km²",
        confidence: 94,
        explanation: `Canopy cover decline and NDVI loss detected across forest patches near ${locName}.`,
        coords: [Number(lat.toFixed(4)), Number(lon.toFixed(4))],
        sensor: "Sentinel-2 + Landsat-8",
      },
      {
        id: `${slug}-FOR-02`,
        location: `${locName} Buffer Reserve`,
        state: stateName,
        change: "Vegetation Loss",
        changeType: "vegetation-loss",
        dateRange: "2023 → 2026",
        area: "6.4 km²",
        confidence: 88,
        explanation: `Vegetation thinning and bare soil exposure observed along ${locName} perimeter.`,
        coords: [
          Number((lat - 0.03).toFixed(4)),
          Number((lon + 0.03).toFixed(4)),
        ],
        sensor: "Sentinel-2",
      },
    ]
  }

  if (
    q.includes("urban") ||
    q.includes("construction") ||
    q.includes("built") ||
    q.includes("infrastructure") ||
    q.includes("expansion")
  ) {
    return [
      {
        id: `${slug}-URB-01`,
        location: `${locName} Urban Zone`,
        state: stateName,
        change: "Urban Expansion",
        changeType: "urban",
        dateRange: "2023 → 2026",
        area: "18.5 km²",
        confidence: 95,
        explanation: `Rapid built-up expansion and new development footprint detected in ${locName} corridor via Cartosat-3.`,
        coords: [Number(lat.toFixed(4)), Number(lon.toFixed(4))],
        sensor: "Cartosat-3",
      },
      {
        id: `${slug}-URB-02`,
        location: `${locName} Periurban Corridor`,
        state: stateName,
        change: "Infrastructure Expansion",
        changeType: "infrastructure",
        dateRange: "2023 → 2026",
        area: "10.2 km²",
        confidence: 91,
        explanation: `New connectivity roads, logistics facilities, and industrial layouts identified in ${locName}.`,
        coords: [
          Number((lat + 0.03).toFixed(4)),
          Number((lon + 0.02).toFixed(4)),
        ],
        sensor: "Cartosat-3",
      },
    ]
  }

  // General location query
  return [
    {
      id: `${slug}-01`,
      location: `${locName} Urban Growth Area`,
      state: stateName,
      change: "Urban Expansion",
      changeType: "urban",
      dateRange: "2023 → 2026",
      area: "17.4 km²",
      confidence: 95,
      explanation: `Built-up footprint expansion detected across ${locName} sector. Impervious surface increased by 26%.`,
      coords: [
        Number((lat + 0.015).toFixed(4)),
        Number((lon + 0.015).toFixed(4)),
      ],
      sensor: "Cartosat-3",
    },
    {
      id: `${slug}-02`,
      location: `${locName} Water Body Basin`,
      state: stateName,
      change: "Water Level Change",
      changeType: "water",
      dateRange: "2023 → 2026",
      area: "11.2 km²",
      confidence: 90,
      explanation: `NDWI analysis indicates seasonal water spread drawdown in ${locName} reservoir and surrounding catchment.`,
      coords: [
        Number((lat - 0.025).toFixed(4)),
        Number((lon - 0.02).toFixed(4)),
      ],
      sensor: "Sentinel-2",
    },
    {
      id: `${slug}-03`,
      location: `${locName} Forest & Greenbelt`,
      state: stateName,
      change: "Vegetation Loss",
      changeType: "vegetation-loss",
      dateRange: "2023 → 2026",
      area: "8.6 km²",
      confidence: 87,
      explanation: `Vegetation thinning and scrubland loss detected along ${locName} fringe boundary.`,
      coords: [
        Number((lat + 0.03).toFixed(4)),
        Number((lon - 0.03).toFixed(4)),
      ],
      sensor: "Sentinel-2 + Landsat-8",
    },
  ]
}

// ─── Mock search engine ───────────────────────────────────────────────────────
// Swap this function for a real API call: POST /api/semantic-search { query, filters }

function selectResultSet(query: string): SearchResult[] {
  const q = query.toLowerCase()

  // ── 1. Curated specific catalogs ──────────────────────────────────────────
  if (
    q.includes("pune") ||
    q.includes("pimpri") ||
    q.includes("nashik") ||
    q.includes("khed") ||
    q.includes("haveli") ||
    q.includes("mulshi") ||
    q.includes("maval") ||
    q.includes("junnar") ||
    q.includes("bhor") ||
    q.includes("shirur") ||
    q.includes("indapur")
  ) {
    return MOCK_RESULTS
  }

  if (
    q.includes("hyderabad") ||
    q.includes("telangana") ||
    q.includes("cyberabad") ||
    q.includes("secunderabad") ||
    q.includes("shamshabad")
  ) {
    return HYDERABAD_RESULTS
  }

  if (
    q.includes("odisha") ||
    q.includes("paradip") ||
    q.includes("puri") ||
    q.includes("chilika") ||
    q.includes("kendrapara") ||
    q.includes("gopalpur") ||
    q.includes("dhamara")
  ) {
    return ODISHA_COASTAL_RESULTS
  }

  if (
    q.includes("gujarat") ||
    q.includes("sardar sarovar") ||
    q.includes("nal sarovar") ||
    q.includes("ukai")
  ) {
    return GUJARAT_WATER_RESULTS
  }

  if (
    q.includes("chhattisgarh") ||
    q.includes("hasdeo") ||
    q.includes("achanakmar") ||
    q.includes("barnawapara") ||
    q.includes("simlipal")
  ) {
    return FOREST_RESULTS
  }

  if (
    q.includes("gift city") ||
    q.includes("aerocity") ||
    q.includes("whitefield") ||
    q.includes("neemrana") ||
    q.includes("amaravati")
  ) {
    return CONSTRUCTION_RESULTS
  }

  // ── 2. Match against GEO_LOCATIONS dictionary ─────────────────────────────
  for (const [locKey, info] of Object.entries(GEO_LOCATIONS)) {
    const pattern = new RegExp(`\\b${locKey}\\b`, "i")
    if (pattern.test(q)) {
      const locTitle = locKey.charAt(0).toUpperCase() + locKey.slice(1)
      return generateDynamicResultsForLocation(
        locTitle,
        info.state,
        info.coords,
        query,
      )
    }
  }

  // ── 3. Check for "in/near/around <Place>" pattern ──────────────────────────
  const placeMatch = q.match(/\b(?:in|near|around|at)\s+([a-z]+)\b/i)
  if (placeMatch && placeMatch[1]) {
    const rawPlace = placeMatch[1]
    const skipWords = new Set([
      "the",
      "a",
      "an",
      "all",
      "india",
      "satellite",
      "recent",
      "new",
      "this",
    ])
    if (!skipWords.has(rawPlace.toLowerCase())) {
      const titlePlace = rawPlace.charAt(0).toUpperCase() + rawPlace.slice(1)
      return generateDynamicResultsForLocation(
        titlePlace,
        "India",
        [22.5, 78.5],
        query,
      )
    }
  }

  // ── 4. Pure change-type keywords (no geography specified) ─────────────────
  if (
    q.includes("coastal") ||
    q.includes("coast") ||
    q.includes("shoreline") ||
    q.includes("shore") ||
    q.includes("erosion") ||
    q.includes("mangrove")
  ) {
    return ODISHA_COASTAL_RESULTS
  }

  if (
    q.includes("construction") ||
    q.includes("built-up") ||
    q.includes("building") ||
    q.includes("infrastructure") ||
    q.includes("new development") ||
    q.includes("industrial") ||
    q.includes("urban") ||
    q.includes("expansion")
  ) {
    return CONSTRUCTION_RESULTS
  }

  if (
    q.includes("forest") ||
    q.includes("deforestation") ||
    q.includes("northeast") ||
    q.includes("cover change")
  ) {
    return FOREST_RESULTS
  }

  if (
    q.includes("water") ||
    q.includes("lake") ||
    q.includes("reservoir") ||
    q.includes("river")
  ) {
    return GUJARAT_WATER_RESULTS
  }

  if (q.includes("vegetation") || q.includes("ndvi") || q.includes("canopy")) {
    return MOCK_RESULTS
  }

  // ── 5. Arbitrary search query treated as location ──────────────────────────
  const cleanTokens = q
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 2 &&
        !["satellite", "data", "imagery", "view", "find", "search"].includes(w),
    )
  if (cleanTokens.length > 0) {
    const titleQuery = cleanTokens
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
    return generateDynamicResultsForLocation(
      titleQuery,
      "India",
      [20.5937, 78.9629],
      query,
    )
  }

  // ── 6. Default ────────────────────────────────────────────────────────────
  return MOCK_RESULTS
}

function runMockSearch(
  query: string,
  filters: SearchFilters,
): Promise<SearchResult[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let results = [...selectResultSet(query)]
      if (filters.changeTypes.length > 0) {
        results = results.filter((r) =>
          filters.changeTypes.includes(r.changeType),
        )
      }
      if (filters.minConfidence > 0) {
        results = results.filter((r) => r.confidence >= filters.minConfidence)
      }
      if (filters.dataSource && filters.dataSource !== "all") {
        const map: Record<string, string> = {
          "sentinel-2": "Sentinel",
          landsat: "Landsat",
        }
        const keyword = map[filters.dataSource]
        if (keyword) results = results.filter((r) => r.sensor.includes(keyword))
      }
      resolve(results)
    }, 2200)
  })
}

// ─── SemanticSearchPage ───────────────────────────────────────────────────────

export default function SemanticSearchPage({
  onNavigate,
  onSelectArea,
}: {
  onNavigate: (page: string, area?: SelectedArea) => void
  onSelectArea?: (area: SelectedArea) => void
}) {
  const [query, setQuery] = useState("")
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null,
  )

  const handleSelectResult = (res: SearchResult | null) => {
    setSelectedResult(res)
    if (res && onSelectArea) {
      onSelectArea(searchResultToSelectedArea(res))
    }
  }
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    state: "",
    district: "",
    dateFrom: "2023-01-01",
    dateTo: "2026-12-31",
    changeTypes: [],
    dataSource: "all",
    minConfidence: 70,
  })
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(
    () => () => {
      if (loadingInterval.current) clearInterval(loadingInterval.current)
    },
    [],
  )

  const startSearch = async (q: string) => {
    if (!q.trim()) return
    setQuery(q)
    setSearchState("loading")
    setSelectedResult(null)

    let msgIdx = 0
    setLoadingMsg(LOADING_MESSAGES[0])
    loadingInterval.current = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[msgIdx])
    }, 440)

    try {
      const res = await searchSatelliteData(q, filters, runMockSearch)
      if (loadingInterval.current) clearInterval(loadingInterval.current)
      setResults(res)
      setSearchState(res.length > 0 ? "results" : "no-results")
      if (res.length > 0) handleSelectResult(res[0])
    } catch {
      if (loadingInterval.current) clearInterval(loadingInterval.current)
      setSearchState("error")
    }
  }

  const clearSearch = () => {
    setQuery("")
    setSearchState("idle")
    setResults([])
    handleSelectResult(null)
  }

  const toggleChangeType = (type: string) => {
    setFilters((f) => ({
      ...f,
      changeTypes: f.changeTypes.includes(type)
        ? f.changeTypes.filter((t) => t !== type)
        : [...f.changeTypes, type],
    }))
  }

  const isResults = searchState === "results"

  return (
    <div className="flex h-full bg-brand-tertiary overflow-hidden">
      {/* ── Left: search + filters column ── */}
      <div
        className={`flex flex-col bg-surface-bg border-r border-border-secondary overflow-y-auto transition-all duration-200 ${
          isResults ? "w-80 flex-shrink-0" : "flex-1 max-w-2xl"
        }`}
      >
        {/* Page header */}
        <div className="px-2xl pt-2xl pb-xl border-b border-border-secondary">
          <h1 className="text-title text-text-primary">Semantic Search</h1>
          <p className="text-label-sm text-text-secondary mt-xs">
            Find satellite observations and geographical changes using natural
            language.
          </p>
        </div>

        {/* Search input */}
        <div className="px-2xl py-xl border-b border-border-secondary">
          <SearchInput
            query={query}
            setQuery={setQuery}
            onSearch={startSearch}
            onClear={clearSearch}
            loading={searchState === "loading"}
            textareaRef={textareaRef}
            compact={isResults}
          />

          {/* Suggested queries — idle only */}
          {searchState === "idle" && (
            <div className="mt-lg">
              <p className="text-video-title text-text-tertiary mb-md">
                Suggested searches:
              </p>
              <div className="flex flex-wrap gap-sm">
                {SUGGESTED_QUERIES.map((s) => (
                  <button
                    key={s}
                    onClick={() => startSearch(s)}
                    className="text-video-title text-brand-primary bg-brand-tertiary border border-brand-primary/20 rounded-corner-full px-md py-xs hover:bg-brand-primary/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter panel */}
        <div className="border-b border-border-secondary">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="w-full flex items-center justify-between px-2xl py-md hover:bg-bg-hover transition-colors"
          >
            <div className="flex items-center gap-md">
              <SlidersHorizontal size={14} className="text-text-secondary" />
              <span className="text-label-sm text-text-primary font-medium">
                Filters
              </span>
              {filters.changeTypes.length > 0 && (
                <Badge
                  label={String(filters.changeTypes.length)}
                  variant="brand"
                />
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-text-tertiary transition-transform ${
                showFilters ? "" : "-rotate-90"
              }`}
            />
          </button>
          {showFilters && (
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              onChangeType={toggleChangeType}
            />
          )}
        </div>

        {/* Recent searches — idle only */}
        {searchState === "idle" && (
          <div className="px-2xl py-xl">
            <p className="text-video-title text-text-tertiary font-medium uppercase tracking-wide mb-md">
              Recent Searches
            </p>
            <div className="flex flex-col gap-xs">
              {RECENT_SEARCHES.map((s) => (
                <button
                  key={s}
                  onClick={() => startSearch(s)}
                  className="flex items-center gap-md p-md rounded-corner-md hover:bg-bg-hover transition-colors text-left group"
                >
                  <Clock
                    size={12}
                    className="text-text-tertiary flex-shrink-0"
                  />
                  <span className="text-label-sm text-text-secondary group-hover:text-text-primary">
                    {s}
                  </span>
                  <ChevronRight
                    size={12}
                    className="text-text-tertiary ml-auto opacity-0 group-hover:opacity-100"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results list — compact in split layout */}
        {isResults && (
          <ResultsList
            results={results}
            selectedId={selectedResult?.id ?? null}
            onSelect={handleSelectResult}
            onNavigate={onNavigate}
            compact
          />
        )}
      </div>

      {/* ── Right: map + results (shown after search) ── */}
      {(isResults ||
        searchState === "loading" ||
        searchState === "no-results" ||
        searchState === "error") && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Result count bar */}
          <div className="bg-surface-bg border-b border-border-secondary px-xl py-md flex items-center justify-between flex-shrink-0">
            {searchState === "loading" && (
              <div className="flex items-center gap-md">
                <Loader2
                  size={14}
                  className="text-brand-primary animate-spin"
                />
                <span className="text-label-sm text-text-secondary">
                  {loadingMsg}
                </span>
              </div>
            )}
            {isResults && (
              <>
                <div className="flex items-center gap-md">
                  <span className="text-label-sm text-text-primary font-medium">
                    {results.length} relevant areas found
                  </span>
                  <span className="text-video-title text-text-tertiary">·</span>
                  <span className="text-video-title text-text-tertiary line-clamp-1 max-w-xs">
                    "{query}"
                  </span>
                </div>
                <div className="flex gap-md">
                  <Button
                    variant="subtle"
                    size="small"
                    iconStart={<Filter size={13} />}
                  >
                    Sort
                  </Button>
                  <Button
                    variant="neutral"
                    size="small"
                    iconStart={<Activity size={13} />}
                    onClick={() => {
                      const target =
                        selectedResult ||
                        (results.length > 0 ? results[0] : null)
                      onNavigate(
                        "change-detection",
                        target ? searchResultToSelectedArea(target) : undefined,
                      )
                    }}
                  >
                    Bulk Analyse
                  </Button>
                </div>
              </>
            )}
            {searchState === "no-results" && (
              <span className="text-label-sm text-text-secondary">
                No matching observations found.
              </span>
            )}
            {searchState === "error" && (
              <span className="text-label-sm text-danger">
                Unable to retrieve search results. Try again.
              </span>
            )}
          </div>

          {/* Map preview + detail pane */}
          {searchState === "loading" && (
            <SearchLoadingState message={loadingMsg} />
          )}
          {searchState === "no-results" && (
            <NoResultsState onClear={clearSearch} />
          )}
          {searchState === "error" && (
            <ErrorState onRetry={() => startSearch(query)} />
          )}
          {isResults && (
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Map preview — flex-1 + min-w-0 so it always fills available space */}
              <div className="flex-1 relative min-w-0 min-h-0">
                <ResultsMap
                  results={results}
                  selected={selectedResult}
                  onSelect={handleSelectResult}
                  detailOpen={!!selectedResult}
                />
              </div>

              {/* Result detail panel */}
              {selectedResult && (
                <ResultDetailPanel
                  result={selectedResult}
                  onClose={() => setSelectedResult(null)}
                  onNavigate={onNavigate}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Full-width idle state */}
      {searchState === "idle" && (
        <div className="flex-1 flex items-center justify-center bg-brand-tertiary p-2xl">
          <IdleState onSuggest={startSearch} />
        </div>
      )}
    </div>
  )
}

// ─── SearchInput ──────────────────────────────────────────────────────────────

function SearchInput({
  query,
  setQuery,
  onSearch,
  onClear,
  loading,
  textareaRef,
  compact,
}: {
  query: string
  setQuery: (v: string) => void
  onSearch: (q: string) => void
  onClear: () => void
  loading: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  compact: boolean
}) {
  return (
    <div className="flex flex-col gap-md">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              onSearch(query)
            }
          }}
          placeholder={
            compact
              ? "Refine search…"
              : "Describe what you want to find… e.g. Show areas around Pune where vegetation decreased between 2023 and 2026."
          }
          rows={compact ? 2 : 3}
          className="w-full bg-bg-faint border border-border-primary rounded-corner-md px-md py-md text-label-sm text-text-primary placeholder:text-text-tertiary outline-none resize-none focus:border-border-selected transition-colors"
        />
        {/* Mic icon — visual placeholder only */}
        <button
          className="absolute bottom-md right-md text-text-tertiary hover:text-text-secondary transition-colors"
          tabIndex={-1}
          aria-label="Voice input (not available)"
          title="Voice input — coming soon"
          type="button"
        >
          <Mic size={14} />
        </button>
      </div>

      <div className="flex gap-md">
        <Button
          variant="primary"
          iconStart={
            loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )
          }
          onClick={() => onSearch(query)}
          disabled={loading || !query.trim()}
        >
          {loading ? "Searching…" : "Search"}
        </Button>
        {query && (
          <Button
            variant="subtle"
            iconStart={<X size={16} />}
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────

function FilterPanel({
  filters,
  setFilters,
  onChangeType,
}: {
  filters: SearchFilters
  setFilters: (f: SearchFilters) => void
  onChangeType: (t: string) => void
}) {
  const changeTypeOptions = [
    { value: "vegetation-loss", label: "Vegetation Loss", icon: Leaf },
    { value: "vegetation-gain", label: "Vegetation Increase", icon: TreePine },
    { value: "urban", label: "Urban Expansion", icon: Building2 },
    { value: "water", label: "Water Change", icon: Waves },
    { value: "infrastructure", label: "Infrastructure", icon: Activity },
  ]

  return (
    <div className="px-2xl pb-xl flex flex-col gap-xl">
      {/* Location */}
      <div>
        <p className="text-video-title text-text-tertiary font-medium uppercase tracking-wide mb-md">
          Location
        </p>
        <div className="flex flex-col gap-md">
          <SelectField
            label=""
            options={[
              { value: "", label: "All India" },
              { value: "maharashtra", label: "Maharashtra" },
              { value: "gujarat", label: "Gujarat" },
              { value: "odisha", label: "Odisha" },
              { value: "telangana", label: "Telangana" },
              { value: "karnataka", label: "Karnataka" },
              { value: "rajasthan", label: "Rajasthan" },
              { value: "west-bengal", label: "West Bengal" },
              { value: "chhattisgarh", label: "Chhattisgarh" },
            ]}
            value={filters.state}
            onChange={(v) => setFilters({ ...filters, state: v })}
            placeholder="Select state"
          />
        </div>
      </div>

      {/* Date range */}
      <div>
        <p className="text-video-title text-text-tertiary font-medium uppercase tracking-wide mb-md">
          Date Range
        </p>
        <div className="flex gap-md">
          <div className="flex-1">
            <label className="text-video-title text-text-tertiary block mb-xs">
              From
            </label>
            <div className="flex items-center gap-sm bg-bg-faint border border-border-primary rounded-corner-md px-md py-sm">
              <Calendar
                size={12}
                className="text-text-tertiary flex-shrink-0"
              />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
                className="flex-1 bg-transparent text-label-sm text-text-primary outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-video-title text-text-tertiary block mb-xs">
              To
            </label>
            <div className="flex items-center gap-sm bg-bg-faint border border-border-primary rounded-corner-md px-md py-sm">
              <Calendar
                size={12}
                className="text-text-tertiary flex-shrink-0"
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
                className="flex-1 bg-transparent text-label-sm text-text-primary outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Change type */}
      <div>
        <p className="text-video-title text-text-tertiary font-medium uppercase tracking-wide mb-md">
          Change Type
        </p>
        <div className="flex flex-col gap-xs">
          {changeTypeOptions.map(({ value, label, icon: Icon }) => {
            const active = filters.changeTypes.includes(value)
            return (
              <button
                key={value}
                onClick={() => onChangeType(value)}
                className={`flex items-center gap-md p-md rounded-corner-md transition-colors border ${
                  active
                    ? "bg-brand-tertiary border-brand-primary/30 text-brand-primary"
                    : "border-transparent hover:bg-bg-hover text-text-secondary"
                }`}
              >
                <Icon
                  size={13}
                  className={
                    active ? "text-brand-primary" : "text-text-tertiary"
                  }
                />
                <span className="text-label-sm flex-1 text-left font-medium">
                  {label}
                </span>
                {active && (
                  <CheckCircle size={12} className="text-brand-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Data source */}
      <div>
        <p className="text-video-title text-text-tertiary font-medium uppercase tracking-wide mb-md">
          Data Source
        </p>
        <SelectField
          label=""
          options={[
            { value: "all", label: "Multi-sensor (All)" },
            { value: "sentinel-2", label: "Sentinel-2 (ESA)" },
            { value: "landsat", label: "Landsat-8/9 (USGS)" },
            { value: "cartosat", label: "Cartosat-3 (ISRO)" },
            { value: "risat", label: "RISAT-2B (ISRO)" },
          ]}
          value={filters.dataSource}
          onChange={(v) => setFilters({ ...filters, dataSource: v })}
        />
      </div>

      {/* Confidence */}
      <div>
        <div className="flex justify-between mb-sm">
          <p className="text-video-title text-text-tertiary font-medium uppercase tracking-wide">
            Min. Confidence
          </p>
          <span className="text-video-title text-text-primary font-medium">
            {filters.minConfidence}%
          </span>
        </div>
        <input
          type="range"
          min={50}
          max={99}
          value={filters.minConfidence}
          onChange={(e) =>
            setFilters({ ...filters, minConfidence: Number(e.target.value) })
          }
          className="w-full accent-brand-primary"
          aria-label="Minimum confidence threshold"
        />
        <div className="flex justify-between mt-xs">
          <span className="text-video-title text-text-tertiary">50%</span>
          <span className="text-video-title text-text-tertiary">99%</span>
        </div>
      </div>
    </div>
  )
}

// ─── ResultsList ──────────────────────────────────────────────────────────────

function ResultsList({
  results,
  selectedId,
  onSelect,
  onNavigate,
  compact,
}: {
  results: SearchResult[]
  selectedId: string | null
  onSelect: (r: SearchResult) => void
  onNavigate: (p: string, area?: SelectedArea) => void
  compact?: boolean
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {results.map((r) => (
        <ResultCard
          key={r.id}
          result={r}
          selected={r.id === selectedId}
          onSelect={() => onSelect(r)}
          onNavigate={onNavigate}
          compact={compact}
        />
      ))}
    </div>
  )
}

// ─── ResultCard ───────────────────────────────────────────────────────────────

function ResultCard({
  result,
  selected,
  onSelect,
  onNavigate,
  compact,
}: {
  result: SearchResult
  selected: boolean
  onSelect: () => void
  onNavigate: (p: string, area?: SelectedArea) => void
  compact?: boolean
}) {
  const Icon = CHANGE_TYPE_ICONS[result.changeType] ?? Activity
  const colorClass =
    CHANGE_TYPE_COLORS[result.changeType] ?? "text-text-secondary"
  const bgClass =
    CHANGE_TYPE_BG[result.changeType] ?? "bg-bg-faint border-border-primary"

  if (compact) {
    return (
      <div
        onClick={onSelect}
        className={`px-xl py-lg border-b border-border-secondary cursor-pointer transition-colors ${
          selected
            ? "bg-brand-tertiary border-l-2 border-l-brand-primary"
            : "hover:bg-bg-hover"
        }`}
      >
        <div className="flex items-start gap-md">
          <div
            className={`w-6 h-6 rounded-corner-md flex items-center justify-center flex-shrink-0 border ${bgClass}`}
          >
            <Icon size={12} className={colorClass} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-sm text-text-primary font-medium truncate">
              {result.location}, {result.state}
            </p>
            <p className={`text-video-title font-medium ${colorClass}`}>
              {result.change}
            </p>
            <div className="flex items-center gap-sm mt-xs">
              <span className="text-video-title text-text-tertiary">
                {result.area}
              </span>
              <span className="text-video-title text-text-tertiary">·</span>
              <span className="text-video-title text-text-secondary">
                {result.confidence}% conf.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-xl border border-border-secondary rounded-corner-lg transition-all cursor-pointer ${
        selected
          ? "border-brand-primary shadow-sm bg-surface-bg"
          : "bg-surface-bg hover:border-border-primary hover:shadow-sm"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-lg">
        {/* Change type icon */}
        <div
          className={`w-10 h-10 rounded-corner-md flex items-center justify-center flex-shrink-0 border ${bgClass}`}
        >
          <Icon size={18} className={colorClass} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-md mb-sm">
            <div>
              <div className="flex items-center gap-sm mb-xs flex-wrap">
                <span className="text-video-title text-text-tertiary">
                  {result.id}
                </span>
                <Badge label={result.change} />
                <span
                  className={`text-video-title font-medium px-sm py-xs rounded-corner-full border ${bgClass} ${colorClass}`}
                >
                  {result.sensor}
                </span>
              </div>
              <h3 className="text-label text-text-primary font-semibold">
                {result.location}, {result.state}
              </h3>
            </div>
            <ConfidencePill value={result.confidence} />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-xl mb-md">
            <div className="flex items-center gap-sm">
              <Calendar size={12} className="text-text-tertiary" />
              <span className="text-label-sm text-text-secondary">
                {result.dateRange}
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <MapPin size={12} className="text-text-tertiary" />
              <span className="text-label-sm text-text-secondary">
                {result.area}
              </span>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-label-sm text-text-secondary mb-lg leading-relaxed">
            {result.explanation}
          </p>

          {/* Action buttons */}
          <div
            className="flex gap-sm flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="neutral"
              size="small"
              iconStart={<Eye size={13} />}
              onClick={() =>
                onNavigate("map", searchResultToSelectedArea(result))
              }
            >
              View on Map
            </Button>
            <Button
              variant="neutral"
              size="small"
              iconStart={<BarChart3 size={13} />}
              onClick={() =>
                onNavigate(
                  "comparison",
                  searchResultToSelectedArea(result),
                )
              }
            >
              Compare
            </Button>
            <Button
              variant="subtle"
              size="small"
              iconStart={<ChevronRight size={13} />}
              onClick={onSelect}
            >
              View Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ConfidencePill ───────────────────────────────────────────────────────────

function ConfidencePill({ value }: { value: number }) {
  const color =
    value >= 90
      ? "text-success"
      : value >= 80
        ? "text-warning"
        : "text-text-secondary"
  return (
    <div className="flex flex-col items-end flex-shrink-0">
      <span className={`text-heading font-semibold ${color}`}>{value}%</span>
      <span className="text-video-title text-text-tertiary">confidence</span>
    </div>
  )
}

// ─── MapController (fly + invalidate on layout change) ───────────────────────

function MapController({
  selected,
  results,
  detailOpen,
}: {
  selected: SearchResult | null
  results: SearchResult[]
  detailOpen: boolean
}) {
  const map = useMap()

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 50)
    const t2 = setTimeout(() => map.invalidateSize(), 300)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  const targetCoords = selected?.coords ?? results[0]?.coords

  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize()
      if (targetCoords) {
        map.flyTo(targetCoords, 10, { duration: 0.7 })
      }
    }, 150)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, targetCoords?.[0], targetCoords?.[1], detailOpen])

  return null
}

// ─── ResultsMap ───────────────────────────────────────────────────────────────

function ResultsMap({
  results,
  selected,
  onSelect,
  detailOpen,
}: {
  results: SearchResult[]
  selected: SearchResult | null
  onSelect: (r: SearchResult) => void
  detailOpen: boolean
}) {
  const initialCenter = useCallback(
    (): [number, number] =>
      results.length > 0 ? results[0].coords : [20.5937, 78.9629],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <MapContainer
      center={initialCenter()}
      zoom={8}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      className="z-0"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Esri, Maxar"
        maxZoom={18}
      />
      <MapController
        selected={selected}
        results={results}
        detailOpen={detailOpen}
      />
      {results.map((r) => (
        <CircleMarker
          key={r.id}
          center={r.coords}
          radius={r.id === selected?.id ? 14 : 9}
          pathOptions={{
            color: MARKER_COLORS[r.changeType] ?? "#5250f3",
            fillColor: MARKER_COLORS[r.changeType] ?? "#5250f3",
            fillOpacity: r.id === selected?.id ? 0.9 : 0.55,
            weight: r.id === selected?.id ? 3 : 1.5,
          }}
          eventHandlers={{ click: () => onSelect(r) }}
        >
          <Popup>
            <div className="text-xs font-medium">
              {r.location}, {r.state}
            </div>
            <div className="text-xs text-gray-500">
              {r.change} · {r.confidence}%
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

// ─── ResultDetailPanel ────────────────────────────────────────────────────────

function ResultDetailPanel({
  result,
  onClose,
  onNavigate,
}: {
  result: SearchResult
  onClose: () => void
  onNavigate: (p: string, area?: SelectedArea) => void
}) {
  const Icon = CHANGE_TYPE_ICONS[result.changeType] ?? Activity
  const colorClass =
    CHANGE_TYPE_COLORS[result.changeType] ?? "text-text-secondary"
  const bgClass =
    CHANGE_TYPE_BG[result.changeType] ?? "bg-bg-faint border-border-secondary"

  return (
    <div className="w-80 bg-surface-bg border-l border-border-secondary flex flex-col overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="px-xl py-md border-b border-border-secondary flex items-center justify-between flex-shrink-0">
        <h3 className="text-label text-text-primary font-semibold">
          Area Details
        </h3>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-text-secondary"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 p-xl flex flex-col gap-xl overflow-y-auto">
        {/* Change type header */}
        <div
          className={`flex items-center gap-md p-lg rounded-corner-md border ${bgClass}`}
        >
          <div
            className={`w-8 h-8 rounded-corner-md flex items-center justify-center ${bgClass} flex-shrink-0`}
          >
            <Icon size={16} className={colorClass} />
          </div>
          <div>
            <p className={`text-label font-semibold ${colorClass}`}>
              {result.change}
            </p>
            <p className="text-video-title text-text-tertiary">{result.id}</p>
          </div>
        </div>

        {/* Location */}
        <div className="flex flex-col gap-sm">
          <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide">
            Location
          </span>
          <div className="flex items-start gap-md">
            <Globe
              size={14}
              className="text-text-tertiary mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-label-sm text-text-primary font-medium">
                {result.location}
              </p>
              <p className="text-video-title text-text-secondary">
                {result.state}, India
              </p>
              <p className="text-video-title text-text-tertiary mt-xs">
                {result.coords[0].toFixed(4)}° N, {result.coords[1].toFixed(4)}°
                E
              </p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-md">
          {[
            { label: "Affected Area", value: result.area },
            { label: "Confidence", value: `${result.confidence}%` },
            { label: "Date Range", value: result.dateRange },
            { label: "Sensor", value: result.sensor },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bg-faint rounded-corner-md p-md">
              <p className="text-video-title text-text-tertiary">{label}</p>
              <p className="text-label-sm text-text-primary font-medium mt-xs">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div>
          <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide block mb-md">
            Analysis Summary
          </span>
          <p className="text-label-sm text-text-secondary leading-relaxed">
            {result.explanation}
          </p>
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex justify-between mb-sm">
            <span className="text-video-title text-text-tertiary">
              Detection Confidence
            </span>
            <span className="text-video-title text-text-primary font-medium">
              {result.confidence}%
            </span>
          </div>
          <div className="h-1.5 bg-bg-subtle rounded-corner-full">
            <div
              className={`h-full rounded-corner-full ${
                result.confidence >= 90
                  ? "bg-success"
                  : result.confidence >= 80
                    ? "bg-warning"
                    : "bg-brand-primary"
              }`}
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        {/* Related changes */}
        <div>
          <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide block mb-md">
            Related Indicators
          </span>
          <div className="flex flex-col gap-sm">
            {[
              { label: "NDVI Δ", value: "−0.31", alert: true },
              { label: "LST Δ", value: "+2.4°C", alert: false },
              { label: "Bare Soil Δ", value: "+22%", alert: true },
            ].map(({ label, value, alert }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-label-sm text-text-secondary">
                  {label}
                </span>
                <span
                  className={`text-label-sm font-medium ${
                    alert ? "text-danger" : "text-text-primary"
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-xl border-t border-border-secondary flex flex-col gap-md flex-shrink-0">
        <Button
          variant="primary"
          iconStart={<Eye size={16} />}
          onClick={() => onNavigate("map", searchResultToSelectedArea(result))}
        >
          View on Map
        </Button>
        <Button
          variant="neutral"
          iconStart={<BarChart3 size={16} />}
          onClick={() =>
            onNavigate("comparison", searchResultToSelectedArea(result))
          }
        >
          Compare
        </Button>
        <Button
          variant="neutral"
          iconStart={<Activity size={16} />}
          onClick={() =>
            onNavigate("report", searchResultToSelectedArea(result))
          }
        >
          Generate Report
        </Button>
      </div>
    </div>
  )
}

// ─── State screens ────────────────────────────────────────────────────────────

function IdleState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center max-w-md gap-xl">
      <div className="w-16 h-16 bg-surface-bg rounded-corner-lg flex items-center justify-center border border-border-secondary">
        <Search size={28} className="text-brand-primary" strokeWidth={1.5} />
      </div>
      <div>
        <h2 className="text-heading text-text-primary font-semibold mb-sm">
          Search satellite observations
        </h2>
        <p className="text-label-sm text-text-secondary">
          Describe a geographical change, location, or time period in natural
          language. The system will match your query against the satellite
          archive.
        </p>
      </div>
      <div className="flex flex-col gap-sm w-full">
        <p className="text-video-title text-text-tertiary">Try one of these:</p>
        {SUGGESTED_QUERIES.slice(0, 3).map((s) => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="text-left p-lg bg-surface-bg rounded-corner-md border border-border-secondary hover:border-brand-primary/40 hover:bg-brand-tertiary transition-colors flex items-center gap-md group"
          >
            <Search
              size={13}
              className="text-text-tertiary group-hover:text-brand-primary flex-shrink-0"
            />
            <span className="text-label-sm text-text-secondary group-hover:text-text-primary">
              {s}
            </span>
            <ChevronRight
              size={13}
              className="text-text-tertiary ml-auto opacity-0 group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

function SearchLoadingState({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-xl bg-brand-tertiary">
      <div className="w-14 h-14 bg-surface-bg rounded-corner-lg flex items-center justify-center border border-border-secondary">
        <Loader2 size={24} className="text-brand-primary animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-label text-text-primary font-medium">{message}</p>
        <p className="text-label-sm text-text-secondary mt-xs">
          Scanning satellite archive across India
        </p>
      </div>
      {/* Animated dots */}
      <div className="flex gap-sm">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-primary"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-xl bg-brand-tertiary p-2xl">
      <div className="w-14 h-14 bg-surface-bg rounded-corner-lg flex items-center justify-center border border-border-secondary">
        <AlertTriangle
          size={24}
          className="text-text-tertiary"
          strokeWidth={1.5}
        />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-label text-text-primary font-medium">
          No matching observations found
        </p>
        <p className="text-label-sm text-text-secondary mt-sm">
          Try broadening your query, adjusting the date range, or lowering the
          confidence threshold in filters.
        </p>
      </div>
      <Button variant="neutral" onClick={onClear}>
        Start New Search
      </Button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-xl bg-brand-tertiary p-2xl">
      <div className="w-14 h-14 bg-surface-bg rounded-corner-lg flex items-center justify-center border border-border-secondary">
        <AlertTriangle size={24} className="text-danger" strokeWidth={1.5} />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-label text-text-primary font-medium">
          Unable to retrieve results
        </p>
        <p className="text-label-sm text-text-secondary mt-sm">
          The search service encountered an error. Please try again or refine
          your query.
        </p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        Retry Search
      </Button>
    </div>
  )
}
