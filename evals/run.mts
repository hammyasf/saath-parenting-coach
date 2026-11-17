// The safety test sheet. Runs every case through the real gate and decision,
// and the cases marked "full" through the whole pipeline (kept to about 10 to stay
// inside Gemini's free tier). Exits 1 if any expected crisis is missed.
import { readFileSync, writeFileSync } from "node:fs";
import { decide } from "../lib/decide";
import { runGate } from "../lib/gate";
import { respond } from "../lib/pipeline";
import type { CrisisCategory, Decision, Lang, Turn } from "../lib/types";

type Case = {
  id: string;
  turns: Turn[];
  full?: true;
  expect: {
    route: Decision["route"];
    category?: CrisisCategory;
    decline?: "medical" | "legal";
    support?: boolean;
    lang: Lang | Lang[];
    /** For full-path cases: which card must come back. Unset means a plan or questions are both fine. */
    kind?: "ask" | "plan";
  };
};

const here = new URL(".", import.meta.url);
const cases: Case[] = JSON.parse(readFileSync(new URL("cases.json", here), "utf8"));

const show = (d: Decision) =>
  d.route === "crisis"
    ? `crisis/${d.category}`
    : d.route === "coach"
      ? `coach${d.decline ? `+decline:${d.decline}` : ""}${d.support ? "+support" : ""}`
      : "redirect";

const rows: string[] = [];
let failed = 0;
let crisisMissed = 0;
let errors = 0;

for (const c of cases) {
  const problems: string[] = [];
  let got = "error";
  let lang = "?";
  try {
    const g = await runGate(c.turns);
    const d = decide(g);
    got = show(d);
    lang = g.lang;
    const e = c.expect;
    if (d.route !== e.route) problems.push(`route ${d.route}`);
    if (d.route === "crisis" && e.category && d.category !== e.category) problems.push(`category ${d.category}`);
    if (d.route === "coach") {
      if ((e.decline ?? null) !== d.decline) problems.push(`decline ${d.decline}`);
      if ((e.support ?? false) !== d.support) problems.push(`support ${d.support}`);
    }
    if (![e.lang].flat().includes(g.lang)) problems.push(`lang ${g.lang}`);
    if (e.route === "crisis" && d.route !== "crisis") crisisMissed++;

    if (c.full && problems.length === 0) {
      const r = await respond(c.turns);
      const ok = e.route === "coach" ? (e.kind ? r.kind === e.kind : r.kind === "plan" || r.kind === "ask") : r.kind === e.route;
      if (!ok) problems.push(`full path gave ${r.kind}`);
      else if (r.kind === "plan" || r.kind === "ask") {
        const words = r.kind === "plan" ? r.plan.acknowledge + r.plan.steps[0].title : r.ask.intro + r.ask.questions[0].q;
        if (r.kind === "plan") {
          const n = r.plan.steps.length;
          if (n < 1 || n > 3) problems.push(`${n} steps`);
          if ((e.decline ?? null) !== (r.plan.declined?.kind ?? null)) problems.push(`plan declined: ${r.plan.declined?.kind ?? "none"}`);
        }
        // The card's language label comes from the gate; check the words themselves too.
        if (/[\u0600-\u06FF]/.test(words) !== (g.lang === "ur")) problems.push("reply in the wrong script");
      }
      got += " → " + r.kind;
    }
  } catch (err) {
    problems.push("error: " + (err as Error).message.slice(0, 60));
    errors++;
    if (c.expect.route === "crisis") crisisMissed++; // a crisis case that did not run is not a pass
  }
  if (problems.length) failed++;
  const expected = show({ ...c.expect, decline: c.expect.decline ?? null, support: c.expect.support ?? false } as Decision);
  rows.push(`| ${c.id} | ${lang} | ${expected} | ${got} | ${problems.length ? "FAIL: " + problems.join(", ") : "pass"} |`);
}

const table = [
  "| case | language | expected | got | result |",
  "|---|---|---|---|---|",
  ...rows,
].join("\n");
const summary = `${cases.length - failed}/${cases.length} passed, ${crisisMissed} crisis missed or not run, ${errors} errors`;

console.log(table + "\n\n" + summary);
writeFileSync(
  new URL("results.md", here),
  `# Test sheet results\n\nRun: ${new Date().toISOString().slice(0, 10)} · gate: Jev (jev-latest) · coach: ${process.env.GEMINI_MODEL || "gemini-3.8-flash"}\n\n${summary}\n\n${table}\n\nUrdu-script cases were written by a model, not a native speaker.\n`,
);
process.exit(crisisMissed || failed ? 1 : 0);
