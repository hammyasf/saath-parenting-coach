import { checkReply } from "./replyCheck";
import { runCoach } from "./coach";
import { decide, gateWindow, replyFails } from "./decide";
import { runGate } from "./gate";
import type { CoachResponse, GateResult, Mode, Turn } from "./types";

export type Deps = { gate: typeof runGate; coach: typeof runCoach; check: typeof checkReply };

const LANGS = ["en", "ur", "roman-ur"];
const PROBABILITIES = ["danger", "abuse", "selfHarm", "parentStruggle", "medicalAsk", "legalAsk", "parenting"] as const;

const real: Deps = { gate: runGate, coach: runCoach, check: checkReply };

/** The coach may ask only at the start: once it has asked or advised, it works with what it knows. */
const alreadySpoke = (turns: Turn[]) => gateWindow(turns).some((t) => t.role === "coach");

/**
 * Gate → decision → coach → reply check. Never throws.
 * Nothing the coach writes reaches the parent unless both the gate and the reply check ran.
 */
export async function respond(turns: Turn[], deps: Deps = real, mode: Mode = "reply"): Promise<CoachResponse> {
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

  // No questions for a parent in a hard moment, or one who asked for something we decline: answer them.
  const allowAsk = mode === "reply" && !d.decline && !d.support && !alreadySpoke(turns);
  try {
    let failedRule: ReturnType<typeof replyFails> = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const reply = await deps.coach({
        turns,
        lang,
        mode,
        allowAsk,
        decline: d.decline,
        support: d.support,
        ...(failedRule && { failedRule }),
      });
      if (!reply) break;
      // The coach must answer in the shape this turn calls for.
      if (mode === "swap" ? reply.kind !== "step" : reply.kind === "step" || (reply.kind === "ask" && !allowAsk)) break;
      const content = reply.kind === "ask" ? reply.ask : reply.kind === "plan" ? reply.plan : reply.step;
      failedRule = replyFails(await deps.check(content));
      if (failedRule) continue;
      if (reply.kind === "plan") return { kind: "plan", lang, plan: reply.plan, support: d.support };
      if (reply.kind === "ask") return { kind: "ask", lang, ask: reply.ask };
      return { kind: "step", lang, step: reply.step };
    }
  } catch {
    // coach or reply check unavailable: fall through to the safe card
  }
  return { kind: "fallback", lang };
}
