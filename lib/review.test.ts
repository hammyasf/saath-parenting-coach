// Tests added from the cold review: each one failed before its fix.
import { expect, test, vi } from "vitest";
import { peekCheckIn, safeStore, type Store } from "./checkin";
import { conversationFor } from "./coach";
import { isItem, summary, toTurns } from "./items";
import { respond } from "./pipeline";
import { validatePlan } from "./plan";
import type { GateResult, Plan, Turn } from "./types";

const plan: Plan = {
  acknowledge: "a",
  steps: [{ title: "t", how: "h", say: null, why: "y" }],
  watchFor: "w",
  checkIn: { question: "q", whenLabel: "tomorrow", afterHours: 24 },
  declined: null,
  timeline: null,
};
const calm: GateResult = {
  danger: 0, abuse: 0, selfHarm: 0, parentStruggle: 0,
  medicalAsk: 0, legalAsk: 0, parenting: 0.9, lang: "en",
};

// 1. The coach must never see more than the gate judged.
test("coach context excludes everything before the last crisis panel", () => {
  const turns: Turn[] = [
    { role: "parent", text: "My husband beats our son with a belt" },
    { role: "crisis", text: "" },
    { role: "parent", text: "ok, what about bedtime?" },
  ];
  const c = conversationFor(turns);
  expect(c).not.toContain("belt");
  expect(c).toContain("bedtime");
});

test("coach context is no wider than the gate's 6-turn window", () => {
  const turns: Turn[] = Array.from({ length: 9 }, (_, i) => ({ role: "parent" as const, text: `m${i}` }));
  const c = conversationFor(turns);
  expect(c).not.toContain("m2");
  expect(c).toContain("m3");
});

// 2. Blocked site data: reading window.localStorage itself throws.
test("safeStore survives a storage getter that throws", () => {
  const s = safeStore(() => { throw new Error("SecurityError"); });
  expect(s.getItem("x")).toBeNull();
  expect(() => s.setItem("x", "1")).not.toThrow();
  expect(() => s.removeItem("x")).not.toThrow();
});

test("safeStore passes a working store through", () => {
  const real: Store = { getItem: () => "v", setItem: () => {}, removeItem: () => {} };
  expect(safeStore(() => real).getItem("x")).toBe("v");
});

// 3. Restored items are untrusted.
test.each([
  ["null", null],
  ["reply with no response", { id: "1", kind: "reply" }],
  ["plan reply with no steps", { id: "1", kind: "reply", response: { kind: "plan", lang: "en", support: false, plan: {} } }],
  ["parent with no text", { id: "1", kind: "parent" }],
  ["unknown kind", { id: "1", kind: "other", text: "x" }],
  ["bad lang", { id: "1", kind: "reply", response: { kind: "redirect", lang: "fr" } }],
  ["bad crisis category", { id: "1", kind: "reply", response: { kind: "crisis", lang: "en", category: "x" } }],
])("isItem rejects %s", (_n, v) => expect(isItem(v)).toBe(false));

test("isItem accepts well-formed items", () => {
  expect(isItem({ id: "1", kind: "parent", text: "hi" })).toBe(true);
  expect(isItem({ id: "2", kind: "reply", response: { kind: "plan", lang: "ur", support: true, plan } })).toBe(true);
  expect(isItem({ id: "3", kind: "reply", response: { kind: "crisis", lang: "en", category: "abuse" } })).toBe(true);
});

test("a malformed saved check-in reads as none", () => {
  const s: Store = { getItem: () => JSON.stringify({ question: "q", dueAt: 1 }), setItem: () => {}, removeItem: () => {} };
  expect(peekCheckIn(s)).toBeNull();
});

// 4. The decision must fail closed on a non-number probability.
test.each([
  ["NaN", NaN],
  ["undefined", undefined],
  ["out of range", 7],
])("gate result with selfHarm %s returns fallback, never a plan", async (_n, v) => {
  const coach = vi.fn();
  const r = await respond([{ role: "parent", text: "x" }], {
    gate: async () => ({ ...calm, selfHarm: v as number }),
    coach,
    check: vi.fn(),
  });
  expect(r.kind).toBe("fallback");
  expect(coach).not.toHaveBeenCalled();
});

test("gate result with an unknown language returns fallback", async () => {
  const r = await respond([{ role: "parent", text: "x" }], {
    gate: async () => ({ ...calm, lang: "fr" as never }),
    coach: vi.fn(),
    check: vi.fn(),
  });
  expect(r.kind).toBe("fallback");
});

// 10. Over-long model output must not become a wall of text or lock the conversation.
test("validatePlan rejects over-long fields", () => {
  expect(validatePlan({ ...plan, steps: [{ title: "t".repeat(81), how: "h", say: null, why: "y" }] })).toBeNull();
  expect(validatePlan({ ...plan, acknowledge: "a".repeat(401) })).toBeNull();
  expect(validatePlan(plan)).toEqual(plan);
});

test("summary stays well under the request text limit", () => {
  const long: Plan = { ...plan, steps: Array(3).fill({ title: "t".repeat(80), how: "h", say: null, why: "y" }), checkIn: { ...plan.checkIn, question: "q".repeat(400) } };
  expect(summary(long).length).toBeLessThanOrEqual(300);
});

test("toTurns keeps parent text, plan memory and crisis markers, and drops notes", () => {
  expect(
    toTurns([
      { id: "1", kind: "parent", text: "a" },
      { id: "2", kind: "reply", response: { kind: "plan", lang: "en", support: false, plan } },
      { id: "3", kind: "reply", response: { kind: "redirect", lang: "en" } },
      { id: "4", kind: "reply", response: { kind: "crisis", lang: "en", category: "danger" } },
      { id: "5", kind: "parent", text: "b" },
    ]).map((t) => t.role),
  ).toEqual(["parent", "coach", "crisis", "parent"]);
});

// Found on the first live run: the primary Gemini model returned 503 "high demand".
import { tryModels } from "./coach";

test("tryModels falls back to the next model when one is unavailable", async () => {
  const call = vi.fn().mockRejectedValueOnce(Object.assign(new Error("busy"), { status: 503 })).mockResolvedValueOnce("ok");
  expect(await tryModels(["a", "b"], call)).toBe("ok");
  expect(call.mock.calls.map((c) => c[0])).toEqual(["a", "b"]);
});

test("tryModels does not retry a request the provider refused (400, e.g. safety block)", async () => {
  const call = vi.fn().mockRejectedValue(Object.assign(new Error("safety"), { status: 400 }));
  expect(await tryModels(["a", "b"], call)).toBeNull();
  expect(call).toHaveBeenCalledTimes(1);
});

test("tryModels returns null when every model fails, and skips duplicates", async () => {
  const call = vi.fn().mockRejectedValue(new Error("timeout"));
  expect(await tryModels(["a", "a", "b"], call)).toBeNull();
  expect(call).toHaveBeenCalledTimes(2);
});
