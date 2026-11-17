import type { Plan } from "./types";

// Shape and size limits for a plan. Used on the coach's output and again on
// anything restored from browser storage; both are untrusted.
const TITLE_MAX = 80;
const TEXT_MAX = 400;

const text = (v: unknown, max = TEXT_MAX): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

export function validatePlan(v: unknown): Plan | null {
  if (!v || typeof v !== "object") return null;
  const { acknowledge, steps, watchFor, checkIn, declined } = v as Plan;
  if (!text(acknowledge) || !text(watchFor)) return null;
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > 3) return null;
  if (!steps.every((s) => s && text(s.title, TITLE_MAX) && text(s.how))) return null;
  if (!checkIn || !text(checkIn.question) || !text(checkIn.whenLabel, TITLE_MAX)) return null;
  const hours = Number(checkIn.afterHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) return null;
  if (declined != null && !((declined.kind === "medical" || declined.kind === "legal") && text(declined.pointer)))
    return null;
  return {
    acknowledge,
    steps: steps.map(({ title, how }) => ({ title, how })),
    watchFor,
    checkIn: { question: checkIn.question, whenLabel: checkIn.whenLabel, afterHours: hours },
    declined: declined ? { kind: declined.kind, pointer: declined.pointer } : null,
  };
}
