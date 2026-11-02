import type { ReactNode } from "react";
import { Activity, FlaskConical, Globe2, MapPin, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LabelCount, Stats } from "../api";
import { colorFor as statusColor, pretty } from "../constants";
import { Card, CardHeader } from "./ui";

// ---------- KPI card ----------

function Kpi({
  icon,
  label,
  value,
  hint,
  tint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
  tint: string; // Tailwind classes for the icon circle
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tint}`}>{icon}</div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </Card>
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

const BLUE = "#2563eb";
const axisTick = { fontSize: 11, fill: "#64748b" };
const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgb(15 23 42 / 0.08)",
  fontSize: 12,
};

function ChartCard({
  title,
  subtitle,
  data,
  horizontal = false,
  colorFor,
  format = asIs,
}: ChartProps) {
  const height = horizontal ? Math.max(220, data.length * 30) : 260;

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="px-3 py-4">
        {data.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-slate-500">
            No trials match these filters. Try resetting a filter.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {horizontal ? (
              <BarChart
                data={data}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={170}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => shorten(format(v))}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => format(String(v))}
                />
                <Bar
                  dataKey="count"
                  name="Trials"
                  fill={BLUE}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                >
                  {colorFor &&
                    data.map((d) => (
                      <Cell key={d.label} fill={colorFor(d.label)} />
                    ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={data} margin={{ right: 8 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  interval={0} // show every label…
                  angle={-35} // …tilted so long ones like "Phase 2/3" fit
                  textAnchor="end"
                  height={60}
                  tickFormatter={(v: string) => format(v)}
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
                  contentStyle={tooltipStyle}
                  labelFormatter={(v) => format(String(v))}
                />
                <Bar
                  dataKey="count"
                  name="Trials"
                  fill={BLUE}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

// ---------- The dashboard: KPI cards and charts ----------

// The row of number cards at the top
export function KpiRow({ stats }: { stats: Stats }) {
  const { kpis } = stats;
  const icon = "h-4 w-4";

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      <Kpi
        icon={<FlaskConical className={icon} />}
        tint="bg-blue-50 text-blue-600"
        label="Trials"
        value={kpis.total_trials}
        hint="matching your search and filters"
      />
      <Kpi
        icon={<MapPin className={icon} />}
        tint="bg-violet-50 text-violet-600"
        label="Sites"
        value={kpis.sites}
        hint="hospitals and clinics running them"
      />
      <Kpi
        icon={<Globe2 className={icon} />}
        tint="bg-cyan-50 text-cyan-600"
        label="Countries"
        value={kpis.countries}
        hint="with at least one trial site"
      />
      <Kpi
        icon={<Activity className={icon} />}
        tint="bg-green-50 text-green-600"
        label="Recruiting now"
        value={kpis.recruiting}
        hint="trials looking for participants"
      />
      <Kpi
        icon={<Users className={icon} />}
        tint="bg-amber-50 text-amber-600"
        label="Total enrollment"
        value={kpis.total_enrollment}
        hint="planned or actual participants"
      />
    </div>
  );
}

// The four charts
export function ChartGrid({ stats }: { stats: Stats }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Trials by status"
        subtitle="Same colours as the map pins."
        data={stats.by_status}
        horizontal
        colorFor={statusColor}
        format={pretty}
      />
      <ChartCard
        title="Trials by phase"
        subtitle="Combined phases (e.g. Phase 2/3) are their own bar. N/A = no phase."
        data={stats.by_phase}
        format={pretty}
      />
      <ChartCard
        title="Top 10 sponsors"
        subtitle="Companies and institutions leading the most trials."
        data={stats.top_sponsors}
        horizontal
      />
      <ChartCard
        title="Trials started per year"
        subtitle="By the trial's (planned) start date."
        data={stats.by_year}
      />
    </div>
  );
}
