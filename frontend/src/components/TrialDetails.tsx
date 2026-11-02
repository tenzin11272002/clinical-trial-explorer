import { ExternalLink, X } from "lucide-react";
import type { TrialDetail } from "../api";
import { colorFor, pretty } from "../constants";
import { Badge, Card } from "./ui";

type Props = {
  trial: TrialDetail;
  onClose: () => void;
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

export default function TrialDetails({ trial, onClose }: Props) {
  const missing = trial.sites.filter(
    (s) => s.lat === null || s.lon === null,
  ).length;

  // Count sites per country and keep the 5 biggest
  const perCountry = new Map<string, number>();
  for (const s of trial.sites) {
    perCountry.set(s.country, (perCountry.get(s.country) ?? 0) + 1);
  }
  const topCountries = [...perCountry.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {trial.nct_id}
          </p>
          <h2 className="mt-1 text-sm font-semibold leading-snug text-slate-900">
            {trial.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* Same colour as the trial's map pins */}
            <Badge color={colorFor(trial.status)}>{pretty(trial.status)}</Badge>
            <Badge>{pretty(trial.phase)}</Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close trial details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-4 px-5 py-4">
        <div className="col-span-2">
          <Fact label="Sponsor" value={trial.sponsor} />
        </div>
        <Fact
          label="Enrollment"
          value={
            trial.enrollment != null
              ? `${trial.enrollment.toLocaleString()} people`
              : "Not given"
          }
        />
        <Fact label="Start date" value={trial.start_date ?? "Not given"} />
        <Fact label="Sites" value={trial.sites.length.toLocaleString()} />
        <Fact label="Countries" value={perCountry.size.toLocaleString()} />
      </dl>

      {topCountries.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-xs font-medium text-slate-500">Sites by country</p>
          <ul className="mt-2 space-y-1.5">
            {topCountries.map(([country, count]) => (
              <li key={country} className="flex items-center gap-2 text-sm">
                <span className="w-32 truncate text-slate-700">{country}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-blue-500"
                    style={{ width: `${(count / topCountries[0][1]) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right tabular-nums text-slate-500">
                  {count}
                </span>
              </li>
            ))}
          </ul>
          {perCountry.size > 5 && (
            <p className="mt-2 text-xs text-slate-400">
              + {perCountry.size - 5} more countries
            </p>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4">
        {missing > 0 && (
          <p className="mb-3 text-xs text-slate-500">
            {missing} of these sites have no map location.
          </p>
        )}
        <a
          href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Open on ClinicalTrials.gov
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </Card>
  );
}
