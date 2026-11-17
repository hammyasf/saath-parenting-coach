import { validateAsk, validatePlan } from "./plan";
import { MAX_NOTE, MAX_TURNS } from "./request";
import type { CoachResponse, Plan, Turn } from "./types";

/** One entry in the on-page conversation. */
export type Item =
  /** `label` is what the bubble shows when the sent text is long-winded (tapped answers). */
  | { id: string; kind: "parent"; text: string; label?: string }
  | { id: string; kind: "reply"; response: CoachResponse; done?: number[]; answered?: boolean };

const LANGS = ["en", "ur", "roman-ur"];
const CATEGORIES = ["danger", "abuse", "self-harm"];

/** Items restored from browser storage are untrusted: one bad entry must not break the page. */
export function isItem(v: unknown): v is Item {
  const it = v as Item | null;
  if (!it || typeof it !== "object" || typeof it.id !== "string") return false;
  if (it.kind === "parent") return typeof it.text === "string" && (it.label === undefined || typeof it.label === "string");
  if (it.kind !== "reply") return false;
  const r = it.response;
  if (!r || typeof r !== "object" || !LANGS.includes(r.lang)) return false;
  if (it.done !== undefined && !(Array.isArray(it.done) && it.done.every((n) => Number.isInteger(n)))) return false;
  if (r.kind === "plan") return typeof r.support === "boolean" && validatePlan(r.plan) !== null;
  if (r.kind === "ask") return validateAsk(r.ask) !== null;
  if (r.kind === "crisis") return CATEGORIES.includes(r.category);
  return r.kind === "redirect" || r.kind === "fallback";
}

/** The one-line memory of a plan that goes back to the server on later turns. */
export const summary = (p: Plan) =>
  `Plan: ${p.steps.map((s) => s.title).join("; ")}. Check-in question: ${p.checkIn.question}`.slice(0, 300);

const RECENT = 6; // matches the gate's window in lib/decide.ts

/**
 * What the server needs: parent messages, plan memories, and where a crisis panel was shown.
 * Once the conversation outgrows the recent window, what the parent said at the start (and
 * their tapped answers) rides along as one pinned note, so the child's age and the details
 * are not forgotten. Nothing from before a crisis panel is ever pinned.
 */
export function toTurns(items: Item[]): Turn[] {
  const turns: Turn[] = [];
  for (const it of items) {
    if (it.kind === "parent") turns.push({ role: "parent", text: it.text });
    else if (it.response.kind === "plan") turns.push({ role: "coach", text: summary(it.response.plan) });
    else if (it.response.kind === "ask")
      turns.push({ role: "coach", text: `Asked: ${it.response.ask.questions.map((q) => q.q).join(" ")}`.slice(0, 300) });
    else if (it.response.kind === "crisis") turns.push({ role: "crisis", text: "" });
  }
  const start = turns.findLastIndex((t) => t.role === "crisis") + 1;
  const fresh = turns.slice(start);
  if (fresh.length > RECENT && fresh[0].role === "parent") {
    const answers = fresh[1]?.text.startsWith("Asked:") && fresh[2]?.role === "parent" ? ` ${fresh[2].text}` : "";
    const note: Turn = { role: "parent", text: (fresh[0].text + answers).slice(0, MAX_NOTE), pinned: true };
    // Keep the crisis marker (if any), the note, then as many recent turns as fit.
    return [...turns.slice(0, start).slice(-1), note, ...fresh.slice(-(MAX_TURNS - 2))];
  }
  return turns.slice(-MAX_TURNS);
}

/** randomUUID is missing on plain-http origins (a phone on the local network), so fall back. */
export const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
