import type { CrisisCategory } from "./types";

export type Helpline = { label: string; detail: string; url: string };

// The brief names no country, so the app does not guess one. A wrong local number is worse
// than none: the panel tells the parent to call their local emergency number, then links
// to directories that list helplines by country. Each page was opened on 17 Nov 2026.
const FIND: Helpline = {
  label: "Find a helpline in your country",
  detail: "findahelpline.com",
  url: "https://findahelpline.com/",
};
const CHILD: Helpline = {
  label: "Child helplines by country",
  detail: "Child Helpline International",
  url: "https://childhelplineinternational.org/helplines/",
};
const CRISIS: Helpline = {
  label: "Crisis centres by country",
  detail: "International Association for Suicide Prevention",
  url: "https://www.iasp.info/crisis-centres-helplines/",
};

const LINES: Record<CrisisCategory, Helpline[]> = {
  danger: [FIND],
  abuse: [CHILD, FIND],
  "self-harm": [CRISIS, FIND],
};

/** Where to find a helpline. Callers always show "call your local emergency number" first. */
export const helplinesFor = (category: CrisisCategory): Helpline[] => LINES[category];
