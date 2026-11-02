import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { Filters } from "../api";
import { STATUS_COLORS, pretty } from "../constants";
import { fieldClass, labelClass, secondaryButton } from "../styles";
import CountryPicker from "./CountryPicker";
import YearSlider from "./YearSlider";

type Props = {
  filters: Filters;
  countries: string[];
  yearBounds: [number, number] | null; // earliest and latest start year, if known
  updating: boolean; // new results are loading
  onChange: (filters: Filters) => void;
};

const PHASES = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "N/A"];
const STATUSES = Object.keys(STATUS_COLORS); // every status, including Unknown

export default function FilterBar({
  filters,
  countries,
  yearBounds,
  updating,
  onChange,
}: Props) {
  // How many filters are switched on (shown as a small counter)
  const active = Object.values(filters).filter((v) => v !== undefined).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
        Filters
        {active > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {active} active
          </span>
        )}
        {updating && (
          <span className="ml-auto text-xs font-medium text-blue-600">
            Updating results…
          </span>
        )}
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <label className={labelClass}>
          Phase
          <select
            className={`${fieldClass} mt-1`}
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

        <label className={labelClass}>
          Status
          <select
            className={`${fieldClass} mt-1`}
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

        {/* Not a <label>: the picker has its own clickable parts inside */}
        <div className={labelClass}>
          Country
          <CountryPicker
            value={filters.country}
            countries={countries}
            onChange={(country) => onChange({ ...filters, country })}
          />
        </div>

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
          disabled={active === 0}
          className={`${secondaryButton} h-[38px]`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
