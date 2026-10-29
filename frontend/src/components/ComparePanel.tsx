import { useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  errorMessage,
  getStats,
  runSearch,
  type JobProgress,
  type LabelCount,
  type Stats,
} from "../api";
import { pretty } from "../constants";

const COLOR_A = "#2563eb"; // blue
const COLOR_B = "#f97316"; // orange

type Result = { drugA: string; drugB: string; a: Stats; b: Stats };

// Turn two lists like [{label:"PHASE3", count:74}] into one list of rows
// like [{label:"PHASE3", a:74, b:40}] so both drugs can share one chart.
function mergeCounts(a: LabelCount[], b: LabelCount[]) {
  const rows = new Map<string, { label: string; a: number; b: number }>();
  for (const d of a) rows.set(d.label, { label: d.label, a: d.count, b: 0 });
  for (const d of b) {
    const row = rows.get(d.label) ?? { label: d.label, a: 0, b: 0 };
    row.b = d.count;
    rows.set(d.label, row);
  }
  return [...rows.values()];
}

function progressText(name: string, p: JobProgress | null) {
  if (!p) return `${name}: starting…`;
  return `${name}: fetched ${p.fetched} of ${p.goal ?? "…"} trials`;
}

function CompareChart(props: {
  title: string;
  a: LabelCount[];
  b: LabelCount[];
  drugA: string;
  drugB: string;
}) {
  const data = mergeCounts(props.a, props.b);
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="mb-3 font-semibold text-slate-800">{props.title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => pretty(v)}
          />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(v) => pretty(String(v))} />
          <Legend />
          <Bar dataKey="a" name={props.drugA} fill={COLOR_A} />
          <Bar dataKey="b" name={props.drugB} fill={COLOR_B} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ComparePanel() {
  const [condition, setCondition] = useState("");
  const [drugA, setDrugA] = useState("");
  const [drugB, setDrugB] = useState("");
  const [progressA, setProgressA] = useState<JobProgress | null>(null);
  const [progressB, setProgressB] = useState<JobProgress | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCompare(event: FormEvent) {
    event.preventDefault();

    if (!drugA.trim() || !drugB.trim()) {
      setError("Please enter two drugs to compare.");
      return;
    }

    setError("");
    setResult(null);
    setProgressA(null);
    setProgressB(null);
    setBusy(true);

    try {
      // Run both searches at the same time and wait for both
      const [idA, idB] = await Promise.all([
        runSearch(condition, drugA, "", setProgressA),
        runSearch(condition, drugB, "", setProgressB),
      ]);
      const [a, b] = await Promise.all([getStats(idA), getStats(idB)]);
      setResult({ drugA: drugA.trim(), drugB: drugB.trim(), a, b });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const kpiRows: [string, keyof Stats["kpis"]][] = [
    ["Trials", "total_trials"],
    ["Total enrollment", "total_enrollment"],
    ["Recruiting now", "recruiting"],
    ["Countries", "countries"],
  ];

  return (
    <div className="space-y-4">
      <form onSubmit={handleCompare} className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-wrap gap-3">
          <input
            className="flex-1 rounded border border-slate-300 px-3 py-2"
            placeholder="Condition (optional, e.g. obesity)"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          />
          <input
            className="flex-1 rounded border-2 px-3 py-2"
            style={{ borderColor: COLOR_A }}
            placeholder="Drug A (e.g. semaglutide)"
            value={drugA}
            onChange={(e) => setDrugA(e.target.value)}
          />
          <input
            className="flex-1 rounded border-2 px-3 py-2"
            style={{ borderColor: COLOR_B }}
            placeholder="Drug B (e.g. tirzepatide)"
            value={drugB}
            onChange={(e) => setDrugB(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Comparing…" : "Compare"}
          </button>
        </div>

        {busy && (
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>{progressText(drugA, progressA)}</p>
            <p>{progressText(drugB, progressB)}</p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <>
          <div className="overflow-x-auto rounded-lg bg-white p-4 shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-1"></th>
                  <th className="py-1" style={{ color: COLOR_A }}>
                    {result.drugA}
                  </th>
                  <th className="py-1" style={{ color: COLOR_B }}>
                    {result.drugB}
                  </th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map(([label, key]) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="py-2 text-slate-500">{label}</td>
                    <td className="py-2 font-semibold">
                      {result.a.kpis[key].toLocaleString()}
                    </td>
                    <td className="py-2 font-semibold">
                      {result.b.kpis[key].toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CompareChart
              title="Trials by phase"
              a={result.a.by_phase}
              b={result.b.by_phase}
              drugA={result.drugA}
              drugB={result.drugB}
            />
            <CompareChart
              title="Trials by status"
              a={result.a.by_status}
              b={result.b.by_status}
              drugA={result.drugA}
              drugB={result.drugB}
            />
          </div>
        </>
      )}
    </div>
  );
}
