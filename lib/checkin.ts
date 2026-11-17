import type { Lang } from "./types";

// Everything the app remembers lives in the parent's own browser.
// Storage can be missing, full, or corrupt; none of that may break the page.

export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type SavedCheckIn = {
  question: string;
  whenLabel: string;
  trying: string;
  /** Titles of the plan's steps, so the check-in can ask which one did not hold. */
  steps?: string[];
  lang: Lang;
  dueAt: number;
};

const NO_STORE: Store = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** With site data blocked, even reading `window.localStorage` throws. Fall back to remembering nothing. */
export function safeStore(get: () => Store): Store {
  try {
    return get() ?? NO_STORE;
  } catch {
    return NO_STORE;
  }
}

const CHECKIN = "saath.checkin";
const ITEMS = "saath.items";

function read(s: Store, key: string): unknown {
  try {
    return JSON.parse(s.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function write(s: Store, key: string, value: unknown) {
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or quota: carry on without saving
  }
}

export const saveCheckIn = (s: Store, c: SavedCheckIn) => write(s, CHECKIN, c);

export function peekCheckIn(s: Store): SavedCheckIn | null {
  const c = read(s, CHECKIN) as SavedCheckIn | null;
  const str = (v: unknown) => typeof v === "string" && v.length > 0;
  return c &&
    typeof c === "object" &&
    str(c.question) &&
    str(c.whenLabel) &&
    str(c.trying) &&
    ["en", "ur", "roman-ur"].includes(c.lang) &&
    Number.isFinite(c.dueAt) &&
    (c.steps === undefined || (Array.isArray(c.steps) && c.steps.every(str)))
    ? c
    : null;
}

export function dueCheckIn(s: Store, now: number): SavedCheckIn | null {
  const c = peekCheckIn(s);
  return c && now >= c.dueAt ? c : null;
}

export function clearCheckIn(s: Store) {
  try {
    s.removeItem(CHECKIN);
  } catch {}
}

export const saveItems = (s: Store, items: unknown[]) => write(s, ITEMS, items);

export function loadItems(s: Store): unknown[] {
  const v = read(s, ITEMS);
  return Array.isArray(v) ? v : [];
}

export function clearItems(s: Store) {
  try {
    s.removeItem(ITEMS);
  } catch {}
}
