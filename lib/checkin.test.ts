import { expect, test } from "vitest";
import { clearCheckIn, dueCheckIn, loadItems, saveCheckIn, saveItems, type SavedCheckIn, type Store } from "./checkin";

const fake = (): Store & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return {
    m,
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
};
const broken: Store = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("quota"); },
  removeItem: () => { throw new Error("blocked"); },
};
const c: SavedCheckIn = { question: "Did bedtime start on time?", whenLabel: "tomorrow", trying: "Set one bedtime", lang: "en", dueAt: 1000 };

test("check-in is due only once its time has come", () => {
  const s = fake();
  saveCheckIn(s, c);
  expect(dueCheckIn(s, 999)).toBeNull();
  expect(dueCheckIn(s, 1000)).toEqual(c);
});

test("clearCheckIn removes it", () => {
  const s = fake();
  saveCheckIn(s, c);
  clearCheckIn(s);
  expect(dueCheckIn(s, 5000)).toBeNull();
});

test("items round-trip", () => {
  const s = fake();
  saveItems(s, [{ id: "1" }]);
  expect(loadItems(s)).toEqual([{ id: "1" }]);
});

test("corrupt or wrong-shaped storage reads as empty", () => {
  const s = fake();
  for (const k of [...Array(2)].flatMap(() => ["saath.checkin", "saath.items"])) s.m.set(k, "{not json");
  expect(dueCheckIn(s, 5000)).toBeNull();
  expect(loadItems(s)).toEqual([]);
  s.m.set("saath.items", '{"a":1}');
  s.m.set("saath.checkin", '"text"');
  expect(loadItems(s)).toEqual([]);
  expect(dueCheckIn(s, 5000)).toBeNull();
});

test("a store that throws never breaks the page", () => {
  expect(() => saveCheckIn(broken, c)).not.toThrow();
  expect(() => saveItems(broken, [])).not.toThrow();
  expect(() => clearCheckIn(broken)).not.toThrow();
  expect(dueCheckIn(broken, 5000)).toBeNull();
  expect(loadItems(broken)).toEqual([]);
});
