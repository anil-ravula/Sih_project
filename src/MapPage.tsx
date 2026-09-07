import { useState, useCallback, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  Rectangle,
  useMap,
} from "react-leaflet";
import type { LatLngBounds, Map as LeafletMap } from "leaflet";
import L from "leaflet";
import { Button, Badge, InputField, SelectField } from "@figma/astraui";
import {
  Search,
  Activity,
  FileText,
  Layers,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Maximize,
  SlidersHorizontal,
  Info,
  X,
  Plus,
  Minus,
  Download,
  BarChart3,
  Globe,
  Crosshair,
  AlertTriangle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIA_CENTER: [number, number] = [22.5937, 80.9629];
const INDIA_ZOOM = 5;

const LOCATIONS: Record<string, { center: [number, number]; zoom: number; label: string }> = {
  pune: { center: [18.5204, 73.8567], zoom: 11, label: "Pune, Maharashtra" },
  hyderabad: { center: [17.385, 78.4867], zoom: 11, label: "Hyderabad, Telangana" },
  delhi: { center: [28.6139, 77.209], zoom: 11, label: "Delhi NCR" },
  gujarat: { center: [22.3511, 71.6745], zoom: 7, label: "Gujarat State" },
  chilika: { center: [19.72, 85.32], zoom: 10, label: "Chilika Lake, Odisha" },
  sundarbans: { center: [21.9497, 88.9218], zoom: 10, label: "Sundarbans Delta, WB" },
  "sardar sarovar": { center: [21.8302, 73.7476], zoom: 11, label: "Sardar Sarovar, Gujarat" },
  hasdeo: { center: [22.6, 82.3], zoom: 10, label: "Hasdeo Forest, Chhattisgarh" },
  yamuna: { center: [28.6, 77.1], zoom: 11, label: "Yamuna Floodplain, Delhi" },
};

const LOCATION_SUGGESTIONS = [
  "Pune, Maharashtra",
  "Hyderabad, Telangana",
  "Delhi NCR",
  "Gujarat State",
  "Chilika Lake, Odisha",
  "Sundarbans Delta, WB",
  "Sardar Sarovar, Gujarat",
  "Hasdeo Forest, Chhattisgarh",
  "Yamuna Floodplain, Delhi",
];

// Tile layer URLs — swap for real satellite APIs in production
const TILE_LAYERS = {
  "true-color": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, Maxar, Earthstar Geographics",
    label: "True Colour",
    basemap: "Esri/Maxar",
    analysis: null,
    filterStyle: "",
  },
  "false-color": {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri, Maxar",
    label: "False Colour (NIR-R-G)",
    basemap: "Esri/Maxar",
    analysis: "Sentinel-2 (Demo)",
    filterStyle: "hue-rotate(120deg) saturate(2.2)",
  },
  ndvi: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
    label: "NDVI",
    basemap: "Esri/Maxar",
    analysis: "Sentinel-2 B8/B4 (Demo)",
    filterStyle: "sepia(0.8) hue-rotate(80deg) saturate(3) brightness(1.1)",
  },
  ndwi: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
    label: "NDWI",
    basemap: "Esri/Maxar",
    analysis: "Sentinel-2 B3/B8 (Demo)",
    filterStyle: "hue-rotate(200deg) saturate(2.5) brightness(1.05)",
  },
  sar: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
    label: "SAR C-Band",
    basemap: "Esri/Maxar",
    analysis: "Sentinel-1 IW GRD (Demo)",
    filterStyle: "grayscale(1) contrast(1.5) brightness(0.9)",
  },
  thermal: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri",
    label: "Thermal (LST)",
    basemap: "Esri/Maxar",
    analysis: "Landsat-8 B10 (Demo)",
    filterStyle: "sepia(1) hue-rotate(330deg) saturate(2.5) brightness(0.95)",
  },
};

const MOCK_CHANGE_EVENTS = [
  {
    id: "CHG-001",
    bounds: [[21.8, 73.7], [21.86, 73.8]] as [[number, number], [number, number]],
    type: "Water Level Change",
    severity: "High",
    confidence: 94,
    area: "33.7 km²",
    location: "Sardar Sarovar Reservoir",
    color: "#3b82f6",
  },
  {
    id: "CHG-002",
    bounds: [[19.68, 85.28], [19.76, 85.36]] as [[number, number], [number, number]],
    type: "Vegetation Loss",
    severity: "Critical",
    confidence: 97,
    area: "8.2 km²",
    location: "Chilika Lake Buffer Zone",
    color: "#ef4444",
  },
  {
    id: "CHG-003",
    bounds: [[22.55, 82.25], [22.65, 82.35]] as [[number, number], [number, number]],
    type: "Vegetation Loss",
    severity: "Critical",
    confidence: 97,
    area: "14.1 km²",
    location: "Hasdeo Forest, CG",
    color: "#ef4444",
  },
  {
    id: "CHG-004",
    bounds: [[28.58, 77.06], [28.62, 77.14]] as [[number, number], [number, number]],
    type: "Urban Expansion",
    severity: "Medium",
    confidence: 88,
    area: "5.6 km²",
    location: "Yamuna Floodplain",
    color: "#f97316",
  },
];

type SpectralView = keyof typeof TILE_LAYERS;
type ComparisonMode = "none" | "side-by-side" | "swipe";

interface SelectedArea {
  bounds: LatLngBounds;
  center: [number, number];
  event?: (typeof MOCK_CHANGE_EVENTS)[0];
}

// ─── MapPage (main export) ────────────────────────────────────────────────────

export default function MapPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const [spectralView, setSpectralView] = useState<SpectralView>("true-color");
  const [dataSource, setDataSource] = useState("sentinel-2");
  const [beforeDate, setBeforeDate] = useState("2023-01-15");
  const [afterDate, setAfterDate] = useState("2026-09-06");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("none");
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);
  const [opacity, setOpacity] = useState(90);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const [coords, setCoords] = useState<[number, number]>(INDIA_CENTER);
  const [zoom, setZoom] = useState(INDIA_ZOOM);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [legendVisible, setLegendVisible] = useState(true);
  const [activeOverlays, setActiveOverlays] = useState({
    changeDetection: true,
    vegetation: false,
    waterBodies: false,
    urbanAreas: false,
  });
  const [swipePos, setSwipePos] = useState(50);
  const swipeDragging = useRef(false);

  const tileConfig = TILE_LAYERS[spectralView];

  const filteredSuggestions = LOCATION_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLocationSelect = (name: string) => {
    const key = Object.keys(LOCATIONS).find((k) =>
      name.toLowerCase().includes(k) || k.includes(name.toLowerCase().split(",")[0].trim())
    );
    if (key && LOCATIONS[key]) {
      const loc = LOCATIONS[key];
      setFlyTarget({ center: loc.center, zoom: loc.zoom });
      setSearchQuery(loc.label);
    }
    setShowSuggestions(false);
  };

  const toggleOverlay = (key: keyof typeof activeOverlays) =>
    setActiveOverlays((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex flex-col h-full bg-surface-dark">
      {/* Top search bar */}
      <MapSearchBar
        query={searchQuery}
        setQuery={setSearchQuery}
        suggestions={filteredSuggestions}
        showSuggestions={showSuggestions}
        setShowSuggestions={setShowSuggestions}
        onSelect={handleLocationSelect}
        spectralView={spectralView}
        tileLabel={tileConfig.label}
        comparisonMode={comparisonMode}
        setComparisonMode={setComparisonMode}
        onNavigate={onNavigate}
      />

      {/* Map workspace row */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left control panel */}
        <LeftControlPanel
          open={leftPanelOpen}
          setOpen={setLeftPanelOpen}
          spectralView={spectralView}
          setSpectralView={setSpectralView}
          dataSource={dataSource}
          setDataSource={setDataSource}
          beforeDate={beforeDate}
          setBeforeDate={setBeforeDate}
          afterDate={afterDate}
          setAfterDate={setAfterDate}
          opacity={opacity}
          setOpacity={setOpacity}
          activeOverlays={activeOverlays}
          toggleOverlay={toggleOverlay}
          comparisonMode={comparisonMode}
          setComparisonMode={setComparisonMode}
          onNavigate={onNavigate}
        />

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">
          {comparisonMode === "side-by-side" ? (
            <SideBySideMap
              tileConfig={tileConfig}
              beforeDate={beforeDate}
              afterDate={afterDate}
              flyTarget={flyTarget}
              onFlyComplete={() => setFlyTarget(null)}
            />
          ) : comparisonMode === "swipe" ? (
            <SwipeMap
              tileConfig={tileConfig}
              swipePos={swipePos}
              setSwipePos={setSwipePos}
              swipeDragging={swipeDragging}
              flyTarget={flyTarget}
              onFlyComplete={() => setFlyTarget(null)}
            />
          ) : (
            <MainMap
              tileConfig={tileConfig}
              opacity={opacity}
              flyTarget={flyTarget}
              onFlyComplete={() => setFlyTarget(null)}
              onCoordsChange={setCoords}
              onZoomChange={setZoom}
              onAreaSelect={setSelectedArea}
              changeEvents={activeOverlays.changeDetection ? MOCK_CHANGE_EVENTS : []}
            />
          )}

          {/* Map legend */}
          {legendVisible && comparisonMode === "none" && (
            <MapLegend
              visible={legendVisible}
              onToggle={() => setLegendVisible((v) => !v)}
              activeOverlays={activeOverlays}
            />
          )}

          {/* HUD: coordinates + zoom */}
          <MapHUD coords={coords} zoom={zoom} basemap={tileConfig.basemap} analysis={tileConfig.analysis} />

          {/* Zoom controls */}
          <MapZoomControls
            onZoomIn={() =>
              setFlyTarget({ center: coords, zoom: Math.min(zoom + 1, 18) })
            }
            onZoomOut={() =>
              setFlyTarget({ center: coords, zoom: Math.max(zoom - 1, 3) })
            }
            onReset={() => setFlyTarget({ center: INDIA_CENTER, zoom: INDIA_ZOOM })}
          />

          {/* Opacity HUD for single mode */}
          {comparisonMode === "none" && (
            <div className="absolute top-4 right-4 z-[500] flex items-center gap-md bg-surface-dark/90 backdrop-blur-sm rounded-corner-md px-md py-sm border border-border-secondary/40">
              <Eye size={12} className="text-text-tertiary" />
              <input
                type="range"
                min={20}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-20 accent-brand-primary"
                aria-label="Layer opacity"
              />
              <span className="text-video-title text-on-brand w-7 text-right">
                {opacity}%
              </span>
            </div>
          )}

          {/* Spectral view badge */}
          {comparisonMode === "none" && (
            <div className="absolute bottom-14 right-4 z-[500]">
              <span className="text-video-title font-medium bg-brand-primary text-on-brand rounded-corner-full px-md py-xs">
                {tileConfig.label}
              </span>
            </div>
          )}
        </div>

        {/* Selected area panel — right side */}
        {selectedArea && comparisonMode === "none" && (
          <SelectedAreaPanel
            area={selectedArea}
            onClose={() => setSelectedArea(null)}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
}

// ─── MapSearchBar ─────────────────────────────────────────────────────────────

function MapSearchBar({
  query,
  setQuery,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  onSelect,
  spectralView,
  tileLabel,
  comparisonMode,
  setComparisonMode,
  onNavigate,
}: {
  query: string;
  setQuery: (v: string) => void;
  suggestions: string[];
  showSuggestions: boolean;
  setShowSuggestions: (v: boolean) => void;
  onSelect: (v: string) => void;
  spectralView: SpectralView;
  tileLabel: string;
  comparisonMode: ComparisonMode;
  setComparisonMode: (m: ComparisonMode) => void;
  onNavigate: (p: string) => void;
}) {
  return (
    <div className="bg-surface-bg border-b border-border-secondary z-[600] flex items-center gap-md px-xl py-md relative">
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <div className="flex items-center gap-md bg-bg-faint border border-border-primary rounded-corner-md px-md py-sm">
          <Search size={14} className="text-text-tertiary flex-shrink-0" />
          <input
            className="flex-1 bg-transparent text-label-sm text-text-primary outline-none placeholder:text-text-tertiary"
            placeholder="Search location, district, state…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query) onSelect(query);
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-text-tertiary hover:text-text-secondary">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-xs bg-surface-bg border border-border-primary rounded-corner-md shadow-lg z-50 overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={() => onSelect(s)}
                className="w-full text-left px-md py-sm text-label-sm text-text-primary hover:bg-bg-hover transition-colors flex items-center gap-md"
              >
                <Globe size={12} className="text-text-tertiary flex-shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison mode toggle */}
      <div className="flex items-center gap-sm bg-bg-faint border border-border-primary rounded-corner-md p-xs">
        {(["none", "side-by-side", "swipe"] as ComparisonMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setComparisonMode(mode)}
            className={`px-md py-xs rounded-corner-md text-label-sm font-medium transition-colors ${
              comparisonMode === mode
                ? "bg-brand-primary text-on-brand"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {mode === "none" ? "Single View" : mode === "side-by-side" ? "Side-by-Side" : "Swipe"}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-md">
        <Button
          variant="neutral"
          size="small"
          iconStart={<Activity size={14} />}
          onClick={() => onNavigate("change-detection")}
        >
          Change Detection
        </Button>
        <Button
          variant="primary"
          size="small"
          iconStart={<FileText size={14} />}
          onClick={() => onNavigate("report")}
        >
          Generate Report
        </Button>
      </div>
    </div>
  );
}

// ─── LeftControlPanel ─────────────────────────────────────────────────────────

function LeftControlPanel({
  open,
  setOpen,
  spectralView,
  setSpectralView,
  dataSource,
  setDataSource,
  beforeDate,
  setBeforeDate,
  afterDate,
  setAfterDate,
  opacity,
  setOpacity,
  activeOverlays,
  toggleOverlay,
  comparisonMode,
  setComparisonMode,
  onNavigate,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  spectralView: SpectralView;
  setSpectralView: (v: SpectralView) => void;
  dataSource: string;
  setDataSource: (v: string) => void;
  beforeDate: string;
  setBeforeDate: (v: string) => void;
  afterDate: string;
  setAfterDate: (v: string) => void;
  opacity: number;
  setOpacity: (v: number) => void;
  activeOverlays: Record<string, boolean>;
  toggleOverlay: (k: any) => void;
  comparisonMode: ComparisonMode;
  setComparisonMode: (m: ComparisonMode) => void;
  onNavigate: (p: string) => void;
}) {
  const [sections, setSections] = useState({
    source: true,
    spectral: true,
    dates: true,
    layers: true,
  });

  const toggleSection = (k: keyof typeof sections) =>
    setSections((prev) => ({ ...prev, [k]: !prev[k] }));

  const spectralOptions: { id: SpectralView; label: string; sub: string }[] = [
    { id: "true-color", label: "True Colour", sub: "RGB composite" },
    { id: "false-color", label: "False Colour", sub: "NIR-R-G" },
    { id: "ndvi", label: "NDVI", sub: "Vegetation Index" },
    { id: "ndwi", label: "NDWI", sub: "Water Index" },
    { id: "sar", label: "SAR C-Band", sub: "Radar backscatter" },
    { id: "thermal", label: "Thermal (LST)", sub: "Land surface temp" },
  ];

  const overlayItems = [
    { key: "changeDetection", label: "Change Detection", color: "bg-danger" },
    { key: "vegetation", label: "Vegetation Zones", color: "bg-success" },
    { key: "waterBodies", label: "Water Bodies", color: "bg-blue-500" },
    { key: "urbanAreas", label: "Urban Areas", color: "bg-warning" },
  ] as const;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-[500] bg-surface-bg border border-border-secondary rounded-r-corner-md p-sm shadow-lg hover:bg-bg-hover transition-colors"
        aria-label="Open control panel"
      >
        <ChevronRight size={14} className="text-text-secondary" />
      </button>
    );
  }

  return (
    <div className="w-72 bg-surface-bg border-r border-border-secondary flex flex-col z-[500] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-xl py-md border-b border-border-secondary">
        <div>
          <h2 className="text-label text-text-primary font-semibold">Map Controls</h2>
          <p className="text-video-title text-text-tertiary mt-xs">Geospatial workspace</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-text-tertiary hover:text-text-secondary"
          aria-label="Collapse panel"
        >
          <ChevronRight size={14} className="rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* DATA SOURCE */}
        <PanelSection
          title="Data Source"
          open={sections.source}
          onToggle={() => toggleSection("source")}
        >
          <SelectField
            label=""
            options={[
              { value: "sentinel-2", label: "Sentinel-2 (ESA)" },
              { value: "sentinel-1", label: "Sentinel-1 SAR (ESA)" },
              { value: "landsat-8", label: "Landsat-8 OLI (USGS)" },
              { value: "cartosat-3", label: "Cartosat-3 (ISRO)" },
              { value: "risat-2b", label: "RISAT-2B (ISRO)" },
              { value: "resourcesat", label: "ResourceSat-2A (ISRO)" },
              { value: "bhuvan", label: "Bhuvan Portal (ISRO)" },
            ]}
            value={dataSource}
            onChange={setDataSource}
          />
          <div className="flex items-center gap-sm mt-md bg-bg-faint rounded-corner-md p-sm">
            <Info size={12} className="text-text-tertiary flex-shrink-0" />
            <p className="text-video-title text-text-tertiary">
              Live ingestion via STAC API — connect in production
            </p>
          </div>
        </PanelSection>

        {/* SPECTRAL VIEW */}
        <PanelSection
          title="Spectral View"
          open={sections.spectral}
          onToggle={() => toggleSection("spectral")}
        >
          <div className="flex flex-col gap-xs">
            {spectralOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSpectralView(opt.id)}
                className={`flex items-center gap-md p-md rounded-corner-md text-left transition-colors ${
                  spectralView === opt.id
                    ? "bg-brand-tertiary border border-brand-primary/30"
                    : "hover:bg-bg-hover border border-transparent"
                }`}
              >
                <div
                  className={`w-1 h-6 rounded-corner-full flex-shrink-0 ${
                    spectralView === opt.id ? "bg-brand-primary" : "bg-border-primary"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-label-sm font-medium ${
                      spectralView === opt.id ? "text-brand-primary" : "text-text-primary"
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-video-title text-text-tertiary">{opt.sub}</p>
                </div>
                {spectralView === opt.id && (
                  <CheckCircle size={12} className="text-brand-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </PanelSection>

        {/* DATES */}
        <PanelSection
          title="Date Range"
          open={sections.dates}
          onToggle={() => toggleSection("dates")}
        >
          <div className="flex flex-col gap-lg">
            <div>
              <label className="text-video-title text-text-tertiary block mb-xs">
                Before Date
              </label>
              <div className="flex items-center gap-md bg-bg-faint border border-border-primary rounded-corner-md px-md py-sm">
                <Calendar size={12} className="text-text-tertiary flex-shrink-0" />
                <input
                  type="date"
                  value={beforeDate}
                  onChange={(e) => setBeforeDate(e.target.value)}
                  className="flex-1 bg-transparent text-label-sm text-text-primary outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-video-title text-text-tertiary block mb-xs">
                After Date
              </label>
              <div className="flex items-center gap-md bg-bg-faint border border-border-primary rounded-corner-md px-md py-sm">
                <Calendar size={12} className="text-text-tertiary flex-shrink-0" />
                <input
                  type="date"
                  value={afterDate}
                  onChange={(e) => setAfterDate(e.target.value)}
                  className="flex-1 bg-transparent text-label-sm text-text-primary outline-none"
                />
              </div>
            </div>

            {/* Comparison shortcut */}
            <div className="border-t border-border-secondary pt-lg">
              <p className="text-video-title text-text-tertiary mb-md">Compare these dates:</p>
              <div className="flex gap-sm">
                {(["side-by-side", "swipe"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setComparisonMode(comparisonMode === m ? "none" : m)}
                    className={`flex-1 py-sm rounded-corner-md text-video-title font-medium transition-colors ${
                      comparisonMode === m
                        ? "bg-brand-primary text-on-brand"
                        : "bg-bg-faint border border-border-primary text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {m === "side-by-side" ? "Side-by-Side" : "Swipe"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </PanelSection>

        {/* LAYERS */}
        <PanelSection
          title="Overlay Layers"
          open={sections.layers}
          onToggle={() => toggleSection("layers")}
        >
          <div className="flex flex-col gap-sm">
            {overlayItems.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleOverlay(key)}
                className={`flex items-center gap-md p-md rounded-corner-md transition-colors ${
                  activeOverlays[key] ? "bg-bg-faint" : "hover:bg-bg-hover"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-xs flex-shrink-0 ${color} ${
                    activeOverlays[key] ? "opacity-100" : "opacity-30"
                  }`}
                />
                <span
                  className={`text-label-sm flex-1 text-left ${
                    activeOverlays[key] ? "text-text-primary font-medium" : "text-text-secondary"
                  }`}
                >
                  {label}
                </span>
                <div
                  className={`w-7 h-4 rounded-corner-full transition-colors relative ${
                    activeOverlays[key] ? "bg-brand-primary" : "bg-border-primary"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-surface-bg transition-all ${
                      activeOverlays[key] ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </PanelSection>

        {/* Satellite imagery opacity */}
        <PanelSection title="Satellite Imagery" open={true} onToggle={() => {}}>
          <div>
            <div className="flex justify-between mb-sm">
              <span className="text-video-title text-text-secondary">Layer Opacity</span>
              <span className="text-video-title text-text-primary font-medium">{opacity}%</span>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-brand-primary"
              aria-label="Layer opacity"
            />
          </div>
        </PanelSection>
      </div>

      {/* Footer actions */}
      <div className="p-xl border-t border-border-secondary flex flex-col gap-md">
        <Button
          variant="primary"
          iconStart={<Activity size={16} />}
          onClick={() => onNavigate("change-detection")}
        >
          Run Change Detection
        </Button>
        <Button
          variant="neutral"
          iconStart={<Download size={16} />}
        >
          Export AOI GeoJSON
        </Button>
      </div>
    </div>
  );
}

// ─── PanelSection ─────────────────────────────────────────────────────────────

function PanelSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border-secondary">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-xl py-md hover:bg-bg-hover transition-colors"
      >
        <span className="text-label-sm text-text-primary font-medium">{title}</span>
        <ChevronDown
          size={14}
          className={`text-text-tertiary transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="px-xl pb-xl pt-sm">{children}</div>}
    </div>
  );
}

// ─── MainMap ──────────────────────────────────────────────────────────────────

function MainMap({
  tileConfig,
  opacity,
  flyTarget,
  onFlyComplete,
  onCoordsChange,
  onZoomChange,
  onAreaSelect,
  changeEvents,
}: {
  tileConfig: (typeof TILE_LAYERS)[SpectralView];
  opacity: number;
  flyTarget: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
  onCoordsChange: (c: [number, number]) => void;
  onZoomChange: (z: number) => void;
  onAreaSelect: (a: SelectedArea | null) => void;
  changeEvents: typeof MOCK_CHANGE_EVENTS;
}) {
  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={INDIA_ZOOM}
      style={{ width: "100%", height: "100%" }}
      zoomControl={false}
      className="z-0"
    >
      <TileLayer
        url={tileConfig.url}
        attribution={tileConfig.attribution}
        maxZoom={19}
        opacity={opacity / 100}
        className={tileConfig.filterStyle ? "leaflet-tile-filter" : ""}
      />

      {/* Change event rectangles */}
      {changeEvents.map((ev) => (
        <Rectangle
          key={ev.id}
          bounds={ev.bounds}
          pathOptions={{
            color: ev.color,
            weight: 2,
            fillColor: ev.color,
            fillOpacity: 0.18,
            dashArray: "4 2",
          }}
          eventHandlers={{
            click: (e) => {
              const bounds = L.latLngBounds(
                L.latLng(ev.bounds[0][0], ev.bounds[0][1]),
                L.latLng(ev.bounds[1][0], ev.bounds[1][1])
              );
              const center = bounds.getCenter();
              onAreaSelect({
                bounds,
                center: [center.lat, center.lng],
                event: ev,
              });
            },
          }}
        />
      ))}

      <MapEventHandler
        onCoordsChange={onCoordsChange}
        onZoomChange={onZoomChange}
        onAreaClick={(center, bounds) =>
          onAreaSelect({ bounds, center })
        }
      />
      <FlyController target={flyTarget} onComplete={onFlyComplete} />
      <TileFilterStyle filterStyle={tileConfig.filterStyle} />
    </MapContainer>
  );
}

// ─── SideBySideMap ────────────────────────────────────────────────────────────

function SideBySideMap({
  tileConfig,
  beforeDate,
  afterDate,
  flyTarget,
  onFlyComplete,
}: {
  tileConfig: (typeof TILE_LAYERS)[SpectralView];
  beforeDate: string;
  afterDate: string;
  flyTarget: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
}) {
  return (
    <div className="flex h-full">
      {/* Before panel */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-surface-dark/90 text-on-brand rounded-corner-md px-md py-xs border border-border-secondary/30">
          <span className="text-video-title font-medium">BEFORE · {beforeDate}</span>
        </div>
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url={tileConfig.url}
            attribution=""
            maxZoom={19}
          />
          <FlyController target={flyTarget} onComplete={onFlyComplete} />
        </MapContainer>
      </div>

      {/* Divider */}
      <div className="w-0.5 bg-surface-bg z-[400] flex-shrink-0" />

      {/* After panel */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-brand-primary text-on-brand rounded-corner-md px-md py-xs">
          <span className="text-video-title font-medium">AFTER · {afterDate}</span>
        </div>
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution=""
            maxZoom={19}
            className="leaflet-tile-filter-after"
          />
          <FlyController target={flyTarget} onComplete={() => {}} />
        </MapContainer>
      </div>
    </div>
  );
}

// ─── SwipeMap ─────────────────────────────────────────────────────────────────

function SwipeMap({
  tileConfig,
  swipePos,
  setSwipePos,
  swipeDragging,
  flyTarget,
  onFlyComplete,
}: {
  tileConfig: (typeof TILE_LAYERS)[SpectralView];
  swipePos: number;
  setSwipePos: (v: number) => void;
  swipeDragging: React.MutableRefObject<boolean>;
  flyTarget: { center: [number, number]; zoom: number } | null;
  onFlyComplete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!swipeDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      setSwipePos(pct);
    },
    [setSwipePos, swipeDragging]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-col-resize select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={() => { swipeDragging.current = false; }}
    >
      {/* Base: After map (full width) */}
      <div className="absolute inset-0">
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          dragging={false}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
            attribution=""
          />
          <FlyController target={flyTarget} onComplete={() => {}} />
        </MapContainer>
      </div>

      {/* Clipped: Before map */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - swipePos}% 0 0)` }}
      >
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          dragging={false}
        >
          <TileLayer
            url={tileConfig.url}
            maxZoom={19}
            attribution=""
          />
          <FlyController target={flyTarget} onComplete={onFlyComplete} />
        </MapContainer>
      </div>

      {/* Swipe handle */}
      <div
        className="absolute top-0 bottom-0 z-[400] flex items-center justify-center"
        style={{ left: `${swipePos}%`, transform: "translateX(-50%)" }}
        onPointerDown={() => { swipeDragging.current = true; }}
      >
        <div className="w-0.5 h-full bg-surface-bg/80" />
        <div className="absolute w-10 h-10 bg-surface-bg rounded-full border-2 border-brand-primary flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing">
          <SlidersHorizontal size={16} className="text-brand-primary" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 z-[400]" style={{ left: `${swipePos / 2}%`, transform: "translateX(-50%)" }}>
        <div className="bg-surface-dark/90 text-on-brand rounded-corner-md px-md py-xs whitespace-nowrap">
          <span className="text-video-title font-medium">BEFORE</span>
        </div>
      </div>
      <div className="absolute top-3 z-[400]" style={{ left: `${swipePos + (100 - swipePos) / 2}%`, transform: "translateX(-50%)" }}>
        <div className="bg-brand-primary text-on-brand rounded-corner-md px-md py-xs whitespace-nowrap">
          <span className="text-video-title font-medium">AFTER</span>
        </div>
      </div>
    </div>
  );
}

// ─── MapEventHandler ──────────────────────────────────────────────────────────

function MapEventHandler({
  onCoordsChange,
  onZoomChange,
  onAreaClick,
}: {
  onCoordsChange: (c: [number, number]) => void;
  onZoomChange: (z: number) => void;
  onAreaClick: (center: [number, number], bounds: LatLngBounds) => void;
}) {
  useMapEvents({
    mousemove: (e) => onCoordsChange([e.latlng.lat, e.latlng.lng]),
    zoomend: (e) => onZoomChange(e.target.getZoom()),
    click: (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const delta = 0.05;
      const bounds = L.latLngBounds(
        L.latLng(lat - delta, lng - delta),
        L.latLng(lat + delta, lng + delta)
      );
      onAreaClick([lat, lng], bounds);
    },
  });
  return null;
}

// ─── FlyController ────────────────────────────────────────────────────────────

function FlyController({
  target,
  onComplete,
}: {
  target: { center: [number, number]; zoom: number } | null;
  onComplete: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target.center, target.zoom, { duration: 1.4 });
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [target]);
  return null;
}

// ─── TileFilterStyle ─────────────────────────────────────────────────────────

function TileFilterStyle({ filterStyle }: { filterStyle?: string }) {
  useEffect(() => {
    const styleId = "tile-filter-style";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = filterStyle
      ? `.leaflet-tile-filter .leaflet-tile { filter: ${filterStyle}; }`
      : "";
  }, [filterStyle]);
  return null;
}

// ─── MapHUD ───────────────────────────────────────────────────────────────────

function MapHUD({
  coords,
  zoom,
  basemap,
  analysis,
}: {
  coords: [number, number];
  zoom: number;
  basemap: string;
  analysis: string | null;
}) {
  return (
    <div className="absolute bottom-4 left-4 z-[500] flex items-center gap-md flex-wrap">
      <div className="bg-surface-dark/90 backdrop-blur-sm text-on-brand rounded-corner-md px-md py-sm flex items-center gap-md border border-border-secondary/30">
        <Crosshair size={11} className="text-text-tertiary" />
        <span className="text-video-title font-medium">
          {coords[0].toFixed(4)}° N &nbsp; {coords[1].toFixed(4)}° E
        </span>
        <span className="text-border-secondary">|</span>
        <span className="text-video-title text-text-tertiary">Z{zoom}</span>
        <span className="text-border-secondary">|</span>
        <span className="text-video-title text-text-tertiary">Basemap: {basemap}</span>
        {analysis && (
          <>
            <span className="text-border-secondary">|</span>
            <span className="text-video-title text-text-tertiary">Analysis: {analysis}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MapZoomControls ──────────────────────────────────────────────────────────

function MapZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-4 bottom-16 z-[500] flex flex-col gap-sm">
      <button
        onClick={onZoomIn}
        className="w-8 h-8 bg-surface-dark/90 backdrop-blur-sm text-on-brand rounded-corner-md flex items-center justify-center hover:bg-surface-dark transition-colors border border-border-secondary/30"
        aria-label="Zoom in"
      >
        <Plus size={14} />
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 bg-surface-dark/90 backdrop-blur-sm text-on-brand rounded-corner-md flex items-center justify-center hover:bg-surface-dark transition-colors border border-border-secondary/30"
        aria-label="Zoom out"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={onReset}
        className="w-8 h-8 bg-surface-dark/90 backdrop-blur-sm text-on-brand rounded-corner-md flex items-center justify-center hover:bg-surface-dark transition-colors border border-border-secondary/30 mt-sm"
        aria-label="Reset to India view"
      >
        <Globe size={13} />
      </button>
    </div>
  );
}

// ─── MapLegend ────────────────────────────────────────────────────────────────

function MapLegend({
  visible,
  onToggle,
  activeOverlays,
}: {
  visible: boolean;
  onToggle: () => void;
  activeOverlays: Record<string, boolean>;
}) {
  const legendItems = [
    { color: "bg-success", label: "Vegetation Increase", key: "vegetation" },
    { color: "bg-danger", label: "Vegetation Loss", key: "changeDetection" },
    { color: "bg-blue-500", label: "Water Change", key: "waterBodies" },
    { color: "bg-warning", label: "Urban Expansion", key: "urbanAreas" },
    { color: "bg-brand-primary", label: "Change Detection AOI", key: "changeDetection" },
  ];

  return (
    <div className="absolute left-4 bottom-4 z-[500]">
      <div className="bg-surface-dark/90 backdrop-blur-sm rounded-corner-lg border border-border-secondary/30 overflow-hidden">
        <button
          onClick={onToggle}
          className="flex items-center gap-md px-md py-sm w-full hover:bg-surface-dark/60 transition-colors"
        >
          <Layers size={12} className="text-text-tertiary" />
          <span className="text-video-title text-on-brand font-medium">Legend</span>
          <ChevronDown size={12} className={`text-text-tertiary ml-auto ${visible ? "" : "rotate-180"}`} />
        </button>
        {visible && (
          <div className="px-md pb-md flex flex-col gap-xs border-t border-border-secondary/20 pt-sm">
            {legendItems.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-sm">
                <div className={`w-2.5 h-2.5 rounded-xs flex-shrink-0 ${color} opacity-80`} />
                <span className="text-video-title text-on-brand/80">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SelectedAreaPanel ────────────────────────────────────────────────────────

function SelectedAreaPanel({
  area,
  onClose,
  onNavigate,
}: {
  area: SelectedArea;
  onClose: () => void;
  onNavigate: (p: string) => void;
}) {
  const ev = area.event;

  return (
    <div className="w-72 bg-surface-bg border-l border-border-secondary flex flex-col z-[500] relative overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-xl py-md border-b border-border-secondary flex-shrink-0">
        <h3 className="text-label text-text-primary font-semibold">
          {ev ? "Change Event" : "Selected Area"}
        </h3>
        <button onClick={onClose} className="text-text-tertiary hover:text-text-secondary">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 p-xl flex flex-col gap-xl">
        {/* Location / coordinates */}
        <div className="bg-bg-faint rounded-corner-md p-lg flex flex-col gap-sm">
          <div className="flex items-center gap-sm mb-xs">
            <Globe size={12} className="text-text-tertiary" />
            <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide">
              Location
            </span>
          </div>
          <p className="text-label-sm text-text-primary font-medium">
            {ev?.location ?? "Custom Selection"}
          </p>
          <p className="text-video-title text-text-tertiary">
            {area.center[0].toFixed(4)}° N, {area.center[1].toFixed(4)}° E
          </p>
          {ev && (
            <div className="mt-xs">
              <Badge label={ev.type} />
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-sm">
          <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide">
            Analysis Window
          </span>
          <div className="flex gap-md">
            <div className="flex-1 bg-bg-faint rounded-corner-md p-md">
              <p className="text-video-title text-text-tertiary">Before</p>
              <p className="text-label-sm text-text-primary font-medium">2023-01-01</p>
            </div>
            <div className="flex-1 bg-bg-faint rounded-corner-md p-md">
              <p className="text-video-title text-text-tertiary">After</p>
              <p className="text-label-sm text-text-primary font-medium">2026-09-06</p>
            </div>
          </div>
        </div>

        {/* Detected changes */}
        {ev && (
          <div className="flex flex-col gap-md">
            <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide">
              Detected Changes
            </span>
            <div className="flex flex-col gap-sm">
              {[
                { label: ev.type, active: true, icon: AlertTriangle },
                { label: "Urban Expansion", active: false, icon: BarChart3 },
                { label: "Water Level Change", active: ev.type === "Water Level Change", icon: Globe },
              ].map(({ label, active, icon: Icon }) => (
                <div
                  key={label}
                  className={`flex items-center gap-md p-md rounded-corner-md ${
                    active ? "bg-danger/10 border border-danger/20" : "bg-bg-faint"
                  }`}
                >
                  <Icon
                    size={12}
                    className={active ? "text-danger" : "text-text-tertiary"}
                  />
                  <span
                    className={`text-label-sm ${active ? "text-danger font-medium" : "text-text-tertiary"}`}
                  >
                    {label}
                  </span>
                  {active && (
                    <CheckCircle size={12} className="ml-auto text-danger" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        {ev && (
          <div className="grid grid-cols-2 gap-md">
            <div className="bg-bg-faint rounded-corner-md p-md">
              <p className="text-video-title text-text-tertiary">Confidence</p>
              <p className="text-heading text-text-primary font-semibold">{ev.confidence}%</p>
              <div className="mt-sm h-1 bg-bg-subtle rounded-corner-full">
                <div
                  className="h-full bg-brand-primary rounded-corner-full"
                  style={{ width: `${ev.confidence}%` }}
                />
              </div>
            </div>
            <div className="bg-bg-faint rounded-corner-md p-md">
              <p className="text-video-title text-text-tertiary">Affected</p>
              <p className="text-heading text-text-primary font-semibold">{ev.area}</p>
            </div>
          </div>
        )}

        {/* Area bounds */}
        <div className="bg-bg-faint rounded-corner-md p-lg flex flex-col gap-sm">
          <span className="text-video-title text-text-tertiary font-medium uppercase tracking-wide">
            Bounding Box
          </span>
          {[
            ["N", `${area.bounds.getNorth().toFixed(4)}°`],
            ["S", `${area.bounds.getSouth().toFixed(4)}°`],
            ["E", `${area.bounds.getEast().toFixed(4)}°`],
            ["W", `${area.bounds.getWest().toFixed(4)}°`],
            ["Area", `~${((area.bounds.getNorth() - area.bounds.getSouth()) * 111 * (area.bounds.getEast() - area.bounds.getWest()) * 111 * Math.cos((area.center[0] * Math.PI) / 180)).toFixed(1)} km²`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-video-title text-text-tertiary">{k}</span>
              <span className="text-video-title text-text-primary font-medium">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-xl border-t border-border-secondary flex flex-col gap-md flex-shrink-0">
        <Button
          variant="primary"
          iconStart={<Activity size={16} />}
          onClick={() => onNavigate("change-detection")}
        >
          Analyse This Area
        </Button>
        <Button
          variant="neutral"
          iconStart={<FileText size={16} />}
          onClick={() => onNavigate("report")}
        >
          Generate Report
        </Button>
        <Button variant="subtle" iconStart={<Download size={16} />}>
          Export GeoJSON
        </Button>
      </div>
    </div>
  );
}
