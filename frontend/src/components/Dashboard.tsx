import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelCount, Stats } from "../api";
import { colorFor as statusColor, pretty } from "../constants";

// ---------- KPI card ----------

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

// ---------- One reusable bar chart ----------

type ChartProps = {
  title: string;
  subtitle?: string;
  data: LabelCount[];
  horizontal?: boolean; // bars going sideways (good for long names)
  colorFor?: (label: string) => string; // optional colour per bar
  format?: (label: string) => string; // how to show a label (default: as is)
};

const asIs = (text: string) => text;
const shorten = (text: string) =>
  text.length > 24 ? text.slice(0, 23) + "…" : text;

function ChartCard({
  title,
  subtitle,
  data,
  horizontal = false,
  colorFor,
  format = asIs,
}: ChartProps) {
  const height = horizontal ? Math.max(200, data.length * 30) : 250;

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mb-3 text-xs text-slate-400">
        {subtitle ?? "Hover a bar to see the exact number."}
      </p>

      {data.length === 0 ? (
        <p className="text-sm text-slate-500">
          No trials match these filters. Try clearing a filter.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {horizontal ? (
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={170}
                tick={{ fontSize: 12 }}
                tickFormatter={(v: string) => shorten(format(v))}
              />
              <Tooltip labelFormatter={(v) => format(String(v))} />
              <Bar dataKey="count" name="Trials" fill="#2563eb">
                {colorFor &&
                  data.map((d) => (
                    <Cell key={d.label} fill={colorFor(d.label)} />
                  ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={data}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0} // show every label…
                angle={-35} // …tilted so long ones like "Phase 2/3" fit
                textAnchor="end"
                height={60}
                tickFormatter={(v: string) => format(v)}
              />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={(v) => format(String(v))} />
              <Bar dataKey="count" name="Trials" fill="#2563eb" />
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ---------- The whole dashboard ----------

export default function Dashboard({ stats }: { stats: Stats }) {
  const { kpis } = stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi
          label="Trials"
          value={kpis.total_trials}
          hint="matching your search and filters"
        />
        <Kpi
          label="Total enrollment"
          value={kpis.total_enrollment}
          hint="planned or actual participants"
        />
        <Kpi
          label="Recruiting now"
          value={kpis.recruiting}
          hint="trials currently looking for people"
        />
        <Kpi
          label="Countries"
          value={kpis.countries}
          hint="with at least one trial site"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Trials by status"
          data={stats.by_status}
          horizontal
          colorFor={statusColor}
          format={pretty}
          subtitle="Same colours as the map pins."
        />
        <ChartCard
          title="Trials by phase"
          data={stats.by_phase}
          format={pretty}
          subtitle="N/A = no phase (e.g. observational studies)."
        />
        <ChartCard
          title="Top 10 sponsors"
          data={stats.top_sponsors}
          horizontal
          subtitle="Hover a name to see it in full."
        />
        <ChartCard title="Trials by start year" data={stats.by_year} />
      </div>
    </div>
  );
}
