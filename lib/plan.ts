import type { Ask, Plan, Step } from "./types";

// Shape and size limits for everything the coach writes. Used on the coach's
// output and again on anything restored from browser storage; both are untrusted.
const TITLE_MAX = 80;
const TEXT_MAX = 400;
const SAY_MAX = 240;
const OPTION_MAX = 60;

const text = (v: unknown, max = TEXT_MAX): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

export function validateStep(v: unknown): Step | null {
  if (!v || typeof v !== "object") return null;
  const { title, how, say, why } = v as Step;
  if (!text(title, TITLE_MAX) || !text(how) || !text(why)) return null;
  // The exact words are optional: an empty string means there are none.
  if (say != null && typeof say !== "string") return null;
  const words = say?.trim() ? say : null;
  if (words && words.length > SAY_MAX) return null;
  return { title, how, say: words, why };
}

/** The timeline is an extra: a malformed one is dropped, it does not cost the parent the whole plan. */
function validateTimeline(v: unknown): Plan["timeline"] {
  if (!Array.isArray(v) || v.length < 2 || v.length > 5) return null;
  if (!v.every((r) => r && text(r.time, 20) && text(r.what, TITLE_MAX))) return null;
  return v.map(({ time, what }) => ({ time, what }));
}

export function validatePlan(v: unknown): Plan | null {
  if (!v || typeof v !== "object") return null;
  const { acknowledge, steps, watchFor, checkIn, declined } = v as Plan;
  if (!text(acknowledge) || !text(watchFor)) return null;
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > 3) return null;
  const checked = steps.map(validateStep);
  if (checked.some((s) => !s)) return null;
  const timeline = validateTimeline((v as Plan).timeline);
  if (!checkIn || !text(checkIn.question) || !text(checkIn.whenLabel, TITLE_MAX)) return null;
  const hours = Number(checkIn.afterHours);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) return null;
  if (declined != null && !((declined.kind === "medical" || declined.kind === "legal") && text(declined.pointer)))
    return null;
  return {
    acknowledge,
    steps: checked as Step[],
    timeline,
    watchFor,
    checkIn: { question: checkIn.question, whenLabel: checkIn.whenLabel, afterHours: hours },
    declined: declined ? { kind: declined.kind, pointer: declined.pointer } : null,
  };
}

export function validateAsk(v: unknown): Ask | null {
  if (!v || typeof v !== "object") return null;
  const { intro, questions } = v as Ask;
  if (!text(intro, 120)) return null;
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 2) return null;
  for (const q of questions) {
    if (!q || !text(q.q, 140)) return null;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4) return null;
    if (!q.options.every((o) => text(o, OPTION_MAX))) return null;
  }
  return { intro, questions: questions.map(({ q, options }) => ({ q, options: [...options] })) };
}
