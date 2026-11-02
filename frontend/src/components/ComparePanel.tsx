import { useState, type FormEvent } from "react";
import { GitCompareArrows, Loader2, Pill, Stethoscope } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { labelClass, primaryButton } from "../styles";
import SuggestInput from "./SuggestInput";
import { Card, CardHeader } from "./ui";

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
  return `${name}: fetched ${p.fetched.toLocaleString()} of ${p.goal?.toLocaleString() ?? "…"} trials`;
}

const axisTick = { fontSize: 11, fill: "#64748b" };

function CompareChart(props: {
  title: string;
  a: LabelCount[];
  b: LabelCount[];
  drugA: string;
  drugB: string;
}) {
  const data = mergeCounts(props.a, props.b);
  return (
    <Card>
      <CardHeader title={props.title} />
      <div className="px-3 py-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ right: 8 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
              tickFormatter={(v: string) => pretty(v)}
            />
            <YAxis
              allowDecimals={false}
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
              labelFormatter={(v) => pretty(String(v))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="a"
              name={props.drugA}
              fill={COLOR_A}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="b"
              name={props.drugB}
              fill={COLOR_B}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
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
    ["Sites", "sites"],
    ["Countries", "countries"],
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Compare two drugs
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Runs both searches at the same time and puts the results side by
            side.
          </p>
        </div>

        <form
          onSubmit={handleCompare}
          className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
        >
          <label className={labelClass}>
            Condition (optional)
            <SuggestInput
              field="condition"
              placeholder="e.g. obesity"
              icon={<Stethoscope className="h-4 w-4" />}
              value={condition}
              onChange={setCondition}
            />
          </label>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLOR_A }}
              />
              Drug A
            </span>
            <SuggestInput
              field="drug"
              placeholder="e.g. semaglutide"
              icon={<Pill className="h-4 w-4" style={{ color: COLOR_A }} />}
              value={drugA}
              onChange={setDrugA}
            />
          </label>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLOR_B }}
              />
              Drug B
            </span>
            <SuggestInput
              field="drug"
              placeholder="e.g. tirzepatide"
              icon={<Pill className="h-4 w-4" style={{ color: COLOR_B }} />}
              value={drugB}
              onChange={setDrugB}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className={`${primaryButton} h-[38px]`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitCompareArrows className="h-4 w-4" />
            )}
            {busy ? "Comparing…" : "Compare"}
          </button>
        </form>

        {busy && (
          <div className="mt-4 space-y-1 text-xs text-slate-600">
            <p>{progressText(drugA, progressA)}</p>
            <p>{progressText(drugB, progressB)}</p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </Card>

      {result && (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3"></th>
                  <th className="px-5 py-3" style={{ color: COLOR_A }}>
                    {result.drugA}
                  </th>
                  <th className="px-5 py-3" style={{ color: COLOR_B }}>
                    {result.drugB}
                  </th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map(([label, key]) => (
                  <tr key={key} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-slate-600">{label}</td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-slate-900">
                      {result.a.kpis[key].toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-semibold tabular-nums text-slate-900">
                      {result.b.kpis[key].toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
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
