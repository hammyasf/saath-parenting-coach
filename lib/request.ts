import type { Turn } from "./types";

export const MAX_TURNS = 20;
export const MAX_TEXT = 2000;

const ROLES = new Set(["parent", "coach", "crisis"]);

/** The request body is untrusted: return the turns only if every part is in bounds. */
export function parseBody(body: unknown): Turn[] | null {
  const turns = (body as { turns?: unknown } | null)?.turns;
  if (!Array.isArray(turns) || turns.length < 1 || turns.length > MAX_TURNS) return null;
  for (const t of turns) {
    if (!t || !ROLES.has(t.role) || typeof t.text !== "string" || t.text.length > MAX_TEXT) return null;
  }
  const last = turns[turns.length - 1];
  if (last.role !== "parent" || !last.text.trim()) return null;
  return turns.map(({ role, text }) => ({ role, text }));
}

const LIMIT = 20;
const WINDOW_MS = 10 * 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

// ponytail: in-memory, per server instance, resets on cold start. Enough to protect
// a demo's free quota; move to a shared store if abuse ever matters.
export function allow(ip: string, now = Date.now()): boolean {
  const h = hits.get(ip);
  if (!h || now >= h.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  return ++h.count <= LIMIT;
}
