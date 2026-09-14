import type { SelectedArea } from "../types"

/**
 * Exports the selected area of interest (AOI) as a standard GeoJSON FeatureCollection.
 * Automatically computes bounding polygon coordinates from the area bounds and triggers a browser download.
 */
export function exportAreaToGeoJSON(area: SelectedArea) {
  if (!area) return

  const lat = area.latitude
  const lon = area.longitude

  const west = area.boundingBox
    ? area.boundingBox[0][1]
    : Number((lon - 0.04).toFixed(4))
  const south = area.boundingBox
    ? area.boundingBox[0][0]
    : Number((lat - 0.04).toFixed(4))
  const east = area.boundingBox
    ? area.boundingBox[1][1]
    : Number((lon + 0.04).toFixed(4))
  const north = area.boundingBox
    ? area.boundingBox[1][0]
    : Number((lat + 0.04).toFixed(4))

  const featureCollection = {
    type: "FeatureCollection",
    name: `ISRO_SatWatch_${area.id}`,
    crs: {
      type: "name",
      properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" },
    },
    features: [
      {
        type: "Feature",
        properties: {
          id: area.id,
          location: area.name,
          state: area.state,
          latitude: lat,
          longitude: lon,
          changeType: area.analysisType,
          changeDescription: area.changeDescription,
          affectedArea: area.affectedArea,
          confidence: area.confidence,
          sensor: area.sensor,
          beforeDate: area.beforeDate,
          afterDate: area.afterDate,
          explanation: area.explanation,
          exportedAt: new Date().toISOString(),
          platform: "ISRO SatWatch Geospatial Platform (SIH 26227)",
        },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [west, south],
              [east, south],
              [east, north],
              [west, north],
              [west, south],
            ],
          ],
        },
      },
    ],
  }

  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
    type: "application/geo+json;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const cleanName = area.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()
  link.href = url
  link.download = `${cleanName}_change_aoi.geojson`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
