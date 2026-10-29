import type { Filters } from "../api";
import { STATUS_COLORS, pretty } from "../constants";
import YearSlider from "./YearSlider";

type Props = {
  filters: Filters;
  countries: string[];
  yearBounds: [number, number] | null; // earliest and latest start year, if known
  onChange: (filters: Filters) => void;
};

const PHASES = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "N/A"];
const STATUSES = [...Object.keys(STATUS_COLORS), "UNKNOWN"];

const selectClass =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm";

export default function FilterBar({
  filters,
  countries,
  yearBounds,
  onChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
      <label className="text-sm text-slate-600">
        Phase
        <select
          className={`${selectClass} block`}
          value={filters.phase ?? ""}
          onChange={(e) =>
            onChange({ ...filters, phase: e.target.value || undefined })
          }
        >
          <option value="">All phases</option>
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {pretty(p)}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-slate-600">
        Status
        <select
          className={`${selectClass} block`}
          value={filters.status ?? ""}
          onChange={(e) =>
            onChange({ ...filters, status: e.target.value || undefined })
          }
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {pretty(s)}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm text-slate-600">
        Country
        <select
          className={`${selectClass} block`}
          value={filters.country ?? ""}
          onChange={(e) =>
            onChange({ ...filters, country: e.target.value || undefined })
          }
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {yearBounds && (
        <YearSlider
          min={yearBounds[0]}
          max={yearBounds[1]}
          from={filters.year_from}
          to={filters.year_to}
          onChange={(from, to) =>
            onChange({ ...filters, year_from: from, year_to: to })
          }
        />
      )}

      <button
        onClick={() => onChange({})}
        className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        Clear filters
      </button>
    </div>
  );
}
