import { useState, type FormEvent } from "react";
import { Loader2, Pill, Search, Stethoscope, X } from "lucide-react";
import { errorMessage, runSearch, type JobProgress } from "../api";
import { pretty } from "../constants";
import {
  fieldClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "../styles";
import { Card } from "./ui";
import SuggestInput from "./SuggestInput";

type Props = {
  onDone: (searchId: number) => void; // App tells us what to do when the search is finished
  onClear: () => void; // App clears the results and shows the start page again
  hasResults: boolean; // are results shown below?
};

const STATUSES = [
  "RECRUITING",
  "NOT_YET_RECRUITING",
  "ACTIVE_NOT_RECRUITING",
  "COMPLETED",
  "TERMINATED",
];

// One-click examples so a first-time visitor can see the app working right away
const EXAMPLES = [
  { condition: "obesity", drug: "semaglutide" },
  { condition: "obesity", drug: "tirzepatide" },
  { condition: "asthma", drug: "dupilumab" },
  { condition: "breast cancer", drug: "" },
];

export default function SearchPanel({ onDone, onClear, hasResults }: Props) {
  const [condition, setCondition] = useState("");
  const [drug, setDrug] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(cond: string, drg: string, stat: string) {
    if (!cond.trim() && !drg.trim()) {
      setError("Please type a condition or a drug (or both).");
      return;
    }

    setError("");
    setProgress(null);
    setBusy(true);

    try {
      const searchId = await runSearch(cond, drg, stat, setProgress);
      onDone(searchId);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser from reloading the page
    search(condition, drug, status);
  }

  function tryExample(example: { condition: string; drug: string }) {
    setCondition(example.condition);
    setDrug(example.drug);
    setStatus("");
    search(example.condition, example.drug, "");
  }

  // Empty the boxes and go back to the start page
  function handleClear() {
    setCondition("");
    setDrug("");
    setStatus("");
    setError("");
    onClear();
  }

  const canClear = !busy && (condition || drug || status || hasResults);

  const percent = progress?.goal
    ? Math.round((progress.fetched / progress.goal) * 100)
    : 0;

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_14rem_auto] md:items-end">
          <label className={labelClass}>
            Condition or disease
            <SuggestInput
              field="condition"
              placeholder="e.g. obesity"
              icon={<Stethoscope className="h-4 w-4" />}
              value={condition}
              onChange={setCondition}
            />
          </label>

          <label className={labelClass}>
            Drug or treatment
            <SuggestInput
              field="drug"
              placeholder="e.g. semaglutide"
              icon={<Pill className="h-4 w-4" />}
              value={drug}
              onChange={setDrug}
            />
          </label>

          <label className={labelClass}>
            Trial status
            <select
              className={`${fieldClass} mt-1`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {pretty(s)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={`${primaryButton} h-[38px] flex-1`}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {busy ? "Searching…" : "Search"}
            </button>
            {canClear && (
              <button
                type="button"
                onClick={handleClear}
                className={`${secondaryButton} h-[38px]`}
                title="Clear the search and start again"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {!busy && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-500">Try an example:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={`${ex.condition}-${ex.drug}`}
              type="button"
              onClick={() => tryExample(ex)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {ex.drug ? `${ex.condition} + ${ex.drug}` : ex.condition}
            </button>
          ))}
        </div>
      )}

      {busy && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-600">
            <span>
              {progress
                ? `Downloading from ClinicalTrials.gov: ${progress.fetched.toLocaleString()} of ${progress.goal?.toLocaleString() ?? "…"} trials`
                : "Starting search… (searches you have run before load instantly)"}
            </span>
            {progress && (
              <span className="font-semibold text-slate-900">{percent}%</span>
            )}
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </Card>
  );
}
