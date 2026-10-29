import { useEffect, useState } from "react";
import {
  errorMessage,
  getSites,
  getStats,
  getTrial,
  type SitesResponse,
  type Stats,
  type TrialDetail,
  type Filters,
} from "./api";
import SearchPanel from "./components/SearchPanel";
import TrialMap from "./components/TrialMap";
import TrialDetails from "./components/TrialDetails";
import FilterBar from "./components/FilterBar";
import Dashboard from "./components/Dashboard";
import ComparePanel from "./components/ComparePanel";

// Shown before the first search, so a new visitor knows what to do
function Welcome() {
  const steps = [
    [
      "1. Search",
      "Type a condition and/or a drug, or click one of the examples.",
    ],
    [
      "2. Explore",
      "See every trial site on the map and the key numbers in the charts.",
    ],
    [
      "3. Filter",
      "Narrow down by phase, status, country or start year. Map and charts update together.",
    ],
  ];
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {steps.map(([title, text]) => (
        <div key={title} className="rounded-lg bg-white p-4 shadow">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{text}</p>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [searchId, setSearchId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sites, setSites] = useState<SitesResponse | null>(null);
  const [selected, setSelected] = useState<TrialDetail | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [yearBounds, setYearBounds] = useState<[number, number] | null>(null);
  const [tab, setTab] = useState<"explore" | "compare">("explore");
  const [loadError, setLoadError] = useState("");

  // Which search + filters the data on screen belongs to.
  // If it differs from what is selected now, new data is still loading.
  const [loadedKey, setLoadedKey] = useState("");
  const currentKey = JSON.stringify({ searchId, filters });
  const loading = searchId !== null && loadedKey !== currentKey;

  // A new search finished: clear the old details panel and filters
  function handleSearchDone(id: number) {
    setSelected(null);
    setFilters({});
    setSearchId(id);
  }

  useEffect(() => {
    if (!searchId) return;
    getSites(searchId)
      .then((data) => {
        const unique = [...new Set(data.sites.map((s) => s.country))];
        setCountries(unique.sort());
      })
      .catch((err) => setLoadError(errorMessage(err)));
    // Earliest and latest start year (unfiltered) set the slider's range
    getStats(searchId)
      .then((data) => {
        const years = data.by_year
          .map((d) => Number(d.label))
          .filter(Number.isFinite);
        setYearBounds(
          years.length ? [Math.min(...years), Math.max(...years)] : null,
        );
      })
      .catch((err) => setLoadError(errorMessage(err)));
  }, [searchId]);

  useEffect(() => {
    if (!searchId) return;
    let cancelled = false; // ignore answers that arrive after the filters changed again
    const key = JSON.stringify({ searchId, filters });

    Promise.all([getStats(searchId, filters), getSites(searchId, filters)])
      .then(([newStats, newSites]) => {
        if (cancelled) return;
        setStats(newStats);
        setSites(newSites);
        setLoadError("");
        setLoadedKey(key);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(errorMessage(err));
        setLoadedKey(key);
      });

    return () => {
      cancelled = true;
    };
  }, [searchId, filters]);

  function handleSelect(nctId: string) {
    if (!searchId) return;
    getTrial(searchId, nctId)
      .then(setSelected)
      .catch((err) => setLoadError(errorMessage(err)));
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-slate-900">
          Clinical Trial Map Explorer
        </h1>
        <p className="mt-1 text-slate-600">
          Find clinical trials from ClinicalTrials.gov and see where in the
          world they run.
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        {(["explore", "compare"] as const).map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`rounded px-4 py-2 text-sm font-medium ${
              tab === name
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 shadow hover:bg-slate-100"
            }`}
          >
            {name === "explore" ? "Explore trials" : "Compare two drugs"}
          </button>
        ))}
      </div>

      {tab === "compare" ? (
        <ComparePanel />
      ) : (
        <>
          <SearchPanel onDone={handleSearchDone} />

          {!searchId && <Welcome />}

          {loadError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </p>
          )}

          {searchId && (
            <div className="mt-4">
              <FilterBar
                filters={filters}
                countries={countries}
                yearBounds={yearBounds}
                onChange={setFilters}
              />
              {loading && (
                <p className="mt-2 text-sm text-blue-600">Updating results…</p>
              )}
            </div>
          )}

          {/* Fade the old results while new ones load */}
          <div className={loading ? "opacity-50 transition-opacity" : ""}>
            {stats && (
              <div className="mt-4">
                <Dashboard stats={stats} />
              </div>
            )}

            {sites && (
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <TrialMap sites={sites.sites} onSelect={handleSelect} />
                  {sites.missing_coordinates > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      {sites.missing_coordinates.toLocaleString()} sites have no
                      location in ClinicalTrials.gov, so they are not on the map
                      (they are still counted in the numbers above).
                    </p>
                  )}
                </div>

                <div>
                  {selected ? (
                    <TrialDetails
                      trial={selected}
                      onClose={() => setSelected(null)}
                    />
                  ) : (
                    <div className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow">
                      <p className="font-semibold text-slate-900">
                        Trial details
                      </p>
                      <p className="mt-1">
                        Click a coloured dot on the map, then{" "}
                        <b>View trial details →</b> to see that trial here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
