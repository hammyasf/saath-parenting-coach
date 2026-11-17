import { GoogleGenAI } from "@google/genai";
import { gateWindow } from "./decide";
import { validateAsk, validatePlan, validateStep } from "./plan";
import type { CoachReply, Lang, Mode, Plan, ReplyCheck, Turn } from "./types";

export type CoachInput = {
  turns: Turn[];
  lang: Lang;
  mode: Mode;
  /** False once the coach has asked its questions, when declining, and in swap mode. */
  allowAsk: boolean;
  decline: "medical" | "legal" | null;
  support: boolean;
  failedRule?: keyof ReplyCheck;
};

const LANGUAGE: Record<Lang, string> = {
  en: "English",
  ur: "Urdu written in Arabic script",
  "roman-ur": "Roman Urdu (Urdu written in Latin letters, the way people type it on WhatsApp)",
};

const RULES = `You are a parenting coach. A parent is writing to you on their phone, often tired and in the middle of it. Your reply is shown as a card they act on tonight, not as chat text.

Hard rules, never broken:
- Never name a diagnosis or disorder for the child, and never say the child "has" or "may have" a condition.
- Never recommend a medicine, supplement, dose, or a decision about treatment.
- Never say what the law requires or what legal action to take.
- If something needs a professional, say "talk to your child's doctor" (or a lawyer) and stop there.

What makes a reply worth reading:
- It is about THIS child. Use the child's age and every detail the parent gave, including their answers to your questions. If a step would fit any child of any age, it is too vague: write a sharper one.
- Every step carries something exact: a time, a number, a place, or the words to say. "Set a routine" is not a step. "Lights out at 8:00, after bath then one book" is.
- If the parent reports that a step did not hold, do not hand it back in other words. Change the approach, and let the acknowledge line say what you are changing.
- Plain everyday words. No jargon, no emojis, no praise, no lecture.`;

const PLAN_GUIDE = `How to fill a plan:
- acknowledge: one sentence that reflects back only what the parent told you. Do not tell them how they feel unless they said it.
- steps: one to three, in the order to do them. Each:
  - title: under six words, starts with a verb.
  - how: one or two short sentences with the exact thing to do.
  - say: the exact words the parent says to the child, simple enough for the child's age, with no quotation marks. Use null when the step is not about speaking.
  - why: one sentence on why this works for a child this age.
- timeline: only when the concern runs on a clock (bedtime, mornings, mealtimes, homework). Three to five rows, each a time and a short action, built around any time the parent mentioned. Otherwise null.
- watchFor: one specific sign, for this concern, that means a professional should look.
- checkIn: a question about the first step that the parent can answer tomorrow with "better", "same" or "harder"; a plain label for when (such as "tomorrow evening"); and afterHours as the number of hours until then.`;

const ASK_GUIDE = `Ask before you advise, when you would otherwise be guessing:
- If you do not know the one or two facts that would change the plan (what exactly happens, when it happens, how long it has gone on, what they already tried), reply with type "ask" and leave plan null.
- intro: a short line such as "Two quick things, so I don't guess:".
- One or two questions. Each has two to four options the parent taps. An option is something a parent would say, under six words.
- Do not ask for anything the parent already told you.
- If the parent gave enough detail, or is answering a check-in, reply with type "plan" and leave ask null.`;

const SWAP_GUIDE = `The parent says one step of the plan you gave will not work for them, and why. Write exactly one replacement step that goes after the same problem a different way and respects their reason. Do not repeat the title of any step already in the plan. Fill title, how, say and why as described:
- title: under six words, starts with a verb.
- how: one or two short sentences with the exact thing to do.
- say: the exact words to say to the child, with no quotation marks, or null.
- why: one sentence on why this works for a child this age.`;

const stepSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    how: { type: "string" },
    say: { type: ["string", "null"] },
    why: { type: "string" },
  },
  required: ["title", "how", "say", "why"],
};

const planSchema = {
  type: "object",
  properties: {
    acknowledge: { type: "string" },
    steps: { type: "array", minItems: 1, maxItems: 3, items: stepSchema },
    timeline: {
      type: ["array", "null"],
      maxItems: 5,
      items: {
        type: "object",
        properties: { time: { type: "string" }, what: { type: "string" } },
        required: ["time", "what"],
      },
    },
    watchFor: { type: "string" },
    checkIn: {
      type: "object",
      properties: {
        question: { type: "string" },
        whenLabel: { type: "string" },
        afterHours: { type: "integer", minimum: 1, maximum: 168 },
      },
      required: ["question", "whenLabel", "afterHours"],
    },
    declined: {
      type: ["object", "null"],
      properties: { kind: { type: "string", enum: ["medical", "legal"] }, pointer: { type: "string" } },
      required: ["kind", "pointer"],
    },
  },
  required: ["acknowledge", "steps", "timeline", "watchFor", "checkIn", "declined"],
};

const askSchema = {
  type: "object",
  properties: {
    intro: { type: "string" },
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          options: { type: "array", minItems: 2, maxItems: 4, items: { type: "string" } },
        },
        required: ["q", "options"],
      },
    },
  },
  required: ["intro", "questions"],
};

const askOrPlanSchema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["ask", "plan"] },
    ask: { ...askSchema, type: ["object", "null"] },
    plan: { ...planSchema, type: ["object", "null"] },
  },
  required: ["type", "ask", "plan"],
};

const FAILED: Record<keyof ReplyCheck, string> = {
  diagnosis: "named a diagnosis or condition for the child",
  medical: "gave a medical instruction",
  legal: "gave a legal instruction",
};

function instructions({ lang, mode, allowAsk, decline, support, failedRule }: CoachInput): string {
  const parts = [RULES];
  if (mode === "swap") parts.push(SWAP_GUIDE);
  else {
    if (allowAsk) parts.push(ASK_GUIDE);
    else parts.push("Give the plan now. Do not ask questions: work with what the parent has told you.");
    parts.push(PLAN_GUIDE);
    parts.push(
      decline
        ? `The parent asked for a ${decline} instruction. Do not give it. Set "declined" to kind "${decline}" with a one-sentence pointer to ${decline === "medical" ? "their child's doctor" : "a lawyer"}, then help with the parenting side of the concern: what the child needs from this parent tonight. Keep every step about the child, not about the other adult, the dispute, or what to document.`
        : `Set "declined" to null.`,
    );
  }
  if (support)
    parts.push(
      "The parent is describing their own harsh moment or a fear of losing control. Do not judge them. Aim the steps at the parent's own calm-down in the moment and at repairing things with the child.",
    );
  parts.push(`Write every field in ${LANGUAGE[lang]}, the same language and script the parent used.`);
  if (failedRule) parts.push(`Your previous draft ${FAILED[failedRule]}. Write it again without doing that.`);
  return parts.join("\n\n");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Validate a plan the model wrote; the schema is a request, not a guarantee. */
export const parsePlan = (text: string): Plan | null => validatePlan(parseJson(text));

/** Turn the model's text into a reply of the shape this turn allows, or null. */
export function parseReply(text: string, mode: Mode, allowAsk: boolean): CoachReply | null {
  const v = parseJson(text) as { type?: string; ask?: unknown; plan?: unknown } | null;
  if (!v || typeof v !== "object") return null;
  if (mode === "swap") {
    const step = validateStep(v);
    return step && { kind: "step", step };
  }
  if (!allowAsk) {
    const plan = validatePlan(v);
    return plan && { kind: "plan", plan };
  }
  if (v.type === "ask") {
    const ask = validateAsk(v.ask);
    return ask && { kind: "ask", ask };
  }
  const plan = validatePlan(v.plan);
  return plan && { kind: "plan", plan };
}

/**
 * The conversation the coach is shown. It is exactly the window the gate judged:
 * the coach must never see a turn that was not checked first.
 */
export function conversationFor(turns: Turn[]): string {
  return gateWindow(turns)
    .map((t) =>
      t.pinned ? `What the parent told you earlier: ${t.text}` : `${t.role === "parent" ? "Parent" : "Coach"}: ${t.text}`,
    )
    .join("\n");
}

/**
 * Try each model in turn. A busy or slow model (503, timeout) moves on to the next;
 * a refused request (4xx, such as Gemini's own safety block) stops at once, since
 * asking another model the same thing is not the answer to a refusal.
 */
export async function tryModels<T>(models: string[], call: (model: string) => Promise<T>): Promise<T | null> {
  for (const model of new Set(models)) {
    try {
      return await call(model);
    } catch (e) {
      const status = (e as { status?: number }).status;
      // Operational detail only: never the parent's words.
      console.warn(`coach: ${model} failed (${status ?? (e as Error).name})`);
      if (status && status >= 400 && status < 500 && status !== 429) return null;
    }
  }
  return null;
}

const TIMEOUT_MS = 8_000;

let client: GoogleGenAI | undefined;

/**
 * Ask Gemini for the next card. Returns null when the reply is blocked by Gemini's own
 * safety filter, empty, malformed, or the service fails: the caller shows the safe card.
 */
export async function runCoach(input: CoachInput): Promise<CoachReply | null> {
  client ??= new GoogleGenAI({});
  const ai = client;
  const models = [
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.1-flash-lite,gemini-3.8-flash").split(","),
  ];
  const schema = input.mode === "swap" ? stepSchema : input.allowAsk ? askOrPlanSchema : planSchema;
  return tryModels(models, async (model) => {
    const interaction = await ai.interactions.create(
      {
        model,
        system_instruction: instructions(input),
        input: conversationFor(input.turns),
        store: false, // do not keep parent messages at Google
        response_format: { type: "text", mime_type: "application/json", schema },
      },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );
    // A reply in the wrong shape is this model's failure, not the parent's: let the next model try.
    const reply = parseReply(interaction.output_text ?? "", input.mode, input.allowAsk);
    if (!reply) throw Object.assign(new Error("bad shape"), { name: "reply did not match the expected shape" });
    return reply;
  });
}
