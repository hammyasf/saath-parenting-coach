import { validatePlan } from "./plan";
import { MAX_TURNS } from "./request";
import type { CoachResponse, Plan, Turn } from "./types";

/** One entry in the on-page conversation. */
export type Item =
  | { id: string; kind: "parent"; text: string }
  | { id: string; kind: "reply"; response: CoachResponse };

const LANGS = ["en", "ur", "roman-ur"];
const CATEGORIES = ["danger", "abuse", "self-harm"];

/** Items restored from browser storage are untrusted: one bad entry must not break the page. */
export function isItem(v: unknown): v is Item {
  const it = v as Item | null;
  if (!it || typeof it !== "object" || typeof it.id !== "string") return false;
  if (it.kind === "parent") return typeof it.text === "string";
  if (it.kind !== "reply") return false;
  const r = it.response;
  if (!r || typeof r !== "object" || !LANGS.includes(r.lang)) return false;
  if (r.kind === "plan") return typeof r.support === "boolean" && validatePlan(r.plan) !== null;
  if (r.kind === "crisis") return CATEGORIES.includes(r.category);
  return r.kind === "redirect" || r.kind === "fallback";
}

/** The one-line memory of a plan that goes back to the server on later turns. */
export const summary = (p: Plan) =>
  `Plan: ${p.steps.map((s) => s.title).join("; ")}. Check-in question: ${p.checkIn.question}`.slice(0, 300);

/** What the server needs: parent messages, plan memories, and where a crisis panel was shown. */
export function toTurns(items: Item[]): Turn[] {
  const turns: Turn[] = [];
  for (const it of items) {
    if (it.kind === "parent") turns.push({ role: "parent", text: it.text });
    else if (it.response.kind === "plan") turns.push({ role: "coach", text: summary(it.response.plan) });
    else if (it.response.kind === "crisis") turns.push({ role: "crisis", text: "" });
  }
  return turns.slice(-MAX_TURNS);
}

/** randomUUID is missing on plain-http origins (a phone on the local network), so fall back. */
export const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
