from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

AnalysisType = Literal[
    "urban",
    "water",
    "vegetation-loss",
    "vegetation-gain",
    "infrastructure",
]

FindingType = Literal["critical", "warning", "ok"]


class Finding(BaseModel):
    text: str
    type: FindingType


class TimelineItem(BaseModel):
    date: str
    label: str
    type: str


class SelectedArea(BaseModel):
    id: str
    name: str
    state: str
    latitude: float
    longitude: float
    boundingBox: Optional[Tuple[Tuple[float, float], Tuple[float, float]]] = None
    analysisType: AnalysisType
    changeDescription: str
    beforeDate: str
    afterDate: str
    sensor: str
    confidence: float
    affectedArea: str
    explanation: str


class AnalysisResponse(BaseModel):
    selectedArea: SelectedArea
    location: str
    state: str
    area: str
    changeType: AnalysisType
    sensor: str
    confidence: float
    beforeDate: str
    afterDate: str
    pageTitle: str
    subtitle: str
    reportId: str
    analysisType: str
    severity: str
    beforeLabel: str
    beforeValue: str
    afterLabel: str
    afterValue: str
    netChange: str
    netChangePct: str
    comparisonSubtitle: str
    findings: List[Finding]
    statistics: List[Tuple[str, str]]
    timeline: List[TimelineItem]


class SearchFilters(BaseModel):
    state: Optional[str] = ""
    district: Optional[str] = ""
    dateFrom: Optional[str] = "2023-01-01"
    dateTo: Optional[str] = "2026-12-31"
    changeTypes: Optional[List[str]] = Field(default_factory=list)
    dataSource: Optional[str] = "all"
    minConfidence: Optional[float] = 70.0


class SearchRequest(BaseModel):
    query: str
    filters: Optional[SearchFilters] = None


class SearchResult(BaseModel):
    id: str
    location: str
    state: str
    change: str
    changeType: AnalysisType
    dateRange: str
    area: str
    confidence: float
    explanation: str
    coords: Tuple[float, float]
    sensor: str
    boundingBox: Optional[Tuple[Tuple[float, float], Tuple[float, float]]] = None


class StatCard(BaseModel):
    label: str
    value: str
    delta: str
    positive: bool


class RecentEvent(BaseModel):
    id: str
    region: str
    type: str
    severity: str
    date: str
    confidence: str


class DashboardResponse(BaseModel):
    stats: List[StatCard]
    recentEvents: List[RecentEvent]

