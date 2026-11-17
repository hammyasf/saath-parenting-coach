import type { CrisisCategory } from "./types";

export type PhoneLine = { label: string; number: string; source: string };
export type Directory = { label: string; detail: string; url: string };

// The brief names no country. The team is in Dubai, so the panel assumes the UAE first and
// always offers a way out for a parent somewhere else. Only numbers read on an official page
// are listed (17 Nov 2026); no mental-health line could be confirmed that way, so self-harm
// shows the emergency number and "go to the nearest hospital".
const AE_EMERGENCY: PhoneLine = {
  label: "Emergency (police)",
  number: "999",
  source: "https://www.adpolice.gov.ae/en/contact-us",
};
const AE_CHILD: PhoneLine = {
  label: "Child protection (Ministry of Interior)",
  number: "116111",
  source: "https://www.adpolice.gov.ae/en/Media-Center/News/2021/06/19/MoI-Urges-the-Society-to-Cooperate-in-Protecting-Children-from-Abuse",
};

const PHONES: Record<CrisisCategory, PhoneLine[]> = {
  danger: [AE_EMERGENCY],
  abuse: [AE_CHILD, AE_EMERGENCY],
  "self-harm": [AE_EMERGENCY],
};

// For a parent outside the UAE: directories that list helplines by country (each opened 17 Nov 2026).
const FIND: Directory = {
  label: "Find a helpline in your country",
  detail: "findahelpline.com",
  url: "https://findahelpline.com/",
};
const CHILD: Directory = {
  label: "Child helplines by country",
  detail: "Child Helpline International",
  url: "https://childhelplineinternational.org/helplines/",
};
const CRISIS: Directory = {
  label: "Crisis centres by country",
  detail: "International Association for Suicide Prevention",
  url: "https://www.iasp.info/crisis-centres-helplines/",
};

const ELSEWHERE: Record<CrisisCategory, Directory[]> = {
  danger: [FIND],
  abuse: [CHILD, FIND],
  "self-harm": [CRISIS, FIND],
};

/** Numbers to call in the UAE, most relevant first. */
export const phonesFor = (category: CrisisCategory): PhoneLine[] => PHONES[category];

/** Where a parent in another country can find their own helpline. */
export const directoriesFor = (category: CrisisCategory): Directory[] => ELSEWHERE[category];
