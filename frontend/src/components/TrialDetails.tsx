import type { TrialDetail } from "../api";
import { colorFor, pretty } from "../constants";

type Props = {
  trial: TrialDetail;
  onClose: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function TrialDetails({ trial, onClose }: Props) {
  const countries = [...new Set(trial.sites.map((s) => s.country))];
  const missing = trial.sites.filter(
    (s) => s.lat === null || s.lon === null,
  ).length;

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{trial.title}</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Coloured status badge, same colour as the trial's map pins */}
      <span
        className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: colorFor(trial.status) }}
      >
        {pretty(trial.status)}
      </span>

      <div className="mt-3">
        <Row label="NCT ID" value={trial.nct_id} />
        <Row label="Phase" value={pretty(trial.phase)} />
        <Row label="Sponsor" value={trial.sponsor} />
        <Row
          label="Enrollment"
          value={trial.enrollment?.toLocaleString() ?? "Not given"}
        />
        <Row label="Start date" value={trial.start_date ?? "Not given"} />
        <Row
          label="Sites"
          value={`${trial.sites.length} in ${countries.length} countries`}
        />
      </div>

      {missing > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          {missing} of these sites have no map location.
        </p>
      )}

      <a
        href={`https://clinicaltrials.gov/study/${trial.nct_id}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
      >
        Open on ClinicalTrials.gov ↗
      </a>
    </div>
  );
}
