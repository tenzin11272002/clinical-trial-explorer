import { useState } from "react";

type Props = {
  min: number; // earliest start year in this search
  max: number; // latest start year in this search
  from?: number; // current year_from filter (undefined = no limit)
  to?: number; // current year_to filter (undefined = no limit)
  onChange: (from?: number, to?: number) => void;
};

// Two sliders: one for the start of the range, one for the end.
// While dragging we only keep a "draft" range; the filter is applied when
// the user lets go, so the map isn't redrawn on every pixel.
export default function YearSlider({ min, max, from, to, onChange }: Props) {
  const [draft, setDraft] = useState<[number, number] | null>(null);

  // Show the draft while dragging, otherwise the applied filter (or full range)
  const low = draft?.[0] ?? from ?? min;
  const high = draft?.[1] ?? to ?? max;

  function apply() {
    if (!draft) return;
    const [newLow, newHigh] = draft;
    // Full range = no year filter, so trials without a start date still show
    onChange(
      newLow === min ? undefined : newLow,
      newHigh === max ? undefined : newHigh,
    );
    setDraft(null);
  }

  return (
    <div className="text-sm text-slate-600">
      <p>
        Start year: <b className="text-slate-900">{low}</b> –{" "}
        <b className="text-slate-900">{high}</b>
      </p>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          aria-label="Start year from"
          min={min}
          max={max}
          value={low}
          onChange={(e) =>
            setDraft([Math.min(Number(e.target.value), high), high])
          }
          onPointerUp={apply}
          onKeyUp={apply}
          className="w-32 accent-blue-600"
        />
        <input
          type="range"
          aria-label="Start year to"
          min={min}
          max={max}
          value={high}
          onChange={(e) =>
            setDraft([low, Math.max(Number(e.target.value), low)])
          }
          onPointerUp={apply}
          onKeyUp={apply}
          className="w-32 accent-blue-600"
        />
      </div>
    </div>
  );
}
