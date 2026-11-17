// Pinned child note, plan as shareable text, and the check-in as a calendar file.
import { expect, test } from "vitest";
import { conversationFor } from "./coach";
import { gateWindow } from "./decide";
import { parseBody } from "./request";
import { checkInIcs, planToText } from "./share";
import type { Plan, Turn } from "./types";

const note: Turn = { role: "parent", text: "My 4-year-old won't sleep. He keeps getting up. A few weeks.", pinned: true };
const p = (text: string): Turn => ({ role: "parent", text });

test("the pinned note survives past the 6-turn window", () => {
  const turns = [note, ...Array.from({ length: 9 }, (_, i) => p(`m${i}`))];
  const w = gateWindow(turns);
  expect(w[0]).toEqual(note);
  expect(w.length).toBe(7);
  expect(w.at(-1)?.text).toBe("m8");
});

test("a note from before a crisis panel is dropped with everything else", () => {
  expect(gateWindow([note, p("a"), { role: "crisis", text: "" }, p("b")])).toEqual([p("b")]);
});

test("the coach is shown the note as what it knows about the child", () => {
  const c = conversationFor([note, p("He woke at 5 today")]);
  expect(c).toContain("What the parent told you earlier: My 4-year-old won't sleep.");
  expect(c).toContain("Parent: He woke at 5 today");
});

test("parseBody accepts one short pinned note and rejects more or longer", () => {
  expect(parseBody({ turns: [note, p("hi")] })).toEqual([note, p("hi")]);
  expect(parseBody({ turns: [note, note, p("hi")] })).toBeNull();
  expect(parseBody({ turns: [{ ...note, text: "x".repeat(401) }, p("hi")] })).toBeNull();
  expect(parseBody({ turns: [{ role: "coach", text: "Plan: x", pinned: true }, p("hi")] })).toBeNull();
  expect(parseBody({ turns: [{ ...note, pinned: "yes" }, p("hi")] })).toBeNull();
});

const plan: Plan = {
  acknowledge: "He comes out five or six times after lights out.",
  steps: [
    { title: "Walk him back", how: "Same line every time.", say: "It's sleep time. Goodnight.", why: "Attention keeps him coming out." },
    { title: "Give two passes", how: "Two cards for two trips.", say: null, why: "A limit he can hold." },
  ],
  timeline: [{ time: "7:30", what: "Bath" }, { time: "8:00", what: "Lights out" }],
  watchFor: "Loud snoring most nights: talk to your child's doctor.",
  checkIn: { question: "How many times did he come out?", whenLabel: "tomorrow morning", afterHours: 14 },
  declined: null,
};

test("planToText is a plain message someone else can follow", () => {
  const t = planToText(plan, "en");
  expect(t).toContain("1. Walk him back\nSame line every time.\nSay: It's sleep time. Goodnight.");
  expect(t).toContain("2. Give two passes\nTwo cards for two trips.");
  expect(t).not.toContain("Say: null");
  expect(t).toContain("Tonight\n7:30  Bath\n8:00  Lights out");
  expect(t).toContain("Watch for: Loud snoring");
  expect(t).toContain("Check-in (tomorrow morning): How many times did he come out?");
  expect(t).toContain("AI coach, not a doctor.");
});

test("checkInIcs is a valid one-event calendar file", () => {
  const due = Date.UTC(2026, 10, 18, 2, 30, 0);
  const ics = checkInIcs({ question: "Did he stay in bed, or come out; again?", trying: "Walk him back", dueAt: due }, Date.UTC(2026, 10, 17, 12, 0, 0), "https://example.test/");
  const lines = ics.split("\r\n");
  expect(lines[0]).toBe("BEGIN:VCALENDAR");
  expect(lines.at(-2)).toBe("END:VCALENDAR");
  expect(ics).toContain("DTSTART:20261118T023000Z");
  expect(ics).toContain("DTEND:20261118T024500Z");
  expect(ics).toContain("DTSTAMP:20261117T120000Z");
  // commas and semicolons are escaped in calendar text
  expect(ics).toContain("SUMMARY:Saath check-in: Did he stay in bed\\, or come out\\; again?");
  expect(ics).toContain("DESCRIPTION:You were trying: Walk him back\\nOpen Saath to answer: https://example.test/");
  expect(ics).toMatch(/UID:[\w-]+@saath/);
});

import { toTurns, type Item } from "./items";

const mine = (id: string, text: string): Item => ({ id, kind: "parent", text });
const planItem = (id: string): Item => ({ id, kind: "reply", response: { kind: "plan", lang: "en", support: false, plan } });
const askItem: Item = { id: "a", kind: "reply", response: { kind: "ask", lang: "en", ask: { intro: "Two things:", questions: [{ q: "How old?", options: ["3", "4"] }] } } };

test("a short conversation carries no pinned note", () => {
  expect(toTurns([mine("1", "My son won't sleep"), planItem("2")]).some((t) => t.pinned)).toBe(false);
});

test("a long conversation pins the opening message and the tapped answers", () => {
  const items = [mine("1", "My son won't sleep"), askItem, mine("2", "How old? 4."), planItem("3"), mine("4", "Harder."), planItem("5"), mine("6", "Same."), planItem("7"), mine("8", "And mornings?")];
  const turns = toTurns(items);
  expect(turns.filter((t) => t.pinned)).toEqual([{ role: "parent", text: "My son won't sleep How old? 4.", pinned: true }]);
  expect(turns.at(-1)).toEqual({ role: "parent", text: "And mornings?" });
});

test("nothing from before a crisis panel is pinned", () => {
  const crisis: Item = { id: "c", kind: "reply", response: { kind: "crisis", lang: "en", category: "abuse" } };
  const items = [mine("0", "My husband beats our son"), crisis, mine("1", "ok. bedtime?"), planItem("2"), mine("3", "a"), planItem("4"), mine("5", "b"), planItem("6"), mine("7", "c")];
  const pinned = toTurns(items).filter((t) => t.pinned);
  expect(pinned).toEqual([{ role: "parent", text: "ok. bedtime?", pinned: true }]);
  expect(toTurns(items).findIndex((t) => t.pinned)).toBeGreaterThan(toTurns(items).findIndex((t) => t.role === "crisis"));
});
