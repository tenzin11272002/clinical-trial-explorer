import { useId, useRef, useState, type ReactNode } from "react";
import { getSuggestions } from "../api";
import { fieldClass } from "../styles";

type Props = {
  field: "condition" | "drug"; // which list to suggest from
  value: string;
  placeholder: string;
  icon: ReactNode;
  onChange: (text: string) => void;
};

// A text box that suggests names from ClinicalTrials.gov while you type
// ("dia" → Diabetes, Diabetic Retinopathy…). Typing your own text still works.
export default function SuggestInput({
  field,
  value,
  placeholder,
  icon,
  onChange,
}: Props) {
  const [items, setItems] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1); // -1 = nothing highlighted, Enter searches what is typed
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(""); // the newest text, to ignore slow, outdated answers
  const listId = useId();

  function handleType(text: string) {
    onChange(text);
    setHighlight(-1);
    latest.current = text;

    // Wait until the user pauses typing for 250 ms, then ask once (a "debounce")
    window.clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setItems([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const list = await getSuggestions(field, text);
        if (latest.current !== text) return; // the user kept typing: this answer is old
        setItems(list);
        setOpen(true);
      } catch {
        setItems([]); // suggestions are optional: just show none
      }
    }, 250);
  }

  function choose(name: string) {
    onChange(name);
    latest.current = name;
    setOpen(false);
    setItems([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return; // let Enter submit the form as normal
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault(); // pick the suggestion instead of searching
      choose(items[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && items.length > 0;

  return (
    <div className="relative mt-1">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        {icon}
      </span>
      <input
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off" // hide the browser's own history pop-up
        className={`${fieldClass} pl-9`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
        >
          <li className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Suggestions from ClinicalTrials.gov
          </li>
          {items.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === highlight}
              // preventDefault stops the input's onBlur from closing the list before the click
              onMouseDown={(e) => {
                e.preventDefault();
                choose(name);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-1.5 ${
                i === highlight ? "bg-blue-50 text-blue-700" : "text-slate-700"
              }`}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
