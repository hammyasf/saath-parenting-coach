import type { CrisisCategory } from "./types";

export type Region = "pk" | "ae" | "other";
export type Helpline = { label: string; number: string; source: string };

// Only numbers found on an official page are listed (checked 17 Nov 2026).
// No mental-health or suicide line could be confirmed on an official source for
// either region, so self-harm shows the emergency number; the panel always adds
// "go to the nearest hospital emergency department" below these.
const PK_CHILD: Helpline = {
  label: "Child Protection Helpline (free, 24 hours)",
  number: "1121",
  source: "https://www.kpcpwc.gov.pk/",
};
const PK_RESCUE: Helpline = {
  label: "Rescue 1122 (ambulance and emergency)",
  number: "1122",
  source: "https://www.rescue.gov.pk/",
};
const AE_CHILD: Helpline = {
  label: "Ministry of Interior Child Protection Centre",
  number: "116111",
  source: "https://www.adpolice.gov.ae/en/Media-Center/News/2021/06/19/MoI-Urges-the-Society-to-Cooperate-in-Protecting-Children-from-Abuse",
};
const AE_POLICE: Helpline = {
  label: "Police",
  number: "999",
  source: "https://u.ae/en/information-and-services/justice-safety-and-the-law/handling-emergencies",
};
const AE_AMBULANCE: Helpline = {
  label: "Ambulance",
  number: "998",
  source: "https://u.ae/en/information-and-services/justice-safety-and-the-law/handling-emergencies",
};

const LINES: Record<Exclude<Region, "other">, Record<CrisisCategory, Helpline[]>> = {
  pk: {
    danger: [PK_RESCUE, PK_CHILD],
    abuse: [PK_CHILD, PK_RESCUE],
    "self-harm": [PK_RESCUE],
  },
  ae: {
    danger: [AE_POLICE, AE_AMBULANCE],
    abuse: [AE_CHILD, AE_POLICE],
    "self-harm": [AE_AMBULANCE, AE_POLICE],
  },
};

/** May be empty ("other"); callers always also show the generic "local emergency number" line. */
export function helplinesFor(region: Region, category: CrisisCategory): Helpline[] {
  return region === "other" ? [] : LINES[region][category];
}
