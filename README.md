# Clinical Trial Map Explorer

Search clinical trials for a condition and/or drug and see them on an interactive world map: where trials are running, what phase they are in, who sponsors them, and how the numbers break down.

Built for the Eclypse AI full-stack task. Data comes live from the free [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/api).

![Example search: obesity + semaglutide](docs/screenshot.png)
<!-- Add a screenshot at docs/screenshot.png, or remove this line. -->

## Features

- **Search** by condition, drug and status, with a **live progress bar** ("Downloading 300 of 1000 trials…"). One-click example searches for first-time visitors.
- **Clustered world map** of every trial site, with **pins coloured by status** and a legend. Click a pin to see the trial, site and status, then open the full details.
- **Trial details panel**: status, phase, sponsor, enrollment, start date, number of sites and countries, and a link to the trial on ClinicalTrials.gov.
- **Filters**: phase, status, country and a **start-year range slider**. The map, KPI cards and all charts update together.
- **Dashboard**: KPI cards (trials, total enrollment, recruiting now, countries) and charts for trials by status, by phase, top 10 sponsors and trials per start year.
- **Compare two drugs** side by side (e.g. semaglutide vs tirzepatide): KPIs plus grouped charts by phase and status.
- **Caching**: a repeated search is answered instantly from SQLite.

## Tech stack

| Part | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS v4 |
| Map | Leaflet + react-leaflet, `leaflet.markercluster` |
| Charts | Recharts |
| HTTP | Axios |
| Backend | Python + FastAPI, `requests` |
| Storage | SQLite (Python's built-in `sqlite3`) |

## Setup

You need **Python 3.11+** and **Node.js 20+** (developed on Python 3.13 and Node 22).

### 1. Backend (terminal 1)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at http://127.0.0.1:8000, with interactive docs at http://127.0.0.1:8000/docs.
The SQLite file `clinical_trials.db` is created automatically on first start.

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click one of the example searches.

## How it works

```
Browser (React)                     FastAPI                            ClinicalTrials.gov
───────────────                     ───────                            ──────────────────
GET /api/search ─────────────────►  cached in SQLite? ──yes──► search_id (instant)
                                        │ no
                                        ▼
                                    start background job ──────────►  GET /studies (page 1, 2, 3…)
GET /api/jobs/{id}  (every 1 s) ◄── progress: fetched / goal           follow nextPageToken
                                        │ done
                                        ▼
                                    save trials + sites to SQLite → search_id

GET /api/searches/{id}/sites  ?phase&status&country&year_from&year_to   → map pins
GET /api/searches/{id}/stats  ?same filters                             → KPIs + charts
GET /api/searches/{id}/trials/{nct_id}                                  → details panel
```

### Backend files

- `backend/services/clinical_trials.py`: calls the API, follows `nextPageToken` page by page, and flattens each study's nested JSON into a simple trial with a list of sites.
- `backend/db.py`: SQLite tables (`searches`, `trials`, `sites`), the cache lookup, and the queries for sites, stats and trial details.
- `backend/main.py`: the FastAPI endpoints and the background search jobs.

### Frontend files

- `src/api.ts`: every backend call plus TypeScript types for the data. `runSearch()` starts a search and polls its progress.
- `src/components/`: `SearchPanel`, `FilterBar`, `YearSlider`, `Dashboard`, `TrialMap`, `TrialDetails`, `ComparePanel`.
- `src/constants.ts`: status colours and `pretty()`, which turns API codes into readable labels (`NOT_YET_RECRUITING` → "Not yet recruiting").

## Design decisions

**Store results in SQLite and query them, instead of keeping everything in memory.**
Each search is saved once (one row per trial, one row per site). Filters and charts are then simple SQL `WHERE` / `GROUP BY` queries on the server, so the browser never downloads more than it shows. It also makes the cache survive a server restart.

**One shared filter helper.**
`trial_filters()` in `db.py` builds the SQL conditions for phase, status, country and year. Both the map endpoint and the stats endpoint use it, so the map and the charts can never disagree about which trials are included.

**Background job + polling for progress.**
A big search takes 5–15 seconds (up to 10 pages). `/api/search` starts the download in a background thread and returns a job id at once. The frontend asks `/api/jobs/{id}` every second and shows "fetched X of Y". This needs no WebSockets and is easy to follow.

**A safety limit of 1,000 trials per search.**
"Obesity" alone matches about 15,000 trials. Downloading all of them would take minutes, so a search stops after 1,000 trials (10 pages). The progress bar counts to the real goal (`min(total, 1000)`), so it never gets stuck.

### The "things to handle" from the task

- **Trials with hundreds of sites.** Pins are grouped with `leaflet.markercluster` (numbered bubbles that split as you zoom in). Markers are plain Leaflet objects added in chunks (`chunkedLoading`) rather than one React component per pin, and only one icon object is created per status and shared by every pin. Many sites share the exact same city coordinates, so `spiderfyOnMaxZoom` spreads them out when you click a bubble at full zoom.
- **Sites with missing coordinates.** They are stored, counted in every number and shown in the trial details, but left off the map. The app says how many are missing (e.g. "240 sites have no location…") instead of hiding them silently.
- **Combined phases** (e.g. `PHASE2/PHASE3`). A combined trial is counted **once**, as its own bar ("Phase 2/3") in the phase chart, so totals still add up to the number of trials. When filtering, it matches both of its phases: filtering for Phase 2 also includes Phase 1/2 and Phase 2/3 trials. `EARLY_PHASE1` is kept separate from Phase 1. An empty phase (common for observational studies) and the API's `NA` are both shown as "N/A".
- **Caching.** Searches are normalised (trimmed, lower-case) and looked up in SQLite before calling the API, so "Obesity " and "obesity" hit the same cache entry.

## Limitations

- **1,000-trial limit per search.** Very broad searches show a sample of the matching trials, not all of them. The total that ClinicalTrials.gov reports is stored, but the UI does not show it yet.
- **The cache never expires.** A saved search is not refreshed, so trials added to ClinicalTrials.gov later will not appear. A simple fix would be to ignore cached searches older than e.g. 24 hours.
- **Jobs live in memory.** Restarting the backend forgets searches that were still downloading (finished searches are safe in SQLite). A single server process is assumed.
- **Status and year are filtered after the download.** The status in the search form is sent to the API; the year range is applied afterwards as a filter, not as part of the API query.
- **Trials without a start date** are excluded when a year range is active.
- **Total enrollment** is a plain sum, so a few very large observational studies (100,000+ people) can dominate it.
- **Year slider** filters a range; it does not animate year by year. **Compare two drugs** compares the numbers and charts, not both drugs on one map.
- No automated tests yet; everything was tested by hand (Swagger at `/docs` for the backend, the browser for the frontend).

## Future improvements

- Show the full API total next to the 1,000-trial sample, and let users load more.
- Cache expiry and a "refresh" button.
- Play/animate the year slider, and show both compared drugs on one map.
- Backend tests (pytest) for the filters and the phase handling; frontend component tests.

## How I used AI tools

I used **Claude Code** (Anthropic) throughout the project:

- **Learning and step-by-step guidance.** I'm new to parts of this stack, so I asked it to explain each concept (pagination, caching, SQL `JOIN` / `GROUP BY`, threads and polling, React state and effects) and to break the work into small steps. I built the backend and the core frontend this way and tested each step in Swagger or the browser.
- **Code review.** After each step it reviewed my code and caught bugs, for example typos in JSON keys that `.get()` defaults were hiding, a duplicate import, and a country count that disagreed with the map.
- **Code suggestions.** For the bonus features and UI polish I worked more directly from its code, then studied and tested it until I understood how it works.
