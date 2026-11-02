import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { fieldClass } from "../styles";

type Props = {
  value?: string; // selected country, undefined = all countries
  countries: string[];
  onChange: (country?: string) => void;
};

// A country filter you can type into. The list opens right under the box,
// shrinks as you type, and works with the keyboard (↑ ↓ Enter Esc).
export default function CountryPicker({ value, countries, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // Countries that START with the typed text come first ("ger" → Germany before Algeria)
  const typed = query.trim().toLowerCase();
  const startsWith = countries.filter((c) => c.toLowerCase().startsWith(typed));
  const contains = countries.filter(
    (c) =>
      !c.toLowerCase().startsWith(typed) && c.toLowerCase().includes(typed),
  );
  const matches = [...startsWith, ...contains];

  // With nothing typed, "All countries" is the first choice
  const options: (string | undefined)[] = query
    ? matches
    : [undefined, ...matches];

  function choose(country?: string) {
    onChange(country);
    setOpen(false);
    setQuery("");
  }

  function moveHighlight(index: number) {
    const next = Math.max(0, Math.min(index, options.length - 1));
    setHighlight(next);
    // Keep the highlighted row visible inside the scrolling list
    requestAnimationFrame(() =>
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" }),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(highlight + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(highlight - 1);
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (options.length > 0) choose(options[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative mt-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={`${fieldClass} pl-9 pr-14`}
        // While typing show what is typed; otherwise show the chosen country
        value={open ? query : (value ?? "")}
        placeholder={value ?? `All countries (${countries.length})`}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onKeyDown={handleKeyDown}
      />

      {/* Clear button when a country is chosen, otherwise a down arrow */}
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-slate-400">
        {value && (
          <button
            type="button"
            aria-label="Clear country"
            className="rounded p-0.5 hover:bg-slate-100 hover:text-slate-700"
            // onMouseDown + preventDefault keeps the input from losing focus first
            onMouseDown={(e) => {
              e.preventDefault();
              choose(undefined);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className="pointer-events-none h-4 w-4" />
      </div>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-slate-500">
              No country matches “{query}”
            </li>
          )}
          {options.map((country, i) => {
            const selected = country === value;
            return (
              <li
                key={country ?? "__all"}
                role="option"
                aria-selected={selected}
                // preventDefault stops the input's onBlur from closing the list before the click
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(country);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex cursor-pointer items-center justify-between px-3 py-1.5 ${
                  i === highlight
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700"
                }`}
              >
                {country ?? `All countries (${countries.length})`}
                {selected && <Check className="h-4 w-4 text-blue-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
