// Pin, chart and filter colours by trial status (bonus: pins coloured by status)
export const STATUS_COLORS: Record<string, string> = {
  RECRUITING: "#16a34a", // green
  NOT_YET_RECRUITING: "#2563eb", // blue
  ENROLLING_BY_INVITATION: "#0891b2",
  ACTIVE_NOT_RECRUITING: "#9333ea", // purple
  COMPLETED: "#64748b", // grey
  SUSPENDED: "#f59e0b", // orange
  TERMINATED: "#dc2626", // red
  WITHDRAWN: "#dc2626",
};

export function colorFor(status: string) {
  return STATUS_COLORS[status] ?? "#94a3b8"; // light grey for UNKNOWN and anything else
}

// Turn API codes into words people read easily:
//   "NOT_YET_RECRUITING" → "Not yet recruiting"
//   "PHASE2/PHASE3"      → "Phase 2/3"
//   "EARLY_PHASE1"       → "Early phase 1"
export function pretty(code: string) {
  if (code === "N/A" || code === "") return "N/A";
  if (code === "EARLY_PHASE1") return "Early phase 1";
  if (code.startsWith("PHASE")) {
    return "Phase " + code.replaceAll("PHASE", ""); // "PHASE2/PHASE3" → "Phase 2/3"
  }
  const words = code.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
