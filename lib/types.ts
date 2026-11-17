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

export type Plan = {
  acknowledge: string;
  steps: { title: string; how: string }[]; // 1–3
  watchFor: string;
  checkIn: { question: string; whenLabel: string; afterHours: number };
  declined: { kind: "medical" | "legal"; pointer: string } | null;
};

export type ReplyCheck = { diagnosis: number; medical: number; legal: number };

export type CoachResponse =
  | { kind: "plan"; lang: Lang; plan: Plan; support: boolean }
  | { kind: "crisis"; lang: Lang; category: CrisisCategory }
  | { kind: "redirect"; lang: Lang }
  | { kind: "fallback"; lang: Lang };
