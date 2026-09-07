import { useState } from "react";
import MapPageComponent from "./MapPage";
import SemanticSearchPage from "./SearchPage";
import type { SelectedArea, AnalysisResponse } from "./types";
import { getAnalysis } from "./services/analysisService";
import { DEMO_SELECTED_AREA } from "./data/mockAnalysisData";
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
} from "@figma/astraui";
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
} from "lucide-react";

type Page =
  | "dashboard"
  | "map"
  | "search"
  | "search-result"
  | "change-detection"
  | "comparison"
  | "report";

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
];

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
];

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
];

const CHANGE_EVENTS = [
  {
    id: "CHG-001",
    label: "Reservoir surface area reduced by 18%",
    category: "Water Body",
    date: "Sep 06, 2026",
    severity: "High",
    confidence: 94,
  },
  {
    id: "CHG-002",
    label: "New construction detected — 2.3 km²",
    category: "Built-up",
    date: "Sep 04, 2026",
    severity: "Medium",
    confidence: 88,
  },
  {
    id: "CHG-003",
    label: "Vegetation NDVI drop > 0.25 in zone B",
    category: "Vegetation",
    date: "Sep 03, 2026",
    severity: "Critical",
    confidence: 97,
  },
  {
    id: "CHG-004",
    label: "Bare soil exposure along eastern bank",
    category: "Land Cover",
    date: "Sep 01, 2026",
    severity: "Low",
    confidence: 81,
  },
];

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    Critical: "bg-danger text-on-brand",
    High: "bg-warning text-on-brand",
    Medium: "bg-brand-secondary text-text-primary",
    Low: "bg-bg-subtle text-text-secondary",
  };
  return map[sev] ?? "bg-bg-subtle text-text-secondary";
}

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [comparisonPos, setComparisonPos] = useState(50);
  const [reportNotes, setReportNotes] = useState(
    "Water level at Sardar Sarovar reservoir has declined significantly between January and September 2026. The analysis is based on Sentinel-2 multispectral imagery with NDWI thresholding. Ground-truth verification recommended for zones C and D."
  );
  const [showToast, setShowToast] = useState(false);
  const [selectedArea, setSelectedArea] = useState<SelectedArea>(DEMO_SELECTED_AREA);

  const handleSearchNavigate = (p: string, area?: SelectedArea) => {
    if (area) {
      setSelectedArea(area);
      setReportNotes(
        `Analysis of ${area.name}, ${area.state}. Change type: ${area.changeDescription}. Period: ${area.beforeDate} → ${area.afterDate}. Sensor: ${area.sensor}. Confidence: ${area.confidence}%. ${area.explanation}`
      );
    }
    setPage(p as Page);
  };

  const analysisData: AnalysisResponse = getAnalysis(selectedArea);

  const sidebarNav = (
    <SidebarNavigation
      footer={
        <>
          <SidebarButton
            icon={<Settings className="size-full" strokeWidth={1.5} />}
          />
          <Avatar
            type="initial"
            initials="AR"
            size="medium"
            shape="circle"
          />
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
  );

  return (
    <div className="flex h-screen bg-brand-tertiary overflow-hidden">
      {sidebarNav}

      <main className={`flex-1 ${page === "map" || page === "search" || page === "search-result" ? "overflow-hidden" : "overflow-y-auto"}`}>
        {page === "dashboard" && (
          <DashboardPage
            onNavigate={setPage}
          />
        )}
        {page === "map" && (
          <MapPageComponent onNavigate={(p) => setPage(p as Page)} />
        )}
        {(page === "search" || page === "search-result") && (
          <SemanticSearchPage onNavigate={handleSearchNavigate} />
        )}
        {page === "change-detection" && (
          <ChangeDetectionPage
            events={CHANGE_EVENTS}
            analysisData={analysisData}
            onCompare={() => setPage("comparison")}
            onReport={() => setPage("report")}
            onNavigate={setPage}
          />
        )}
        {page === "comparison" && (
          <ComparisonPage
            sliderPos={comparisonPos}
            setSliderPos={setComparisonPos}
            analysisData={analysisData}
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
  );
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */

function DashboardPage({ onNavigate }: { onNavigate: (p: Page) => void }) {
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
            iconStart={<RefreshCw size={14} />}
          >
            Sync Now
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-xl">
        {STAT_CARDS.map(({ label, value, delta, positive, icon: Icon }) => (
          <div
            key={label}
            className="bg-surface-bg rounded-corner-lg p-xl flex flex-col gap-lg"
          >
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-text-secondary">{label}</span>
              <Icon size={16} className="text-text-tertiary" strokeWidth={1.5} />
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
              {RECENT_EVENTS.map((ev) => (
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
                      status === "Operational"
                        ? "text-success"
                        : "text-warning"
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
  );
}

/* ─── Change Detection ──────────────────────────────────────────────────────── */

function ChangeDetectionPage({
  events,
  analysisData,
  onCompare,
  onReport,
  onNavigate,
}: {
  events: typeof CHANGE_EVENTS;
  analysisData: AnalysisResponse;
  onCompare: () => void;
  onReport: () => void;
  onNavigate: (p: Page) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState(events[0].id);

  // Use derived analysisData when a result is selected, otherwise fall back to demo defaults.
  const timeline = analysisData.timeline;
  const statistics = analysisData.statistics;

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
          <div key={k} className="flex justify-between border-b border-border-secondary pb-sm last:border-0">
            <span className="text-label-sm text-text-secondary">{k}</span>
            <span className="text-label-sm text-text-primary font-medium">{v}</span>
          </div>
        ))}
      </div>
    ),
  };

  const pageSubtitle = `${analysisData.location}, ${analysisData.state} · ${analysisData.beforeDate.slice(0, 7)} – ${analysisData.afterDate.slice(0, 7)} · ${analysisData.analysisType}`;

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
            iconStart={<RefreshCw size={16} />}
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
            {events.map((ev) => (
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
                      <span className="text-video-title text-text-tertiary">·</span>
                      <span className="text-video-title text-text-secondary">
                        {ev.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="neutral"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompare();
                    }}
                  >
                    Compare
                  </Button>
                </div>
                {/* Confidence bar */}
                <div className="mt-md">
                  <div className="h-1 bg-bg-subtle rounded-corner-full overflow-hidden">
                    <div
                      className="h-full bg-brand-primary rounded-corner-full"
                      style={{ width: `${ev.confidence}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
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
                <span className="text-label-sm text-text-secondary">Critical</span>
                <span className="text-label-sm text-danger font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">High</span>
                <span className="text-label-sm text-warning font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">Medium</span>
                <span className="text-label-sm text-text-primary font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-sm text-text-secondary">Low</span>
                <span className="text-label-sm text-text-secondary font-medium">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Comparison ────────────────────────────────────────────────────────────── */

function ComparisonPage({
  sliderPos,
  setSliderPos,
  analysisData,
  onBack,
  onReport,
}: {
  sliderPos: number;
  setSliderPos: (v: number) => void;
  analysisData: AnalysisResponse;
  onBack: () => void;
  onReport: () => void;
}) {
  const subtitle = analysisData.comparisonSubtitle;
  const stats = [
    { label: analysisData.beforeLabel, value: analysisData.beforeValue, sub: analysisData.beforeDate },
    { label: analysisData.afterLabel, value: analysisData.afterValue, sub: analysisData.afterDate },
    { label: "Net Change", value: analysisData.netChange, sub: `${analysisData.netChangePct} change`, danger: analysisData.netChange.startsWith("−") || analysisData.netChange.startsWith("-") },
    { label: "Detection Confidence", value: `${analysisData.confidence}%`, sub: analysisData.analysisType },
  ];

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
            <h1 className="text-title text-text-primary">Before / After Comparison</h1>
            <p className="text-label-sm text-text-secondary mt-xs">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex gap-md">
          <Button
            variant="neutral"
            iconStart={<Download size={16} />}
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

      {/* Comparison viewport */}
      <div className="flex-1 bg-surface-bg rounded-corner-lg overflow-hidden relative min-h-0">
        {/* Simulated-analysis disclaimer */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-center pt-md pointer-events-none">
          <div className="bg-surface-dark/85 text-on-brand rounded-corner-full px-lg py-xs flex items-center gap-sm border border-border-secondary/30">
            <Info size={10} className="text-warning flex-shrink-0" />
            <span className="text-video-title text-text-tertiary">
              Simulated NDWI analysis · demo data only · not real satellite imagery
            </span>
          </div>
        </div>

        <div className="absolute inset-0 flex">
          {/* Before (left) */}
          <div
            className="h-full overflow-hidden relative flex-shrink-0"
            style={{ width: `${sliderPos}%` }}
          >
            <AnalysisDiagram phase="before" changeType={analysisData.changeType} />
            <div className="absolute top-md left-md bg-surface-dark/90 text-on-brand rounded-corner-md px-md py-xs z-10">
              <span className="text-video-title font-medium">
                BEFORE · {analysisData.beforeDate}
              </span>
            </div>
          </div>

          {/* After (right) */}
          <div className="flex-1 h-full overflow-hidden relative">
            <AnalysisDiagram phase="after" changeType={analysisData.changeType} />
            <div className="absolute top-md right-md bg-brand-primary text-on-brand rounded-corner-md px-md py-xs z-10">
              <span className="text-video-title font-medium">
                AFTER · {analysisData.afterDate}
              </span>
            </div>
          </div>

          {/* Divider line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-surface-bg z-10 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-surface-bg rounded-full border border-border-primary flex items-center justify-center shadow-lg">
              <SlidersHorizontal size={14} className="text-text-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Slider control */}
      <div className="bg-surface-bg rounded-corner-lg p-xl flex items-center gap-xl">
        <span className="text-label-sm text-text-secondary flex-shrink-0 w-20">
          Before {sliderPos}%
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
        <span className="text-label-sm text-text-secondary flex-shrink-0 w-20 text-right">
          After {100 - sliderPos}%
        </span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-4 gap-xl">
        {stats.map(({ label, value, sub, danger }) => (
          <div
            key={label}
            className="bg-surface-bg rounded-corner-lg p-xl"
          >
            <p className="text-video-title text-text-tertiary mb-xs">{label}</p>
            <p
              className={`text-heading font-semibold ${danger ? "text-danger" : "text-text-primary"}`}
            >
              {value}
            </p>
            <p className="text-video-title text-text-secondary mt-xs">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── AnalysisDiagram (simulated before/after — demo data only) ─────────────── */

function AnalysisDiagram({
  phase,
  changeType,
}: {
  phase: "before" | "after";
  changeType: AnalysisResponse["changeType"];
}) {
  const isBefore = phase === "before";

  if (changeType === "urban" || changeType === "infrastructure") {
    // Urban: grey/orange built-up patches — "after" has more coverage
    const bigPatchW = isBefore ? 160 : 230;
    const bigPatchH = isBefore ? 100 : 145;
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ background: "#0d1117" }}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 500">
          <rect width="800" height="500" fill="#1a2332" />
          <g stroke="#253040" strokeWidth="0.5" opacity="0.5">
            {Array.from({ length: 20 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 26} x2="800" y2={i * 26} />)}
            {Array.from({ length: 32 }).map((_, i) => <line key={`v${i}`} x1={i * 26} y1="0" x2={i * 26} y2="500" />)}
          </g>
          {/* Land background */}
          <rect width="800" height="500" fill="#2a3220" opacity="0.6" />
          {/* Existing built-up (both states) */}
          <rect x="200" y="160" width="120" height="80" fill="#4a5568" rx="3" />
          <rect x="330" y="190" width="90" height="60" fill="#64748b" rx="3" />
          <rect x="250" y="260" width="110" height="70" fill="#475569" rx="3" />
          {/* New construction — larger in "after" */}
          <rect x={isBefore ? 440 : 420} y={isBefore ? 155 : 135} width={bigPatchW} height={bigPatchH} fill={isBefore ? "#6b7280" : "#f97316"} rx="4" opacity={isBefore ? 0.7 : 0.85} />
          {/* Additional new plots — only in after */}
          {!isBefore && <>
            <rect x="200" y="340" width="140" height="90" fill="#f97316" rx="3" opacity="0.75" />
            <rect x="560" y="310" width="100" height="75" fill="#ea580c" rx="3" opacity="0.8" />
          </>}
          {/* Road network */}
          <line x1="0" y1="250" x2="800" y2="250" stroke="#94a3b8" strokeWidth="3" opacity="0.25" />
          <line x1="400" y1="0" x2="400" y2="500" stroke="#94a3b8" strokeWidth="2" opacity="0.2" />
          {/* Legend */}
          <rect x="20" y="440" width="200" height="48" fill="#0d1117" rx="4" opacity="0.9" />
          <rect x="30" y="450" width="10" height="10" fill={isBefore ? "#6b7280" : "#f97316"} />
          <text x="46" y="460" fill="#94a3b8" fontSize="10" fontFamily="monospace">{isBefore ? "Existing built-up" : "New construction"}</text>
          <text x="30" y="479" fill="#475569" fontSize="8" fontFamily="monospace">ISA Change · Cartosat-3 · Simulated</text>
          {/* ISA scale */}
          <rect x="620" y="440" width="120" height="8" fill="url(#isa-scale)" rx="2" />
          <defs>
            <linearGradient id="isa-scale" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2d3a2e" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <text x="620" y="435" fill="#94a3b8" fontSize="9" fontFamily="monospace">Low ISA</text>
          <text x="690" y="435" fill="#94a3b8" fontSize="9" fontFamily="monospace">High ISA</text>
        </svg>
      </div>
    );
  }

  if (changeType === "vegetation-loss") {
    // Vegetation: green canopy — "before" is dense, "after" is sparse
    const canopyRx = isBefore ? 200 : 150;
    const canopyRy = isBefore ? 135 : 100;
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ background: "#0d1117" }}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 500">
          <rect width="800" height="500" fill="#0f1a10" />
          <g stroke="#1a2d1a" strokeWidth="0.5" opacity="0.5">
            {Array.from({ length: 20 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 26} x2="800" y2={i * 26} />)}
            {Array.from({ length: 32 }).map((_, i) => <line key={`v${i}`} x1={i * 26} y1="0" x2={i * 26} y2="500" />)}
          </g>
          {/* Land base */}
          <rect width="800" height="500" fill="#1e2d1c" opacity="0.8" />
          {/* Dense canopy / forest extent */}
          <ellipse cx="400" cy="250" rx={canopyRx} ry={canopyRy} fill="url(#veg-grad)" />
          {isBefore && <>
            <ellipse cx="220" cy="200" rx="80" ry="55" fill="#166534" opacity="0.7" />
            <ellipse cx="580" cy="300" rx="90" ry="60" fill="#15803d" opacity="0.65" />
          </>}
          {/* Bare soil exposed after loss */}
          {!isBefore && <>
            <ellipse cx="430" cy="270" rx="60" ry="40" fill="#78573a" opacity="0.85" />
            <ellipse cx="350" cy="220" rx="45" ry="30" fill="#8c6642" opacity="0.7" />
          </>}
          <defs>
            <radialGradient id="veg-grad" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor={isBefore ? "#22c55e" : "#16a34a"} stopOpacity={isBefore ? 0.9 : 0.7} />
              <stop offset="60%" stopColor={isBefore ? "#15803d" : "#14532d"} stopOpacity={isBefore ? 0.85 : 0.75} />
              <stop offset="100%" stopColor="#166534" stopOpacity="0.6" />
            </radialGradient>
          </defs>
          <rect x="20" y="440" width="200" height="48" fill="#0d1117" rx="4" opacity="0.9" />
          <text x="30" y="457" fill="#94a3b8" fontSize="10" fontFamily="monospace">Canopy cover:</text>
          <text x="30" y="473" fill="#22c55e" fontSize="13" fontFamily="monospace" fontWeight="bold">{isBefore ? "Dense" : "Reduced"}</text>
          <text x="30" y="486" fill="#475569" fontSize="8" fontFamily="monospace">NDVI · Sentinel-2 · Simulated</text>
        </svg>
      </div>
    );
  }

  if (changeType === "vegetation-gain") {
    // Vegetation gain: sparse before, dense after
    const canopyRx = isBefore ? 140 : 200;
    const canopyRy = isBefore ? 90 : 135;
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ background: "#0d1117" }}>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 500">
          <rect width="800" height="500" fill="#0f1a10" />
          <rect width="800" height="500" fill="#1e2d1c" opacity="0.8" />
          <ellipse cx="400" cy="250" rx={canopyRx} ry={canopyRy} fill="url(#veg-gain-grad)" />
          {!isBefore && <>
            <ellipse cx="220" cy="200" rx="75" ry="50" fill="#15803d" opacity="0.65" />
            <ellipse cx="580" cy="300" rx="85" ry="55" fill="#166534" opacity="0.6" />
          </>}
          <defs>
            <radialGradient id="veg-gain-grad" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor={isBefore ? "#4ade80" : "#22c55e"} stopOpacity={isBefore ? 0.6 : 0.9} />
              <stop offset="100%" stopColor={isBefore ? "#166534" : "#15803d"} stopOpacity={isBefore ? 0.5 : 0.85} />
            </radialGradient>
          </defs>
          <rect x="20" y="440" width="200" height="48" fill="#0d1117" rx="4" opacity="0.9" />
          <text x="30" y="457" fill="#94a3b8" fontSize="10" fontFamily="monospace">Canopy cover:</text>
          <text x="30" y="473" fill="#22c55e" fontSize="13" fontFamily="monospace" fontWeight="bold">{isBefore ? "Sparse" : "Recovered"}</text>
          <text x="30" y="486" fill="#475569" fontSize="8" fontFamily="monospace">NDVI · Sentinel-2 · Simulated</text>
        </svg>
      </div>
    );
  }

  // Water (default)
  const isHigh = isBefore; // before = higher water level
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: "#0d1117" }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
        <rect width="800" height="500" fill="#1a2332" />
        <g stroke="#253040" strokeWidth="0.5" opacity="0.6">
          {Array.from({ length: 20 }).map((_, i) => <line key={`h${i}`} x1="0" y1={i * 26} x2="800" y2={i * 26} />)}
          {Array.from({ length: 32 }).map((_, i) => <line key={`v${i}`} x1={i * 26} y1="0" x2={i * 26} y2="500" />)}
        </g>
        <ellipse cx="400" cy="250" rx="340" ry="220" fill="#2d3a2e" />
        <rect x="60" y="80" width="80" height="60" fill="#2a3d24" rx="2" opacity="0.7" />
        <rect x="580" y="100" width="90" height="55" fill="#2a3d24" rx="2" opacity="0.7" />
        <rect x="80" y="330" width="85" height="65" fill="#2d3e25" rx="2" opacity="0.7" />
        <rect x="620" y="320" width="80" height="60" fill="#2a3d24" rx="2" opacity="0.6" />
        {!isHigh && <ellipse cx="400" cy="252" rx="198" ry="128" fill="#5c4a2a" opacity="0.9" />}
        <ellipse cx="400" cy="252" rx={isHigh ? 210 : 168} ry={isHigh ? 138 : 108} fill="#1a4a7a" />
        <ellipse cx="400" cy="252" rx={isHigh ? 210 : 168} ry={isHigh ? 138 : 108} fill={isHigh ? "url(#ndwi-high)" : "url(#ndwi-low)"} />
        <defs>
          <radialGradient id="ndwi-high" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#0ea5e9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="ndwi-low" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.80" />
            <stop offset="55%" stopColor="#0284c7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.8" />
          </radialGradient>
          <linearGradient id="ndwi-scale" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="40%" stopColor="#1d4ed8" />
            <stop offset="70%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <rect x="335" y="368" width="130" height="14" fill="#4a5568" rx="2" />
        <rect x="620" y="440" width="120" height="8" fill="url(#ndwi-scale)" rx="2" />
        <text x="620" y="435" fill="#94a3b8" fontSize="9" fontFamily="monospace">−1.0</text>
        <text x="720" y="435" fill="#94a3b8" fontSize="9" fontFamily="monospace">+1.0</text>
        <text x="650" y="462" fill="#64748b" fontSize="9" fontFamily="monospace">NDWI index</text>
        <rect x="20" y="440" width="180" height="42" fill="#0d1117" rx="4" opacity="0.85" />
        <text x="30" y="457" fill="#94a3b8" fontSize="10" fontFamily="monospace">Water extent:</text>
        <text x="30" y="474" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
          {isHigh ? "High" : "Reduced"}
        </text>
        <text x="30" y="492" fill="#475569" fontSize="8" fontFamily="monospace">Sentinel-2 NDWI · Simulated</text>
      </svg>
    </div>
  );
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
  notes: string;
  setNotes: (v: string) => void;
  showToast: boolean;
  setShowToast: (v: boolean) => void;
  analysisData: AnalysisResponse;
  onBack: () => void;
}) {
  const reportId = analysisData.reportId;
  const reportLocation = `${analysisData.location}, ${analysisData.state}`;
  const reportSubtitle = `${reportId} · ${reportLocation} · Generated Sep 07, 2026`;
  const reportTitle = analysisData.pageTitle;
  const analysisPeriod = `${analysisData.beforeDate} – ${analysisData.afterDate}`;
  const findings = analysisData.findings;

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
          <span className={`text-video-title px-md py-xs rounded-corner-full font-medium border ${
            analysisData.severity === "Critical"
              ? "bg-danger/20 text-danger border-danger/30"
              : analysisData.severity === "High"
              ? "bg-warning/20 text-warning border-warning/30"
              : "bg-brand-tertiary text-brand-primary border-brand-primary/30"
          }`}>
            {analysisData.severity} Priority
          </span>
        </div>
        <div className="grid grid-cols-3 gap-xl border-t border-border-secondary pt-lg">
          {[
            ["Analysis Period", analysisPeriod],
            ["Primary Sensor", analysisData.sensor],
            ["Analysis Method", analysisData.analysisType],
            ["AOI Area", `~${analysisData.area}`],
            ["Scenes Used", "18 cloud-free scenes"],
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
              {["Change Type", "Area / Magnitude", "Confidence", "Severity", "Zone"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left text-video-title text-text-tertiary pb-md font-medium"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {[
              ["Water surface recession", "−33.7 km²", "94%", "High", "Entire AOI"],
              ["Sediment deposition", "4.2 km²", "88%", "Medium", "East bank"],
              ["Vegetation stress", "23% buffer", "91%", "Medium", "Peripheral"],
              ["Shoreline stability", "±50 m", "96%", "Low", "West shore"],
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
          <Button variant="neutral" iconStart={<Download size={16} />}>
            PDF Report
          </Button>
          <Button variant="neutral" iconStart={<Download size={16} />}>
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
  );
}