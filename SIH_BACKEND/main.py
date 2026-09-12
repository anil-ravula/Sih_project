from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    SelectedArea,
    AnalysisResponse,
    SearchRequest,
    SearchResult,
    DashboardResponse,
)
from services import (
    search_observations,
    calculate_analysis,
    get_dashboard_data,
)

app = FastAPI(
    title="ISRO SatWatch Geospatial Intelligence API",
    description="Backend API for satellite change detection, semantic search, and intelligence reporting.",
    version="1.0.0",
)

# Enable CORS for local Vite dev server (ports 8443, 5173, 3000, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
def root():
    """Root endpoint for status and links."""
    return {
        "status": "online",
        "message": "ISRO SatWatch Geospatial Intelligence API is running",
        "docs_url": "/docs",
        "health_url": "/api/health",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint to verify backend status."""
    return {
        "status": "healthy",
        "service": "ISRO SatWatch API",
        "version": "1.0.0",
    }


@app.get("/api/search", response_model=List[SearchResult], tags=["Semantic Search"])
def search_get(
    query: str = "",
    state: str = "",
    min_confidence: float = 70.0,
    data_source: str = "all",
):
    """GET variant of search for query params and browser testing."""
    from schemas import SearchFilters
    filters = SearchFilters(
        state=state,
        minConfidence=min_confidence,
        dataSource=data_source,
    )
    return search_observations(query=query, filters=filters)


@app.get("/api/dashboard", response_model=DashboardResponse, tags=["Dashboard"])
def get_dashboard():
    """Returns overview statistics and recent detection events across India."""
    return get_dashboard_data()


@app.post("/api/search", response_model=List[SearchResult], tags=["Semantic Search"])
def search(request: SearchRequest):
    """
    Search satellite observations based on natural language query and optional filters
    (change types, date range, data source, minimum confidence, state).
    """
    try:
        results = search_observations(query=request.query, filters=request.filters)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/api/analysis", response_model=AnalysisResponse, tags=["Change Analysis"])
def analyze_area(area: SelectedArea):
    """
    Performs dynamic change detection analysis for the selected AOI,
    generating quantitative change vectors, findings, statistics, and timelines.
    """
    try:
        response = calculate_analysis(area)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis calculation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

