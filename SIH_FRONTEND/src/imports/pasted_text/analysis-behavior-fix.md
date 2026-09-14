Fix the analysis state and map behavior. Do NOT redesign the UI.

CURRENT BUGS:

1. I searched for "new construction analysis", but when I click Analyze, the app still shows Sardar Sarovar Reservoir analysis.
2. Every analysis currently produces Sardar Sarovar Reservoir regardless of what I searched/selected.
3. The map on the Semantic Search page is still not using the available central area correctly and sometimes renders only partially.
4. The selected search result and the analysis page are not properly connected.

ROOT CAUSE TO FIX:
Sardar Sarovar Reservoir appears to be hard-coded as the default analysis/location. Remove this hard-coded dependency.

REQUIRED BEHAVIOR:

A. SEARCH → SELECT RESULT → ANALYZE

When the user searches something like:
"new construction analysis"

and selects a relevant result such as a construction/urban-development area:

- Store the selected result in application state.
- Pass the selected area's:
  - name
  - ID
  - location
  - latitude/longitude
  - bounding box if available
  - analysis/change type
  - date range
  - sensor
  - confidence/metadata
  into the analysis page/state.
- Clicking "Analyze" or "Analyze This Area" MUST analyze the selected result.
- NEVER replace the selected result with Sardar Sarovar Reservoir.
- Sardar Sarovar Reservoir may remain as demo/sample data ONLY when no area has been selected yet.

B. SEARCH RESULTS MUST MATCH THE QUERY

Do not return unrelated Sardar Sarovar Reservoir results for every query.

For example:

"new construction analysis"
→ return construction / urban expansion / built-up change related areas.

"urban expansion in Hyderabad"
→ return Hyderabad-related urban expansion areas.

"water change"
→ return water-related areas.

"vegetation loss"
→ return vegetation-related areas.

The existing result cards and mock dataset can be retained, but selection/filtering must actually depend on the search query.

C. ANALYSIS PAGE

The analysis page title, subtitle, location, coordinates, date range, sensor, analysis type, statistics, findings, charts/cards and report data must all come from the SELECTED AREA.

Example:

If selected area =
"Cyberabad IT Corridor, Telangana"

then the analysis page should NOT say:

"Sardar Sarovar Reservoir"

and should NOT display Sardar Sarovar's:
- water area
- reservoir statistics
- water recession
- reservoir findings

Instead, it should display data appropriate to the selected construction/urban-expansion analysis.

Do not merely change the title. The underlying displayed analysis data must correspond to the selected analysis type.

D. MAP FIX

On the Semantic Search page:

- The central map must fill ALL available space between the search-results panel and Area Details panel.
- Use a flex/grid layout correctly.
- Do not use a fixed narrow width for the map.
- Map height must fill the available viewport.
- When the selected area changes, automatically center the map on that area's coordinates/bounding box.
- Automatically zoom to the selected area's bounding box when available.
- If using Leaflet, call invalidateSize() after:
  1. search results change
  2. a result is selected
  3. Area Details opens/closes
  4. the map container changes size
- Do not crop the map to make it look full.
- Make the map container actually occupy the available space.

E. STATE MANAGEMENT

Trace the complete flow:

SearchPage
→ search query
→ result selection
→ selectedResult state
→ Area Details
→ View on Map
→ Compare
→ Generate Report
→ Analyze
→ Analysis Page

All these actions must use the SAME selected result.

Do not create separate hard-coded location state for each page.

If there is currently something like:
selectedArea = SARDAR_SAROVAR
or default analysis data = SARDAR_SAROVAR

replace it with:
selectedArea = actual user-selected search result

Only use Sardar Sarovar as fallback demo data when selectedArea is null.

F. DO NOT BREAK EXISTING FEATURES

Do not change:
- visual design
- colors
- typography
- sidebar
- existing buttons
- navigation
- report layout
- comparison layout
- existing map controls

Only fix:
1. selected-result state propagation
2. query-based result selection/filtering
3. analysis data binding
4. map sizing
5. map centering/zooming

After implementing, test these exact flows:

TEST 1:
Search "urban expansion in Hyderabad"
→ select Cyberabad IT Corridor
→ View on Map
→ map centers on Hyderabad
→ Analyze
→ analysis page says Cyberabad IT Corridor / Hyderabad
→ NOT Sardar Sarovar Reservoir.

TEST 2:
Search "new construction analysis"
→ select a construction/urban expansion result
→ Analyze
→ analysis page uses that selected construction area
→ NOT Sardar Sarovar Reservoir.

TEST 3:
Search "water change"
→ select a water-related result
→ Analyze
→ analysis page shows the selected water area.

TEST 4:
Select a result
→ open/close Area Details
→ map remains fully rendered and fills the central available area.

IMPORTANT:
Do not solve this by simply replacing the text "Sardar Sarovar Reservoir". Fix the actual data/state flow so every selected search result produces its own analysis.