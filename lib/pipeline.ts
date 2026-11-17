import { checkReply } from "./replyCheck";
import { runCoach } from "./coach";
import { decide, replyFails } from "./decide";
import { runGate } from "./gate";
import type { CoachResponse, GateResult, Turn } from "./types";

export type Deps = { gate: typeof runGate; coach: typeof runCoach; check: typeof checkReply };

const LANGS = ["en", "ur", "roman-ur"];
const PROBABILITIES = ["danger", "abuse", "selfHarm", "parentStruggle", "medicalAsk", "legalAsk", "parenting"] as const;

const real: Deps = { gate: runGate, coach: runCoach, check: checkReply };

/**
 * Gate → decision → coach → reply check. Never throws.
 * Nothing the coach writes reaches the parent unless both the gate and the reply check ran.
 */
export async function respond(turns: Turn[], deps: Deps = real): Promise<CoachResponse> {
  let g: GateResult;
  try {
    g = await deps.gate(turns);
    // A missing or non-numeric probability would compare false against every
    // threshold and slip through as "safe". Treat a malformed result as no result.
    if (!LANGS.includes(g?.lang) || !PROBABILITIES.every((k) => Number.isFinite(g[k]) && g[k] >= 0 && g[k] <= 1))
      throw new Error("malformed gate result");
  } catch {
    return { kind: "fallback", lang: "en" };
  }
  const { lang } = g;
  const d = decide(g);
  if (d.route === "crisis") return { kind: "crisis", lang, category: d.category };
  if (d.route === "redirect") return { kind: "redirect", lang };

  try {
    let failedRule: ReturnType<typeof replyFails> = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const plan = await deps.coach({
        turns,
        lang,
        decline: d.decline,
        support: d.support,
        ...(failedRule && { failedRule }),
      });
      if (!plan) break;
      failedRule = replyFails(await deps.check(plan));
      if (!failedRule) return { kind: "plan", lang, plan, support: d.support };
    }
  } catch {
    // coach or reply check unavailable: fall through to the safe card
  }
  return { kind: "fallback", lang };
}
