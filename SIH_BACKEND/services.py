import re
import httpx
from typing import List, Optional, Tuple, Dict
from schemas import (
    SelectedArea,
    AnalysisResponse,
    Finding,
    TimelineItem,
    SearchResult,
    SearchFilters,
    DashboardResponse,
    StatCard,
    RecentEvent,
)

# ─── Master Datasets ──────────────────────────────────────────────────────────

PUNE_RESULTS: List[SearchResult] = [
    SearchResult(
        id="SR-001",
        location="Pune Rural",
        state="Maharashtra",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="12.4 km²",
        confidence=92.0,
        explanation="NDVI decreased by 0.31 across agricultural fringes. Consistent with land-use conversion to built-up surfaces.",
        coords=(18.4, 73.75),
        sensor="Sentinel-2",
        boundingBox=((18.35, 73.70), (18.45, 73.80)),
    ),
    SearchResult(
        id="SR-002",
        location="Khed Taluka",
        state="Maharashtra",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="8.7 km²",
        confidence=87.0,
        explanation="Significant loss of mixed shrubland detected. Bare soil fraction increased from 11% to 38%.",
        coords=(18.82, 73.99),
        sensor="Sentinel-2",
        boundingBox=((18.78, 73.95), (18.86, 74.03)),
    ),
    SearchResult(
        id="SR-003",
        location="Ambegaon Forest Reserve",
        state="Maharashtra",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="5.1 km²",
        confidence=94.0,
        explanation="Canopy cover reduction near buffer zone edge. Possible encroachment detected on eastern boundary.",
        coords=(19.1, 73.7),
        sensor="Sentinel-2 + Landsat-8",
        boundingBox=((19.05, 73.65), (19.15, 73.75)),
    ),
    SearchResult(
        id="SR-004",
        location="Pimpri-Chinchwad",
        state="Maharashtra",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="18.2 km²",
        confidence=96.0,
        explanation="New built-up area detected adjacent to existing industrial zones. Impervious surface fraction grew by 22%.",
        coords=(18.63, 73.8),
        sensor="Cartosat-3",
        boundingBox=((18.60, 73.76), (18.66, 73.84)),
    ),
    SearchResult(
        id="SR-005",
        location="Khadakwasla Reservoir",
        state="Maharashtra",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="9.3 km²",
        confidence=89.0,
        explanation="Water extent reduced by ~15%. NDWI analysis indicates seasonal drawdown compounded by reduced inflow.",
        coords=(18.43, 73.76),
        sensor="Sentinel-2",
        boundingBox=((18.40, 73.72), (18.46, 73.80)),
    ),
    SearchResult(
        id="SR-006",
        location="Haveli District",
        state="Maharashtra",
        change="Vegetation Increase",
        changeType="vegetation-gain",
        dateRange="2023 → 2026",
        area="4.2 km²",
        confidence=81.0,
        explanation="NDVI increase suggests reforestation or agricultural intensification in the southern sub-district.",
        coords=(18.5, 74.05),
        sensor="Landsat-8",
        boundingBox=((18.45, 74.00), (18.55, 74.10)),
    ),
    SearchResult(
        id="SR-007",
        location="Maval Taluka",
        state="Maharashtra",
        change="Infrastructure Change",
        changeType="infrastructure",
        dateRange="2023 → 2026",
        area="2.8 km²",
        confidence=91.0,
        explanation="Linear infrastructure features detected — probable road widening or new connectivity corridor.",
        coords=(18.72, 73.55),
        sensor="Cartosat-3",
        boundingBox=((18.68, 73.50), (18.76, 73.60)),
    ),
    SearchResult(
        id="SR-008",
        location="Mulshi Valley",
        state="Maharashtra",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="6.9 km²",
        confidence=85.0,
        explanation="Forest fragmentation along ridge. NDVI loss concentrated at 600–900m elevation band.",
        coords=(18.5, 73.52),
        sensor="Sentinel-2",
        boundingBox=((18.46, 73.48), (18.54, 73.56)),
    ),
    SearchResult(
        id="SR-009",
        location="Shirur",
        state="Maharashtra",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="7.6 km²",
        confidence=88.0,
        explanation="Periurban growth pattern. Residential plots replacing rain-fed agriculture.",
        coords=(18.83, 74.37),
        sensor="Sentinel-2",
        boundingBox=((18.79, 74.33), (18.87, 74.41)),
    ),
    SearchResult(
        id="SR-010",
        location="Bhor Taluka",
        state="Maharashtra",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="3.4 km²",
        confidence=79.0,
        explanation="Sparse scrubland thinning along south-facing slopes. Possible overgrazing or drought stress.",
        coords=(18.15, 73.85),
        sensor="Landsat-8",
        boundingBox=((18.10, 73.80), (18.20, 73.90)),
    ),
    SearchResult(
        id="SR-011",
        location="Indapur",
        state="Maharashtra",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="11.1 km²",
        confidence=90.0,
        explanation="Ujani reservoir water area reduced significantly. High confidence from multi-date NDWI stack.",
        coords=(17.97, 75.03),
        sensor="Sentinel-2",
        boundingBox=((17.92, 74.98), (18.02, 75.08)),
    ),
    SearchResult(
        id="SR-012",
        location="Junnar",
        state="Maharashtra",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="4.7 km²",
        confidence=83.0,
        explanation="Deciduous forest stress detected in northern patch. Cross-validated with Landsat LST anomaly.",
        coords=(19.2, 73.87),
        sensor="Sentinel-2 + Landsat-8",
        boundingBox=((19.15, 73.82), (19.25, 73.92)),
    ),
]

CONSTRUCTION_RESULTS: List[SearchResult] = [
    SearchResult(
        id="CON-001",
        location="GIFT City, Gandhinagar",
        state="Gujarat",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="15.8 km²",
        confidence=93.0,
        explanation="Rapid expansion of the GIFT City financial district. Impervious surface fraction increased by 34%. New commercial towers and road network detected via Cartosat-3.",
        coords=(23.16, 72.68),
        sensor="Cartosat-3",
        boundingBox=((23.12, 72.64), (23.20, 72.72)),
    ),
    SearchResult(
        id="CON-002",
        location="Aerocity Cluster, Delhi",
        state="Delhi",
        change="Infrastructure Change",
        changeType="infrastructure",
        dateRange="2023 → 2026",
        area="11.2 km²",
        confidence=91.0,
        explanation="New hospitality and logistics infrastructure around IGI Airport. Road and utility corridor expansion confirmed through multi-date SAR change analysis.",
        coords=(28.56, 77.11),
        sensor="Sentinel-1 + Cartosat-3",
        boundingBox=((28.52, 77.07), (28.60, 77.15)),
    ),
    SearchResult(
        id="CON-003",
        location="Whitefield IT Park",
        state="Karnataka",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="19.4 km²",
        confidence=95.0,
        explanation="Large-scale IT campus construction east of Bengaluru. Bare soil and foundation activity detected at multiple new construction sites. Impervious surface grew by 29%.",
        coords=(12.97, 77.75),
        sensor="Cartosat-3",
        boundingBox=((12.93, 77.71), (13.01, 77.79)),
    ),
    SearchResult(
        id="CON-004",
        location="Navi Mumbai Expansion",
        state="Maharashtra",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="24.7 km²",
        confidence=88.0,
        explanation="Periurban growth in Panvel–Uran corridor. New township layouts and residential construction identified. Coastal reclamation activity also detected.",
        coords=(18.99, 73.03),
        sensor="Sentinel-2",
        boundingBox=((18.95, 72.99), (19.03, 73.07)),
    ),
    SearchResult(
        id="CON-005",
        location="DMIC Industrial Node, Neemrana",
        state="Rajasthan",
        change="Infrastructure Change",
        changeType="infrastructure",
        dateRange="2023 → 2026",
        area="17.1 km²",
        confidence=90.0,
        explanation="Delhi-Mumbai Industrial Corridor node expansion. Factory sheds, access roads and utility infrastructure detected at three separate construction sites.",
        coords=(27.98, 76.37),
        sensor="Sentinel-2 + Cartosat-3",
        boundingBox=((27.94, 76.33), (28.02, 76.41)),
    ),
    SearchResult(
        id="CON-006",
        location="Amaravati Capital Region",
        state="Andhra Pradesh",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="31.6 km²",
        confidence=87.0,
        explanation="Capital city construction activity across multiple zones. Administrative buildings, residential layouts and arterial roads visible in high-resolution imagery.",
        coords=(16.51, 80.52),
        sensor="Cartosat-3",
        boundingBox=((16.45, 80.45), (16.57, 80.59)),
    ),
]

HYDERABAD_RESULTS: List[SearchResult] = [
    SearchResult(
        id="HYD-001",
        location="Cyberabad IT Corridor",
        state="Telangana",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="22.6 km²",
        confidence=95.0,
        explanation="Rapid built-up growth west of HITECH City. Impervious surface fraction increased by 31% driven by IT park and residential development.",
        coords=(17.45, 78.37),
        sensor="Cartosat-3",
        boundingBox=((17.40, 78.32), (17.50, 78.42)),
    ),
    SearchResult(
        id="HYD-002",
        location="Shamshabad Periurban",
        state="Telangana",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="14.1 km²",
        confidence=91.0,
        explanation="Airport-adjacent peri-urban sprawl. New road alignments and plot layouts detected via Cartosat-3 PAN imagery.",
        coords=(17.24, 78.42),
        sensor="Cartosat-3",
        boundingBox=((17.20, 78.37), (17.28, 78.47)),
    ),
    SearchResult(
        id="HYD-003",
        location="Malkajgiri",
        state="Telangana",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="6.3 km²",
        confidence=88.0,
        explanation="Green cover reduction in transitional zones. NDVI decline of 0.27 correlates with residential layout approvals in this corridor.",
        coords=(17.46, 78.54),
        sensor="Sentinel-2",
        boundingBox=((17.42, 78.50), (17.50, 78.58)),
    ),
    SearchResult(
        id="HYD-004",
        location="Hussain Sagar Catchment",
        state="Telangana",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="3.1 km²",
        confidence=83.0,
        explanation="Lake-edge encroachment reducing effective water area. NDWI boundary has receded 80–120m on the eastern shore.",
        coords=(17.43, 78.47),
        sensor="Sentinel-2",
        boundingBox=((17.40, 78.44), (17.46, 78.50)),
    ),
    SearchResult(
        id="HYD-005",
        location="Chevella Mandal",
        state="Telangana",
        change="Infrastructure Change",
        changeType="infrastructure",
        dateRange="2023 → 2026",
        area="8.4 km²",
        confidence=90.0,
        explanation="New road and utility corridor detected south of Hyderabad. Bare soil disturbance pattern consistent with highway-grade construction.",
        coords=(17.3, 78.18),
        sensor="Cartosat-3",
        boundingBox=((17.26, 78.14), (17.34, 78.22)),
    ),
    SearchResult(
        id="HYD-006",
        location="Hayathnagar",
        state="Telangana",
        change="Urban Expansion",
        changeType="urban",
        dateRange="2023 → 2026",
        area="9.8 km²",
        confidence=87.0,
        explanation="Eastern Hyderabad growth corridor. New townships and logistics park footprints confirmed by multi-date analysis.",
        coords=(17.37, 78.6),
        sensor="Sentinel-2",
        boundingBox=((17.33, 78.56), (17.41, 78.64)),
    ),
]

GUJARAT_WATER_RESULTS: List[SearchResult] = [
    SearchResult(
        id="GUJ-001",
        location="Sardar Sarovar Reservoir",
        state="Gujarat",
        change="Water Change",
        changeType="water",
        dateRange="Jan 2026 → Sep 2026",
        area="33.7 km²",
        confidence=94.0,
        explanation="NDWI analysis confirms water surface area reduction from 187.4 km² to 153.7 km² — an 18% decline over the analysis period. Sedimentation along eastern bank also detected.",
        coords=(21.83, 73.75),
        sensor="Sentinel-2",
        boundingBox=((21.80, 73.70), (21.86, 73.80)),
    ),
    SearchResult(
        id="GUJ-002",
        location="Nal Sarovar Bird Sanctuary",
        state="Gujarat",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="12.8 km²",
        confidence=89.0,
        explanation="Seasonal lake extent variability detected. Post-monsoon maximum area significantly reduced compared to 2023 baseline, suggesting reduced inflow from catchment.",
        coords=(22.75, 72.0),
        sensor="Sentinel-2",
        boundingBox=((22.70, 71.95), (22.80, 72.05)),
    ),
    SearchResult(
        id="GUJ-003",
        location="Ukai Reservoir",
        state="Gujarat",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="18.2 km²",
        confidence=92.0,
        explanation="Reservoir water area declined. Tapi river inflow reduction combined with increased irrigation drawdown accounts for observed 12% surface loss.",
        coords=(21.25, 73.6),
        sensor="Sentinel-2",
        boundingBox=((21.20, 73.55), (21.30, 73.65)),
    ),
    SearchResult(
        id="GUJ-004",
        location="Little Rann of Kutch",
        state="Gujarat",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="47.5 km²",
        confidence=86.0,
        explanation="Seasonal salt flat inundation area reduced. NDWI and SAR joint analysis indicates earlier-than-average desiccation onset.",
        coords=(23.5, 71.5),
        sensor="Sentinel-1 + Sentinel-2",
        boundingBox=((23.40, 71.40), (23.60, 71.60)),
    ),
]

ODISHA_COASTAL_RESULTS: List[SearchResult] = [
    SearchResult(
        id="ODI-001",
        location="Paradip Coastal Zone",
        state="Odisha",
        change="Coastal Erosion",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="8.4 km²",
        confidence=93.0,
        explanation="Shoreline recession of 35–80m detected along a 12 km stretch north of Paradip Port. Beach width reduced by ~40% relative to the 2023 baseline. Erosion correlates with post-cyclone wave action and reduced sediment supply.",
        coords=(20.32, 86.62),
        sensor="Sentinel-2 + Sentinel-1",
        boundingBox=((20.27, 86.57), (20.37, 86.67)),
    ),
    SearchResult(
        id="ODI-002",
        location="Kendrapara Mangrove Coast",
        state="Odisha",
        change="Coastal Erosion",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="5.1 km²",
        confidence=90.0,
        explanation="Mangrove fringe loss and shoreline retreat detected in Bhitarkanika buffer zone. NDVI decline of 0.29 in coastal fringe. Tidal creek migration also observed in northern sector.",
        coords=(20.72, 86.9),
        sensor="Sentinel-2",
        boundingBox=((20.67, 86.85), (20.77, 86.95)),
    ),
    SearchResult(
        id="ODI-003",
        location="Puri Beach Corridor",
        state="Odisha",
        change="Coastal Erosion",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="3.7 km²",
        confidence=88.0,
        explanation="Active beach erosion south of Puri city. Dune system lost ~25m from the seaward edge. Coastal infrastructure risk elevated. SAR coherence confirms active erosion front.",
        coords=(19.81, 85.83),
        sensor="Sentinel-1 + Cartosat-3",
        boundingBox=((19.76, 85.78), (19.86, 85.88)),
    ),
    SearchResult(
        id="ODI-004",
        location="Chilika Lake Mouth",
        state="Odisha",
        change="Water Change",
        changeType="water",
        dateRange="2023 → 2026",
        area="11.3 km²",
        confidence=92.0,
        explanation="Chilika outlet channel migrated ~1.8 km southward. Sandbar accretion blocking tidal exchange detected via NDWI and SAR. Salinity gradient shift impacts aquaculture zones.",
        coords=(19.72, 85.37),
        sensor="Sentinel-2 + Sentinel-1",
        boundingBox=((19.67, 85.32), (19.77, 85.42)),
    ),
    SearchResult(
        id="ODI-005",
        location="Gopalpur-on-Sea",
        state="Odisha",
        change="Coastal Erosion",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="2.9 km²",
        confidence=85.0,
        explanation="Shoreline retreat of 20–45m along a 7 km stretch. Storm surge scour during 2025 cyclone season accelerated pre-existing erosion trend detected since 2023 baseline.",
        coords=(19.27, 84.9),
        sensor="Sentinel-2",
        boundingBox=((19.22, 84.85), (19.32, 84.95)),
    ),
    SearchResult(
        id="ODI-006",
        location="Dhamara Estuary",
        state="Odisha",
        change="Infrastructure Change",
        changeType="infrastructure",
        dateRange="2023 → 2026",
        area="6.2 km²",
        confidence=89.0,
        explanation="Port expansion and reclamation activity detected at Dhamara LNG terminal. New jetty and road infrastructure identified via Cartosat-3 PAN imagery. Intertidal habitat loss confirmed.",
        coords=(20.83, 86.97),
        sensor="Cartosat-3",
        boundingBox=((20.78, 86.92), (20.88, 87.02)),
    ),
]

FOREST_RESULTS: List[SearchResult] = [
    SearchResult(
        id="FOR-001",
        location="Hasdeo Arand Forest",
        state="Chhattisgarh",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="14.1 km²",
        confidence=97.0,
        explanation="Significant canopy loss in biodiversity-rich Hasdeo block. NDVI reduced by 0.38 in core zone, consistent with open-cast mining activity.",
        coords=(22.6, 82.3),
        sensor="Sentinel-2 + Landsat-8",
        boundingBox=((22.55, 82.25), (22.65, 82.35)),
    ),
    SearchResult(
        id="FOR-002",
        location="Achanakmar Tiger Reserve Buffer",
        state="Chhattisgarh",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="7.6 km²",
        confidence=91.0,
        explanation="Forest fragmentation along buffer zone boundary. Clearings of 0.5–2 ha size visible in Cartosat imagery, possibly from encroachment.",
        coords=(22.1, 81.55),
        sensor="Cartosat-3",
        boundingBox=((22.05, 81.50), (22.15, 81.60)),
    ),
    SearchResult(
        id="FOR-003",
        location="Barnawapara Wildlife Sanctuary",
        state="Chhattisgarh",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="4.9 km²",
        confidence=85.0,
        explanation="Peripheral NDVI decline consistent with fire-disturbed regrowth and possible grazing pressure.",
        coords=(21.55, 82.1),
        sensor="Sentinel-2",
        boundingBox=((21.50, 82.05), (21.60, 82.15)),
    ),
    SearchResult(
        id="FOR-004",
        location="Simlipal Biosphere Reserve",
        state="Odisha",
        change="Vegetation Loss",
        changeType="vegetation-loss",
        dateRange="2023 → 2026",
        area="9.2 km²",
        confidence=90.0,
        explanation="Forest fire scars and post-fire succession zones identified. Thermal anomaly confirmed via Landsat-8 LST analysis.",
        coords=(21.8, 86.5),
        sensor="Landsat-8",
        boundingBox=((21.75, 86.45), (21.85, 86.55)),
    ),
]

# Combined Master Catalog
ALL_RESULTS: List[SearchResult] = (
    PUNE_RESULTS
    + CONSTRUCTION_RESULTS
    + HYDERABAD_RESULTS
    + GUJARAT_WATER_RESULTS
    + ODISHA_COASTAL_RESULTS
    + FOREST_RESULTS
)


# ─── Natural Language Search Engine ───────────────────────────────────────────

# ─── Comprehensive Indian Geographic Directory ───────────────────────────────

INDIAN_GEO_LOCATIONS: Dict[str, Dict] = {
    # States & Union Territories
    "nagaland": {"state": "Nagaland", "coords": (25.67, 94.11)},
    "kerala": {"state": "Kerala", "coords": (10.85, 76.27)},
    "rajasthan": {"state": "Rajasthan", "coords": (26.50, 74.50)},
    "ladakh": {"state": "Ladakh", "coords": (34.15, 77.58)},
    "jammu": {"state": "Jammu & Kashmir", "coords": (32.73, 74.87)},
    "kashmir": {"state": "Jammu & Kashmir", "coords": (34.08, 74.80)},
    "himachal": {"state": "Himachal Pradesh", "coords": (31.10, 77.17)},
    "uttarakhand": {"state": "Uttarakhand", "coords": (30.06, 79.01)},
    "punjab": {"state": "Punjab", "coords": (31.14, 75.34)},
    "haryana": {"state": "Haryana", "coords": (29.05, 76.08)},
    "uttar pradesh": {"state": "Uttar Pradesh", "coords": (26.85, 80.95)},
    "madhya pradesh": {"state": "Madhya Pradesh", "coords": (22.97, 78.65)},
    "bihar": {"state": "Bihar", "coords": (25.09, 85.31)},
    "jharkhand": {"state": "Jharkhand", "coords": (23.34, 85.31)},
    "west bengal": {"state": "West Bengal", "coords": (22.98, 87.85)},
    "odisha": {"state": "Odisha", "coords": (20.95, 85.09)},
    "chhattisgarh": {"state": "Chhattisgarh", "coords": (21.27, 81.86)},
    "andhra pradesh": {"state": "Andhra Pradesh", "coords": (15.91, 79.74)},
    "telangana": {"state": "Telangana", "coords": (18.11, 79.01)},
    "karnataka": {"state": "Karnataka", "coords": (15.30, 75.70)},
    "tamil nadu": {"state": "Tamil Nadu", "coords": (11.12, 78.65)},
    "goa": {"state": "Goa", "coords": (15.30, 74.12)},
    "gujarat": {"state": "Gujarat", "coords": (22.25, 71.19)},
    "maharashtra": {"state": "Maharashtra", "coords": (19.75, 75.70)},
    "assam": {"state": "Assam", "coords": (26.20, 92.93)},
    "meghalaya": {"state": "Meghalaya", "coords": (25.47, 91.37)},
    "tripura": {"state": "Tripura", "coords": (23.94, 91.99)},
    "mizoram": {"state": "Mizoram", "coords": (23.16, 92.94)},
    "manipur": {"state": "Manipur", "coords": (24.66, 93.91)},
    "arunachal": {"state": "Arunachal Pradesh", "coords": (28.22, 94.73)},
    "sikkim": {"state": "Sikkim", "coords": (27.53, 88.51)},
    "chandigarh": {"state": "Chandigarh", "coords": (30.73, 76.78)},
    "delhi": {"state": "Delhi NCR", "coords": (28.61, 77.21)},

    # Major Cities & Key Regional Hubs
    "kohima": {"state": "Nagaland", "coords": (25.67, 94.11)},
    "dimapur": {"state": "Nagaland", "coords": (25.91, 93.73)},
    "jaipur": {"state": "Rajasthan", "coords": (26.91, 75.79)},
    "jodhpur": {"state": "Rajasthan", "coords": (26.24, 73.02)},
    "udaipur": {"state": "Rajasthan", "coords": (24.59, 73.71)},
    "jaisalmer": {"state": "Rajasthan", "coords": (26.92, 70.91)},
    "kota": {"state": "Rajasthan", "coords": (25.18, 75.83)},
    "leh": {"state": "Ladakh", "coords": (34.15, 77.58)},
    "kargil": {"state": "Ladakh", "coords": (34.56, 76.13)},
    "srinagar": {"state": "Jammu & Kashmir", "coords": (34.08, 74.80)},
    "shimla": {"state": "Himachal Pradesh", "coords": (31.10, 77.17)},
    "manali": {"state": "Himachal Pradesh", "coords": (32.24, 77.19)},
    "dharamshala": {"state": "Himachal Pradesh", "coords": (32.22, 76.32)},
    "dehradun": {"state": "Uttarakhand", "coords": (30.32, 78.03)},
    "haridwar": {"state": "Uttarakhand", "coords": (29.95, 78.16)},
    "rishikesh": {"state": "Uttarakhand", "coords": (30.09, 78.27)},
    "amritsar": {"state": "Punjab", "coords": (31.63, 74.87)},
    "ludhiana": {"state": "Punjab", "coords": (30.90, 75.86)},
    "noida": {"state": "Uttar Pradesh", "coords": (28.54, 77.39)},
    "gurgaon": {"state": "Haryana", "coords": (28.46, 77.03)},
    "gurugram": {"state": "Haryana", "coords": (28.46, 77.03)},
    "lucknow": {"state": "Uttar Pradesh", "coords": (26.85, 80.95)},
    "kanpur": {"state": "Uttar Pradesh", "coords": (26.45, 80.33)},
    "varanasi": {"state": "Uttar Pradesh", "coords": (25.32, 82.97)},
    "prayagraj": {"state": "Uttar Pradesh", "coords": (25.44, 81.85)},
    "allahabad": {"state": "Uttar Pradesh", "coords": (25.44, 81.85)},
    "agra": {"state": "Uttar Pradesh", "coords": (27.18, 78.01)},
    "patna": {"state": "Bihar", "coords": (25.59, 85.14)},
    "gaya": {"state": "Bihar", "coords": (24.80, 85.00)},
    "ranchi": {"state": "Jharkhand", "coords": (23.34, 85.31)},
    "jamshedpur": {"state": "Jharkhand", "coords": (22.80, 86.20)},
    "dhanbad": {"state": "Jharkhand", "coords": (23.80, 86.43)},
    "bhopal": {"state": "Madhya Pradesh", "coords": (23.26, 77.41)},
    "indore": {"state": "Madhya Pradesh", "coords": (22.72, 75.86)},
    "gwalior": {"state": "Madhya Pradesh", "coords": (26.22, 78.18)},
    "jabalpur": {"state": "Madhya Pradesh", "coords": (23.18, 79.99)},
    "raipur": {"state": "Chhattisgarh", "coords": (21.25, 81.63)},
    "bilaspur": {"state": "Chhattisgarh", "coords": (22.08, 82.16)},
    "kolkata": {"state": "West Bengal", "coords": (22.57, 88.36)},
    "howrah": {"state": "West Bengal", "coords": (22.60, 88.31)},
    "darjeeling": {"state": "West Bengal", "coords": (27.04, 88.27)},
    "siliguri": {"state": "West Bengal", "coords": (26.73, 88.43)},
    "bhubaneswar": {"state": "Odisha", "coords": (20.30, 85.82)},
    "cuttack": {"state": "Odisha", "coords": (20.46, 85.88)},
    "rourkela": {"state": "Odisha", "coords": (22.25, 84.88)},
    "mumbai": {"state": "Maharashtra", "coords": (19.08, 72.88)},
    "navi mumbai": {"state": "Maharashtra", "coords": (19.03, 73.02)},
    "thane": {"state": "Maharashtra", "coords": (19.22, 72.98)},
    "nagpur": {"state": "Maharashtra", "coords": (21.15, 79.09)},
    "nashik": {"state": "Maharashtra", "coords": (19.99, 73.79)},
    "aurangabad": {"state": "Maharashtra", "coords": (19.88, 75.34)},
    "ahmedabad": {"state": "Gujarat", "coords": (23.02, 72.57)},
    "surat": {"state": "Gujarat", "coords": (21.17, 72.83)},
    "vadodara": {"state": "Gujarat", "coords": (22.31, 73.18)},
    "rajkot": {"state": "Gujarat", "coords": (22.30, 70.80)},
    "bhavnagar": {"state": "Gujarat", "coords": (21.76, 72.15)},
    "panaji": {"state": "Goa", "coords": (15.49, 73.83)},
    "vasco": {"state": "Goa", "coords": (15.40, 73.81)},
    "kochi": {"state": "Kerala", "coords": (9.93, 76.27)},
    "thiruvananthapuram": {"state": "Kerala", "coords": (8.52, 76.94)},
    "trivandrum": {"state": "Kerala", "coords": (8.52, 76.94)},
    "kozhikode": {"state": "Kerala", "coords": (11.26, 75.78)},
    "thrissur": {"state": "Kerala", "coords": (10.53, 76.21)},
    "bengaluru": {"state": "Karnataka", "coords": (12.97, 77.59)},
    "bangalore": {"state": "Karnataka", "coords": (12.97, 77.59)},
    "mysuru": {"state": "Karnataka", "coords": (12.30, 76.64)},
    "mysore": {"state": "Karnataka", "coords": (12.30, 76.64)},
    "hubli": {"state": "Karnataka", "coords": (15.36, 75.12)},
    "mangalore": {"state": "Karnataka", "coords": (12.91, 74.86)},
    "visakhapatnam": {"state": "Andhra Pradesh", "coords": (17.69, 83.22)},
    "vizag": {"state": "Andhra Pradesh", "coords": (17.69, 83.22)},
    "vijayawada": {"state": "Andhra Pradesh", "coords": (16.51, 80.65)},
    "guntur": {"state": "Andhra Pradesh", "coords": (16.31, 80.44)},
    "tirupati": {"state": "Andhra Pradesh", "coords": (13.63, 79.42)},
    "chennai": {"state": "Tamil Nadu", "coords": (13.08, 80.27)},
    "coimbatore": {"state": "Tamil Nadu", "coords": (11.02, 76.96)},
    "madurai": {"state": "Tamil Nadu", "coords": (9.93, 78.12)},
    "salem": {"state": "Tamil Nadu", "coords": (11.66, 78.15)},
    "tiruchirappalli": {"state": "Tamil Nadu", "coords": (10.79, 78.70)},
    "guwahati": {"state": "Assam", "coords": (26.14, 91.74)},
    "silchar": {"state": "Assam", "coords": (24.83, 92.78)},
    "shillong": {"state": "Meghalaya", "coords": (25.58, 91.89)},
    "imphal": {"state": "Manipur", "coords": (24.82, 93.94)},
    "aizawl": {"state": "Mizoram", "coords": (23.73, 92.72)},
    "agartala": {"state": "Tripura", "coords": (23.83, 91.28)},
    "gangtok": {"state": "Sikkim", "coords": (27.34, 88.61)},
    "itanagar": {"state": "Arunachal Pradesh", "coords": (27.08, 93.61)},
    "port blair": {"state": "Andaman & Nicobar", "coords": (11.62, 92.73)},
}


def generate_dynamic_results_for_location(
    loc_name: str,
    state_name: str,
    coords: Tuple[float, float],
    query: str,
) -> List[SearchResult]:
    q = query.lower()
    slug = re.sub(r"[^a-zA-Z0-9]", "", loc_name).upper()[:4] or "LOC"
    lat, lon = round(coords[0], 4), round(coords[1], 4)

    def make_bounds(center_lat: float, center_lon: float, delta: float = 0.04) -> Tuple[Tuple[float, float], Tuple[float, float]]:
        return (
            (round(center_lat - delta, 4), round(center_lon - delta, 4)),
            (round(center_lat + delta, 4), round(center_lon + delta, 4)),
        )

    # 1. Water Queries
    if any(k in q for k in ["water", "lake", "reservoir", "river", "wetland", "catchment"]):
        return [
            SearchResult(
                id=f"{slug}-WAT-01",
                location=f"{loc_name} Reservoir Basin",
                state=state_name,
                change="Water Level Change",
                changeType="water",
                dateRange="2023 → 2026",
                area="14.8 km²",
                confidence=93.0,
                explanation=f"NDWI analysis indicates seasonal water spread reduction and shoreline recession in {loc_name} catchment.",
                coords=(lat, lon),
                sensor="Sentinel-2",
                boundingBox=make_bounds(lat, lon, 0.04),
            ),
            SearchResult(
                id=f"{slug}-WAT-02",
                location=f"{loc_name} Wetland Zone",
                state=state_name,
                change="Water Change",
                changeType="water",
                dateRange="2023 → 2026",
                area="8.2 km²",
                confidence=89.0,
                explanation=f"Peripheral wetland boundary contraction detected along {loc_name} water bodies.",
                coords=(round(lat + 0.03, 4), round(lon - 0.02, 4)),
                sensor="Sentinel-2",
                boundingBox=make_bounds(lat + 0.03, lon - 0.02, 0.03),
            ),
        ]

    # 2. Forest / Vegetation Queries
    if any(k in q for k in ["forest", "deforestation", "loss", "tree", "canopy", "vegetation", "green"]):
        return [
            SearchResult(
                id=f"{slug}-FOR-01",
                location=f"{loc_name} Forest Fringe",
                state=state_name,
                change="Vegetation Loss",
                changeType="vegetation-loss",
                dateRange="2023 → 2026",
                area="12.6 km²",
                confidence=94.0,
                explanation=f"Canopy cover decline and NDVI loss detected across forest patches near {loc_name}.",
                coords=(lat, lon),
                sensor="Sentinel-2 + Landsat-8",
                boundingBox=make_bounds(lat, lon, 0.04),
            ),
            SearchResult(
                id=f"{slug}-FOR-02",
                location=f"{loc_name} Buffer Reserve",
                state=state_name,
                change="Vegetation Loss",
                changeType="vegetation-loss",
                dateRange="2023 → 2026",
                area="6.4 km²",
                confidence=88.0,
                explanation=f"Vegetation thinning and bare soil exposure observed along {loc_name} perimeter.",
                coords=(round(lat - 0.03, 4), round(lon + 0.03, 4)),
                sensor="Sentinel-2",
                boundingBox=make_bounds(lat - 0.03, lon + 0.03, 0.03),
            ),
        ]

    # 3. Urban / Construction Queries
    if any(k in q for k in ["urban", "construction", "built", "infrastructure", "expansion", "growth", "city"]):
        return [
            SearchResult(
                id=f"{slug}-URB-01",
                location=f"{loc_name} Urban Zone",
                state=state_name,
                change="Urban Expansion",
                changeType="urban",
                dateRange="2023 → 2026",
                area="18.5 km²",
                confidence=95.0,
                explanation=f"Rapid built-up expansion and new development footprint detected in {loc_name} corridor via Cartosat-3.",
                coords=(lat, lon),
                sensor="Cartosat-3",
                boundingBox=make_bounds(lat, lon, 0.04),
            ),
            SearchResult(
                id=f"{slug}-URB-02",
                location=f"{loc_name} Periurban Corridor",
                state=state_name,
                change="Infrastructure Expansion",
                changeType="infrastructure",
                dateRange="2023 → 2026",
                area="10.2 km²",
                confidence=91.0,
                explanation=f"New connectivity roads, logistics facilities, and industrial layouts identified in {loc_name}.",
                coords=(round(lat + 0.03, 4), round(lon + 0.02, 4)),
                sensor="Cartosat-3",
                boundingBox=make_bounds(lat + 0.03, lon + 0.02, 0.03),
            ),
        ]

    # 4. Multi-domain General Location Search
    return [
        SearchResult(
            id=f"{slug}-01",
            location=f"{loc_name} Urban Growth Area",
            state=state_name,
            change="Urban Expansion",
            changeType="urban",
            dateRange="2023 → 2026",
            area="17.4 km²",
            confidence=95.0,
            explanation=f"Built-up footprint expansion detected across {loc_name} sector. Impervious surface increased by 26%.",
            coords=(round(lat + 0.015, 4), round(lon + 0.015, 4)),
            sensor="Cartosat-3",
            boundingBox=make_bounds(lat + 0.015, lon + 0.015, 0.035),
        ),
        SearchResult(
            id=f"{slug}-02",
            location=f"{loc_name} Water Body Basin",
            state=state_name,
            change="Water Level Change",
            changeType="water",
            dateRange="2023 → 2026",
            area="11.2 km²",
            confidence=90.0,
            explanation=f"NDWI analysis indicates seasonal water spread drawdown in {loc_name} reservoir and surrounding catchment.",
            coords=(round(lat - 0.025, 4), round(lon - 0.02, 4)),
            sensor="Sentinel-2",
            boundingBox=make_bounds(lat - 0.025, lon - 0.02, 0.035),
        ),
        SearchResult(
            id=f"{slug}-03",
            location=f"{loc_name} Forest & Greenbelt",
            state=state_name,
            change="Vegetation Loss",
            changeType="vegetation-loss",
            dateRange="2023 → 2026",
            area="8.6 km²",
            confidence=87.0,
            explanation=f"Vegetation thinning and scrubland loss detected along {loc_name} fringe boundary.",
            coords=(round(lat + 0.03, 4), round(lon - 0.03, 4)),
            sensor="Sentinel-2 + Landsat-8",
            boundingBox=make_bounds(lat + 0.03, lon - 0.03, 0.035),
        ),
    ]


def select_result_set(query: str) -> List[SearchResult]:
    q = query.lower()

    # 1. Curated specific catalogs (Preserve all existing catalogued locations)
    if any(k in q for k in ["pune", "pimpri", "nashik", "khed", "haveli", "mulshi", "maval", "junnar", "bhor", "shirur", "indapur"]):
        return list(PUNE_RESULTS)

    if any(k in q for k in ["hyderabad", "telangana", "cyberabad", "secunderabad", "shamshabad"]):
        return list(HYDERABAD_RESULTS)

    if any(k in q for k in ["odisha", "paradip", "puri", "chilika", "kendrapara", "gopalpur", "dhamara"]):
        return list(ODISHA_COASTAL_RESULTS)

    if any(k in q for k in ["gujarat", "sardar sarovar", "gandhinagar", "nal sarovar", "ukai"]):
        return list(GUJARAT_WATER_RESULTS)

    if any(k in q for k in ["chhattisgarh", "hasdeo", "achanakmar", "barnawapara", "simlipal"]):
        return list(FOREST_RESULTS)

    if any(k in q for k in ["gift city", "aerocity", "whitefield", "neemrana", "amaravati"]):
        return list(CONSTRUCTION_RESULTS)

    # 2. Match against Comprehensive Indian Geographic Directory
    # Sort keys by length descending to match multi-word entries first (e.g. "navi mumbai", "tamil nadu")
    sorted_geo_keys = sorted(INDIAN_GEO_LOCATIONS.keys(), key=len, reverse=True)
    for key in sorted_geo_keys:
        pattern = r"\b" + re.escape(key) + r"\b"
        if re.search(pattern, q):
            info = INDIAN_GEO_LOCATIONS[key]
            loc_title = key.title()
            return generate_dynamic_results_for_location(loc_title, info["state"], info["coords"], query)

    # 3. Check for "in/near/around/at <Place>" regex pattern against catalog
    place_match = re.search(r"\b(?:in|near|around|at)\s+([a-zA-Z]+)\b", q)
    if place_match:
        raw_place = place_match.group(1).lower()
        skip_words = {"the", "a", "an", "all", "india", "satellite", "recent", "new", "this", "zone", "corridor"}
        if raw_place not in skip_words and len(raw_place) > 2 and raw_place in INDIAN_GEO_LOCATIONS:
            info = INDIAN_GEO_LOCATIONS[raw_place]
            return generate_dynamic_results_for_location(raw_place.title(), info["state"], info["coords"], query)

    # 4. Pure change-type keywords (when no specific location is requested)
    if any(k in q for k in ["coastal", "coast", "shoreline", "shore", "erosion", "mangrove"]):
        return list(ODISHA_COASTAL_RESULTS)

    if any(k in q for k in ["construction", "built-up", "building", "infrastructure", "new development", "industrial", "urban", "expansion"]):
        return list(CONSTRUCTION_RESULTS)

    if any(k in q for k in ["forest", "deforestation", "northeast", "cover change"]):
        return list(FOREST_RESULTS)

    if any(k in q for k in ["water", "lake", "reservoir", "river"]):
        return list(GUJARAT_WATER_RESULTS)

    if any(k in q for k in ["vegetation", "ndvi", "canopy", "loss"]):
        return list(PUNE_RESULTS)

    # 5. Unknown location / query not in catalog -> graceful no results (do NOT fall back to Pune)
    return []


# ─── Copernicus Data Space STAC Integration (Sentinel-2 Level-2A) ───────────

COPERNICUS_STAC_URL = "https://stac.dataspace.copernicus.eu/v1/search"


def resolve_location_and_aoi(
    query: str,
    filters: Optional[SearchFilters] = None,
) -> Optional[Tuple[str, str, Tuple[float, float, float, float]]]:
    """
    Resolves location name, state, and geographic bounding box [min_lon, min_lat, max_lon, max_lat]
    from natural language query or structured search filters.
    """
    q = query.lower()

    # 1. Curated specific catalogs
    if any(k in q for k in ["pune", "pimpri", "nashik", "khed", "haveli", "mulshi", "maval", "junnar", "bhor", "shirur", "indapur"]):
        return ("Pune Metropolitan Region", "Maharashtra", (73.70, 18.35, 74.05, 18.85))

    if any(k in q for k in ["hyderabad", "telangana", "cyberabad", "secunderabad", "shamshabad"]):
        return ("Hyderabad Urban Hub", "Telangana", (78.20, 17.20, 78.65, 17.60))

    if any(k in q for k in ["odisha", "paradip", "puri", "chilika", "kendrapara", "gopalpur", "dhamara"]):
        return ("Odisha Coastal Belt", "Odisha", (85.70, 19.60, 86.80, 20.50))

    if any(k in q for k in ["gujarat", "sardar sarovar", "gandhinagar", "nal sarovar", "ukai"]):
        return ("Gujarat Hydrological Basin", "Gujarat", (71.10, 21.80, 73.00, 23.20))

    if any(k in q for k in ["chhattisgarh", "hasdeo", "achanakmar", "barnawapara", "simlipal"]):
        return ("Hasdeo Arand Forest", "Chhattisgarh", (81.50, 21.00, 83.20, 22.80))

    if any(k in q for k in ["gift city", "aerocity", "whitefield", "neemrana", "amaravati"]):
        return ("GIFT City / Whitefield Corridor", "Gujarat", (72.60, 23.10, 72.75, 23.25))

    # 2. Match against Comprehensive Indian Geographic Directory
    sorted_geo_keys = sorted(INDIAN_GEO_LOCATIONS.keys(), key=len, reverse=True)
    for key in sorted_geo_keys:
        pattern = r"\b" + re.escape(key) + r"\b"
        if re.search(pattern, q):
            info = INDIAN_GEO_LOCATIONS[key]
            lat, lon = info["coords"]
            bbox = (round(lon - 0.20, 4), round(lat - 0.20, 4), round(lon + 0.20, 4), round(lat + 0.20, 4))
            return (key.title(), info["state"], bbox)

    # 3. Check for "in/near/around/at <Place>" regex pattern against catalog
    place_match = re.search(r"\b(?:in|near|around|at)\s+([a-zA-Z]+)\b", q)
    if place_match:
        raw_place = place_match.group(1).lower()
        skip_words = {"the", "a", "an", "all", "india", "satellite", "recent", "new", "this", "zone", "corridor"}
        if raw_place not in skip_words and len(raw_place) > 2 and raw_place in INDIAN_GEO_LOCATIONS:
            info = INDIAN_GEO_LOCATIONS[raw_place]
            lat, lon = info["coords"]
            bbox = (round(lon - 0.20, 4), round(lat - 0.20, 4), round(lon + 0.20, 4), round(lat + 0.20, 4))
            return (raw_place.title(), info["state"], bbox)

    # 4. Check if filter provides state
    if filters and filters.state and filters.state.strip():
        st_key = filters.state.strip().lower()
        for key, info in INDIAN_GEO_LOCATIONS.items():
            if key == st_key or info["state"].lower() == st_key:
                lat, lon = info["coords"]
                bbox = (round(lon - 0.25, 4), round(lat - 0.25, 4), round(lon + 0.25, 4), round(lat + 0.25, 4))
                return (info["state"], info["state"], bbox)

    return None


def query_copernicus_stac(
    bbox: Tuple[float, float, float, float],
    loc_name: str,
    state_name: str,
    query: str,
    filters: Optional[SearchFilters] = None,
    limit: int = 5,
) -> List[SearchResult]:
    """
    Queries Copernicus Data Space STAC API for Sentinel-2 Level-2A surface reflectance scenes.
    Transforms returned STAC items to SearchResult schema with fallback protection.
    """
    # 1. Date Range Handling
    date_from = (filters.dateFrom.strip() if filters and filters.dateFrom else "") or "2023-01-01"
    date_to = (filters.dateTo.strip() if filters and filters.dateTo else "") or "2026-12-31"

    dt_from_iso = f"{date_from}T00:00:00Z" if "T" not in date_from else date_from
    dt_to_iso = f"{date_to}T23:59:59Z" if "T" not in date_to else date_to
    datetime_str = f"{dt_from_iso}/{dt_to_iso}"

    # 2. Cloud Cover Filter
    max_cloud = 30.0
    if filters and filters.minConfidence and filters.minConfidence > 0:
        max_cloud = min(50.0, max(5.0, round(100.0 - filters.minConfidence, 1)))

    payload = {
        "collections": ["sentinel-2-l2a"],
        "bbox": list(bbox),
        "datetime": datetime_str,
        "query": {
            "eo:cloud_cover": {"lte": max_cloud}
        },
        "limit": limit,
    }

    headers = {
        "User-Agent": "ISRO-SatWatch-Backend/1.0",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        with httpx.Client(http2=True, timeout=12.0) as client:
            resp = client.post(COPERNICUS_STAC_URL, headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"[STAC Warning] Copernicus STAC returned HTTP {resp.status_code}: {resp.text[:150]}")
                return []
            data = resp.json()
    except Exception as exc:
        print(f"[STAC Error] Copernicus STAC connection failure: {exc}")
        return []

    features = data.get("features", [])
    if not features:
        return []

    # 3. Infer change type & label from natural language query intent
    q_lower = query.lower()
    if any(k in q_lower for k in ["water", "lake", "reservoir", "river", "wetland"]):
        change_type = "water"
        change_label = "Water Level & Hydrological Change"
    elif any(k in q_lower for k in ["gain", "plantation", "reforestation", "greening"]):
        change_type = "vegetation-gain"
        change_label = "Vegetation Growth & Canopy Gain"
    elif any(k in q_lower for k in ["forest", "deforestation", "vegetation", "canopy", "loss", "ndvi"]):
        change_type = "vegetation-loss"
        change_label = "Vegetation Loss & Surface Thinning"
    elif any(k in q_lower for k in ["construction", "highway", "infrastructure", "industrial", "corridor"]):
        change_type = "infrastructure"
        change_label = "Infrastructure & Construction Progression"
    else:
        change_type = "urban"
        change_label = "Urban Expansion & Built-Up Surface"

    results: List[SearchResult] = []
    for feat in features:
        f_id = feat.get("id", "S2-UNKNOWN")
        props = feat.get("properties", {})
        f_bbox = feat.get("bbox", list(bbox))

        min_lon, min_lat, max_lon, max_lat = f_bbox[0], f_bbox[1], f_bbox[2], f_bbox[3]
        center_lat = round((min_lat + max_lat) / 2.0, 4)
        center_lon = round((min_lon + max_lon) / 2.0, 4)

        dt_acq = props.get("datetime", "")
        acq_date = dt_acq[:10] if dt_acq else "2024-03-28"
        acq_year = acq_date[:4]

        # Ensure dateRange matches "YYYY → YYYY" pattern required by frontend parser
        from_year = date_from[:4] if len(date_from) >= 4 else "2023"
        date_range = f"{from_year} → {acq_year}"

        cloud_val = float(props.get("eo:cloud_cover", 0.0))
        confidence = max(70.0, round(100.0 - cloud_val, 1))

        # Format tile ID and sensor details
        tile_raw = props.get("grid:code", "").replace("MGRS-", "").replace("CDSE-S2-SN-", "")
        tile_label = f"Tile {tile_raw}" if tile_raw else "L2A Granule"

        platform = str(props.get("platform", "sentinel-2a")).upper()
        if "2A" in platform:
            sensor_str = "Sentinel-2A MSI L2A"
        elif "2B" in platform:
            sensor_str = "Sentinel-2B MSI L2A"
        else:
            sensor_str = "Sentinel-2 MSI L2A"

        orbit = props.get("sat:relative_orbit", "N/A")
        sun_elev = props.get("view:sun_elevation", None)
        sun_text = f", Sun Elev {round(sun_elev, 1)}°" if sun_elev is not None else ""

        explanation = (
            f"Copernicus Sentinel-2 Level-2A scene acquired {acq_date} "
            f"(Relative Orbit {orbit}{sun_text}). Cloud Cover: {round(cloud_val, 1)}%. "
            f"Bottom-of-Atmosphere (BOA) Surface Reflectance verified by ESA."
        )

        results.append(
            SearchResult(
                id=f_id,
                location=f"{loc_name} · {tile_label}",
                state=state_name,
                change=change_label,
                changeType=change_type,
                dateRange=date_range,
                area="100.0 km²",
                confidence=confidence,
                explanation=explanation,
                coords=(center_lat, center_lon),
                sensor=sensor_str,
                boundingBox=((round(min_lat, 4), round(min_lon, 4)), (round(max_lat, 4), round(max_lon, 4))),
            )
        )

    return results


def search_observations(query: str, filters: Optional[SearchFilters] = None) -> List[SearchResult]:
    query_clean = query.strip()
    
    # Check data source compatibility
    ds = (filters.dataSource or "all").lower() if filters else "all"
    is_sentinel_compatible = ds in ("all", "sentinel-2", "sentinel")

    # If query or filter specifies a location and Sentinel is requested, try Copernicus STAC first
    if query_clean and is_sentinel_compatible:
        aoi_info = resolve_location_and_aoi(query_clean, filters)
        if aoi_info:
            loc_name, state_name, bbox = aoi_info
            try:
                stac_results = query_copernicus_stac(
                    bbox=bbox,
                    loc_name=loc_name,
                    state_name=state_name,
                    query=query_clean,
                    filters=filters,
                    limit=5,
                )
                if stac_results:
                    filtered_stac = stac_results
                    if filters and filters.changeTypes:
                        filtered_stac = [r for r in filtered_stac if r.changeType in filters.changeTypes]
                    if filters and filters.minConfidence and filters.minConfidence > 0:
                        filtered_stac = [r for r in filtered_stac if r.confidence >= filters.minConfidence]
                    
                    if filtered_stac:
                        return filtered_stac
                    return stac_results
            except Exception as e:
                print(f"[STAC Warning] STAC search failed: {e}. Falling back to catalog.")

    # Fallback to existing curated and dynamic catalog
    if not query_clean:
        results = list(ALL_RESULTS)
    else:
        results = select_result_set(query_clean)

    # Apply Structured Filters to fallback results
    if filters:
        if filters.changeTypes:
            results = [r for r in results if r.changeType in filters.changeTypes]
        
        if filters.minConfidence and filters.minConfidence > 0:
            results = [r for r in results if r.confidence >= filters.minConfidence]
        
        if filters.state and filters.state.strip():
            st = filters.state.strip().lower()
            results = [r for r in results if st in r.state.lower()]
            
        if filters.dataSource and filters.dataSource != "all":
            ds_map = {
                "sentinel-2": "Sentinel",
                "landsat": "Landsat",
                "cartosat": "Cartosat",
            }
            target = ds_map.get(filters.dataSource.lower(), filters.dataSource)
            results = [r for r in results if target.lower() in r.sensor.lower()]

    return results


# ─── Analysis Calculation Engine ──────────────────────────────────────────────

def calculate_analysis(area: SelectedArea) -> AnalysisResponse:
    match = re.search(r"([\d\.]+)", area.affectedArea)
    area_km = float(match.group(1)) if match else 10.0

    year_from = area.beforeDate[:4] if len(area.beforeDate) >= 4 else "2023"
    year_to = area.afterDate[:4] if len(area.afterDate) >= 4 else "2026"

    report_id = f"RPT-{area.id.upper()}"

    # Urban & Infrastructure
    if area.analysisType in ("urban", "infrastructure"):
        built_before = round(area_km * 0.65, 1)
        built_after = round(built_before + area_km, 1)
        pct = round((area_km / built_before) * 100, 1) if built_before > 0 else 0
        severity = "High" if area.confidence >= 90 else "Medium"

        return AnalysisResponse(
            selectedArea=area,
            location=area.name,
            state=area.state,
            area=area.affectedArea,
            changeType=area.analysisType,
            sensor=area.sensor,
            confidence=area.confidence,
            beforeDate=area.beforeDate,
            afterDate=area.afterDate,
            pageTitle="Urban Change Analysis",
            subtitle=f"{area.name}, {area.state} · {year_from}–{year_to} · ISA Change",
            reportId=report_id,
            analysisType="Impervious Surface Area (ISA) Change Vector",
            severity=severity,
            beforeLabel="Built-up Area (Before)",
            beforeValue=f"{built_before} km²",
            afterLabel="Built-up Area (After)",
            afterValue=f"{built_after} km²",
            netChange=f"+{area_km} km²",
            netChangePct=f"+{pct}%",
            comparisonSubtitle=f"{area.name} · {area.beforeDate} vs {area.afterDate} · ISA Change",
            findings=[
                Finding(
                    text=f"Built-up area expanded from {built_before} km² to {built_after} km² — a {pct}% increase over the analysis period.",
                    type="critical",
                ),
                Finding(text=area.explanation, type="warning"),
                Finding(
                    text="Road network and utility corridor expansion detected in surrounding 2 km buffer zone.",
                    type="warning",
                ),
                Finding(
                    text="Designated open-space and green-belt reserves show no significant encroachment within the AOI boundary.",
                    type="ok",
                ),
            ],
            statistics=[
                (f"Built-up Area ({year_from})", f"{built_before} km²"),
                (f"Built-up Area ({year_to})", f"{built_after} km²"),
                ("Net Change", f"+{area_km} km² (+{pct}%)"),
                ("Analysis Method", "ISA Change Vector"),
                ("Accuracy", f"{int(area.confidence)}%"),
                ("Kappa Coefficient", "0.91"),
            ],
            timeline=[
                TimelineItem(date=area.afterDate, label="Post-expansion scan complete", type="scan"),
                TimelineItem(date=f"{year_to}-04-01", label="Urban growth alert issued", type="alert"),
                TimelineItem(date=f"{year_to}-01-01", label="Annual ISA baseline update", type="baseline"),
                TimelineItem(date=f"{year_from}-06-01", label="Mid-period reference captured", type="reference"),
                TimelineItem(date=area.beforeDate, label="Pre-expansion baseline established", type="baseline"),
            ],
        )

    # Water Body Changes
    if area.analysisType == "water":
        water_before = round(area_km * 6.0, 1)
        water_after = round(max(water_before - area_km, 1.0), 1)
        pct = round((area_km / water_before) * 100, 1) if water_before > 0 else 0
        severity = "High" if area.confidence >= 90 else "Medium"

        return AnalysisResponse(
            selectedArea=area,
            location=area.name,
            state=area.state,
            area=area.affectedArea,
            changeType=area.analysisType,
            sensor=area.sensor,
            confidence=area.confidence,
            beforeDate=area.beforeDate,
            afterDate=area.afterDate,
            pageTitle="Water Body Change Analysis",
            subtitle=f"{area.name}, {area.state} · {year_from}–{year_to} · NDWI",
            reportId=report_id,
            analysisType="NDWI Thresholding + Change Vector",
            severity=severity,
            beforeLabel="Water Surface (Before)",
            beforeValue=f"{water_before} km²",
            afterLabel="Water Surface (After)",
            afterValue=f"{water_after} km²",
            netChange=f"−{area_km} km²",
            netChangePct=f"−{pct}%",
            comparisonSubtitle=f"{area.name} · {area.beforeDate} vs {area.afterDate} · NDWI",
            findings=[
                Finding(
                    text=f"Water surface reduced from {water_before} km² to {water_after} km² — a {pct}% decline over the analysis period.",
                    type="critical",
                ),
                Finding(text=area.explanation, type="warning"),
                Finding(
                    text="Peripheral vegetation stress detected in 18% of the lake buffer zone (500 m radius).",
                    type="warning",
                ),
                Finding(
                    text="Northern shoreline remains stable within ±30 m of historical multi-year baseline.",
                    type="ok",
                ),
            ],
            statistics=[
                (f"Water Surface ({year_from})", f"{water_before} km²"),
                (f"Water Surface ({year_to})", f"{water_after} km²"),
                ("Net Change", f"−{area_km} km² (−{pct}%)"),
                ("NDWI Threshold", "0.2"),
                ("Accuracy", f"{int(area.confidence)}%"),
                ("Kappa Coefficient", "0.87"),
            ],
            timeline=[
                TimelineItem(date=area.afterDate, label="Post-monsoon water-level scan", type="scan"),
                TimelineItem(date=f"{year_to}-06-01", label="Water recession alert issued", type="alert"),
                TimelineItem(date=f"{year_to}-01-01", label="Annual NDWI baseline update", type="baseline"),
                TimelineItem(date=f"{year_from}-06-01", label="Pre-monsoon reference captured", type="reference"),
                TimelineItem(date=area.beforeDate, label="High-water baseline established", type="baseline"),
            ],
        )

    # Vegetation Gain
    if area.analysisType == "vegetation-gain":
        veg_before = round(area_km * 3.5, 1)
        veg_after = round(veg_before + area_km, 1)
        pct = round((area_km / veg_before) * 100, 1) if veg_before > 0 else 0

        return AnalysisResponse(
            selectedArea=area,
            location=area.name,
            state=area.state,
            area=area.affectedArea,
            changeType=area.analysisType,
            sensor=area.sensor,
            confidence=area.confidence,
            beforeDate=area.beforeDate,
            afterDate=area.afterDate,
            pageTitle="Vegetation Recovery Analysis",
            subtitle=f"{area.name}, {area.state} · {year_from}–{year_to} · NDVI",
            reportId=report_id,
            analysisType="NDVI Change + Phenology Analysis",
            severity="Low",
            beforeLabel="Canopy Cover (Before)",
            beforeValue=f"{veg_before} km²",
            afterLabel="Canopy Cover (After)",
            afterValue=f"{veg_after} km²",
            netChange=f"+{area_km} km²",
            netChangePct=f"+{pct}%",
            comparisonSubtitle=f"{area.name} · {area.beforeDate} vs {area.afterDate} · NDVI",
            findings=[
                Finding(
                    text=f"Canopy cover increased from {veg_before} km² to {veg_after} km² — a {pct}% gain over the analysis period.",
                    type="ok",
                ),
                Finding(text=area.explanation, type="ok"),
                Finding(
                    text="Soil moisture index improvement correlates with detected reforestation effort in the zone.",
                    type="ok",
                ),
                Finding(
                    text="Isolated patches at northern boundary show slower recovery rate — recommended for monitoring next season.",
                    type="warning",
                ),
            ],
            statistics=[
                (f"Canopy Cover ({year_from})", f"{veg_before} km²"),
                (f"Canopy Cover ({year_to})", f"{veg_after} km²"),
                ("Net Change", f"+{area_km} km² (+{pct}%)"),
                ("Mean NDVI Δ", "+0.18"),
                ("Accuracy", f"{int(area.confidence)}%"),
                ("Kappa Coefficient", "0.85"),
            ],
            timeline=[
                TimelineItem(date=area.afterDate, label="Post-growth season scan", type="scan"),
                TimelineItem(date=f"{year_to}-04-01", label="Positive NDVI trend confirmed", type="baseline"),
                TimelineItem(date=f"{year_to}-01-01", label="Annual NDVI baseline", type="baseline"),
                TimelineItem(date=f"{year_from}-06-01", label="Mid-period reference captured", type="reference"),
                TimelineItem(date=area.beforeDate, label="Pre-growth baseline established", type="baseline"),
            ],
        )

    # Vegetation Loss (Default)
    veg_before = round(area_km * 4.2, 1)
    veg_after = round(max(veg_before - area_km, 1.0), 1)
    pct = round((area_km / veg_before) * 100, 1) if veg_before > 0 else 0
    severity = "Critical" if area.confidence >= 95 else ("High" if area.confidence >= 85 else "Medium")

    return AnalysisResponse(
        selectedArea=area,
        location=area.name,
        state=area.state,
        area=area.affectedArea,
        changeType=area.analysisType,
        sensor=area.sensor,
        confidence=area.confidence,
        beforeDate=area.beforeDate,
        afterDate=area.afterDate,
        pageTitle="Vegetation Loss Analysis",
        subtitle=f"{area.name}, {area.state} · {year_from}–{year_to} · NDVI",
        reportId=report_id,
        analysisType="NDVI Decline + Fragmentation Index",
        severity=severity,
        beforeLabel="Canopy Cover (Before)",
        beforeValue=f"{veg_before} km²",
        afterLabel="Canopy Cover (After)",
        afterValue=f"{veg_after} km²",
        netChange=f"−{area_km} km²",
        netChangePct=f"−{pct}%",
        comparisonSubtitle=f"{area.name} · {area.beforeDate} vs {area.afterDate} · NDVI",
        findings=[
            Finding(
                text=f"Canopy cover declined from {veg_before} km² to {veg_after} km² — a {pct}% loss over the analysis period.",
                type="critical",
            ),
            Finding(text=area.explanation, type="warning"),
            Finding(
                text="Soil exposure increased in the central patch. Bare soil fraction rose from 9% to 28%.",
                type="warning",
            ),
            Finding(
                text="Eastern boundary buffer zone remains stable within historical variation range.",
                type="ok",
            ),
        ],
        statistics=[
            (f"Canopy Cover ({year_from})", f"{veg_before} km²"),
            (f"Canopy Cover ({year_to})", f"{veg_after} km²"),
            ("Net Change", f"−{area_km} km² (−{pct}%)"),
            ("Mean NDVI Δ", "−0.31"),
            ("Accuracy", f"{int(area.confidence)}%"),
            ("Kappa Coefficient", "0.88"),
        ],
        timeline=[
            TimelineItem(date=area.afterDate, label="Post-loss scan complete", type="scan"),
            TimelineItem(date=f"{year_to}-03-15", label="Vegetation loss alert issued", type="alert"),
            TimelineItem(date=f"{year_to}-01-01", label="Annual NDVI baseline", type="baseline"),
            TimelineItem(date=f"{year_from}-06-01", label="Mid-period reference captured", type="reference"),
            TimelineItem(date=area.beforeDate, label="Healthy canopy baseline established", type="baseline"),
        ],
    )


# ─── Dashboard Data ───────────────────────────────────────────────────────────

def get_dashboard_data() -> DashboardResponse:
    return DashboardResponse(
        stats=[
            StatCard(label="Total AOIs Monitored", value="1,247", delta="+34 this week", positive=True),
            StatCard(label="Change Events Detected", value="89", delta="+12 since last scan", positive=False),
            StatCard(label="Scenes Indexed", value="48,392", delta="Updated 2h ago", positive=True),
            StatCard(label="Reports Generated", value="312", delta="+5 today", positive=True),
        ],
        recentEvents=[
            RecentEvent(
                id="EVT-2847",
                region="Sardar Sarovar Reservoir, Gujarat",
                type="Water Level Change",
                severity="High",
                date="2026-09-06",
                confidence="94%",
            ),
            RecentEvent(
                id="EVT-2846",
                region="Hasdeo Forest, Chhattisgarh",
                type="Vegetation Loss",
                severity="Critical",
                date="2026-09-05",
                confidence="97%",
            ),
            RecentEvent(
                id="EVT-2845",
                region="Cyberabad IT Corridor, Telangana",
                type="Urban Expansion",
                severity="High",
                date="2026-09-04",
                confidence="96%",
            ),
            RecentEvent(
                id="EVT-2844",
                region="Chilika Lake, Odisha",
                type="Shoreline Shift",
                severity="Low",
                date="2026-09-03",
                confidence="93%",
            ),
            RecentEvent(
                id="EVT-2843",
                region="GIFT City, Gandhinagar",
                type="Urban Expansion",
                severity="High",
                date="2026-09-02",
                confidence="93%",
            ),
        ],
    )
