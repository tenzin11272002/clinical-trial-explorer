// Pin, chart and filter colours by trial status (bonus: pins coloured by status).
// Every status has its own colour, grouped by meaning:
//   open / running → greens and blues, finished → dark slate, stopped → warm colours.
export const STATUS_COLORS: Record<string, string> = {
  RECRUITING: "#16a34a", // green: open for new participants
  ENROLLING_BY_INVITATION: "#65a30d", // lime: open, but only by invitation
  NOT_YET_RECRUITING: "#2563eb", // blue: starting soon
  ACTIVE_NOT_RECRUITING: "#7c3aed", // violet: running, no new participants
  COMPLETED: "#334155", // dark slate: finished normally
  SUSPENDED: "#f59e0b", // amber: paused, may restart
  TERMINATED: "#dc2626", // red: stopped early
  WITHDRAWN: "#db2777", // pink: stopped before anyone joined
  UNKNOWN: "#a8a29e", // light warm grey: status not updated for a long time
};

export function colorFor(status: string) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.UNKNOWN;
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
