import { GoogleGenAI } from "@google/genai";
import { gateWindow } from "./decide";
import { validatePlan } from "./plan";
import type { Lang, Plan, ReplyCheck, Turn } from "./types";

export type CoachInput = {
  turns: Turn[];
  lang: Lang;
  decline: "medical" | "legal" | null;
  support: boolean;
  failedRule?: keyof ReplyCheck;
};

const LANGUAGE: Record<Lang, string> = {
  en: "English",
  ur: "Urdu written in Arabic script",
  "roman-ur": "Roman Urdu (Urdu written in Latin letters, the way people type it on WhatsApp)",
};

const RULES = `You are a calm, practical parenting coach. A parent has written to you. Reply with a short plan they can act on today.

Hard rules:
- Never name a diagnosis or disorder for the child, and never say the child "has" or "may have" a condition.
- Never recommend a medicine, supplement, dose, or a decision about treatment.
- Never say what the law requires or what legal action to take.
- If something needs a professional, say "talk to your child's doctor" (or a lawyer) and stop there.

Style:
- acknowledge: one warm sentence showing you heard them. No praise, no lecture.
- steps: one to three. Each title starts with a verb and is under six words. Each "how" is one or two short sentences a tired parent can follow.
- watchFor: one sentence on what would mean this needs a professional.
- checkIn: one specific question to answer later about whether the plan worked, a plain label for when (such as "tomorrow evening"), and afterHours as the number of hours until then.
- Plain everyday words. No jargon. No emojis.`;

const schema = {
  type: "object",
  properties: {
    acknowledge: { type: "string" },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        properties: { title: { type: "string" }, how: { type: "string" } },
        required: ["title", "how"],
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
  required: ["acknowledge", "steps", "watchFor", "checkIn", "declined"],
};

const FAILED: Record<keyof ReplyCheck, string> = {
  diagnosis: "named a diagnosis or condition for the child",
  medical: "gave a medical instruction",
  legal: "gave a legal instruction",
};

function instructions({ lang, decline, support, failedRule }: CoachInput): string {
  const parts = [RULES, `Write every field in ${LANGUAGE[lang]}, the same language and script the parent used.`];
  parts.push(
    decline
      ? `The parent asked for a ${decline} instruction. Do not give it. Set "declined" to kind "${decline}" with a one-sentence pointer to ${decline === "medical" ? "their child's doctor" : "a lawyer"}, then help with the parenting side of the concern.`
      : `Set "declined" to null.`,
  );
  if (support)
    parts.push(
      "The parent is describing their own harsh moment or a fear of losing control. Do not judge them. Aim the steps at the parent's own calm-down in the moment and at repairing things with the child.",
    );
  if (failedRule)
    parts.push(`Your previous draft ${FAILED[failedRule]}. Write it again without doing that.`);
  return parts.join("\n\n");
}

export function parsePlan(text: string): Plan | null {
  try {
    return validatePlan(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * The conversation the coach is shown. It is exactly the window the gate judged:
 * the coach must never see a turn that was not checked first.
 */
export function conversationFor(turns: Turn[]): string {
  return gateWindow(turns)
    .map((t) => `${t.role === "parent" ? "Parent" : "Coach"}: ${t.text}`)
    .join("\n");
}

let client: GoogleGenAI | undefined;

/**
 * Ask Gemini for a plan. Returns null when the reply is blocked by Gemini's own
 * safety filter, empty, malformed, or the service fails: the caller shows the safe card.
 */
export async function runCoach(input: CoachInput): Promise<Plan | null> {
  client ??= new GoogleGenAI({});
  try {
    const interaction = await client.interactions.create({
      model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      system_instruction: instructions(input),
      input: conversationFor(input.turns),
      store: false, // do not keep parent messages at Google
      response_format: { type: "text", mime_type: "application/json", schema },
    });
    return parsePlan(interaction.output_text ?? "");
  } catch {
    return null;
  }
}
