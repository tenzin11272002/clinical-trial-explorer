import type { ReactNode } from "react";

// Shared building blocks, so every panel in the app looks the same.

// A white panel with a soft border and shadow
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

// Title row at the top of a card: title, optional subtitle, optional extra on the right
export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

// Small rounded label, e.g. a trial's status or phase
export function Badge({
  children,
  color,
}: {
  children: ReactNode;
  color?: string; // if given: solid colour badge, otherwise a light grey one
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        color ? "text-white" : "bg-slate-100 text-slate-700"
      }`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {children}
    </span>
  );
}
