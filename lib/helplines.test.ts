import { expect, test } from "vitest";
import { directoriesFor, phonesFor } from "./helplines";
import type { CrisisCategory } from "./types";

const categories: CrisisCategory[] = ["danger", "abuse", "self-harm"];

test("every crisis category has a dialable UAE number with an official source", () => {
  for (const c of categories) {
    expect(phonesFor(c).length).toBeGreaterThan(0);
    for (const h of phonesFor(c)) {
      expect(h.number).toMatch(/^\d{3,}$/);
      expect(h.source).toMatch(/^https:\/\/[^/]+\.gov\.ae\//);
    }
  }
});

test("every crisis category offers a way out for a parent in another country", () => {
  for (const c of categories) {
    expect(directoriesFor(c).length).toBeGreaterThan(0);
    for (const d of directoriesFor(c)) expect(d.url).toMatch(/^https:\/\//);
  }
});

test("abuse leads with child protection", () => {
  expect(phonesFor("abuse")[0].number).toBe("116111");
  expect(directoriesFor("abuse")[0].url).toContain("childhelplineinternational.org");
});
