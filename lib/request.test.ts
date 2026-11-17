import { expect, test } from "vitest";
import { parsePlan } from "./coach";
import { allow, parseBody } from "./request";

const parent = (text: string) => ({ role: "parent", text });

test("allow: 20 per 10 minutes per ip, then resets", () => {
  const t0 = 1_000_000;
  for (let i = 0; i < 20; i++) expect(allow("1.1.1.1", t0)).toBe(true);
  expect(allow("1.1.1.1", t0)).toBe(false);
  expect(allow("2.2.2.2", t0)).toBe(true);
  expect(allow("1.1.1.1", t0 + 10 * 60_000)).toBe(true);
});

test("parseBody accepts a valid conversation", () => {
  const turns = [parent("hi"), { role: "coach", text: "plan" }, { role: "crisis", text: "" }, parent("ok")];
  expect(parseBody({ turns })).toEqual(turns);
});

test.each([
  ["not an object", "nope"],
  ["null", null],
  ["no turns", {}],
  ["empty turns", { turns: [] }],
  ["21 turns", { turns: Array.from({ length: 21 }, () => parent("a")) }],
  ["last turn not parent", { turns: [parent("a"), { role: "coach", text: "b" }] }],
  ["blank last text", { turns: [parent("   ")] }],
  ["text too long", { turns: [parent("a".repeat(2001))] }],
  ["unknown role", { turns: [{ role: "system", text: "x" }, parent("a")] }],
  ["text not a string", { turns: [{ role: "parent", text: 5 }] }],
])("parseBody rejects %s", (_name, body) => expect(parseBody(body)).toBeNull());

const plan = {
  acknowledge: "a",
  steps: [{ title: "t", how: "h" }],
  watchFor: "w",
  checkIn: { question: "q", whenLabel: "tomorrow", afterHours: 24 },
  declined: null,
};

test("parsePlan accepts a well-formed plan and drops extra fields", () =>
  expect(parsePlan(JSON.stringify({ ...plan, extra: 1 }))).toEqual(plan));

test.each([
  ["not json", "sorry, I can't"],
  ["empty", ""],
  ["no steps", JSON.stringify({ ...plan, steps: [] })],
  ["four steps", JSON.stringify({ ...plan, steps: Array(4).fill(plan.steps[0]) })],
  ["blank title", JSON.stringify({ ...plan, steps: [{ title: " ", how: "h" }] })],
  ["zero hours", JSON.stringify({ ...plan, checkIn: { ...plan.checkIn, afterHours: 0 } })],
  ["bad declined kind", JSON.stringify({ ...plan, declined: { kind: "other", pointer: "p" } })],
])("parsePlan rejects %s", (_name, text) => expect(parsePlan(text)).toBeNull());
