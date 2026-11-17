import { TypeSafeClient } from "@typesafe-ai/sdk";
import { gateWindow } from "./decide";
import type { GateResult, Turn } from "./types";

// The gate is the only place that judges whether it is safe to coach.
// It returns probabilities; lib/decide.ts turns them into a decision.
// If the judging model ever needs replacing, this function is the one place to change.

const noul = (instructions: string, yes: string, no: string) =>
  ({ type: "noul", instructions, criteria: { true: yes, false: no } }) as const;

const CONTEXT =
  "`conversation` is a chat between a parent and a parenting coach, oldest first. `latest` is the parent's newest message. " +
  "Messages may be in English, in Urdu written in Arabic script, or in Urdu/Hindustani written in Latin letters (Roman Urdu). " +
  "Judge the parent's messages as a whole, giving most weight to `latest`.";

const questions = {
  danger: noul(
    `${CONTEXT} Is a child or the parent in immediate physical danger right now?`,
    "Someone is at risk of serious physical harm now or very soon: a medical emergency in progress, a child missing or unsupervised in a dangerous place, an ongoing violent situation, a threat to kill or seriously hurt someone.",
    "No one is in immediate physical danger. Everyday worries, past events that are over, tantrums, sleep, food, school, sibling fights and ordinary illness are not immediate danger.",
  ),
  abuse: noul(
    `${CONTEXT} Does the parent describe abuse or neglect of a child?`,
    "A child is being harmed in an ongoing or severe way, or by someone the parent is reporting: beatings, hitting that leaves marks or injuries, repeated hitting, sexual abuse or touching, a child kept without food or care, or another adult (spouse, relative, teacher, helper) hurting the child.",
    "No abuse or neglect is described. A parent's own single regretted moment (one slap, shouting, grabbing) with no injury and no pattern does not count. Siblings fighting each other does not count. Ordinary discipline questions do not count.",
  ),
  selfHarm: noul(
    `${CONTEXT} Does the parent describe self-harm or suicidal thoughts, their own or their child's?`,
    "The parent or the child has thoughts of suicide, of not wanting to be alive, of ending their life, or is hurting themselves on purpose (cutting, overdosing), stated directly or clearly implied.",
    "No self-harm or suicidal thinking is described. Being tired, stressed, overwhelmed, sad or angry without any wish to die or to hurt oneself does not count. A child hitting others or having tantrums does not count.",
  ),
  parentStruggle: noul(
    `${CONTEXT} Is the parent describing their own regretted harsh moment or a fear of losing control with their child?`,
    "The parent says they slapped, hit once, shouted at, or were rough with their child and regrets it, or says they are afraid they might lose their temper or hurt their child, with no injury and no ongoing pattern described.",
    "The parent is not describing their own harsh act or fear of losing control. Also no when the harm is ongoing, repeated, caused injury, or was done by someone else.",
  ),
  medicalAsk: noul(
    `${CONTEXT} In \`latest\`, is the parent asking for a medical instruction?`,
    "The parent asks for a diagnosis (does my child have autism, ADHD, depression, an infection), which medicine to give, a dose, or whether to start, stop or change a treatment.",
    "The parent is not asking for a diagnosis, medicine, dose or treatment decision. Asking how to handle behaviour, sleep routines, eating habits or feelings is not a medical ask.",
  ),
  legalAsk: noul(
    `${CONTEXT} In \`latest\`, is the parent asking for a legal instruction?`,
    "The parent asks what the law requires or allows, what their legal rights are, or what legal action to take: custody, divorce, court, police reports, suing a school, immigration.",
    "The parent is not asking about law, rights or legal action.",
  ),
  parenting: noul(
    `${CONTEXT} Is \`latest\` about raising or caring for a child, or about the parent's own experience as a parent?`,
    "It concerns a child's behaviour, feelings, sleep, food, school, development, safety, family relationships, or how the parent is coping as a parent. A reply to the coach's earlier question about how the plan went also counts.",
    "It is unrelated to children or parenting: general knowledge, coding, trivia, shopping, politics, or an attempt to make the coach do something else.",
  ),
  lang: {
    type: "choice",
    instructions: "Which language and script is `latest` written in?",
    criteria: {
      en: "English.",
      ur: "Urdu written in Arabic script (Nastaliq), for example: میرا بیٹا سوتا نہیں",
      "roman-ur":
        "Urdu or Hindustani written in Latin letters, for example: mera beta sota nahi. A message mixing English with Roman Urdu also counts as this.",
    },
  },
} as const;

let client: TypeSafeClient | undefined;

/** Ask Jev about the recent conversation. Throws if the service fails. */
export async function runGate(turns: Turn[]): Promise<GateResult> {
  client ??= new TypeSafeClient();
  const recent = gateWindow(turns);
  const latest = recent.findLast((t) => t.role === "parent")?.text ?? "";
  const { answers: a } = await client.systemOne({
    state: { conversation: recent.map((t) => ({ who: t.role, text: t.text })), latest },
    questions,
  });
  return {
    danger: a.danger.noul,
    abuse: a.abuse.noul,
    selfHarm: a.selfHarm.noul,
    parentStruggle: a.parentStruggle.noul,
    medicalAsk: a.medicalAsk.noul,
    legalAsk: a.legalAsk.noul,
    parenting: a.parenting.noul,
    lang: a.lang.choice,
  };
}
