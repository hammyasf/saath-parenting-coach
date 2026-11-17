export type Lang = "en" | "ur" | "roman-ur";

/** A "crisis" turn marks where a crisis panel was shown; the gate judges only what comes after it. */
export type Turn = { role: "parent" | "coach" | "crisis"; text: string };

/** Probabilities (0–1) from the gate, plus the detected language and script. */
export type GateResult = {
  danger: number;
  abuse: number;
  selfHarm: number;
  parentStruggle: number;
  medicalAsk: number;
  legalAsk: number;
  parenting: number;
  lang: Lang;
};

export type CrisisCategory = "danger" | "abuse" | "self-harm";

export type Decision =
  | { route: "crisis"; category: CrisisCategory }
  | { route: "coach"; decline: "medical" | "legal" | null; support: boolean }
  | { route: "redirect" };

/** One thing to do. `say` is the exact words to use with the child, when words are the step. */
export type Step = { title: string; how: string; say: string | null; why: string };

export type Plan = {
  acknowledge: string;
  steps: Step[]; // 1–3
  /** A short schedule for tonight, only when timing is the point (bedtime, mornings). */
  timeline: { time: string; what: string }[] | null;
  watchFor: string;
  checkIn: { question: string; whenLabel: string; afterHours: number };
  declined: { kind: "medical" | "legal"; pointer: string } | null;
};

/** Asked before advising, when the concern is too thin to plan for. Options are tappable. */
export type Ask = { intro: string; questions: { q: string; options: string[] }[] }; // 1–2 questions, 2–4 options

/** What the coach wrote, before the reply check. */
export type CoachReply = { kind: "ask"; ask: Ask } | { kind: "plan"; plan: Plan } | { kind: "step"; step: Step };

/** "reply" is a normal turn; "swap" asks for one replacement step for the plan already given. */
export type Mode = "reply" | "swap";

export type ReplyCheck = { diagnosis: number; medical: number; legal: number };

export type CoachResponse =
  | { kind: "plan"; lang: Lang; plan: Plan; support: boolean }
  | { kind: "ask"; lang: Lang; ask: Ask }
  | { kind: "step"; lang: Lang; step: Step }
  | { kind: "crisis"; lang: Lang; category: CrisisCategory }
  | { kind: "redirect"; lang: Lang }
  | { kind: "fallback"; lang: Lang };
