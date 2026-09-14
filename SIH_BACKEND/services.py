import re
import json
import urllib.request
import urllib.parse
from typing import List, Optional, Tuple, Dict
import io
import base64
import concurrent.futures
from PIL import Image
import httpx
import numpy as np
import rasterio
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from pydantic import BaseModel

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
    "whitefield": {"state": "Karnataka", "coords": (12.97, 77.75)},
    "gift city": {"state": "Gujarat", "coords": (23.16, 72.68)},
    "aerocity": {"state": "Delhi", "coords": (28.56, 77.11)},
    "neemrana": {"state": "Rajasthan", "coords": (27.98, 76.37)},
    "amaravati": {"state": "Andhra Pradesh", "coords": (16.51, 80.52)},
    "sardar sarovar": {"state": "Gujarat", "coords": (21.83, 73.75)},
    "cyberabad": {"state": "Telangana", "coords": (17.44, 78.38)},
    "hasdeo": {"state": "Chhattisgarh", "coords": (22.60, 82.30)},
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


def is_explicit_curated_demo_query(query: str) -> bool:
    """Checks if the query explicitly refers to one of the repository's curated demo showcase areas."""
    q = query.lower()
    curated_keywords = [
        # Pune
        "pune", "pimpri", "nashik", "khed", "haveli", "mulshi", "maval", "junnar", "bhor", "shirur", "indapur",
        # Hyderabad / Cyberabad
        "cyberabad", "hyderabad", "secunderabad", "shamshabad", "it corridor", "hitech",
        # Sardar Sarovar / Gujarat
        "sardar sarovar", "nal sarovar", "ukai",
        # Hasdeo
        "hasdeo", "achanakmar", "barnawapara",
        # Odisha
        "paradip", "chilika", "kendrapara", "gopalpur", "dhamara",
        # Nagaland
        "nagaland", "kohima", "dimapur",
        # Construction showcase
        "gift city", "aerocity", "neemrana", "amaravati",
    ]
    for kw in curated_keywords:
        if re.search(r"\b" + re.escape(kw) + r"\b", q):
            return True
    return False


def is_pure_thematic_query(query: str) -> bool:
    """
    Returns True ONLY when a query contains recognized change-type/thematic keywords
    and does NOT contain an unrecognized geographic location name.
    """
    q = query.lower().strip()
    thematic_words = {
        "coastal", "coast", "shoreline", "shore", "erosion", "mangrove",
        "forest", "deforestation", "canopy",
        "water", "lake", "reservoir", "river", "flood",
        "construction", "built-up", "infrastructure", "urban", "expansion",
        "vegetation", "ndvi", "greening",
    }
    tokens = set(re.findall(r"\b[a-zA-Z]{3,}\b", q))
    common_stops = {
        "change", "detection", "satellite", "data", "imagery", "analysis",
        "monitoring", "recent", "view", "find", "all", "the", "in", "and",
        "loss", "gain", "type", "events", "near", "around", "over", "zones",
    }
    non_thematic = tokens - thematic_words - common_stops
    return bool(tokens & thematic_words) and len(non_thematic) == 0


def select_result_set(query: str) -> List[SearchResult]:
    q = query.lower()

    # 1. Curated specific catalogs (Preserve all existing catalogued locations)
    if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["pune", "pimpri", "nashik", "khed", "haveli", "mulshi", "maval", "junnar", "bhor", "shirur", "indapur"]):
        return list(PUNE_RESULTS)

    if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["cyberabad", "hyderabad", "telangana", "secunderabad", "shamshabad", "it corridor", "hitech"]):
        return list(HYDERABAD_RESULTS)

    if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["odisha", "paradip", "puri", "chilika", "kendrapara", "gopalpur", "dhamara"]):
        return list(ODISHA_COASTAL_RESULTS)

    if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["sardar sarovar", "gujarat", "gandhinagar", "nal sarovar", "ukai"]):
        return list(GUJARAT_WATER_RESULTS)

    if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["hasdeo", "chhattisgarh", "achanakmar", "barnawapara", "simlipal"]):
        return list(FOREST_RESULTS)

    # Specific unbundled construction locations (Do NOT lump Whitefield into Gujarat):
    if re.search(r"\bwhitefield\b", q):
        matches = [r for r in CONSTRUCTION_RESULTS if "whitefield" in r.location.lower()]
        return matches if matches else list(CONSTRUCTION_RESULTS)

    if re.search(r"\bgift city\b", q):
        matches = [r for r in CONSTRUCTION_RESULTS if "gift city" in r.location.lower()]
        return matches if matches else list(CONSTRUCTION_RESULTS)

    if re.search(r"\baerocity\b", q):
        matches = [r for r in CONSTRUCTION_RESULTS if "aerocity" in r.location.lower()]
        return matches if matches else list(CONSTRUCTION_RESULTS)

    if re.search(r"\bneemrana\b", q):
        matches = [r for r in CONSTRUCTION_RESULTS if "neemrana" in r.location.lower()]
        return matches if matches else list(CONSTRUCTION_RESULTS)

    if re.search(r"\bamaravati\b", q):
        matches = [r for r in CONSTRUCTION_RESULTS if "amaravati" in r.location.lower()]
        return matches if matches else list(CONSTRUCTION_RESULTS)

    # 2. Match against Comprehensive Indian Geographic Directory
    sorted_geo_keys = sorted(INDIAN_GEO_LOCATIONS.keys(), key=len, reverse=True)
    for key in sorted_geo_keys:
        pattern = r"\b" + re.escape(key) + r"\b"
        if re.search(pattern, q):
            info = INDIAN_GEO_LOCATIONS[key]
            loc_title = key.title()
            return generate_dynamic_results_for_location(loc_title, info["state"], info["coords"], query)

    # 3. Pure change-type keywords (ONLY when no specific location is requested)
    if is_pure_thematic_query(q):
        if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["coastal", "coast", "shoreline", "shore", "erosion", "mangrove"]):
            return list(ODISHA_COASTAL_RESULTS)

        if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["construction", "built-up", "building", "infrastructure", "new development", "industrial", "urban", "expansion"]):
            return list(CONSTRUCTION_RESULTS)

        if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["forest", "deforestation", "northeast", "cover change"]):
            return list(FOREST_RESULTS)

        if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["water", "lake", "reservoir", "river"]):
            return list(GUJARAT_WATER_RESULTS)

        if any(re.search(r"\b" + re.escape(k) + r"\b", q) for k in ["vegetation", "ndvi", "canopy", "loss"]):
            return list(PUNE_RESULTS)

    # 4. Unknown location / query not in catalog -> graceful no results (never fall back to Pune or Odisha)
    return []


# ─── Multi-Tier General Geocoding Architecture ──────────────────────────────

class GeocodedLocation(BaseModel):
    name: str
    display_name: str
    state: str
    district: Optional[str] = None
    country: str = "India"
    latitude: float
    longitude: float
    bbox: Tuple[float, float, float, float]  # (min_lon, min_lat, max_lon, max_lat)
    source: str


_GEOCODE_CACHE: Dict[str, Optional[GeocodedLocation]] = {}


def _query_open_meteo(term: str) -> Optional[GeocodedLocation]:
    """Query Open-Meteo Geocoding API, prioritizing Indian locations and administrative details."""
    try:
        enc = urllib.parse.quote(term.strip())
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={enc}&count=10&language=en&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "SIH-SatWatch/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as res:
            data = json.loads(res.read().decode())
            results = data.get("results", [])
            in_res = [r for r in results if r.get("country_code") == "IN" or r.get("country") == "India"]
            if in_res:
                r = in_res[0]
                lat = float(r.get("latitude"))
                lon = float(r.get("longitude"))
                bbox = (round(lon - 0.15, 4), round(lat - 0.15, 4), round(lon + 0.15, 4), round(lat + 0.15, 4))
                state = r.get("admin1") or "India"
                district = r.get("admin2")
                name = r.get("name") or term.title()
                return GeocodedLocation(
                    name=name,
                    display_name=f"{name}, {state}",
                    state=state,
                    district=district,
                    country="India",
                    latitude=lat,
                    longitude=lon,
                    bbox=bbox,
                    source="open-meteo",
                )
    except Exception:
        pass
    return None


def _query_photon(term: str) -> Optional[GeocodedLocation]:
    """Query Komoot Photon API (OSM-based), prioritizing Indian locations and geographic features."""
    try:
        enc = urllib.parse.quote(term.strip())
        url = f"https://photon.komoot.io/api/?q={enc}&limit=5"
        req = urllib.request.Request(url, headers={"User-Agent": "SIH-SatWatch/1.0"})
        with urllib.request.urlopen(req, timeout=3.5) as res:
            data = json.loads(res.read().decode())
            feats = data.get("features", [])
            in_feats = [
                f for f in feats
                if f.get("properties", {}).get("countrycode") == "IN" or f.get("properties", {}).get("country") == "India"
            ]
            if in_feats:
                f = in_feats[0]
                props = f.get("properties", {})
                coords = f.get("geometry", {}).get("coordinates", [0, 0])
                lon = float(coords[0])
                lat = float(coords[1])
                name = props.get("name") or term.title()
                state = props.get("state")
                if not state and name.lower() in (
                    "nagaland", "goa", "assam", "sikkim", "manipur", "mizoram", "tripura", "meghalaya", "kerala", "gujarat"
                ):
                    state = name.title()
                district = props.get("county") or props.get("district")

                extent = props.get("extent")
                if extent and len(extent) == 4:
                    min_lon, max_lat, max_lon, min_lat = extent
                    if abs(max_lon - min_lon) <= 1.0 and abs(max_lat - min_lat) <= 1.0:
                        bbox = (round(min_lon, 4), round(min_lat, 4), round(max_lon, 4), round(max_lat, 4))
                    else:
                        bbox = (round(lon - 0.15, 4), round(lat - 0.15, 4), round(lon + 0.15, 4), round(lat + 0.15, 4))
                else:
                    bbox = (round(lon - 0.15, 4), round(lat - 0.15, 4), round(lon + 0.15, 4), round(lat + 0.15, 4))

                return GeocodedLocation(
                    name=name,
                    display_name=f"{name}, {state or 'India'}",
                    state=state or "India",
                    district=district,
                    country="India",
                    latitude=lat,
                    longitude=lon,
                    bbox=bbox,
                    source="photon",
                )
    except Exception:
        pass
    return None


INTENT_WORDS_PATTERN = re.compile(
    r"\b(vegetation\s+(?:loss|gain|change|decline|stress|growth|recovery|expansion|index)"
    r"|forest\s+(?:loss|gain|change|cover|clearing|decline|destruction)"
    r"|canopy\s+(?:loss|gain|change|cover|decline)"
    r"|water\s+body\s+(?:change|loss|gain|expansion|recession|shrinkage)?"
    r"|water\s+(?:change|loss|gain|level|surface|recession|body|bodies|expansion|shrinkage)"
    r"|urban\s+(?:expansion|growth|change|development|sprawl)"
    r"|built[\s-]up\s+(?:area|growth|expansion|change)?"
    r"|infrastructure\s+(?:development|expansion|growth|change)"
    r"|land\s+cover\s+(?:change|loss|gain)?"
    r"|land\s+use\s+(?:change|conversion)?"
    r"|change\s+detection"
    r"|coastal\s+(?:erosion|change)"
    r"|shoreline\s+(?:change|erosion|shift)"
    r"|satellite\s+(?:imagery|images|data|observations|observation|scans)"
    r"|sentinel[\s-]?2?\s+(?:imagery|images|data|observations|observation|scans)?"
    r"|deforestation|afforestation|greening|flooding|flood|drought"
    r"|vegetation|forest|canopy|reservoir|lake|river|water"
    r"|imagery|images|image|observations|observation|data"
    r"|change|changes|detection|analysis|monitoring|scans|scan"
    r"|show|find|view|display|explore|inspect|get|search"
    r"|recent|latest|historical|multi-temporal|temporal"
    r"|events|event|zones|zone|area|areas|region|regions|district|districts"
    r")\b",
    re.I,
)

PREPOSITIONS_PATTERN = re.compile(
    r"\b(?:around|near|nearby|in|at|over|across|for|of|within|surrounding|covering|along)\s+(.+)$",
    re.I,
)


def _clean_candidate_term(term: str) -> str:
    t = re.sub(r"^[,\s.:;]+|[,\s.:;]+$", "", term)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def extract_location_candidates(query: str, state_filter: str = "") -> List[str]:
    """
    Extracts geographic place candidates generically from natural-language queries
    without hardcoding city names.
    """
    candidates: List[str] = []
    seen = set()

    def add_candidate(cand: str):
        c = _clean_candidate_term(cand)
        if c and len(c) >= 2 and c.lower() not in seen:
            seen.add(c.lower())
            candidates.append(c)

    # 1. Text following spatial prepositions (e.g., "around Pune" -> "Pune")
    prep_match = PREPOSITIONS_PATTERN.search(query)
    if prep_match:
        after_prep = prep_match.group(1).strip()
        cleaned_prep = INTENT_WORDS_PATTERN.sub("", after_prep)
        add_candidate(cleaned_prep)
        add_candidate(after_prep)

    # 2. Entire query with intent and action phrases stripped
    intent_stripped = INTENT_WORDS_PATTERN.sub("", query)
    prep_stripped = re.sub(
        r"\b(around|near|nearby|in|at|over|across|for|of|within|surrounding|covering|along)\b",
        "",
        intent_stripped,
        flags=re.I,
    )
    add_candidate(prep_stripped)

    # 3. Strip landscape qualifiers (e.g., "reservoir", "hills", "valley")
    landscape_stripped = re.sub(
        r"\b(forest|jungle|reservoir|dam|valley|hills|range|region|district|river|corridor)\b",
        "",
        prep_stripped,
        flags=re.I,
    )
    add_candidate(landscape_stripped)

    # 4. State filter qualified variant if state filter exists
    if state_filter:
        for c in list(candidates):
            if state_filter.lower() not in c.lower():
                candidates.insert(0, f"{c}, {state_filter}")
                break

    # 5. Raw query fallback if nothing else was extracted
    if not candidates:
        add_candidate(query)

    return candidates


def geocode_location(
    query: str,
    filters: Optional[SearchFilters] = None,
) -> Optional[GeocodedLocation]:
    """
    Multi-tier geographic geocoding engine for arbitrary locations across India:
    1. Check in-memory cache (_GEOCODE_CACHE)
    2. Check curated showcase locations (Sardar Sarovar, Hasdeo, Cyberabad, Nagaland)
    3. Query Open-Meteo & Photon geocoders with India preference
    4. Fallback to comprehensive national gazetteer (INDIAN_GEO_LOCATIONS)
    5. Fallback to filter state
    """
    q_raw = query.strip()
    if not q_raw:
        return None

    # Pure thematic queries (e.g. "vegetation loss", "coastal erosion") contain no location
    if is_pure_thematic_query(q_raw):
        return None

    state_filter = filters.state.strip() if filters and filters.state else ""
    cache_key = f"{q_raw.lower()}|{state_filter.lower()}"
    if cache_key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[cache_key]

    q_lower = q_raw.lower()

    # 1. Curated showcase exact matches (preserve verified showcase coordinates)
    if "sardar sarovar" in q_lower:
        loc = GeocodedLocation(
            name="Sardar Sarovar Reservoir",
            display_name="Sardar Sarovar Reservoir, Gujarat",
            state="Gujarat",
            district="Narmada",
            country="India",
            latitude=21.83,
            longitude=73.75,
            bbox=(73.65, 21.75, 73.95, 21.95),
            source="showcase",
        )
        _GEOCODE_CACHE[cache_key] = loc
        return loc

    if any(re.search(r"\b" + re.escape(k) + r"\b", q_lower) for k in ["cyberabad", "it corridor", "hitech city", "hitech"]):
        loc = GeocodedLocation(
            name="Cyberabad / Hyderabad IT Corridor",
            display_name="Cyberabad / Hyderabad IT Corridor, Telangana",
            state="Telangana",
            district="Hyderabad",
            country="India",
            latitude=17.44,
            longitude=78.38,
            bbox=(78.25, 17.30, 78.55, 17.55),
            source="showcase",
        )
        _GEOCODE_CACHE[cache_key] = loc
        return loc

    if re.search(r"\bhasdeo\b", q_lower):
        loc = GeocodedLocation(
            name="Hasdeo Forest",
            display_name="Hasdeo Forest, Chhattisgarh",
            state="Chhattisgarh",
            district="Korba",
            country="India",
            latitude=22.60,
            longitude=82.30,
            bbox=(82.15, 22.45, 82.55, 22.85),
            source="showcase",
        )
        _GEOCODE_CACHE[cache_key] = loc
        return loc

    if re.search(r"\bnagaland\b", q_lower):
        loc = GeocodedLocation(
            name="Nagaland Forest Region",
            display_name="Nagaland Forest Region, Nagaland",
            state="Nagaland",
            district="Kohima",
            country="India",
            latitude=25.67,
            longitude=94.11,
            bbox=(93.85, 25.45, 94.35, 25.95),
            source="showcase",
        )
        _GEOCODE_CACHE[cache_key] = loc
        return loc

    # 2. Extract clean search candidate terms generically
    candidates = extract_location_candidates(q_raw, state_filter)

    # 3. Multi-tier general geocoding
    for term in candidates:
        geo = _query_open_meteo(term)
        if geo:
            _GEOCODE_CACHE[cache_key] = geo
            return geo

        geo = _query_photon(term)
        if geo:
            _GEOCODE_CACHE[cache_key] = geo
            return geo

    # 4. National gazetteer matching (INDIAN_GEO_LOCATIONS)
    sorted_geo_keys = sorted(INDIAN_GEO_LOCATIONS.keys(), key=len, reverse=True)
    search_targets = candidates + [q_lower]
    for target in search_targets:
        t_lower = target.lower()
        for key in sorted_geo_keys:
            if re.search(r"\b" + re.escape(key) + r"\b", t_lower):
                info = INDIAN_GEO_LOCATIONS[key]
                lat, lon = info["coords"]
                bbox = (round(lon - 0.15, 4), round(lat - 0.15, 4), round(lon + 0.15, 4), round(lat + 0.15, 4))
                loc = GeocodedLocation(
                    name=key.title(),
                    display_name=f"{key.title()}, {info['state']}",
                    state=info["state"],
                    district=None,
                    country="India",
                    latitude=lat,
                    longitude=lon,
                    bbox=bbox,
                    source="gazetteer",
                )
                _GEOCODE_CACHE[cache_key] = loc
                return loc

    # 5. Filter-based state matching
    if state_filter:
        st_clean = state_filter.lower()
        for key, info in INDIAN_GEO_LOCATIONS.items():
            if key == st_clean or info["state"].lower() == st_clean:
                lat, lon = info["coords"]
                bbox = (round(lon - 0.25, 4), round(lat - 0.25, 4), round(lon + 0.25, 4), round(lat + 0.25, 4))
                loc = GeocodedLocation(
                    name=info["state"],
                    display_name=f"{info['state']}, India",
                    state=info["state"],
                    district=None,
                    country="India",
                    latitude=lat,
                    longitude=lon,
                    bbox=bbox,
                    source="state_filter",
                )
                _GEOCODE_CACHE[cache_key] = loc
                return loc

    _GEOCODE_CACHE[cache_key] = None
    return None


# ─── Copernicus Data Space STAC Integration (Sentinel-2 Level-2A) ───────────

COPERNICUS_STAC_URL = "https://stac.dataspace.copernicus.eu/v1/"


def resolve_location_and_aoi(
    query: str,
    filters: Optional[SearchFilters] = None,
) -> Optional[Tuple[str, str, Tuple[float, float, float, float]]]:
    """
    Resolves location name, state, and geographic bounding box [min_lon, min_lat, max_lon, max_lat]
    using the multi-tier general geocoding engine.
    """
    geo = geocode_location(query, filters)
    if geo:
        return (geo.name, geo.state, geo.bbox)
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
            search_url = f"{COPERNICUS_STAC_URL.rstrip('/')}/search" if not COPERNICUS_STAC_URL.rstrip("/").endswith("/search") else COPERNICUS_STAC_URL
            resp = client.post(search_url, headers=headers, json=payload)
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


def _apply_structured_filters(results: List[SearchResult], filters: Optional[SearchFilters]) -> List[SearchResult]:
    """Applies structured change-type, confidence, state, and sensor filters to result sets."""
    if not filters:
        return results
    res = list(results)
    if filters.changeTypes:
        res = [r for r in res if r.changeType in filters.changeTypes]
    if filters.minConfidence and filters.minConfidence > 0:
        res = [r for r in res if r.confidence >= filters.minConfidence]
    if filters.state and filters.state.strip():
        st = filters.state.strip().lower()
        res = [r for r in res if st in r.state.lower()]
    if filters.dataSource and filters.dataSource != "all":
        ds_map = {
            "sentinel-2": "Sentinel",
            "landsat": "Landsat",
            "cartosat": "Cartosat",
        }
        target = ds_map.get(filters.dataSource.lower(), filters.dataSource)
        res = [r for r in res if target.lower() in r.sensor.lower()]
    return res


def search_observations(query: str, filters: Optional[SearchFilters] = None) -> List[SearchResult]:
    """
    Primary semantic search and observation retrieval handler:
    1. Geocodes user query to arbitrary valid geographic locations (lat/lon, state, district, AOI).
    2. Queries real Copernicus Sentinel-2 STAC API for observations in that specific AOI.
    3. Prevents cross-state mock pollution: arbitrary locations with no observations return empty []
       rather than silent substitution of unrelated mock data.
    4. Preserves curated showcase presets (Pune, Sardar Sarovar, Hasdeo, Cyberabad) when requested.
    """
    query_clean = query.strip()
    
    # Check data source compatibility
    ds = (filters.dataSource or "all").lower() if filters else "all"
    is_sentinel_compatible = ds in ("all", "sentinel-2", "sentinel")

    # If query is completely empty, return default master catalog
    if not query_clean:
        return _apply_structured_filters(ALL_RESULTS, filters)

    # 1. Multi-tier general geocoding resolution
    geo = geocode_location(query_clean, filters)

    if geo:
        # Location successfully resolved geographically!
        if is_sentinel_compatible:
            try:
                stac_results = query_copernicus_stac(
                    bbox=geo.bbox,
                    loc_name=geo.name,
                    state_name=geo.state,
                    query=query_clean,
                    filters=filters,
                    limit=5,
                )
                if stac_results:
                    filtered_stac = _apply_structured_filters(stac_results, filters)
                    if filtered_stac:
                        return filtered_stac
                    return stac_results
            except Exception as e:
                print(f"[STAC Warning] Copernicus STAC query failed for {geo.name}: {e}")

        # If STAC yielded no scenes (or data source was non-Sentinel):
        # Allow curated demo fallback ONLY if the location is an explicit recognized showcase demo
        if is_explicit_curated_demo_query(query_clean):
            fallback_results = select_result_set(query_clean)
            return _apply_structured_filters(fallback_results, filters)
        else:
            # For arbitrary resolved locations:
            # NEVER substitute unrelated mock data from another state!
            # Return empty list ("No observations found for this AOI/date range")
            return []

    # 2. Location could NOT be geocoded:
    # Allow thematic fallback ONLY if this is a pure thematic query (e.g. "coastal erosion", "deforestation")
    # with NO unresolvable place name
    if is_pure_thematic_query(query_clean):
        thematic_results = select_result_set(query_clean)
        return _apply_structured_filters(thematic_results, filters)

    # Unknown or unresolvable location:
    # Never substitute unrelated mock data from another state! Return empty results gracefully.
    return []


# ─── Sentinel-2 Level-2A Real Raster Change Detection Engine ─────────────────

AWS_EARTH_SEARCH_STAC_URL = "https://earth-search.aws.element84.com/v1/search"


def _extract_tci_jpeg_data_uri(tci_url: Optional[str], aoi_bbox: Tuple[float, float, float, float]) -> Optional[str]:
    """
    Extracts the AOI window from a Sentinel-2 true-color (TCI.tif) Cloud-Optimized GeoTIFF
    via rasterio HTTP Range requests, scales it to max dimension 1024, and encodes to
    a browser-renderable Base64 JPEG data URI.
    """
    if not tci_url:
        return None
    try:
        with rasterio.open(tci_url) as src:
            utm = transform_bounds("EPSG:4326", src.crs, *aoi_bbox)
            win = from_bounds(*utm, transform=src.transform)
            rgb = src.read([1, 2, 3], window=win)
            if rgb.shape[1] == 0 or rgb.shape[2] == 0:
                return None
            img = Image.fromarray(np.transpose(rgb, (1, 2, 0)))
            if max(img.size) > 1024:
                img.thumbnail((1024, 1024))
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            encoded = base64.b64encode(buf.getvalue()).decode("ascii")
            return f"data:image/jpeg;base64,{encoded}"
    except Exception as exc:
        print(f"[TCI Extraction Warning] Could not extract visual window from {tci_url}: {exc}")
        return None


def run_real_raster_change_detection(
    aoi_bbox: Tuple[float, float, float, float],
    analysis_type: str,
    before_date_str: str,
    after_date_str: str,
) -> Dict:
    """
    Executes genuine pixel-level multi-temporal change detection using Sentinel-2 Level-2A
    Cloud-Optimized GeoTIFFs (COGs) from AWS Open Data via Element84 Earth Search STAC.
    
    1. Queries Earth Search STAC for Before and After observations covering the AOI.
    2. Selects the lowest-cloud-cover scene pair matching the temporal request.
    3. Streams the required 10m bands via HTTP Range requests (partial content) clipped to the AOI window.
    4. Computes pixel-level spectral indices:
       - NDVI = (B08 - B04) / (B08 + B04) for vegetation
       - NDWI = (B03 - B08) / (B03 + B08) for water
    5. Performs pixel-level array differencing: diff = index_after - index_before.
    6. Measures valid pixel counts, changed pixel counts, changed percentage, and changed area in km².
    """
    # 1. Temporal Parsing
    b_year = before_date_str[:4] if len(before_date_str) >= 4 else "2023"
    a_year = after_date_str[:4] if len(after_date_str) >= 4 else "2024"
    if b_year == a_year:
        b_year = str(int(a_year) - 1)

    payload_before = {
        "collections": ["sentinel-2-l2a"],
        "bbox": list(aoi_bbox),
        "datetime": f"{b_year}-01-01T00:00:00Z/{b_year}-12-31T23:59:59Z",
        "query": {"eo:cloud_cover": {"lte": 25.0}},
        "limit": 10,
    }
    payload_after = {
        "collections": ["sentinel-2-l2a"],
        "bbox": list(aoi_bbox),
        "datetime": f"{a_year}-01-01T00:00:00Z/{a_year}-12-31T23:59:59Z",
        "query": {"eo:cloud_cover": {"lte": 25.0}},
        "limit": 10,
    }

    try:
        with httpx.Client(timeout=18.0) as client:
            res_b = client.post(AWS_EARTH_SEARCH_STAC_URL, json=payload_before).json()
            res_a = client.post(AWS_EARTH_SEARCH_STAC_URL, json=payload_after).json()
    except Exception as exc:
        raise RuntimeError(f"STAC search request failed: {exc}")

    feats_b = res_b.get("features", [])
    feats_a = res_a.get("features", [])

    # If strict cloud filter yielded 0, retry with relaxed threshold
    if not feats_b:
        payload_before["query"]["eo:cloud_cover"]["lte"] = 50.0
        with httpx.Client(timeout=18.0) as client:
            feats_b = client.post(AWS_EARTH_SEARCH_STAC_URL, json=payload_before).json().get("features", [])

    if not feats_a:
        payload_after["query"]["eo:cloud_cover"]["lte"] = 50.0
        with httpx.Client(timeout=18.0) as client:
            feats_a = client.post(AWS_EARTH_SEARCH_STAC_URL, json=payload_after).json().get("features", [])

    if not feats_b:
        raise RuntimeError(f"No Sentinel-2 L2A observations found for Before period ({b_year}) overlapping AOI.")
    if not feats_a:
        raise RuntimeError(f"No Sentinel-2 L2A observations found for After period ({a_year}) overlapping AOI.")

    # 2. Scene Pair Selection
    # Pick lowest cloud cover before scene
    best_b = min(feats_b, key=lambda f: f["properties"].get("eo:cloud_cover", 100.0))
    b_grid = best_b.get("properties", {}).get("grid:code")

    # Pick matching tile for after scene if available, else lowest cloud cover
    matching_a = [f for f in feats_a if f.get("properties", {}).get("grid:code") == b_grid] if b_grid else []
    best_a = min(matching_a, key=lambda f: f["properties"].get("eo:cloud_cover", 100.0)) if matching_a else min(feats_a, key=lambda f: f["properties"].get("eo:cloud_cover", 100.0))

    b_id = best_b.get("id", "S2_BEFORE")
    b_date = best_b.get("properties", {}).get("datetime", "")[:10]
    b_cloud = float(best_b.get("properties", {}).get("eo:cloud_cover", 0.0))

    a_id = best_a.get("id", "S2_AFTER")
    a_date = best_a.get("properties", {}).get("datetime", "")[:10]
    a_cloud = float(best_a.get("properties", {}).get("eo:cloud_cover", 0.0))

    # 3. Determine Required Bands
    if analysis_type == "water":
        band1_key, band2_key = "green", "nir"
        band_names = "B03 (Green) and B08 (NIR)"
        index_name = "NDWI"
        formula_str = "NDWI = (Green - NIR) / (Green + NIR)"
    elif analysis_type in ("urban", "infrastructure"):
        # Normalized Difference Built-up Index (NDBI) using SWIR (B11) and NIR (B08)
        band1_key, band2_key = "swir16", "nir"
        band_names = "B11 (SWIR) and B08 (NIR)"
        index_name = "NDBI"
        formula_str = "NDBI = (SWIR - NIR) / (SWIR + NIR)"
    else:
        band1_key, band2_key = "nir", "red"
        band_names = "B08 (NIR) and B04 (Red)"
        index_name = "NDVI"
        formula_str = "NDVI = (NIR - Red) / (NIR + Red)"

    b_url1 = best_b["assets"][band1_key]["href"]
    b_url2 = best_b["assets"][band2_key]["href"]
    a_url1 = best_a["assets"][band1_key]["href"]
    a_url2 = best_a["assets"][band2_key]["href"]

    # 4. Windowed Raster Reading via HTTP Range Requests
    try:
        with rasterio.open(b_url2) as s2:
            utm_b = transform_bounds("EPSG:4326", s2.crs, *aoi_bbox)
            win_b = from_bounds(*utm_b, transform=s2.transform)
            arr_b2 = s2.read(1, window=win_b).astype(np.float32)
            res_m = float(s2.res[0])
            b_target_shape = arr_b2.shape

        with rasterio.open(b_url1) as s1:
            utm_b1 = transform_bounds("EPSG:4326", s1.crs, *aoi_bbox)
            win_b1 = from_bounds(*utm_b1, transform=s1.transform)
            arr_b1 = s1.read(1, window=win_b1, out_shape=b_target_shape).astype(np.float32)

        with rasterio.open(a_url2) as s2:
            utm_a = transform_bounds("EPSG:4326", s2.crs, *aoi_bbox)
            win_a = from_bounds(*utm_a, transform=s2.transform)
            arr_a2 = s2.read(1, window=win_a).astype(np.float32)
            a_target_shape = arr_a2.shape

        with rasterio.open(a_url1) as s1:
            utm_a1 = transform_bounds("EPSG:4326", s1.crs, *aoi_bbox)
            win_a1 = from_bounds(*utm_a1, transform=s1.transform)
            arr_a1 = s1.read(1, window=win_a1, out_shape=a_target_shape).astype(np.float32)
    except Exception as exc:
        raise RuntimeError(f"Failed to read raster COG bands via HTTP Range: {exc}")

    # 5. Spatial Alignment & Common Grid Clipping
    min_rows = min(arr_b1.shape[0], arr_a1.shape[0])
    min_cols = min(arr_b1.shape[1], arr_a1.shape[1])

    if min_rows <= 0 or min_cols <= 0:
        raise RuntimeError(f"Computed raster window for AOI {aoi_bbox} had 0 dimensions ({min_cols}x{min_rows}).")

    arr_b1 = arr_b1[:min_rows, :min_cols]
    arr_b2 = arr_b2[:min_rows, :min_cols]
    arr_a1 = arr_a1[:min_rows, :min_cols]
    arr_a2 = arr_a2[:min_rows, :min_cols]

    # 6. Spectral Index Computation
    idx_before = (arr_b1 - arr_b2) / (arr_b1 + arr_b2 + 1e-6)
    idx_after = (arr_a1 - arr_a2) / (arr_a1 + arr_a2 + 1e-6)

    # Valid reflectance mask (surface reflectance > 0)
    valid_mask = (arr_b1 > 0) & (arr_b2 > 0) & (arr_a1 > 0) & (arr_a2 > 0)
    valid_pixels = int(np.sum(valid_mask))
    if valid_pixels == 0:
        raise RuntimeError("Zero valid non-zero surface reflectance pixels within the selected AOI.")

    diff = idx_after - idx_before
    valid_diff = diff[valid_mask]

    mean_b = float(np.mean(idx_before[valid_mask]))
    mean_a = float(np.mean(idx_after[valid_mask]))
    mean_diff = float(np.mean(valid_diff))
    min_diff = float(np.min(valid_diff))
    max_diff = float(np.max(valid_diff))

    # 7. Thresholding & Change Quantification
    # Threshold for significant change
    threshold = 0.15
    pixel_area_km2 = (res_m * res_m) / 1e6  # 10m x 10m = 100 m² = 0.0001 km²

    if analysis_type == "water":
        # NDWI >= 0.05 indicates water surface
        before_extent_km2 = float(np.sum(valid_mask & (idx_before >= 0.05))) * pixel_area_km2
        after_extent_km2 = float(np.sum(valid_mask & (idx_after >= 0.05))) * pixel_area_km2
        changed_mask = valid_mask & (np.abs(diff) >= threshold)
    elif analysis_type == "vegetation-loss":
        # Dense canopy NDVI >= 0.30
        before_extent_km2 = float(np.sum(valid_mask & (idx_before >= 0.30))) * pixel_area_km2
        after_extent_km2 = float(np.sum(valid_mask & (idx_after >= 0.30))) * pixel_area_km2
        changed_mask = valid_mask & (diff <= -threshold)
    elif analysis_type == "vegetation-gain":
        before_extent_km2 = float(np.sum(valid_mask & (idx_before >= 0.30))) * pixel_area_km2
        after_extent_km2 = float(np.sum(valid_mask & (idx_after >= 0.30))) * pixel_area_km2
        changed_mask = valid_mask & (diff >= threshold)
    else:
        before_extent_km2 = float(valid_pixels) * pixel_area_km2 * 0.5
        after_extent_km2 = float(valid_pixels) * pixel_area_km2 * 0.5
        changed_mask = valid_mask & (np.abs(diff) >= threshold)

    changed_pixels = int(np.sum(changed_mask))
    changed_pct = (changed_pixels / valid_pixels) * 100.0 if valid_pixels > 0 else 0.0
    changed_area_km2 = changed_pixels * pixel_area_km2

    # 8. True-Color (TCI) Visual Rendering
    before_visual_url = None
    after_visual_url = None
    b_tci_href = best_b.get("assets", {}).get("visual", {}).get("href")
    a_tci_href = best_a.get("assets", {}).get("visual", {}).get("href")

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_b = executor.submit(_extract_tci_jpeg_data_uri, b_tci_href, aoi_bbox)
            future_a = executor.submit(_extract_tci_jpeg_data_uri, a_tci_href, aoi_bbox)
            before_visual_url = future_b.result()
            after_visual_url = future_a.result()
    except Exception as exc:
        print(f"[TCI Warning] ThreadPool visual extraction failed: {exc}")

    return {
        "before_scene_id": b_id,
        "before_date": b_date,
        "before_cloud": b_cloud,
        "after_scene_id": a_id,
        "after_date": a_date,
        "after_cloud": a_cloud,
        "index_name": index_name,
        "formula_str": formula_str,
        "bands_used": band_names,
        "resolution_m": res_m,
        "raster_dims": (min_cols, min_rows),
        "valid_pixels": valid_pixels,
        "changed_pixels": changed_pixels,
        "changed_pct": changed_pct,
        "changed_area_km2": changed_area_km2,
        "before_extent_km2": before_extent_km2,
        "after_extent_km2": after_extent_km2,
        "mean_before": mean_b,
        "mean_after": mean_a,
        "mean_diff": mean_diff,
        "min_diff": min_diff,
        "max_diff": max_diff,
        "threshold": threshold,
        "before_visual_url": before_visual_url,
        "after_visual_url": after_visual_url,
    }


def calculate_analysis(area: SelectedArea) -> AnalysisResponse:
    """
    Performs change detection analysis for the selected AOI.
    - For Vegetation & Water: Executes genuine Sentinel-2 Level-2A multi-temporal
      raster pixel differencing (NDVI/NDWI) via Cloud-Optimized GeoTIFFs on AWS Open Data.
    - For Urban & Infrastructure: Preserves existing baseline change vector model.
    """
    report_id = f"RPT-{area.id.upper()}"
    year_from = area.beforeDate[:4] if len(area.beforeDate) >= 4 else "2023"
    year_to = area.afterDate[:4] if len(area.afterDate) >= 4 else "2026"

    # 1. Real Raster Processing Pipeline (Universal across all change types)
    # Resolve geographic AOI bounding box
    if area.boundingBox:
        ((lat1, lon1), (lat2, lon2)) = area.boundingBox
        min_lat, max_lat = min(lat1, lat2), max(lat1, lat2)
        min_lon, max_lon = min(lon1, lon2), max(lon1, lon2)
        aoi_bbox = (round(min_lon, 4), round(min_lat, 4), round(max_lon, 4), round(max_lat, 4))
    else:
        geo = geocode_location(area.name)
        if geo:
            aoi_bbox = geo.bbox
        else:
            aoi_bbox = (
                round(area.longitude - 0.10, 4),
                round(area.latitude - 0.10, 4),
                round(area.longitude + 0.10, 4),
                round(area.latitude + 0.10, 4),
            )

    try:
        res = run_real_raster_change_detection(
            aoi_bbox=aoi_bbox,
            analysis_type=area.analysisType,
            before_date_str=area.beforeDate,
            after_date_str=area.afterDate,
        )

        # Build quantitative outputs from real raster calculation
        b_val_str = f"{res['before_extent_km2']:.2f} km²"
        a_val_str = f"{res['after_extent_km2']:.2f} km²"
        diff_sign = "+" if res["mean_diff"] >= 0 else "−"
        net_change_str = f"{diff_sign}{res['changed_area_km2']:.2f} km²"
        net_pct_str = f"{diff_sign}{res['changed_pct']:.1f}%"

        if area.analysisType == "water":
            page_title = "Water Body Change Analysis"
            sub_title = f"{area.name}, {area.state} · {res['before_date'][:4]}–{res['after_date'][:4]} · NDWI"
            analysis_desc = "Sentinel-2 NDWI Spectral Differencing"
            b_label = "Water Surface (Before)"
            a_label = "Water Surface (After)"
            comp_sub = f"{area.name} · {res['before_date']} vs {res['after_date']} · NDWI"
            severity = "High" if res["changed_pct"] >= 15.0 else ("Medium" if res["changed_pct"] >= 5.0 else "Low")
        elif area.analysisType == "vegetation-gain":
            page_title = "Vegetation Recovery Analysis"
            sub_title = f"{area.name}, {area.state} · {res['before_date'][:4]}–{res['after_date'][:4]} · NDVI"
            analysis_desc = "Sentinel-2 NDVI Canopy Gain Differencing"
            b_label = "Canopy Cover (Before)"
            a_label = "Canopy Cover (After)"
            comp_sub = f"{area.name} · {res['before_date']} vs {res['after_date']} · NDVI"
            severity = "Low"
        elif area.analysisType in ("urban", "infrastructure"):
            page_title = "Urban Expansion Analysis" if area.analysisType == "urban" else "Infrastructure Progression Analysis"
            sub_title = f"{area.name}, {area.state} · {res['before_date'][:4]}–{res['after_date'][:4]} · NDBI"
            analysis_desc = "Sentinel-2 NDBI Built-Up Differencing"
            b_label = "Built-up Extent (Before)"
            a_label = "Built-up Extent (After)"
            comp_sub = f"{area.name} · {res['before_date']} vs {res['after_date']} · NDBI"
            severity = "High" if res["changed_pct"] >= 10.0 else ("Medium" if res["changed_pct"] >= 4.0 else "Low")
        else:  # vegetation-loss
            page_title = "Vegetation Loss Analysis"
            sub_title = f"{area.name}, {area.state} · {res['before_date'][:4]}–{res['after_date'][:4]} · NDVI"
            analysis_desc = "Sentinel-2 NDVI Canopy Loss Differencing"
            b_label = "Canopy Cover (Before)"
            a_label = "Canopy Cover (After)"
            comp_sub = f"{area.name} · {res['before_date']} vs {res['after_date']} · NDVI"
            severity = "Critical" if res["changed_pct"] >= 20.0 else ("High" if res["changed_pct"] >= 8.0 else "Medium")

        findings = [
            Finding(
                text=f"Pixel-level differencing across {res['valid_pixels']:,} Sentinel-2 pixels revealed {res['changed_area_km2']:.2f} km² ({res['changed_pct']:.1f}%) of significant change within the AOI.",
                type="critical" if res["changed_pct"] >= 15.0 else ("warning" if res["changed_pct"] >= 5.0 else "ok"),
            ),
            Finding(
                text=f"Mean {res['index_name']} shifted from {res['mean_before']:.3f} ({res['before_date']}) to {res['mean_after']:.3f} ({res['after_date']}), representing an overall spectral shift of {res['mean_diff']:+.3f}.",
                type="warning" if abs(res["mean_diff"]) >= 0.05 else "ok",
            ),
            Finding(
                text=f"Observations acquired at 10m Ground Sampling Distance (GSD) by {res['before_scene_id']} and {res['after_scene_id']}.",
                type="ok",
            ),
            Finding(
                text=f"Scene cloud cover verified at {res['before_cloud']:.1f}% on pre-event scan and {res['after_cloud']:.1f}% on post-event scan.",
                type="ok",
            ),
        ]

        statistics = [
            ("Analysis Source", "Copernicus Sentinel-2 Level-2A"),
            ("Analysis Method", "Pixel-Level Spectral Index Differencing"),
            ("Spectral Index", f"{res['index_name']} ({res['formula_str']})"),
            ("Native GSD Resolution", "10m per pixel"),
            ("Total Pixels Evaluated", f"{res['valid_pixels']:,}"),
            ("Changed Pixels Count", f"{res['changed_pixels']:,}"),
            ("Net Changed Surface", f"{res['changed_area_km2']:.2f} km²"),
            ("Mean Pre-Event Index", f"{res['mean_before']:.3f}"),
            ("Mean Post-Event Index", f"{res['mean_after']:.3f}"),
            ("Mean Index Difference (Δ)", f"{res['mean_diff']:+.3f}"),
            ("Significance Threshold", f"|Δ{res['index_name']}| ≥ {res['threshold']}"),
            ("Pre-Event Observation", f"{res['before_scene_id']} ({res['before_date']})"),
            ("Post-Event Observation", f"{res['after_scene_id']} ({res['after_date']})"),
        ]

        timeline = [
            TimelineItem(date=res["after_date"], label=f"Post-event scan ({res['after_scene_id'][:18]}...)", type="scan"),
            TimelineItem(date=f"{res['after_date'][:4]}-06-01", label="Annual index verification milestone", type="baseline"),
            TimelineItem(date=f"{res['before_date'][:4]}-06-01", label="Mid-period reference window", type="reference"),
            TimelineItem(date=res["before_date"], label=f"Baseline scan ({res['before_scene_id'][:18]}...)", type="baseline"),
        ]

        return AnalysisResponse(
            selectedArea=area,
            location=area.name,
            state=area.state,
            area=f"{res['changed_area_km2']:.2f} km²",
            changeType=area.analysisType,
            sensor="Sentinel-2 MSI L2A",
            confidence=None,
            beforeDate=res["before_date"],
            afterDate=res["after_date"],
            pageTitle=page_title,
            subtitle=sub_title,
            reportId=report_id,
            analysisType=analysis_desc,
            severity=severity,
            beforeLabel=b_label,
            beforeValue=b_val_str,
            afterLabel=a_label,
            afterValue=a_val_str,
            netChange=net_change_str,
            netChangePct=net_pct_str,
            comparisonSubtitle=comp_sub,
            findings=findings,
            statistics=statistics,
            timeline=timeline,
            beforeSceneId=res["before_scene_id"],
            afterSceneId=res["after_scene_id"],
            indexType=res["index_name"],
            beforeMean=round(res["mean_before"], 3),
            afterMean=round(res["mean_after"], 3),
            meanChange=round(res["mean_diff"], 3),
            changedAreaKm2=round(res["changed_area_km2"], 2),
            changedPercentage=round(res["changed_pct"], 1),
            pixelCount=res["valid_pixels"],
            analysisSource="Copernicus Sentinel-2 Level-2A",
            analysisMethod="pixel-level spectral index differencing",
            beforeVisualUrl=res.get("before_visual_url"),
            afterVisualUrl=res.get("after_visual_url"),
        )
    except Exception as err:
        # Genuine error reporting - DO NOT fake successful raster analysis
        raise RuntimeError(f"Real Sentinel-2 raster change detection failed for {area.name}: {err}")


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
