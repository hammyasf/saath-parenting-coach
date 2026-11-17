import { useState } from "react";
import { helplinesFor, type Helpline } from "@/lib/helplines";
import { dirOf, langAttr, t } from "@/lib/strings";
import type { SavedCheckIn } from "@/lib/checkin";
import type { Ask, CrisisCategory, Lang, Plan } from "@/lib/types";

const CATEGORIES: CrisisCategory[] = ["danger", "abuse", "self-harm"];
const REASONS = ["reasonHard", "reasonTried", "reasonFit"] as const;

/** The local emergency number first, then directories that list helplines by country. */
function Helplines({ lines, lang }: { lines: Helpline[]; lang: Lang }) {
  return (
    <>
      <p className="generic">{t("crisisGeneric", lang)}</p>
      <ul className="helplines">
        {lines.map((h) => (
          <li key={h.url}>
            <a className="call" href={h.url} target="_blank" rel="noreferrer" dir="ltr" lang="en">
              <span className="call-text">
                <span className="call-label">{h.label}</span>
                <span className="call-detail">{h.detail}</span>
              </span>
              <svg className="call-arrow" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M5 11 11 5M6 5h5v5" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Questions the coach asks before advising. Each option is a tap, not typing. */
export function AskCard({
  ask,
  lang,
  answered,
  onAnswer,
}: {
  ask: Ask;
  lang: Lang;
  answered: boolean;
  onAnswer: (text: string, label: string) => void;
}) {
  const [picked, setPicked] = useState<(string | null)[]>(() => ask.questions.map(() => null));
  const answer = () =>
    onAnswer(
      ask.questions
        .map((q, i) => (picked[i] ? `${q.q} ${picked[i]}.` : ""))
        .filter(Boolean)
        .join(" "),
      picked.filter(Boolean).join(" · "),
    );
  return (
    <article className="card ask" dir={dirOf(lang)} lang={langAttr(lang)}>
      <p className="ack">{ask.intro}</p>
      {ask.questions.map((q, i) => (
        <fieldset key={i} className="ask__q" disabled={answered}>
          <legend>{q.q}</legend>
          <div className="row">
            {q.options.map((o) => (
              <button
                key={o}
                type="button"
                className="opt"
                aria-pressed={picked[i] === o}
                onClick={() => setPicked((p) => p.map((v, j) => (j === i ? (v === o ? null : o) : v)))}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {!answered && (
        <div className="row ask__actions">
          <button type="button" className="btn btn--primary" disabled={!picked.some(Boolean)} onClick={answer}>
            {t("getPlan", lang)}
          </button>
          <button type="button" className="link" onClick={() => onAnswer(t("skipAsk", lang), t("skipAsk", lang))}>
            {t("skipAsk", lang)}
          </button>
        </div>
      )}
    </article>
  );
}

function Tick() {
  return (
    <svg className="tick" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/** Better / Same / Harder, then (if it did not go well) which step. Used on the plan and on a due check-in. */
function CheckInAnswers({
  lang,
  steps,
  onAnswer,
}: {
  lang: Lang;
  steps: string[];
  onAnswer: (answer: string, label: string) => void;
}) {
  const [how, setHow] = useState<string | null>(null);
  if (how === null)
    return (
      <div className="row">
        {(["better", "same", "harder"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="opt"
            onClick={() => (k === "better" || steps.length < 2 ? onAnswer(t(k, lang), t(k, lang)) : setHow(t(k, lang)))}
          >
            {t(k, lang)}
          </button>
        ))}
      </div>
    );
  return (
    <>
      <p className="eyebrow">{t("whichStep", lang)}</p>
      <div className="row">
        {[...steps, t("allSteps", lang)].map((s) => (
          <button
            key={s}
            type="button"
            className="opt"
            onClick={() => onAnswer(`${how}. ${t("whichStep", lang)} ${s}.`, `${how} · ${s}`)}
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}

export function PlanCard({
  plan,
  lang,
  support,
  reminded,
  done,
  swapping,
  swapFailed,
  onToggleDone,
  onSwap,
  onRemind,
  onCalendar,
  onAnswer,
  onShare,
  onHelp,
}: {
  plan: Plan;
  lang: Lang;
  support: boolean;
  reminded: boolean;
  done: number[];
  /** Index of the step being replaced right now, if any. */
  swapping: number | null;
  swapFailed: boolean;
  onToggleDone: (index: number) => void;
  onSwap: (index: number, reason: string) => void;
  onRemind: () => void;
  onCalendar: () => void;
  /** The parent answers the check-in right on the card. */
  onAnswer: (answer: string, label: string) => void;
  onShare: () => Promise<"shared" | "copied" | "failed">;
  onHelp: () => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const [shared, setShared] = useState<"copied" | "failed" | null>(null);
  const [answering, setAnswering] = useState(false);
  const [asking, setAsking] = useState<number | null>(null);
  return (
    <article className="card plan" dir={dirOf(lang)} lang={langAttr(lang)}>
      <p className="ack">{plan.acknowledge}</p>
      {plan.declined && <p className="declined">{plan.declined.pointer}</p>}

      <ol className="steps">
        {plan.steps.map((s, i) => {
          const isOpen = open === i;
          const isDone = done.includes(i);
          const busy = swapping === i;
          return (
            <li key={`${i}-${s.title}`} className="step" data-done={isDone || undefined} aria-busy={busy}>
              <h3>
                <button
                  type="button"
                  className="step__head"
                  aria-expanded={isOpen}
                  aria-controls={`step-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="step-n" aria-hidden="true">
                    {isDone ? <Tick /> : i + 1}
                  </span>
                  <span className="step__title">{s.title}</span>
                  <svg className="chev" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 4.5 6 8l3.5-3.5" />
                  </svg>
                </button>
              </h3>
              <div className="step__body">
                <p>{busy ? t("swapping", lang) : s.how}</p>
                <div id={`step-${i}`} className="step__more" hidden={!isOpen || busy}>
                  {s.say && (
                    <p className="say">
                      <span className="eyebrow">{t("say", lang)}</span>
                      {s.say}
                    </p>
                  )}
                  <p className="why">
                    <span className="eyebrow">{t("why", lang)}</span>
                    {s.why}
                  </p>
                  <div className="row">
                    <button
                      type="button"
                      className="opt"
                      aria-pressed={isDone}
                      onClick={() => onToggleDone(i)}
                    >
                      {t("done", lang)}
                    </button>
                    <button
                      type="button"
                      className="link"
                      aria-expanded={asking === i}
                      onClick={() => setAsking(asking === i ? null : i)}
                    >
                      {t("swap", lang)}
                    </button>
                  </div>
                  {asking === i && (
                    <div className="swap">
                      <p className="eyebrow">{t("swapWhy", lang)}</p>
                      <div className="row">
                        {REASONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            className="opt"
                            onClick={() => {
                              setAsking(null);
                              onSwap(i, t(r, lang));
                            }}
                          >
                            {t(r, lang)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {swapFailed && (
        <p className="inline-note" role="alert">
          {t("swapFailed", lang)}
        </p>
      )}

      {plan.timeline && (
        <section className="tonight" aria-label={t("tonight", lang)}>
          <p className="eyebrow">{t("tonight", lang)}</p>
          <ol>
            {plan.timeline.map((r, i) => (
              <li key={i}>
                <span className="time">{r.time}</span>
                <span>{r.what}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="watch">
        <span className="eyebrow">{t("watchFor", lang)}</span>
        {plan.watchFor}
      </p>

      <section className="checkin">
        <p className="eyebrow">
          {t("checkIn", lang)} · {plan.checkIn.whenLabel}
        </p>
        <p className="question">{plan.checkIn.question}</p>
        {answering ? (
          <CheckInAnswers lang={lang} steps={plan.steps.map((st) => st.title)} onAnswer={onAnswer} />
        ) : (
          <div className="row">
            {reminded ? (
              <>
                <span className="saved" role="status">
                  <Tick /> {t("saved", lang)} {plan.checkIn.whenLabel}
                </span>
                <button type="button" className="btn btn--secondary" onClick={onCalendar}>
                  {t("addCal", lang)}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--secondary" onClick={onRemind}>
                {t("remindMe", lang)}
              </button>
            )}
            <button type="button" className="btn btn--secondary" onClick={() => setAnswering(true)}>
              {t("answerNow", lang)}
            </button>
          </div>
        )}
      </section>
      <div className="plan__foot">
        <button type="button" className="quiet" onClick={async () => { const r = await onShare(); setShared(r === "shared" ? null : r); }}>
          <svg className="quiet__icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 10V2.5M5 5l3-2.5L11 5M3 9.5v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
          </svg>
          {t("share", lang)}
        </button>
        {shared && (
          <span className="plan__status" role="status">
            {t(shared === "copied" ? "copied" : "shareFailed", lang)}
          </span>
        )}
      </div>
      {support && (
        <button type="button" className="link plan__support" onClick={onHelp}>
          {t("supportStrip", lang)}
        </button>
      )}
    </article>
  );
}

export function CrisisPanel({ category, lang }: { category: CrisisCategory; lang: Lang }) {
  return (
    <article className="card crisis" dir={dirOf(lang)} lang={langAttr(lang)}>
      <h3>{t("crisisTitle", lang)}</h3>
      <p>{t(`crisis_${category}`, lang)}</p>
      <Helplines lines={helplinesFor(category)} lang={lang} />
      <p className="after">{t("crisisAfter", lang)}</p>
    </article>
  );
}

/** Every directory, opened from "Get help now" or the support strip. */
export function HelpBox({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const seen = new Set<string>();
  const lines = CATEGORIES.flatMap((c) => helplinesFor(c)).filter((h) => !seen.has(h.url) && seen.add(h.url));
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

/** The check-in when it comes due: three taps, then (if it did not go well) which step. */
export function CheckInCard({ c, onAnswer }: { c: SavedCheckIn; onAnswer: (answer: string, label: string) => void }) {
  const { lang } = c;
  return (
    <article className="card due" dir={dirOf(lang)} lang={langAttr(lang)}>
      <p className="eyebrow">{t("checkIn", lang)}</p>
      <p className="trying">
        {t("youWereTrying", lang)} <strong>{c.trying}</strong>
      </p>
      <p className="question">{c.question}</p>
      <CheckInAnswers lang={lang} steps={c.steps ?? []} onAnswer={onAnswer} />
    </article>
  );
}

export function Skeleton({ label }: { label: string }) {
  return (
    <div className="card skeleton" aria-hidden="true">
      <p className="eyebrow">{label}</p>
      <i />
      <i />
      <i />
    </div>
  );
}

/** The first screen's picture: what a reply looks like, before the parent has typed anything. */
export function ExampleCard() {
  return (
    <div className="hero__media" role="img" aria-label="Example reply: a plan card with three steps, the words to say, and a check-in question for tomorrow morning">
      <div className="mock" aria-hidden="true">
        <div className="card">
          <p className="ack">He comes out of his room five or six times after lights out.</p>
          <ol className="steps">
            <li className="step">
              <div className="step__head">
                <span className="step-n">1</span>
                <span className="step__title">Walk him back, same line</span>
              </div>
              <div className="step__body mock-more">
                <p className="say">
                  <span className="eyebrow">Say</span>
                  It&rsquo;s sleep time. I love you. Goodnight.
                </p>
              </div>
            </li>
            {["Give two bedtime passes", "Praise the first quiet morning"].map((title, i) => (
              <li key={title} className="step">
                <div className="step__head">
                  <span className="step-n">{i + 2}</span>
                  <span className="step__title">{title}</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="checkin">
            <p className="eyebrow">Check-in · tomorrow morning</p>
            <p className="question">How many times did he come out?</p>
            <div className="row">
              {["Better", "Same", "Harder"].map((o) => (
                <span key={o} className="opt">
                  {o}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
