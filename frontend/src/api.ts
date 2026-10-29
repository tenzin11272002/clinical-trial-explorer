import axios from "axios";

const api = axios.create({ baseURL: "http://127.0.0.1:8000" });

export type JobState = "running" | "done" | "error";

export type SearchStart = {
  state: JobState;
  job_id?: string;
  search_id?: number;
  from_cache: boolean;
};

export type JobProgress = {
  state: JobState;
  fetched: number;
  goal: number | null;
  search_id: number | null;
  error?: string;
};

export type Filters = {
  phase?: string;
  status?: string;
  country?: string;
  year_from?: number;
  year_to?: number;
};

export type Site = {
  nct_id: string;
  facility: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  title: string;
  status: string;
};

export type SitesResponse = {
  sites: Site[];
  missing_coordinates: number;
};

export type LabelCount = { label: string; count: number };

export type Stats = {
  kpis: {
    total_trials: number;
    total_enrollment: number;
    recruiting: number;
    countries: number;
  };
  by_status: LabelCount[];
  by_phase: LabelCount[];
  top_sponsors: LabelCount[];
  by_year: LabelCount[];
};

export type TrialDetail = {
  nct_id: string;
  title: string;
  status: string;
  phase: string;
  sponsor: string;
  enrollment: number | null;
  start_date: string | null;
  sites: {
    facility: string;
    city: string;
    country: string;
    lat: number | null;
    lon: number | null;
  }[];
};

// ---------- Functions: one per backend endpoint ----------

export async function startSearch(
  condition: string,
  drug: string,
  status: string,
) {
  const res = await api.get<SearchStart>("/api/search", {
    params: { condition, drug, status },
  });
  return res.data;
}

export async function getJob(jobId: string) {
  const res = await api.get<JobProgress>(`/api/jobs/${jobId}`);
  return res.data;
}

// Network problem (backend off) vs. the search itself failing
export function errorMessage(err: unknown) {
  if (axios.isAxiosError(err))
    return "Could not reach the backend. Is it running on port 8000?";
  if (err instanceof Error) return err.message;
  return "Search failed.";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start a search and wait until it's finished (polling every second).
// Returns the search_id. Used by the normal search and by "compare drugs".
export async function runSearch(
  condition: string,
  drug: string,
  status: string,
  onProgress?: (progress: JobProgress) => void,
): Promise<number> {
  const start = await startSearch(condition, drug, status);

  // Already cached → done right away
  if (start.search_id) return start.search_id;

  while (true) {
    await wait(1000);
    const job = await getJob(start.job_id!);
    onProgress?.(job);

    if (job.state === "done") return job.search_id!;
    if (job.state === "error") throw new Error(job.error ?? "Search failed.");
  }
}

export async function getSites(searchId: number, filters: Filters = {}) {
  const res = await api.get<SitesResponse>(`/api/searches/${searchId}/sites`, {
    params: filters,
  });
  return res.data;
}

export async function getStats(searchId: number, filters: Filters = {}) {
  const res = await api.get<Stats>(`/api/searches/${searchId}/stats`, {
    params: filters,
  });
  return res.data;
}

export async function getTrial(searchId: number, nctId: string) {
  const res = await api.get<TrialDetail>(
    `/api/searches/${searchId}/trials/${nctId}`,
  );
  return res.data;
}
