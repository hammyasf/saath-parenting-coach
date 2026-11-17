import { expect, test } from "vitest";
import { helplinesFor, type Region } from "./helplines";
import type { CrisisCategory } from "./types";

const regions: Region[] = ["pk", "ae", "other"];
const categories: CrisisCategory[] = ["danger", "abuse", "self-harm"];

test("every listed helpline has a dialable number and an https source", () => {
  for (const r of regions)
    for (const c of categories)
      for (const h of helplinesFor(r, c)) {
        expect(h.number).toMatch(/^\d{3,}$/);
        expect(h.source).toMatch(/^https:\/\//);
        expect(h.label.length).toBeGreaterThan(0);
      }
});

test("known regions always offer at least one number; other offers none", () => {
  for (const c of categories) {
    expect(helplinesFor("pk", c).length).toBeGreaterThan(0);
    expect(helplinesFor("ae", c).length).toBeGreaterThan(0);
    expect(helplinesFor("other", c)).toEqual([]);
  }
});

test("abuse leads with the child protection line", () => {
  expect(helplinesFor("pk", "abuse")[0].number).toBe("1121");
  expect(helplinesFor("ae", "abuse")[0].number).toBe("116111");
});
