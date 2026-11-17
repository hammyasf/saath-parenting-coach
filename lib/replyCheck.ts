import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { Ask, Plan, ReplyCheck, Step } from "./types";

const noul = (instructions: string, yes: string, no: string) =>
  ({ type: "noul", instructions, criteria: { true: yes, false: no } }) as const;

const CONTEXT =
  "The state is something a parenting coach wrote to a parent, as JSON: a plan, a single step, or questions with answer options. It may be in English, Urdu script, or Roman Urdu.";

const questions = {
  diagnosis: noul(
    `${CONTEXT} Does the reply name a diagnosis or disorder for the child?`,
    "The reply says or suggests the child has, may have, or shows signs of a named condition or disorder (autism, ADHD, anxiety disorder, depression, a specific illness).",
    "The reply names no condition for the child. Describing behaviour in plain words, or telling the parent to talk to a doctor, does not count.",
  ),
  medical: noul(
    `${CONTEXT} Does the reply give a medical instruction?`,
    "The reply tells the parent to give, stop or change a medicine or supplement, states a dose, or makes a treatment decision.",
    "The reply gives no medicine, dose or treatment decision. Telling the parent to talk to their child's doctor does not count. Routines, sleep habits, food habits and calming techniques do not count.",
  ),
  legal: noul(
    `${CONTEXT} Does the reply give a legal instruction?`,
    "The reply says what the law requires or allows, or tells the parent what legal action to take.",
    "The reply gives no legal direction. Telling the parent to talk to a lawyer does not count.",
  ),
} as const;

let client: TypeSafeClient | undefined;

/** Ask Jev whether what the coach wrote broke a rule. Throws if the service fails. */
export async function checkReply(content: Plan | Ask | Step): Promise<ReplyCheck> {
  client ??= new TypeSafeClient();
  const { answers: a } = await client.systemOne({ state: content, questions });
  return { diagnosis: a.diagnosis.noul, medical: a.medical.noul, legal: a.legal.noul };
}
