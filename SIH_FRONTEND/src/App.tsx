import { useState, useEffect, useCallback } from "react"
import { MapContainer, TileLayer, Rectangle, ImageOverlay, useMap } from "react-leaflet"
import MapPageComponent from "./MapPage"
import SemanticSearchPage from "./SearchPage"
import type { SelectedArea, AnalysisResponse } from "./types"
import { getAnalysis } from "./services/analysisService"
import { exportAreaToGeoJSON } from "./services/exportService"
import { DEMO_SELECTED_AREA, getMockAnalysis } from "./data/mockAnalysisData"
import {
  SidebarNavigation,
  SidebarButton,
  Avatar,
  Button,
  IconButton,
  Badge,
  InputField,
  SelectField,
  TextareaField,
  Tabs,
  Tooltip,
} from "@figma/astraui"
import {
  Home,
  Globe,
  Search,
  Activity,
  FileText,
  Settings,
  Download,
  RefreshCw,
  Filter,
  Layers,
  Eye,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ArrowRight,
  ChevronRight,
  SlidersHorizontal,
  Image,
  ZoomIn,
  Info,
  Tag,
  X,
  Plus,
  ChevronDown,
  Maximize,
  Camera,
} from "lucide-react"

type Page = "dashboard" | "map" | "search" | "search-result" | "change-detection" | "comparison" | "report"

const STAT_CARDS = [
  {
    label: "Total AOIs Monitored",
    value: "1,247",
    delta: "+34 this week",
    positive: true,
    icon: Globe,
  },
  {
    label: "Change Events Detected",
    value: "89",
    delta: "+12 since last scan",
    positive: false,
    icon: Activity,
  },
  {
    label: "Scenes Indexed",
    value: "48,392",
    delta: "Updated 2h ago",
    positive: true,
    icon: Image,
  },
  {
    label: "Reports Generated",
    value: "312",
    delta: "+5 today",
    positive: true,
    icon: FileText,
  },
]

const RECENT_EVENTS = [
  {
    id: "EVT-2847",
    region: "Sardar Sarovar Reservoir, Gujarat",
    type: "Water Level Change",
    severity: "High",
    date: "2026-09-06",
    confidence: "94%",
  },
  {
    id: "EVT-2846",
    region: "Hasdeo Forest, Chhattisgarh",
    type: "Vegetation Loss",
    severity: "Critical",
    date: "2026-09-05",
    confidence: "97%",
  },
  {
    id: "EVT-2845",
    region: "Yamuna Floodplain, Delhi-NCR",
    type: "Urban Encroachment",
    severity: "Medium",
    date: "2026-09-04",
    confidence: "88%",
  },
  {
    id: "EVT-2844",
    region: "Chilika Lake, Odisha",
    type: "Sediment Deposition",
    severity: "Low",
    date: "2026-09-03",
    confidence: "91%",
  },
  {
    id: "EVT-2843",
    region: "Sundarbans Delta, WB",
    type: "Shoreline Shift",
    severity: "High",
    date: "2026-09-02",
    confidence: "96%",
  },
]

const SEARCH_RESULTS = [
  {
    id: "S2-2026090601",
    title: "Sentinel-2 L2A — Sardar Sarovar",
    date: "2026-09-06 07:14 UTC",
    cloud: "3%",
    resolution: "10m",
    bands: "MSI 13-band",
    sensor: "Sentinel-2B",
    size: "847 MB",
    thumbnail:
      "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=320&h=200&fit=crop&auto=format",
  },
  {
    id: "S2-2026090502",
    title: "Sentinel-2 L2A — Hasdeo Forest",
    date: "2026-09-05 06:58 UTC",
    cloud: "7%",
    resolution: "10m",
    bands: "MSI 13-band",
    sensor: "Sentinel-2A",
    size: "912 MB",
    thumbnail:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=320&h=200&fit=crop&auto=format",
  },
  {
    id: "RS2-2026090303",
    title: "RISAT-2B SAR — Yamuna Floodplain",
    date: "2026-09-03 02:31 UTC",
    cloud: "N/A",
    resolution: "1m",
    bands: "SAR C-band",
    sensor: "RISAT-2B",
    size: "1.2 GB",
    thumbnail:
      "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=320&h=200&fit=crop&auto=format",
  },
  {
    id: "CAR-2026090204",
    title: "Cartosat-3 PAN — Delhi-NCR Urban",
    date: "2026-09-02 05:47 UTC",
    cloud: "1%",
    resolution: "0.25m",
    bands: "PAN",
    sensor: "Cartosat-3",
    size: "2.4 GB",
    thumbnail:
      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=320&h=200&fit=crop&auto=format",
  },
  {
    id: "S1-2026090105",
    title: "Sentinel-1 GRD — Chilika Lake",
    date: "2026-09-01 01:22 UTC",
    cloud: "N/A",
    resolution: "10m",
    bands: "SAR C-band IW",
    sensor: "Sentinel-1A",
    size: "776 MB",
    thumbnail:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=320&h=200&fit=crop&auto=format",
  },
  {
    id: "L8-2026083106",
    title: "Landsat-8 OLI — Sundarbans Delta",
    date: "2026-08-31 04:15 UTC",
    cloud: "11%",
    resolution: "30m",
    bands: "OLI 11-band",
    sensor: "Landsat-8",
    size: "524 MB",
    thumbnail:
      "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=320&h=200&fit=crop&auto=format",
  },
]

export interface ChangeEventItem {
  id: string
  label: string
  category: string
  date: string
  severity: string
  confidence?: number
}

function deriveChangeEvents(analysis: AnalysisResponse): ChangeEventItem[] {
  const category =
    analysis.changeType === "water"
      ? "Water Body"
      : analysis.changeType.startsWith("vegetation")
        ? "Vegetation"
        : analysis.changeType === "urban"
          ? "Built-up"
          : "Infrastructure"

  const changedAreaText =
    analysis.changedAreaKm2 !== undefined
      ? `${analysis.changedAreaKm2.toFixed(2)} km²`
      : analysis.area

  const changedPctText =
    analysis.changedPercentage !== undefined
      ? `${analysis.changedPercentage.toFixed(1)}%`
      : analysis.netChangePct

  const indexName = analysis.indexType || "Index"
  const shiftText =
    analysis.meanChange !== undefined
      ? ` · Δ${indexName}: ${analysis.meanChange >= 0 ? "+" : ""}${analysis.meanChange.toFixed(3)}`
      : ""

  return [
    {
      id: analysis.afterSceneId
        ? `EVT-${analysis.afterSceneId.slice(0, 16)}`
        : `EVT-001`,
      label: `${analysis.pageTitle}: ${changedAreaText} (${changedPctText}) surface change detected across ${analysis.location}${shiftText} (${analysis.beforeDate} → ${analysis.afterDate})`,
      category,
      date: analysis.afterDate,
      severity: analysis.severity,
    },
  ]
}

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    Critical: "bg-danger text-on-brand",
    High: "bg-warning text-on-brand",
    Medium: "bg-brand-secondary text-text-primary",
    Low: "bg-bg-subtle text-text-secondary",
  }
  return map[sev] ?? "bg-bg-subtle text-text-secondary"
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [comparisonPos, setComparisonPos] = useState(50)
  const [reportNotes, setReportNotes] = useState(
    "Water level at Sardar Sarovar reservoir multi-temporal analysis based on Sentinel-2 Level-2A surface reflectance imagery with NDWI spectral differencing.",
  )
  const [showToast, setShowToast] = useState(false)
  const [selectedArea, setSelectedArea] =
    useState<SelectedArea>(DEMO_SELECTED_AREA)

  const handleSearchNavigate = (p: string, area?: SelectedArea) => {
    if (area) {
      setSelectedArea(area)
      setReportNotes(
        `Analysis of ${area.name}, ${area.state}. Change type: ${area.changeDescription}. Period: ${area.beforeDate} → ${area.afterDate}. Sensor: ${area.sensor}. ${area.explanation}`,
      )
    }
    setPage(p as Page)
  }

  const [analysisData, setAnalysisData] = useState<AnalysisResponse>(() =>
    getMockAnalysis(DEMO_SELECTED_AREA),
  )
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const executeAnalysis = useCallback((area: SelectedArea) => {
    setIsAnalysisLoading(true)
    setAnalysisError(null)
    getAnalysis(area)
      .then((data) => {
        setAnalysisData(data)
        setIsAnalysisLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load real raster analysis:", err)
        setAnalysisError(
          err.message || "Failed to complete Sentinel-2 raster analysis",
        )
        setIsAnalysisLoading(false)
      })
  }, [])

  useEffect(() => {
    executeAnalysis(selectedArea)
  }, [selectedArea, executeAnalysis])

  const sidebarNav = (
    <SidebarNavigation
      footer={
        <>
          <SidebarButton
            icon={<Settings className="size-full" strokeWidth={1.5} />}
          />
          <Avatar type="initial" initials="AR" size="medium" shape="circle" />
        </>
      }
    >
      <Tooltip content="Dashboard" position="right">
        <SidebarButton
          icon={<Home className="size-full" strokeWidth={1.5} />}
          active={page === "dashboard"}
          onClick={() => setPage("dashboard")}
        />
      </Tooltip>
      <Tooltip content="Map Explorer" position="right">
        <SidebarButton
          icon={<Globe className="size-full" strokeWidth={1.5} />}
          active={page === "map"}
          onClick={() => setPage("map")}
        />
      </Tooltip>
      <Tooltip content="Semantic Search" position="right">
        <SidebarButton
          icon={<Search className="size-full" strokeWidth={1.5} />}
          active={page === "search" || page === "search-result"}
          onClick={() => setPage("search")}
        />
      </Tooltip>
      <Tooltip content="Change Detection" position="right">
        <SidebarButton
          icon={<Activity className="size-full" strokeWidth={1.5} />}
          active={page === "change-detection" || page === "comparison"}
          onClick={() => setPage("change-detection")}
        />
      </Tooltip>
      <Tooltip content="Reports" position="right">
        <SidebarButton
          icon={<FileText className="size-full" strokeWidth={1.5} />}
          active={page === "report"}
          onClick={() => setPage("report")}
        />
      </Tooltip>
    </SidebarNavigation>
  )

  return (
    <div className="flex h-screen bg-brand-tertiary overflow-hidden">
      {sidebarNav}

      <main
        className={`flex-1 ${
          page === "map" || page === "search" || page === "search-result"
            ? "overflow-hidden"
            : "overflow-y-auto"
        }`}
      >
        {page === "dashboard" && <DashboardPage onNavigate={setPage} />}
        {page === "map" && (
          <MapPageComponent
            onNavigate={handleSearchNavigate}
            activeArea={selectedArea}
          />
        )}
        {(page === "search" || page === "search-result") && (
          <SemanticSearchPage
            onNavigate={handleSearchNavigate}
            onSelectArea={setSelectedArea}
          />
        )}
        {page === "change-detection" && (
          <ChangeDetectionPage
            selectedArea={selectedArea}
            events={deriveChangeEvents(analysisData)}
            analysisData={analysisData}
            isLoading={isAnalysisLoading}
            error={analysisError}
            onRerun={() => executeAnalysis(selectedArea)}
            onCompare={() => setPage("comparison")}
            onReport={() => setPage("report")}
            onNavigate={setPage}
          />
        )}
        {page === "comparison" && (
          <ComparisonPage
            selectedArea={selectedArea}
            sliderPos={comparisonPos}
            setSliderPos={setComparisonPos}
            analysisData={analysisData}
            isLoading={isAnalysisLoading}
            error={analysisError}
            onRerun={() => executeAnalysis(selectedArea)}
            onBack={() => setPage("change-detection")}
            onReport={() => setPage("report")}
          />
        )}
        {page === "report" && (
          <ReportPage
            notes={reportNotes}
            setNotes={setReportNotes}
            showToast={showToast}
            setShowToast={setShowToast}
            analysisData={analysisData}
            onBack={() => setPage("change-detection")}
          />
        )}
      </main>
    </div>
  )
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */

function DashboardPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const [stats, setStats] = useState(STAT_CARDS)
  const [recentEvents, setRecentEvents] = useState(RECENT_EVENTS)
  const [isSyncing, setIsSyncing] = useState(false)

  const fetchDashboard = useCallback(() => {
    setIsSyncing(true)
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Dashboard API returned " + res.status)
        return res.json()
      })
      .then((data) => {
        if (data.stats && Array.isArray(data.stats)) {
          setStats((prev) =>
            prev.map((card, idx) => {
              const incoming = data.stats[idx]
              if (!incoming) return card
              return {
                ...card,
                value: incoming.value,
                delta: incoming.delta,
                positive: incoming.positive,
              }
            }),
          )
        }
        if (data.recentEvents && Array.isArray(data.recentEvents)) {
          setRecentEvents(data.recentEvents)
        }
        setIsSyncing(false)
      })
      .catch((err) => {
        console.warn("Could not sync live dashboard, keeping defaults:", err)
        setIsSyncing(false)
      })
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div className="p-2xl flex flex-col gap-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title text-text-primary">ISRO SatWatch</h1>
          <p className="text-label-sm text-text-secondary mt-xs">
            Geospatial Intelligence Platform · Smart India Hackathon 2026
          </p>
        </div>
        <div className="flex items-center gap-md">
          <Badge label="Live" variant="success" />
          <Button
            variant="neutral"
            size="small"
            iconStart={
              <RefreshCw
                size={14}
                className={isSyncing ? "animate-spin" : ""}
              />
            }
            onClick={fetchDashboard}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-xl">
        {stats.map(({ label, value, delta, positive, icon: Icon }) => (
          <div
            key={label}
            className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-text-secondary">{label}</span>
              <Icon
                size={16}
                className="text-text-tertiary"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <span className="text-title text-text-primary font-semibold">
                {value}
              </span>
              <p
                className={`text-video-title mt-xs ${
                  positive ? "text-success" : "text-danger"
                }`}
              >
                {delta}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent events + Quick actions */}
      <div className="flex gap-xl">
        {/* Recent change events table */}
        <div className="flex-1 bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
          <div className="flex items-center justify-between mb-lg">
            <h2 className="text-label text-text-primary font-semibold">
              Recent Change Events
            </h2>
            <Button
              variant="subtle"
              size="small"
              iconEnd={<ArrowRight size={14} />}
              onClick={() => onNavigate("change-detection")}
            >
              View all
            </Button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-secondary">
                <th className="text-left text-video-title text-text-tertiary pb-md font-medium">
                  ID
                </th>
                <th className="text-left text-video-title text-text-tertiary pb-md font-medium">
                  Region
                </th>
                <th className="text-left text-video-title text-text-tertiary pb-md font-medium">
                  Type
                </th>
                <th className="text-left text-video-title text-text-tertiary pb-md font-medium">
                  Severity
                </th>
                <th className="text-left text-video-title text-text-tertiary pb-md font-medium">
                  Confidence
                </th>
                <th className="text-left text-video-title text-text-tertiary pb-md font-medium">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-border-secondary last:border-0 hover:bg-bg-hover cursor-pointer"
                  onClick={() => onNavigate("change-detection")}
                >
                  <td className="py-md text-video-title text-text-tertiary font-medium">
                    {ev.id}
                  </td>
                  <td className="py-md text-label-sm text-text-primary pr-xl">
                    {ev.region}
                  </td>
                  <td className="py-md text-label-sm text-text-secondary">
                    {ev.type}
                  </td>
                  <td className="py-md">
                    <span
                      className={`text-video-title px-sm py-xs rounded-corner-full font-medium ${severityBadge(ev.severity)}`}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td className="py-md text-label-sm text-text-secondary">
                    {ev.confidence}
                  </td>
                  <td className="py-md text-video-title text-text-tertiary whitespace-nowrap">
                    {ev.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick actions panel */}
        <div className="w-64 flex flex-col gap-xl">
          <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
            <h2 className="text-label text-text-primary font-semibold">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-md">
              <Button
                variant="primary"
                iconStart={<Search size={16} />}
                onClick={() => onNavigate("search")}
              >
                New Scene Search
              </Button>
              <Button
                variant="neutral"
                iconStart={<Activity size={16} />}
                onClick={() => onNavigate("change-detection")}
              >
                Run Change Detection
              </Button>
              <Button
                variant="neutral"
                iconStart={<Globe size={16} />}
                onClick={() => onNavigate("map")}
              >
                Open Map Explorer
              </Button>
              <Button
                variant="neutral"
                iconStart={<FileText size={16} />}
                onClick={() => onNavigate("report")}
              >
                View Latest Report
              </Button>
            </div>
          </div>

          <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
            <h2 className="text-label text-text-primary font-semibold">
              System Status
            </h2>
            <div className="flex flex-col gap-md">
              {[
                { label: "Scene Ingestion", status: "Operational" },
                { label: "AI Index", status: "Operational" },
                { label: "Change Pipeline", status: "Processing" },
                { label: "Report Service", status: "Operational" },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-label-sm text-text-secondary">
                    {label}
                  </span>
                  <span
                    className={`text-video-title font-medium ${
                      status === "Operational" ? "text-success" : "text-warning"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Coverage stats bar */}
      <div className="bg-surface-bg rounded-corner-lg p-xl">
        <div className="flex items-center justify-between mb-lg">
          <h2 className="text-label text-text-primary font-semibold">
            Indian Territory Coverage
          </h2>
          <span className="text-label-sm text-text-secondary">
            Last 30 days · All sensors
          </span>
        </div>
        <div className="flex gap-2xl">
          {[
            { region: "North India", pct: 84 },
            { region: "South India", pct: 91 },
            { region: "East India", pct: 77 },
            { region: "West India", pct: 89 },
            { region: "Northeast", pct: 62 },
            { region: "Island Territories", pct: 73 },
          ].map(({ region, pct }) => (
            <div key={region} className="flex-1">
              <div className="flex justify-between mb-xs">
                <span className="text-video-title text-text-secondary">
                  {region}
                </span>
                <span className="text-video-title text-text-primary font-medium">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 bg-bg-subtle rounded-corner-full overflow-hidden">
                <div
                  className="h-full bg-brand-primary rounded-corner-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Change Detection ──────────────────────────────────────────────────────── */

function ChangeDetectionPage({
  selectedArea,
  events,
  analysisData,
  isLoading,
  error,
  onRerun,
  onCompare,
  onReport,
  onNavigate,
}: {
  selectedArea?: SelectedArea
  events: ChangeEventItem[]
  analysisData: AnalysisResponse
  isLoading?: boolean
  error?: string | null
  onRerun?: () => void
  onCompare: () => void
  onReport: () => void
  onNavigate: (p: Page) => void
}) {
  if (isLoading && selectedArea && analysisData.location !== selectedArea.name) {
    return (
      <div className="p-2xl flex flex-col items-center justify-center h-full min-h-[400px] gap-lg">
        <RefreshCw className="animate-spin text-brand-primary" size={32} />
        <div className="text-center">
          <h2 className="text-title text-text-primary">
            Analyzing Sentinel-2 imagery for {selectedArea.name}...
          </h2>
          <p className="text-label-sm text-text-secondary mt-xs">
            Querying real Level-2A STAC observations and streaming 10m bands via HTTP Range reads...
          </p>
        </div>
      </div>
    )
  }

  const [selectedEvent, setSelectedEvent] = useState(events[0]?.id || "")

  useEffect(() => {
    if (
      events.length > 0 &&
      (!selectedEvent || !events.some((e) => e.id === selectedEvent))
    ) {
      setSelectedEvent(events[0].id)
    }
  }, [events, selectedEvent])

  // Only verified observations/scans corresponding to actual scene acquisitions from analysisData
  const rawTimeline = analysisData.timeline || []
  const verifiedTimeline = rawTimeline.filter((item) => {
    // Keep actual scan acquisitions that match the real scene dates
    if (analysisData.beforeDate && item.date === analysisData.beforeDate) return true
    if (analysisData.afterDate && item.date === analysisData.afterDate) return true
    // If scene IDs are known, check if the item label references an actual scene
    if (analysisData.beforeSceneId && item.label.includes(analysisData.beforeSceneId.slice(0, 10))) return true
    if (analysisData.afterSceneId && item.label.includes(analysisData.afterSceneId.slice(0, 10))) return true
    return false
  })
  const timeline =
    verifiedTimeline.length > 0
      ? verifiedTimeline
      : [
          {
            date: analysisData.afterDate,
            label: `Post-event scan (${analysisData.afterSceneId ? `${analysisData.afterSceneId.slice(0, 18)}...` : "Sentinel-2 L2A"})`,
            type: "scan",
          },
          {
            date: analysisData.beforeDate,
            label: `Baseline scan (${analysisData.beforeSceneId ? `${analysisData.beforeSceneId.slice(0, 18)}...` : "Sentinel-2 L2A"})`,
            type: "baseline",
          },
        ]
  const statistics = analysisData.statistics

  const tabContent = {
    timeline: (
      <div className="flex flex-col gap-md">
        {timeline.map((item, i) => (
          <div key={`${i}-${item.date}`} className="flex gap-md items-start">
            <div
              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                item.type === "alert"
                  ? "bg-danger"
                  : item.type === "scan"
                    ? "bg-brand-primary"
                    : "bg-bg-hover border border-border-primary"
              }`}
            />
            <div>
              <p className="text-label-sm text-text-primary">{item.label}</p>
              <p className="text-video-title text-text-tertiary">{item.date}</p>
            </div>
          </div>
        ))}
      </div>
    ),
    statistics: (
      <div className="flex flex-col gap-md">
        {statistics.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between border-b border-border-secondary pb-sm last:border-0"
          >
            <span className="text-label-sm text-text-secondary">{k}</span>
            <span className="text-label-sm text-text-primary font-medium">
              {v}
            </span>
          </div>
        ))}
      </div>
    ),
  }

  const pageSubtitle = `${analysisData.location}, ${analysisData.state} · ${analysisData.beforeDate} → ${analysisData.afterDate} · ${analysisData.analysisType}`

  return (
    <div className="p-2xl flex flex-col gap-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-title text-text-primary">Change Detection</h1>
          <p className="text-label-sm text-text-secondary mt-xs">
            {pageSubtitle}
          </p>
        </div>
        <div className="flex gap-md">
          <Button
            variant="neutral"
            iconStart={
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
            }
            onClick={onRerun}
            disabled={isLoading}
          >
            Re-run Analysis
          </Button>
          <Button
            variant="primary"
            iconStart={<FileText size={16} />}
            onClick={onReport}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-md p-lg bg-brand-tertiary border border-brand-primary/30 rounded-corner-md">
          <RefreshCw
            className="animate-spin text-brand-primary flex-shrink-0"
            size={18}
          />
          <div className="flex-1">
            <p className="text-label-sm font-medium text-text-primary">
              Computing real Sentinel-2 raster change detection...
            </p>
            <p className="text-video-title text-text-tertiary">
              Streaming AWS Open Data Cloud-Optimized GeoTIFFs (10m bands via
              HTTP Range reads)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-lg bg-danger/10 border border-danger/20 rounded-corner-md text-danger">
          <div className="flex items-center gap-md">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <p className="text-label-sm font-medium">{error}</p>
          </div>
          {onRerun && (
            <Button variant="neutral" size="small" onClick={onRerun}>
              Retry
            </Button>
          )}
        </div>
      )}

      <div className="flex gap-xl">
        {/* Change events list */}
        <div className="flex-1 bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-label text-text-primary font-semibold">
              Detected Changes
            </h2>
            <Badge label={`${events.length} events`} />
          </div>
          <div className="flex flex-col gap-md">
            {events.length === 0 ? (
              <div className="p-xl text-center text-text-tertiary border border-dashed border-border-primary rounded-corner-md">
                <p className="text-label-sm">
                  No significant change events detected for this AOI.
                </p>
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev.id)}
                  className={`p-lg rounded-corner-md border cursor-pointer transition-colors ${
                    selectedEvent === ev.id
                      ? "border-brand-primary bg-brand-tertiary"
                      : "border-border-primary hover:bg-bg-hover"
                  }`}
                >
                  <div className="flex items-start justify-between gap-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-md mb-xs">
                        <span className="text-video-title text-text-tertiary font-medium">
                          {ev.id}
                        </span>
                        <span
                          className={`text-video-title px-sm py-xs rounded-corner-full font-medium ${severityBadge(ev.severity)}`}
                        >
                          {ev.severity}
                        </span>
                        <Badge label={ev.category} />
                      </div>
                      <p className="text-label-sm text-text-primary">
                        {ev.label}
                      </p>
                      <div className="flex items-center gap-md mt-xs">
                        <Clock size={12} className="text-text-tertiary" />
                        <span className="text-video-title text-text-tertiary">
                          {ev.date}
                        </span>
                        {ev.confidence !== undefined && (
                          <>
                            <span className="text-video-title text-text-tertiary">
                              ·
                            </span>
                            <span className="text-video-title text-text-secondary">
                              {ev.confidence}% confidence
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="neutral"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCompare()
                      }}
                    >
                      Compare
                    </Button>
                  </div>
                  {/* Confidence bar only if legitimate confidence exists */}
                  {ev.confidence !== undefined && (
                    <div className="mt-md">
                      <div className="h-1 bg-bg-subtle rounded-corner-full overflow-hidden">
                        <div
                          className="h-full bg-brand-primary rounded-corner-full"
                          style={{ width: `${ev.confidence}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side panels */}
        <div className="w-72 flex flex-col gap-xl">
          <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
            <h2 className="text-label text-text-primary font-semibold">
              Analysis Details
            </h2>
            <Tabs
              tabs={[
                {
                  id: "timeline",
                  label: "Timeline",
                  content: tabContent.timeline,
                },
                {
                  id: "stats",
                  label: "Statistics",
                  content: tabContent.statistics,
                },
              ]}
              defaultTab="timeline"
            />
          </div>

          <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
            <h2 className="text-label text-text-primary font-semibold">
              Quick Actions
            </h2>
            <div className="flex flex-col gap-md">
              <Button
                variant="primary"
                iconStart={<Eye size={16} />}
                onClick={onCompare}
              >
                Before/After View
              </Button>
              <Button
                variant="neutral"
                iconStart={<Globe size={16} />}
                onClick={() => onNavigate("map")}
              >
                Open in Map
              </Button>
              <Button
                variant="neutral"
                iconStart={<Download size={16} />}
                onClick={() => exportAreaToGeoJSON(analysisData.selectedArea)}
              >
                Export GeoJSON
              </Button>
            </div>
          </div>

          <div className="bg-surface-bg rounded-corner-lg p-xl">
            <div className="flex items-center gap-md mb-lg">
              <AlertTriangle size={14} className="text-warning" />
              <h2 className="text-label text-text-primary font-semibold">
                Alert Summary
              </h2>
            </div>
            <div className="flex flex-col gap-sm">
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">
                  Critical
                </span>
                <span className="text-label-sm text-danger font-medium">
                  {analysisData.severity === "Critical" ? "1" : "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">High</span>
                <span className="text-label-sm text-warning font-medium">
                  {analysisData.severity === "High" ? "1" : "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">
                  Medium
                </span>
                <span className="text-label-sm text-text-primary font-medium">
                  {analysisData.severity === "Medium" ? "1" : "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">Low</span>
                <span className="text-label-sm text-text-secondary font-medium">
                  {analysisData.severity === "Low" ? "1" : "0"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Comparison ────────────────────────────────────────────────────────────── */

function getChangeHighlightColor(changeType: string): string {
  switch (changeType) {
    case "water":
      return "#06b6d4"
    case "vegetation-loss":
      return "#ef4444"
    case "vegetation-gain":
      return "#10b981"
    case "urban":
      return "#f97316"
    case "infrastructure":
      return "#8b5cf6"
    default:
      return "#6366f1"
  }
}

function ComparisonMapController({
  center,
  bounds,
}: {
  center: [number, number]
  bounds?: [[number, number], [number, number]]
}) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
    if (bounds) {
      map.fitBounds(bounds, { padding: [12, 12] })
    } else {
      map.setView(center, 12)
    }
  }, [map, center, bounds])
  return null
}

function ComparisonPage({
  selectedArea,
  sliderPos,
  setSliderPos,
  analysisData,
  isLoading,
  error,
  onRerun,
  onBack,
  onReport,
}: {
  selectedArea?: SelectedArea
  sliderPos: number
  setSliderPos: (v: number) => void
  analysisData: AnalysisResponse
  isLoading?: boolean
  error?: string | null
  onRerun?: () => void
  onBack: () => void
  onReport: () => void
}) {
  if (isLoading && selectedArea && analysisData.location !== selectedArea.name) {
    return (
      <div className="p-2xl flex flex-col items-center justify-center h-full min-h-[400px] gap-lg">
        <RefreshCw className="animate-spin text-brand-primary" size={32} />
        <div className="text-center">
          <h2 className="text-title text-text-primary">
            Analyzing Sentinel-2 imagery for {selectedArea.name}...
          </h2>
          <p className="text-label-sm text-text-secondary mt-xs">
            Streaming AWS Open Data Cloud-Optimized GeoTIFFs and generating true-color comparison...
          </p>
        </div>
      </div>
    )
  }

  const subtitle = analysisData.comparisonSubtitle

  const beforeIndexLabel =
    analysisData.beforeMean !== undefined
      ? `Mean Before (${analysisData.indexType || "Index"})`
      : analysisData.beforeLabel
  const beforeIndexValue =
    analysisData.beforeMean !== undefined
      ? analysisData.beforeMean.toFixed(3)
      : analysisData.beforeValue
  const beforeIndexSub = analysisData.beforeSceneId
    ? `${analysisData.beforeDate} · ${analysisData.beforeSceneId.slice(0, 16)}...`
    : analysisData.beforeDate

  const afterIndexLabel =
    analysisData.afterMean !== undefined
      ? `Mean After (${analysisData.indexType || "Index"})`
      : analysisData.afterLabel
  const afterIndexValue =
    analysisData.afterMean !== undefined
      ? analysisData.afterMean.toFixed(3)
      : analysisData.afterValue
  const afterIndexSub = analysisData.afterSceneId
    ? `${analysisData.afterDate} · ${analysisData.afterSceneId.slice(0, 16)}...`
    : analysisData.afterDate

  const netAreaStr =
    analysisData.changedAreaKm2 !== undefined
      ? `${analysisData.changedAreaKm2.toFixed(2)} km²`
      : analysisData.area

  const shiftLabel =
    analysisData.meanChange !== undefined
      ? `Mean Shift (Δ ${analysisData.indexType || "Index"})`
      : "Changed Surface"
  const shiftValue =
    analysisData.meanChange !== undefined
      ? `${analysisData.meanChange >= 0 ? "+" : ""}${analysisData.meanChange.toFixed(3)}`
      : analysisData.area
  const shiftSub = analysisData.pixelCount
    ? `${analysisData.pixelCount.toLocaleString()} valid 10m pixels`
    : analysisData.analysisType

  const changedAreaLabel = "Changed Area"
  const changedAreaValue = netAreaStr
  const changedAreaSub =
    analysisData.changedPercentage !== undefined
      ? `${analysisData.changedPercentage.toFixed(1)}% of valid AOI pixels`
      : `${analysisData.netChangePct} (${netAreaStr})`

  const stats = [
    {
      label: beforeIndexLabel,
      value: beforeIndexValue,
      sub: beforeIndexSub,
      danger: false,
    },
    {
      label: afterIndexLabel,
      value: afterIndexValue,
      sub: afterIndexSub,
      danger: false,
    },
    {
      label: changedAreaLabel,
      value: changedAreaValue,
      sub: changedAreaSub,
      danger: false,
    },
    {
      label: shiftLabel,
      value: shiftValue,
      sub: shiftSub,
      danger: false,
    },
  ]

  const lat = analysisData.selectedArea.latitude || 21.83
  const lon = analysisData.selectedArea.longitude || 73.75
  const bounds = analysisData.selectedArea.boundingBox
  const changeType = analysisData.changeType
  const overlayBounds: [[number, number], [number, number]] = bounds
    ? [
        [Math.min(bounds[0][0], bounds[1][0]), Math.min(bounds[0][1], bounds[1][1])],
        [Math.max(bounds[0][0], bounds[1][0]), Math.max(bounds[0][1], bounds[1][1])],
      ]
    : [
        [lat - 0.05, lon - 0.05],
        [lat + 0.05, lon + 0.05],
      ]

  return (
    <div className="p-2xl flex flex-col gap-xl h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <Button
            variant="subtle"
            size="small"
            iconStart={<ChevronRight size={14} className="rotate-180" />}
            onClick={onBack}
          >
            Back
          </Button>
          <div>
            <h1 className="text-title text-text-primary">
              Before / After Comparison
            </h1>
            <p className="text-label-sm text-text-secondary mt-xs">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex gap-md">
          <Button
            variant="neutral"
            iconStart={
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
            }
            onClick={onRerun}
            disabled={isLoading}
          >
            Re-run Analysis
          </Button>
          <Button
            variant="neutral"
            iconStart={<Download size={16} />}
            onClick={() => exportAreaToGeoJSON(analysisData.selectedArea)}
          >
            Export Comparison
          </Button>
          <Button
            variant="primary"
            iconStart={<FileText size={16} />}
            onClick={onReport}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-md p-lg bg-brand-tertiary border border-brand-primary/30 rounded-corner-md">
          <RefreshCw
            className="animate-spin text-brand-primary flex-shrink-0"
            size={18}
          />
          <div className="flex-1">
            <p className="text-label-sm font-medium text-text-primary">
              Computing real Sentinel-2 raster change detection...
            </p>
            <p className="text-video-title text-text-tertiary">
              Streaming AWS Open Data Cloud-Optimized GeoTIFFs (10m bands via
              HTTP Range reads)
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-lg bg-danger/10 border border-danger/20 rounded-corner-md text-danger">
          <div className="flex items-center gap-md">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <p className="text-label-sm font-medium">{error}</p>
          </div>
          {onRerun && (
            <Button variant="neutral" size="small" onClick={onRerun}>
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Comparison viewport */}
      <div className="flex-1 bg-surface-bg rounded-corner-lg overflow-hidden relative min-h-0">
        {/* Observation & Basemap metadata banner */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-md pointer-events-none">
          <div className="bg-surface-dark/95 text-on-brand rounded-corner-full px-lg py-xs flex items-center gap-sm border border-border-secondary/40 shadow-sm">
            <Info size={12} className="text-warning flex-shrink-0" />
            <span className="text-video-title text-text-tertiary">
              {analysisData.indexType
                ? `Sentinel-2 ${analysisData.indexType} Differencing`
                : analysisData.sensor}{" "}
              · Obs: {analysisData.beforeDate} vs {analysisData.afterDate}
              {analysisData.beforeVisualUrl && analysisData.afterVisualUrl
                ? " · Sentinel-2 True Color (TCI)"
                : " · Basemap: ArcGIS World Imagery (Reference)"}
            </span>
          </div>
        </div>

        {/* Satellite Basemap Split View */}
        <div className="absolute inset-0">
          {/* Base: AFTER (Right/Underlying) layer with change detection highlight */}
          <div className="absolute inset-0">
            <MapContainer
              key={`after-${lat}-${lon}`}
              center={[lat, lon]}
              zoom={12}
              style={{ width: "100%", height: "100%" }}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
              className="z-0"
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {analysisData.afterVisualUrl && (
                <ImageOverlay url={analysisData.afterVisualUrl} bounds={overlayBounds} opacity={1.0} />
              )}
              {bounds && (
                <Rectangle
                  bounds={bounds}
                  pathOptions={{
                    color: getChangeHighlightColor(changeType),
                    weight: 3,
                    fillColor: getChangeHighlightColor(changeType),
                    fillOpacity: 0.28,
                    dashArray: "6 3",
                  }}
                />
              )}
              <ComparisonMapController center={[lat, lon]} bounds={overlayBounds} />
            </MapContainer>
          </div>

          {/* Clipped: BEFORE (Left/Top) layer with baseline true-colour satellite imagery */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <MapContainer
              key={`before-${lat}-${lon}`}
              center={[lat, lon]}
              zoom={12}
              style={{ width: "100%", height: "100%" }}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              attributionControl={false}
              className="z-0"
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {analysisData.beforeVisualUrl && (
                <ImageOverlay url={analysisData.beforeVisualUrl} bounds={overlayBounds} opacity={1.0} />
              )}
              <ComparisonMapController center={[lat, lon]} bounds={overlayBounds} />
            </MapContainer>
          </div>

          {/* Before / After Badges */}
          <div className="absolute top-md left-md bg-surface-dark/90 text-on-brand rounded-corner-md px-md py-xs z-20 pointer-events-none border border-border-secondary/30">
            <span className="text-video-title font-medium block">
              Before · {analysisData.beforeDate}
            </span>
            <span className="text-[10px] text-text-tertiary block">
              {analysisData.beforeVisualUrl
                ? `Sentinel-2 True Color · ${analysisData.beforeSceneId || "L2A"}`
                : "ArcGIS World Imagery · Reference Basemap"}
            </span>
          </div>
          <div className="absolute top-md right-md bg-brand-primary text-on-brand rounded-corner-md px-md py-xs z-20 pointer-events-none shadow-sm">
            <span className="text-video-title font-medium block">
              After · {analysisData.afterDate}
            </span>
            <span className="text-[10px] text-on-brand/80 block">
              {analysisData.afterVisualUrl
                ? `Sentinel-2 True Color · ${analysisData.afterSceneId || "L2A"}`
                : "ArcGIS World Imagery · Reference Basemap"}
            </span>
          </div>

          {/* Divider line & handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-surface-bg z-20 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-surface-bg rounded-full border border-border-primary flex items-center justify-center shadow-lg pointer-events-auto">
              <SlidersHorizontal size={14} className="text-text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Slider control */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex items-center gap-xl">
        <span className="text-label-sm text-text-secondary flex-shrink-0 w-36">
          Before ({analysisData.beforeDate}) {sliderPos}%
        </span>
        <input
          type="range"
          min={5}
          max={95}
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="flex-1 accent-brand-primary"
          aria-label="Comparison slider"
        />
        <span className="text-label-sm text-text-secondary flex-shrink-0 w-36 text-right">
          After ({analysisData.afterDate}) {100 - sliderPos}%
        </span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-4 gap-xl">
        {stats.map(({ label, value, sub, danger }) => (
          <div key={label} className="bg-surface-bg rounded-corner-lg p-xl">
            <p className="text-video-title text-text-tertiary mb-xs">{label}</p>
            <p
              className={`text-heading font-semibold ${
                danger ? "text-danger" : "text-text-primary"
              }`}
            >
              {value}
            </p>
            <p className="text-video-title text-text-secondary mt-xs">{sub}</p>
          </div>
        ))}
      </div>

      {/* Raster Telemetry Bar */}
      <div className="bg-surface-bg rounded-corner-lg px-xl py-md flex items-center justify-between text-video-title text-text-tertiary border border-border-secondary/40">
        <div className="flex items-center gap-md">
          <Globe size={14} className="text-brand-primary flex-shrink-0" />
          <span>
            Source:{" "}
            <strong className="text-text-primary font-medium">
              {analysisData.analysisSource || "Copernicus Sentinel-2 Level-2A"}
            </strong>
          </span>
        </div>
        <div>
          <span>
            Bands:{" "}
            <strong className="text-text-primary font-medium">
              {analysisData.indexType === "NDWI"
                ? "B03 (Green) & B08 (NIR)"
                : "B04 (Red) & B08 (NIR)"}
            </strong>
          </span>
        </div>
        <div>
          <span>
            GSD:{" "}
            <strong className="text-text-primary font-medium">
              10m Ground Sampling Distance
            </strong>
          </span>
        </div>
        <div>
          <span>
            Display Layer:{" "}
            <strong className="text-text-primary font-medium">
              {analysisData.beforeVisualUrl && analysisData.afterVisualUrl
                ? "Sentinel-2 True Color (TCI)"
                : "ArcGIS World Imagery (Reference Basemap)"}
            </strong>
          </span>
        </div>
        <div>
          <span>
            Method:{" "}
            <strong className="text-text-primary font-medium">
              {analysisData.analysisMethod || "Pixel-Level Differencing"}
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Report ────────────────────────────────────────────────────────────────── */

function ReportPage({
  notes,
  setNotes,
  showToast,
  setShowToast,
  analysisData,
  onBack,
}: {
  notes: string
  setNotes: (v: string) => void
  showToast: boolean
  setShowToast: (v: boolean) => void
  analysisData: AnalysisResponse
  onBack: () => void
}) {
  const reportId = analysisData.reportId
  const reportLocation = `${analysisData.location}, ${analysisData.state}`
  const reportSubtitle = `${reportId} · ${reportLocation} · Generated Sep 07, 2026`
  const reportTitle = analysisData.pageTitle
  const analysisPeriod = `${analysisData.beforeDate} – ${analysisData.afterDate}`
  const findings = analysisData.findings

  return (
    <div className="p-2xl flex flex-col gap-2xl max-w-4xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-md">
          <Button
            variant="subtle"
            size="small"
            iconStart={<ChevronRight size={14} className="rotate-180" />}
            onClick={onBack}
          >
            Back
          </Button>
          <div>
            <h1 className="text-title text-text-primary">
              Geospatial Change Report
            </h1>
            <p className="text-label-sm text-text-secondary mt-xs">
              {reportSubtitle}
            </p>
          </div>
        </div>
        <div className="flex gap-md">
          <Button
            variant="neutral"
            iconStart={<Download size={16} />}
            onClick={() => window.print()}
          >
            Export PDF
          </Button>
          <Button
            variant="primary"
            iconStart={<CheckCircle size={16} />}
            onClick={() => setShowToast(true)}
          >
            Finalise Report
          </Button>
        </div>
      </div>

      {/* Report header card */}
      <div className="bg-surface-bg rounded-corner-lg p-xl">
        <div className="flex items-start justify-between mb-lg">
          <div>
            <h2 className="text-heading text-text-primary font-semibold">
              {reportTitle}
            </h2>
            <p className="text-label-sm text-text-secondary mt-xs">
              {reportLocation}, India
            </p>
          </div>
          <span
            className={`text-video-title px-md py-xs rounded-corner-full font-medium border ${
              analysisData.severity === "Critical"
                ? "bg-danger/20 text-danger border-danger/30"
                : analysisData.severity === "High"
                  ? "bg-warning/20 text-warning border-warning/30"
                  : "bg-brand-tertiary text-brand-primary border-brand-primary/30"
            }`}
          >
            {analysisData.severity} Priority
          </span>
        </div>
        <div className="grid grid-cols-3 gap-xl border-t border-border-secondary pt-lg">
          {[
            ["Analysis Period", analysisPeriod],
            ["Primary Sensor", analysisData.sensor],
            ["Analysis Method", analysisData.analysisType],
            ["AOI Area", `~${analysisData.area}`],
            [
              "Scenes Used",
              analysisData.beforeSceneId && analysisData.afterSceneId
                ? `2 scenes (${analysisData.beforeSceneId.slice(0, 15)}... / ${analysisData.afterSceneId.slice(0, 15)}...)`
                : "Multi-temporal pair",
            ],
            ["Analyst", "Automated · ISRO SatWatch v2"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-video-title text-text-tertiary block">
                {k}
              </span>
              <span className="text-label-sm text-text-primary font-medium">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Key findings */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
        <h2 className="text-label text-text-primary font-semibold">
          Key Findings
        </h2>
        <div className="flex flex-col gap-md">
          {findings.map(({ text, type }, id) => (
            <div
              key={id}
              className={`flex gap-md p-lg rounded-corner-md ${
                type === "critical"
                  ? "bg-danger/10 border border-danger/20"
                  : type === "warning"
                    ? "bg-warning/10 border border-warning/20"
                    : "bg-success/10 border border-success/20"
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {type === "critical" ? (
                  <AlertTriangle size={14} className="text-danger" />
                ) : type === "warning" ? (
                  <AlertTriangle size={14} className="text-warning" />
                ) : (
                  <CheckCircle size={14} className="text-success" />
                )}
              </div>
              <p className="text-label-sm text-text-primary">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Change summary table */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
        <h2 className="text-label text-text-primary font-semibold">
          Change Summary
        </h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-secondary">
              {[
                "Change Type",
                "Area / Magnitude",
                "Confidence",
                "Severity",
                "Zone",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left text-video-title text-text-tertiary pb-md font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              [
                `Changed Area (|Δ${analysisData.indexType || "Index"}| ≥ threshold)`,
                analysisData.changedAreaKm2 !== undefined
                  ? `${analysisData.changedAreaKm2.toFixed(2)} km²`
                  : analysisData.area,
                analysisData.confidence !== undefined &&
                analysisData.confidence !== null
                  ? `${analysisData.confidence}%`
                  : "BOA Verified",
                analysisData.severity,
                "Selected AOI",
              ],
              [
                `Pre-Event Observation (${analysisData.beforeDate})`,
                analysisData.beforeMean !== undefined
                  ? `Mean: ${analysisData.beforeMean.toFixed(3)}`
                  : analysisData.beforeValue,
                "10m GSD",
                "Baseline",
                analysisData.beforeSceneId
                  ? `${analysisData.beforeSceneId.slice(0, 16)}...`
                  : "Full AOI",
              ],
              [
                `Post-Event Observation (${analysisData.afterDate})`,
                analysisData.afterMean !== undefined
                  ? `Mean: ${analysisData.afterMean.toFixed(3)}`
                  : analysisData.afterValue,
                "10m GSD",
                analysisData.severity,
                analysisData.afterSceneId
                  ? `${analysisData.afterSceneId.slice(0, 16)}...`
                  : "Full AOI",
              ],
              [
                `Spectral Index Difference (Δ${analysisData.indexType || "Index"})`,
                analysisData.meanChange !== undefined
                  ? `${analysisData.meanChange >= 0 ? "+" : ""}${analysisData.meanChange.toFixed(3)}`
                  : "N/A",
                "10m GSD",
                Math.abs(analysisData.meanChange ?? 0) >= 0.05
                  ? "High"
                  : "Low",
                analysisData.pixelCount
                  ? `${analysisData.pixelCount.toLocaleString()} pixels`
                  : "AOI Mask",
              ],
            ].map(([type, area, conf, sev, zone]) => (
              <tr
                key={type}
                className="border-b border-border-secondary last:border-0"
              >
                <td className="py-md text-label-sm text-text-primary pr-xl">
                  {type}
                </td>
                <td className="py-md text-label-sm text-text-primary font-medium">
                  {area}
                </td>
                <td className="py-md text-label-sm text-text-secondary">
                  {conf}
                </td>
                <td className="py-md">
                  <span
                    className={`text-video-title px-sm py-xs rounded-corner-full font-medium ${severityBadge(sev as string)}`}
                  >
                    {sev}
                  </span>
                </td>
                <td className="py-md text-label-sm text-text-secondary">
                  {zone}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Analyst notes */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
        <h2 className="text-label text-text-primary font-semibold">
          Analyst Notes
        </h2>
        <TextareaField
          label="Additional observations"
          description="These notes will be included in the final exported report."
          value={notes}
          onChange={setNotes}
          rows={4}
        />
      </div>

      {/* Recommendations */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
        <h2 className="text-label text-text-primary font-semibold">
          Recommendations
        </h2>
        <div className="flex flex-col gap-md">
          {[
            "Schedule high-resolution Cartosat-3 tasking over eastern sedimentation zone for ground-truth validation.",
            "Initiate hydrological modelling workflow using current water level data to project October outlook.",
            "Cross-reference CWPRS gauge readings to validate ±5% accuracy margin on NDWI-derived area estimates.",
            "Flag reservoir for weekly monitoring cadence until water levels stabilise above historical Q3 average.",
          ].map((rec, i) => (
            <div key={i} className="flex gap-md">
              <span className="text-video-title text-text-tertiary flex-shrink-0 w-5">
                {i + 1}.
              </span>
              <p className="text-label-sm text-text-primary">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export options */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg">
        <h2 className="text-label text-text-primary font-semibold">
          Export Options
        </h2>
        <div className="flex gap-md flex-wrap">
          <Button
            variant="neutral"
            iconStart={<Download size={16} />}
            onClick={() => window.print()}
          >
            PDF Report
          </Button>
          <Button
            variant="neutral"
            iconStart={<Download size={16} />}
            onClick={() => exportAreaToGeoJSON(analysisData.selectedArea)}
          >
            GeoJSON (AOI + Changes)
          </Button>
          <Button variant="neutral" iconStart={<Download size={16} />}>
            CSV Summary
          </Button>
          <Button variant="neutral" iconStart={<Download size={16} />}>
            STAC Metadata
          </Button>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-2xl right-2xl z-50">
          <div className="bg-surface-bg border border-border-primary rounded-corner-lg p-lg flex items-center gap-md shadow-lg">
            <CheckCircle size={16} className="text-success flex-shrink-0" />
            <span className="text-label-sm text-text-primary">
              Report RPT-2026-089 finalised and queued for distribution.
            </span>
            <button
              onClick={() => setShowToast(false)}
              className="text-text-tertiary hover:text-text-primary ml-md"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
