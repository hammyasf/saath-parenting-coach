import { expect, test, vi } from "vitest";
import { respond } from "./pipeline";
import type { GateResult, Plan, ReplyCheck, Turn } from "./types";

const turns: Turn[] = [{ role: "parent", text: "My 4 year old won't sleep" }];
const calm: GateResult = {
  danger: 0, abuse: 0, selfHarm: 0, parentStruggle: 0,
  medicalAsk: 0, legalAsk: 0, parenting: 0.9, lang: "en",
};
const clean: ReplyCheck = { diagnosis: 0, medical: 0, legal: 0 };
const okPlan: Plan = {
  acknowledge: "That sounds exhausting.",
  steps: [{ title: "Set one bedtime", how: "Same time every night.", say: null, why: "Bodies like a clock." }],
  watchFor: "Snoring or gasping: talk to your doctor.",
  checkIn: { question: "Did bedtime start on time?", whenLabel: "tomorrow evening", afterHours: 24 },
  declined: null,
  timeline: null,
};

test("everyday concern returns a plan", async () => {
  const r = await respond(turns, { gate: async () => calm, coach: async () => ({ kind: "plan" as const, plan: okPlan }), check: async () => clean });
  expect(r).toEqual({ kind: "plan", lang: "en", plan: okPlan, support: false });
});

test("crisis never calls the coach", async () => {
  const coach = vi.fn();
  const r = await respond(turns, { gate: async () => ({ ...calm, selfHarm: 0.9 }), coach, check: vi.fn() });
  expect(r).toEqual({ kind: "crisis", lang: "en", category: "self-harm" });
  expect(coach).not.toHaveBeenCalled();
});

test("gate failure returns fallback and never calls the coach", async () => {
  const coach = vi.fn();
  const r = await respond(turns, { gate: async () => { throw new Error("down"); }, coach, check: vi.fn() });
  expect(r.kind).toBe("fallback");
  expect(coach).not.toHaveBeenCalled();
});

test("blocked or empty coach reply returns fallback", async () => {
  const r = await respond(turns, { gate: async () => calm, coach: async () => null, check: vi.fn() });
  expect(r.kind).toBe("fallback");
});

test("coach is told what to decline and whether to support", async () => {
  const coach = vi.fn().mockResolvedValue({ kind: "plan", plan: okPlan });
  await respond(turns, {
    gate: async () => ({ ...calm, medicalAsk: 0.9, parentStruggle: 0.9, lang: "roman-ur" }),
    coach,
    check: async () => clean,
  });
  expect(coach.mock.calls[0][0]).toMatchObject({ lang: "roman-ur", decline: "medical", support: true });
});

test("failed reply check retries once with the failed rule", async () => {
  const coach = vi.fn().mockResolvedValue({ kind: "plan", plan: okPlan });
  const check = vi.fn().mockResolvedValueOnce({ ...clean, diagnosis: 0.9 }).mockResolvedValueOnce(clean);
  const r = await respond(turns, { gate: async () => calm, coach, check });
  expect(r.kind).toBe("plan");
  expect(coach).toHaveBeenCalledTimes(2);
  expect(coach.mock.calls[1][0].failedRule).toBe("diagnosis");
});

test("two failed reply checks return fallback", async () => {
  const r = await respond(turns, {
    gate: async () => calm,
    coach: async () => ({ kind: "plan" as const, plan: okPlan }),
    check: async () => ({ ...clean, medical: 0.9 }),
  });
  expect(r.kind).toBe("fallback");
});

test("reply check outage returns fallback", async () => {
  const r = await respond(turns, {
    gate: async () => calm,
    coach: async () => ({ kind: "plan" as const, plan: okPlan }),
    check: async () => { throw new Error("down"); },
  });
  expect(r.kind).toBe("fallback");
});

test("off-topic returns redirect in the parent's language", async () => {
  const r = await respond(turns, {
    gate: async () => ({ ...calm, parenting: 0.05, lang: "ur" }),
    coach: vi.fn(),
    check: vi.fn(),
  });
  expect(r).toEqual({ kind: "redirect", lang: "ur" });
});
