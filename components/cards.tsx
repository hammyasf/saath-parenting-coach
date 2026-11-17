import { helplinesFor, type Helpline, type Region } from "@/lib/helplines";
import { dirOf, langAttr, t } from "@/lib/strings";
import type { SavedCheckIn } from "@/lib/checkin";
import type { CrisisCategory, Lang, Plan } from "@/lib/types";

const CATEGORIES: CrisisCategory[] = ["danger", "abuse", "self-harm"];

function Helplines({ lines, lang }: { lines: Helpline[]; lang: Lang }) {
  return (
    <>
      {lines.length > 0 && (
        <ul className="helplines">
          {lines.map((h) => (
            <li key={h.number}>
              <a className="call" href={`tel:${h.number}`} dir="ltr">
                <span className="call-number">{h.number}</span>
                <span className="call-label">{h.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="generic">{t("crisisGeneric", lang)}</p>
    </>
  );
}

export function PlanCard({
  plan,
  lang,
  support,
  reminded,
  onRemind,
  onAnswerNow,
  onHelp,
}: {
  plan: Plan;
  lang: Lang;
  support: boolean;
  reminded: boolean;
  onRemind: () => void;
  onAnswerNow: () => void;
  onHelp: () => void;
}) {
  return (
    <article className="card plan" dir={dirOf(lang)} lang={langAttr(lang)}>
      <p className="ack">{plan.acknowledge}</p>
      {plan.declined && <p className="declined">{plan.declined.pointer}</p>}
      <ol className="steps">
        {plan.steps.map((s, i) => (
          <li key={i}>
            <span className="step-n" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h3>{s.title}</h3>
              <p>{s.how}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="watch">
        <strong>{t("watchFor", lang)}: </strong>
        {plan.watchFor}
      </p>
      <section className="checkin">
        <p className="eyebrow">
          {t("checkIn", lang)} · {plan.checkIn.whenLabel}
        </p>
        <p className="question">{plan.checkIn.question}</p>
        <div className="row">
          {reminded ? (
            <span className="saved" role="status">
              ✓ {t("saved", lang)} {plan.checkIn.whenLabel}
            </span>
          ) : (
            <button type="button" className="btn" onClick={onRemind}>
              {t("remindMe", lang)}
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onAnswerNow}>
            {t("answerNow", lang)}
          </button>
        </div>
      </section>
      {support && (
        <button type="button" className="strip" onClick={onHelp}>
          {t("supportStrip", lang)}
        </button>
      )}
    </article>
  );
}

export function CrisisPanel({ category, lang, region }: { category: CrisisCategory; lang: Lang; region: Region }) {
  return (
    <article className="card crisis" dir={dirOf(lang)} lang={langAttr(lang)}>
      <h3>{t("crisisTitle", lang)}</h3>
      <p>{t(`crisis_${category}`, lang)}</p>
      <Helplines lines={helplinesFor(region, category)} lang={lang} />
      <p className="after">{t("crisisAfter", lang)}</p>
    </article>
  );
}

/** Every number for the chosen region, opened from "Get help now" or the support strip. */
export function HelpBox({ lang, region, onClose }: { lang: Lang; region: Region; onClose: () => void }) {
  const seen = new Set<string>();
  const lines = CATEGORIES.flatMap((c) => helplinesFor(region, c)).filter(
    (h) => !seen.has(h.number) && seen.add(h.number),
  );
  return (
    <section className="card crisis helpbox" dir={dirOf(lang)} lang={langAttr(lang)} aria-label={t("getHelpNow", lang)}>
      <div className="row between">
        <h3>{t("getHelpNow", lang)}</h3>
        <button type="button" className="icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <Helplines lines={lines} lang={lang} />
    </section>
  );
}

export function NoteCard({ kind, lang }: { kind: "fallback" | "redirect"; lang: Lang }) {
  return (
    <article className="card note" dir={dirOf(lang)} lang={langAttr(lang)}>
      <p>{t(kind, lang)}</p>
    </article>
  );
}

export function CheckInCard({ c, onAnswer }: { c: SavedCheckIn; onAnswer: (answer: string) => void }) {
  const { lang } = c;
  return (
    <article className="card due" dir={dirOf(lang)} lang={langAttr(lang)}>
      <p className="eyebrow">{t("checkIn", lang)}</p>
      <p className="trying">
        {t("youWereTrying", lang)} <strong>{c.trying}</strong>
      </p>
      <p className="question">{c.question}</p>
      <div className="row">
        {(["better", "same", "harder"] as const).map((k) => (
          <button key={k} type="button" className="btn ghost" onClick={() => onAnswer(t(k, lang))}>
            {t(k, lang)}
          </button>
        ))}
      </div>
    </article>
  );
}

export function Skeleton() {
  return (
    <div className="card skeleton" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
