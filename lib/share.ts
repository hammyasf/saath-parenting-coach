import { t } from "./strings";
import type { Lang, Plan } from "./types";

/** A plan as a plain message: what a parent pastes into a chat with the other parent. */
export function planToText(plan: Plan, lang: Lang): string {
  const parts = [plan.acknowledge];
  plan.steps.forEach((s, i) =>
    parts.push([`${i + 1}. ${s.title}`, s.how, s.say && `${t("say", lang)}: ${s.say}`].filter(Boolean).join("\n")),
  );
  if (plan.timeline) parts.push([t("tonight", lang), ...plan.timeline.map((r) => `${r.time}  ${r.what}`)].join("\n"));
  parts.push(`${t("watchFor", lang)}: ${plan.watchFor}`);
  parts.push(`${t("checkIn", lang)} (${plan.checkIn.whenLabel}): ${plan.checkIn.question}`);
  parts.push(`Saath. ${t("tagline", lang)}`);
  return parts.join("\n\n");
}

const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/**
 * The check-in as a calendar event (RFC 5545), so the reminder exists outside this
 * browser tab. 15 minutes long, with an alert at the start.
 */
export function checkInIcs(c: { question: string; trying: string; dueAt: number }, now: number, url: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Saath//Check-in//EN",
    "BEGIN:VEVENT",
    `UID:${c.dueAt}-${now}@saath`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(c.dueAt)}`,
    `DTEND:${stamp(c.dueAt + 15 * 60_000)}`,
    `SUMMARY:${esc(`Saath check-in: ${c.question}`)}`,
    `DESCRIPTION:${esc(`You were trying: ${c.trying}\nOpen Saath to answer: `)}${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Saath check-in",
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
