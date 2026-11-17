import { expect, test } from "vitest";
import { helplinesFor } from "./helplines";
import type { CrisisCategory } from "./types";

const categories: CrisisCategory[] = ["danger", "abuse", "self-harm"];

test("every crisis category links to at least one https directory with a label", () => {
  for (const c of categories) {
    expect(helplinesFor(c).length).toBeGreaterThan(0);
    for (const h of helplinesFor(c)) {
      expect(h.url).toMatch(/^https:\/\//);
      expect(h.label.length).toBeGreaterThan(0);
    }
  }
});

test("abuse leads with child helplines, self-harm with crisis centres", () => {
  expect(helplinesFor("abuse")[0].url).toContain("childhelplineinternational.org");
  expect(helplinesFor("self-harm")[0].url).toContain("iasp.info");
});
