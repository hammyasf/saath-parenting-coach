import { expect, test } from "vitest";
import { decide, gateWindow, replyFails } from "./decide";
import type { GateResult } from "./types";

const calm: GateResult = {
  danger: 0, abuse: 0, selfHarm: 0, parentStruggle: 0,
  medicalAsk: 0, legalAsk: 0, parenting: 0.9, lang: "en",
};

test("everyday concern goes to coach", () =>
  expect(decide(calm)).toEqual({ route: "coach", decline: null, support: false }));

test("uncertain self-harm is crisis", () =>
  expect(decide({ ...calm, selfHarm: 0.4 })).toEqual({ route: "crisis", category: "self-harm" }));

test("highest crisis signal names the category", () =>
  expect(decide({ ...calm, abuse: 0.5, danger: 0.9 })).toEqual({ route: "crisis", category: "danger" }));

test("regretted harsh moment is coached with support", () =>
  expect(decide({ ...calm, parentStruggle: 0.8, abuse: 0.1 })).toEqual({ route: "coach", decline: null, support: true }));

test("abuse wins over parent struggle", () =>
  expect(decide({ ...calm, parentStruggle: 0.9, abuse: 0.5 })).toEqual({ route: "crisis", category: "abuse" }));

test("medical ask is coached with a decline", () =>
  expect(decide({ ...calm, medicalAsk: 0.8 })).toEqual({ route: "coach", decline: "medical", support: false }));

test("medical beats legal when both asked", () =>
  expect(decide({ ...calm, medicalAsk: 0.7, legalAsk: 0.9 })).toEqual({ route: "coach", decline: "medical", support: false }));

test("off-topic is redirected", () =>
  expect(decide({ ...calm, parenting: 0.1 })).toEqual({ route: "redirect" }));

test("crisis beats off-topic", () =>
  expect(decide({ ...calm, parenting: 0.1, danger: 0.6 })).toEqual({ route: "crisis", category: "danger" }));

test("gateWindow drops turns up to the last crisis", () =>
  expect(
    gateWindow([
      { role: "parent", text: "a" },
      { role: "crisis", text: "" },
      { role: "parent", text: "b" },
    ]),
  ).toEqual([{ role: "parent", text: "b" }]));

test("gateWindow keeps at most 6 turns", () =>
  expect(
    gateWindow(Array.from({ length: 10 }, (_, i) => ({ role: "parent" as const, text: String(i) }))).length,
  ).toBe(6));

test("replyFails names the worst failed rule or null", () => {
  expect(replyFails({ diagnosis: 0.1, medical: 0.2, legal: 0.1 })).toBeNull();
  expect(replyFails({ diagnosis: 0.6, medical: 0.9, legal: 0.1 })).toBe("medical");
});
