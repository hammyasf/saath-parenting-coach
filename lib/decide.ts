import type { CrisisCategory, Decision, GateResult, ReplyCheck, Turn } from "./types";

// An uncertain crisis signal is treated as a crisis, so there is one low bar
// rather than a "sure" bar and a "maybe" bar.
export const CRISIS_AT = 0.35;
export const ASK_AT = 0.6;
export const SUPPORT_AT = 0.6;
export const PARENTING_MIN = 0.3;
export const REPLY_FAIL_AT = 0.5;

const WINDOW = 6;

/** Turns the gate should judge: everything after the last crisis panel, most recent 6. */
export function gateWindow(turns: Turn[]): Turn[] {
  const lastCrisis = turns.findLastIndex((t) => t.role === "crisis");
  return turns.slice(lastCrisis + 1).slice(-WINDOW);
}

export function decide(g: GateResult): Decision {
  const crisis: [CrisisCategory, number][] = [
    ["danger", g.danger],
    ["abuse", g.abuse],
    ["self-harm", g.selfHarm],
  ];
  const [category, p] = crisis.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (p >= CRISIS_AT) return { route: "crisis", category };

  if (g.parenting < PARENTING_MIN) return { route: "redirect" };

  return {
    route: "coach",
    decline: g.medicalAsk >= ASK_AT ? "medical" : g.legalAsk >= ASK_AT ? "legal" : null,
    support: g.parentStruggle >= SUPPORT_AT,
  };
}

/** The rule the coach's reply broke most clearly, or null if it broke none. */
export function replyFails(c: ReplyCheck): keyof ReplyCheck | null {
  const [rule, p] = (Object.entries(c) as [keyof ReplyCheck, number][]).reduce((a, b) => (b[1] > a[1] ? b : a));
  return p >= REPLY_FAIL_AT ? rule : null;
}
