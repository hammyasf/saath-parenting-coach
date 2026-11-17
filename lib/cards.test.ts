// The coach can now ask before advising, give steps with exact words, and swap one step.
import { expect, test, vi } from "vitest";
import { isItem, summary, toTurns } from "./items";
import { respond } from "./pipeline";
import { validateAsk, validatePlan, validateStep } from "./plan";
import { parseBody, parseMode } from "./request";
import type { Ask, GateResult, Plan, ReplyCheck, Step, Turn } from "./types";

const step: Step = { title: "Walk him back", how: "Same line every time.", say: "It's sleep time. Goodnight.", why: "Attention keeps him coming out." };
const plan: Plan = {
  acknowledge: "Two-hour bedtimes wear everyone down.",
  steps: [step],
  timeline: [{ time: "7:30", what: "Bath" }, { time: "8:00", what: "Lights out" }],
  watchFor: "Loud snoring most nights: talk to your child's doctor.",
  checkIn: { question: "How many times did he come out?", whenLabel: "tomorrow morning", afterHours: 14 },
  declined: null,
};
const ask: Ask = {
  intro: "Quick, so I don't guess:",
  questions: [{ q: "What happens after lights out?", options: ["Keeps coming out", "Says he's scared", "Not tired"] }],
};
const calm: GateResult = { danger: 0, abuse: 0, selfHarm: 0, parentStruggle: 0, medicalAsk: 0, legalAsk: 0, parenting: 0.9, lang: "en" };
const clean: ReplyCheck = { diagnosis: 0, medical: 0, legal: 0 };
const first: Turn[] = [{ role: "parent", text: "My son won't sleep" }];

test("validateStep keeps exact words and the reason; say may be null", () => {
  expect(validateStep(step)).toEqual(step);
  expect(validateStep({ ...step, say: null })).toEqual({ ...step, say: null });
  expect(validateStep({ ...step, say: "" })).toEqual({ ...step, say: null });
  expect(validateStep({ ...step, why: " " })).toBeNull();
  expect(validateStep({ ...step, say: "x".repeat(241) })).toBeNull();
});

test("validatePlan accepts a timeline of 2–5 rows or none", () => {
  expect(validatePlan(plan)).toEqual(plan);
  expect(validatePlan({ ...plan, timeline: null })?.timeline).toBeNull();
  expect(validatePlan({ ...plan, timeline: [] })?.timeline).toBeNull();
  expect(validatePlan({ ...plan, timeline: Array(6).fill({ time: "7", what: "x" }) })).toBeNull();
  expect(validatePlan({ ...plan, timeline: [{ time: "7:30" }, { time: "8", what: "x" }] })).toBeNull();
});

test("validateAsk needs 1–2 questions with 2–4 short options each", () => {
  expect(validateAsk(ask)).toEqual(ask);
  expect(validateAsk({ ...ask, questions: [] })).toBeNull();
  expect(validateAsk({ ...ask, questions: Array(3).fill(ask.questions[0]) })).toBeNull();
  expect(validateAsk({ ...ask, questions: [{ q: "Why?", options: ["only one"] }] })).toBeNull();
  expect(validateAsk({ ...ask, questions: [{ q: "Why?", options: ["a", "b", "c", "d", "e"] }] })).toBeNull();
  expect(validateAsk({ ...ask, questions: [{ q: "Why?", options: ["a", "x".repeat(61)] }] })).toBeNull();
});

test("an ask reply reaches the parent after the reply check", async () => {
  const check = vi.fn().mockResolvedValue(clean);
  const r = await respond(first, { gate: async () => calm, coach: async () => ({ kind: "ask", ask }), check });
  expect(r).toEqual({ kind: "ask", lang: "en", ask });
  expect(check).toHaveBeenCalledTimes(1);
});

test("the coach may ask once: not again after its own questions", async () => {
  const coach = vi.fn().mockResolvedValue({ kind: "plan", plan });
  await respond(first, { gate: async () => calm, coach, check: async () => clean });
  expect(coach.mock.calls[0][0].allowAsk).toBe(true);

  const answered: Turn[] = [...first, { role: "coach", text: "Asked: What happens after lights out?" }, { role: "parent", text: "Keeps coming out." }];
  await respond(answered, { gate: async () => calm, coach, check: async () => clean });
  expect(coach.mock.calls[1][0].allowAsk).toBe(false);
});

test("an ask that arrives when asking is not allowed becomes the fallback card", async () => {
  const answered: Turn[] = [...first, { role: "coach", text: "Asked: What happens?" }, { role: "parent", text: "Keeps coming out." }];
  const r = await respond(answered, { gate: async () => calm, coach: async () => ({ kind: "ask", ask }), check: async () => clean });
  expect(r.kind).toBe("fallback");
});

test("swap mode returns one checked step, and never asks", async () => {
  const coach = vi.fn().mockResolvedValue({ kind: "step", step });
  const r = await respond(first, { gate: async () => calm, coach, check: async () => clean }, "swap");
  expect(r).toEqual({ kind: "step", lang: "en", step });
  expect(coach.mock.calls[0][0]).toMatchObject({ mode: "swap", allowAsk: false });
});

test("a crisis in a swap request is still a crisis", async () => {
  const coach = vi.fn();
  const r = await respond(first, { gate: async () => ({ ...calm, abuse: 0.9 }), coach, check: vi.fn() }, "swap");
  expect(r.kind).toBe("crisis");
  expect(coach).not.toHaveBeenCalled();
});

test("a reply of the wrong kind for the mode is the fallback card", async () => {
  const r = await respond(first, { gate: async () => calm, coach: async () => ({ kind: "step", step }), check: async () => clean });
  expect(r.kind).toBe("fallback");
});

test("parseMode accepts only known modes and defaults to reply", () => {
  expect(parseMode({ mode: "swap" })).toBe("swap");
  expect(parseMode({})).toBe("reply");
  expect(parseMode({ mode: "admin" })).toBe("reply");
  expect(parseMode(null)).toBe("reply");
  expect(parseBody({ turns: first, mode: "swap" })).toEqual(first);
});

test("items: ask replies and ticked steps survive storage; the ask is remembered for the coach", () => {
  const askItem = { id: "1", kind: "reply", response: { kind: "ask", lang: "en", ask } };
  expect(isItem(askItem)).toBe(true);
  expect(isItem({ id: "2", kind: "reply", response: { kind: "ask", lang: "en", ask: {} } })).toBe(false);
  expect(isItem({ id: "3", kind: "reply", response: { kind: "plan", lang: "en", support: false, plan }, done: [0] })).toBe(true);
  expect(isItem({ id: "4", kind: "reply", response: { kind: "plan", lang: "en", support: false, plan }, done: ["x"] })).toBe(false);
  const turns = toTurns([{ id: "0", kind: "parent", text: "a" }, askItem as never]);
  expect(turns[1]).toEqual({ role: "coach", text: "Asked: What happens after lights out?" });
  expect(summary(plan)).toContain("Walk him back");
});

import { parseReply } from "./coach";

test("parseReply reads the shape each mode allows", () => {
  expect(parseReply(JSON.stringify({ type: "ask", ask, plan: null }), "reply", true)).toEqual({ kind: "ask", ask });
  expect(parseReply(JSON.stringify({ type: "plan", ask: null, plan }), "reply", true)).toEqual({ kind: "plan", plan });
  expect(parseReply(JSON.stringify(plan), "reply", false)).toEqual({ kind: "plan", plan });
  expect(parseReply(JSON.stringify(step), "swap", false)).toEqual({ kind: "step", step });
  expect(parseReply(JSON.stringify({ type: "ask", ask: {}, plan: null }), "reply", true)).toBeNull();
  expect(parseReply(JSON.stringify({ type: "ask", ask, plan: null }), "reply", false)).toBeNull();
  expect(parseReply("not json", "reply", true)).toBeNull();
});

test("no questions after a plan, or for a parent in a hard moment", async () => {
  const coach = vi.fn().mockResolvedValue({ kind: "plan", plan });
  const afterPlan: Turn[] = [...first, { role: "coach", text: "Plan: Walk him back. Check-in question: How many times?" }, { role: "parent", text: "Harder." }];
  await respond(afterPlan, { gate: async () => calm, coach, check: async () => clean });
  expect(coach.mock.calls[0][0].allowAsk).toBe(false);
  await respond(first, { gate: async () => ({ ...calm, parentStruggle: 0.9 }), coach, check: async () => clean });
  expect(coach.mock.calls[1][0].allowAsk).toBe(false);
});
