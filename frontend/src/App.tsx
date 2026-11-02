import { useEffect, useState } from "react";
import {
  BarChart3,
  GitCompareArrows,
  Map as MapIcon,
  MapPinned,
  MousePointerClick,
  Search,
  SlidersHorizontal,
} from "lucide-react";
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
import { ChartGrid, KpiRow } from "./components/Dashboard";
import ComparePanel from "./components/ComparePanel";
import { Card } from "./components/ui";

// Shown before the first search, so a new visitor knows what to do
function Welcome() {
  const steps = [
    {
      icon: <Search className="h-5 w-5" />,
      title: "1. Search",
      text: "Type a condition and/or a drug, or click one of the examples above.",
    },
    {
      icon: <MapIcon className="h-5 w-5" />,
      title: "2. Explore",
      text: "See every trial site on a world map and the key numbers in charts.",
    },
    {
      icon: <SlidersHorizontal className="h-5 w-5" />,
      title: "3. Filter",
      text: "Narrow down by phase, status, country or start year. Map and charts update together.",
    },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {steps.map((step) => (
        <Card key={step.title} className="p-5">
          <div className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600">
            {step.icon}
          </div>
          <p className="mt-3 font-semibold text-slate-900">{step.title}</p>
          <p className="mt-1 text-sm text-slate-600">{step.text}</p>
        </Card>
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

  // "Clear" in the search box: remove the results and show the start page again
  function handleClear() {
    setSearchId(null);
    setStats(null);
    setSites(null);
    setSelected(null);
    setFilters({});
    setCountries([]);
    setYearBounds(null);
    setLoadError("");
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
    <div className="flex min-h-screen flex-col">
      {/* ---------- Top bar ---------- */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <MapPinned className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Clinical Trial Map Explorer
              </h1>
              <p className="text-xs text-slate-500">
                Where clinical trials run, what phase they are in, and who
                sponsors them
              </p>
            </div>
          </div>

          {/* Tabs as a segmented control */}
          <nav className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {(
              [
                [
                  "explore",
                  "Explore trials",
                  <BarChart3 key="i" className="h-4 w-4" />,
                ],
                [
                  "compare",
                  "Compare two drugs",
                  <GitCompareArrows key="i" className="h-4 w-4" />,
                ],
              ] as const
            ).map(([name, label, icon]) => (
              <button
                key={name}
                onClick={() => setTab(name)}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 transition ${
                  tab === name
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 py-6 md:px-6">
        {tab === "compare" ? (
          <ComparePanel />
        ) : (
          <>
            <SearchPanel
              onDone={handleSearchDone}
              onClear={handleClear}
              hasResults={searchId !== null}
            />

            {!searchId && <Welcome />}

            {loadError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </p>
            )}

            {/* Sticks to the top while you scroll, so filters are always at hand */}
            {searchId && (
              <div className="sticky top-2 z-[1100]">
                <FilterBar
                  filters={filters}
                  countries={countries}
                  yearBounds={yearBounds}
                  updating={loading}
                  onChange={setFilters}
                />
              </div>
            )}

            {/* Fade the old results while new ones load */}
            <div
              className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}
            >
              {stats && <KpiRow stats={stats} />}

              {sites && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <TrialMap
                      sites={sites.sites}
                      missing={sites.missing_coordinates}
                      onSelect={handleSelect}
                    />
                  </div>

                  {/* On wide screens the details panel stays in view beside the map */}
                  <div className="lg:sticky lg:top-40 lg:self-start">
                    {selected ? (
                      <TrialDetails
                        trial={selected}
                        onClose={() => setSelected(null)}
                      />
                    ) : (
                      <Card className="p-6 text-center">
                        <div className="mx-auto inline-flex rounded-full bg-slate-100 p-3 text-slate-500">
                          <MousePointerClick className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          No trial selected
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Click a coloured dot on the map, then{" "}
                          <span className="font-medium text-blue-600">
                            View trial details →
                          </span>{" "}
                          to see the trial here.
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {stats && <ChartGrid stats={stats} />}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500 md:px-6">
          Data from the{" "}
          <a
            href="https://clinicaltrials.gov/data-api/api"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-slate-700 hover:underline"
          >
            ClinicalTrials.gov API
          </a>
          . Map data © OpenStreetMap contributors.
        </p>
      </footer>
    </div>
  );
}

export default App;
