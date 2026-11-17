"use client";

import { useEffect, useRef, useState } from "react";
import { AskCard, CheckInCard, CrisisPanel, ExampleCard, HelpBox, NoteCard, PlanCard, Skeleton } from "./cards";
import {
  clearCheckIn,
  clearItems,
  dueCheckIn,
  loadItems,
  peekCheckIn,
  safeStore,
  saveCheckIn,
  saveItems,
  type SavedCheckIn,
} from "@/lib/checkin";
import type { Region } from "@/lib/helplines";
import { isItem, newId, toTurns, type Item } from "@/lib/items";
import { MAX_TEXT } from "@/lib/request";
import { checkInIcs, planToText } from "@/lib/share";
import { STARTERS, dirOf, langAttr, t } from "@/lib/strings";
import type { CoachResponse, Lang, Plan } from "@/lib/types";

const REGIONS: { value: Region; label: string }[] = [
  { value: "pk", label: "Pakistan" },
  { value: "ae", label: "UAE" },
  { value: "other", label: "Other" },
];

const store = () => safeStore(() => window.localStorage);

/** A first guess at which helplines to show, from the device's time zone. The parent can change it. */
function guessRegion(): Region {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === "Asia/Karachi" ? "pk" : tz === "Asia/Dubai" ? "ae" : "other";
  } catch {
    return "other";
  }
}

/** What a screen reader hears when a reply arrives: the gist, once. */
function announce(r: CoachResponse): string {
  if (r.kind === "plan") return [r.plan.acknowledge, ...r.plan.steps.map((s) => s.title)].join(". ");
  if (r.kind === "ask") return [r.ask.intro, ...r.ask.questions.map((q) => q.q)].join(" ");
  if (r.kind === "step") return r.step.title;
  if (r.kind === "crisis") return `${t("crisisTitle", r.lang)}. ${t(`crisis_${r.category}`, r.lang)}`;
  return t(r.kind, r.lang);
}

export default function Chat() {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [ui, setUi] = useState<Lang>("en");
  const [region, setRegion] = useState<Region>("other");
  const [due, setDue] = useState<SavedCheckIn | null>(null);
  const [reminded, setReminded] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [demo, setDemo] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [swap, setSwap] = useState<{ id: string; index: number } | null>(null);
  const [swapFailed, setSwapFailed] = useState<string | null>(null);

  const itemsRef = useRef(items);
  const busy = useRef(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  // Restore what this browser remembers. Runs once, after first paint, so the server and client render match.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setItems(loadItems(store()).filter(isItem));
    setDue(dueCheckIn(store(), Date.now()));
    setDemo(new URLSearchParams(window.location.search).has("demo"));
    const r = store().getItem("saath.region");
    setRegion(r === "pk" || r === "ae" || r === "other" ? r : guessRegion());
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    itemsRef.current = items;
    if (loaded) saveItems(store(), items);
    end.current?.scrollIntoView({ block: "end" });
  }, [items, loaded, pending, due]);

  const hadCrisis = items.some((it) => it.kind === "reply" && it.response.kind === "crisis");

  async function send(raw: string, label?: string) {
    const message = raw.trim();
    if (!message || busy.current) return;
    if (message.length > MAX_TEXT) return setNote(t("tooLong", ui));
    busy.current = true;
    setPending(true);
    setNote("");

    const mine: Item = { id: newId(), kind: "parent", text: message, ...(label && { label }) };
    const next = [...itemsRef.current, mine];
    setItems(next);
    setText("");

    let response: CoachResponse;
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns: toTurns(next) }),
      });
      if (res.status === 400) {
        setItems((v) => v.filter((it) => it.id !== mine.id));
        setText(raw);
        setNote(t("tooLong", ui));
        return;
      }
      response = res.ok ? await res.json() : { kind: "fallback", lang: ui };
    } catch {
      response = { kind: "fallback", lang: ui };
    } finally {
      busy.current = false;
      setPending(false);
    }
    if (response.kind === "step") response = { kind: "fallback", lang: response.lang }; // only a swap may return a lone step
    setItems((v) => [...v, { id: newId(), kind: "reply", response }]);
    setSpoken(announce(response));
    // Do not pull focus (and a phone keyboard) over a crisis panel's phone numbers.
    if (response.kind !== "crisis") box.current?.focus();
  }

  /** Replace one step of a plan in place. A crisis in the request still shows the crisis panel. */
  async function swapStep(id: string, index: number, reason: string) {
    const at = itemsRef.current.findIndex((it) => it.id === id);
    const item = itemsRef.current[at];
    if (busy.current || !item || item.kind !== "reply" || item.response.kind !== "plan") return;
    const { plan, lang } = item.response;
    busy.current = true;
    setSwap({ id, index });
    setSwapFailed(null);
    let response: CoachResponse | null = null;
    try {
      const turns = toTurns(itemsRef.current.slice(0, at + 1));
      turns.push({ role: "parent", text: `${t("swap", lang)}: ${plan.steps[index].title}. ${reason}.` });
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ turns, mode: "swap" }),
      });
      if (res.ok) response = await res.json();
    } catch {
      // handled below as a failed swap
    } finally {
      busy.current = false;
      setSwap(null);
    }
    if (response?.kind === "step") {
      const { step } = response;
      setItems((v) =>
        v.map((it) =>
          it.id === id && it.kind === "reply" && it.response.kind === "plan"
            ? {
                ...it,
                done: it.done?.filter((n) => n !== index),
                response: { ...it.response, plan: { ...it.response.plan, steps: it.response.plan.steps.map((s, i) => (i === index ? step : s)) } },
              }
            : it,
        ),
      );
      setSpoken(step.title);
    } else if (response?.kind === "crisis") {
      const crisis = response;
      setItems((v) => [...v, { id: newId(), kind: "reply", response: crisis }]);
      setSpoken(announce(crisis));
    } else setSwapFailed(id);
  }

  function toggleDone(id: string, index: number) {
    setItems((v) =>
      v.map((it) =>
        it.id === id && it.kind === "reply"
          ? { ...it, done: it.done?.includes(index) ? it.done.filter((n) => n !== index) : [...(it.done ?? []), index] }
          : it,
      ),
    );
  }

  function answerAsk(id: string, answer: string, label: string) {
    if (busy.current) return;
    // send() builds on itemsRef, so mark the card answered there first or the mark would be overwritten.
    itemsRef.current = itemsRef.current.map((it) => (it.id === id && it.kind === "reply" ? { ...it, answered: true } : it));
    send(answer, label);
  }

  const checkInOf = (plan: Plan, lang: Lang, dueAt: number): SavedCheckIn => ({
    question: plan.checkIn.question,
    whenLabel: plan.checkIn.whenLabel,
    trying: plan.steps[0].title,
    steps: plan.steps.map((s) => s.title),
    lang,
    dueAt,
  });

  function remind(id: string, plan: Plan, lang: Lang) {
    // eslint-disable-next-line react-hooks/purity -- runs on click, never during render
    saveCheckIn(store(), checkInOf(plan, lang, Date.now() + plan.checkIn.afterHours * 3_600_000));
    setReminded(id);
  }

  /** Share sheet on phones (WhatsApp and the rest); copy to the clipboard elsewhere. */
  async function sharePlan(plan: Plan, lang: Lang): Promise<"shared" | "copied" | "failed"> {
    const text = planToText(plan, lang);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return "shared";
      }
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      return "failed"; // dismissed the sheet, or the browser refused
    }
  }

  /** The saved check-in as a calendar file, so the reminder exists outside this tab. */
  function downloadCalendar() {
    const c = peekCheckIn(store());
    if (!c) return;
    const ics = checkInIcs(c, Date.now(), `${window.location.origin}/`);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "saath-check-in.ics" });
    a.click();
    URL.revokeObjectURL(url);
  }

  function answerCheckIn(c: SavedCheckIn, answer: string, label: string) {
    clearCheckIn(store());
    setDue(null);
    setReminded(null);
    // Tell the coach which steps were ticked off, so the next plan builds on what was really tried.
    const last = itemsRef.current.findLast((it) => it.kind === "reply" && it.response.kind === "plan");
    const tried =
      last?.kind === "reply" && last.response.kind === "plan" && last.done?.length
        ? ` ${t("done", c.lang)}: ${last.done.map((n) => last.response.kind === "plan" && last.response.plan.steps[n]?.title).filter(Boolean).join("; ")}.`
        : "";
    send(`${c.question} ${answer}${answer.endsWith(".") ? "" : "."}${tried}`, label);
  }

  /** Answer the check-in right away, with the same three taps as when it comes due. */
  function answerNow(plan: Plan, lang: Lang) {
    // eslint-disable-next-line react-hooks/purity -- runs on click, never during render
    setDue(checkInOf(plan, lang, Date.now()));
  }

  function skipToCheckIn() {
    const c = peekCheckIn(store());
    if (!c) return;
    const now = { ...c, dueAt: Date.now() };
    saveCheckIn(store(), now);
    setDue(now);
  }

  function reset() {
    clearItems(store());
    clearCheckIn(store());
    setItems([]);
    setDue(null);
    setReminded(null);
    setShowHelp(false);
    setNote("");
    setSwapFailed(null);
    box.current?.focus();
  }

  function pickRegion(r: Region) {
    setRegion(r);
    store().setItem("saath.region", r);
  }

  const active = loaded && (items.length > 0 || due !== null);

  const composer = (
    <div className="composer">
      {demo && active && (
        <button type="button" className="demo" onClick={skipToCheckIn} disabled={!reminded}>
          {t("skipDemo", "en")}
        </button>
      )}
      <label className="field-label" htmlFor="concern" dir={dirOf(ui)} lang={langAttr(ui)}>
        {t("fieldLabel", ui)}
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <textarea
          id="concern"
          ref={box}
          rows={1}
          dir="auto"
          value={text}
          placeholder={t("placeholder", ui)}
          aria-describedby={note ? "note" : undefined}
          onChange={(e) => {
            setText(e.target.value);
            if (note) setNote("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(text);
            }
          }}
        />
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {t("send", ui)}
        </button>
      </form>
      {note && (
        <p id="note" className="inline-note" role="alert">
          {note}
        </p>
      )}
      <p className="privacy" dir={dirOf(ui)} lang={langAttr(ui)}>
        {t("tagline", ui)} {t("privacy", ui)}
      </p>
    </div>
  );

  return (
    <>
      <header className="nav">
        <div className="wrap nav__row">
          <a className="skip-link" href="#concern">
            Skip to the message box
          </a>
          <p className="wordmark">Saath</p>
          <p className="sr-only" role="status">
            {pending ? t("thinking", ui) : spoken}
          </p>
          <div className="controls">
            <div className="seg" role="group" aria-label="Page language">
              <button type="button" aria-pressed={ui === "en"} onClick={() => setUi("en")}>
                EN
              </button>
              <button type="button" aria-pressed={ui === "ur"} onClick={() => setUi("ur")} lang="ur">
                اردو
              </button>
            </div>
            <label className="region">
              <span className="sr-only">{t("regionLabel", "en")}</span>
              <select value={region} onChange={(e) => pickRegion(e.target.value as Region)}>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            {active && (
              <button type="button" className="link reset" onClick={reset} disabled={pending} aria-label={t("reset", ui)}>
                <span className="reset__text">{t("reset", ui)}</span>
                <svg className="reset__icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v2.8h2.8" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        {active ? (
          <section className="talk">
            <div className="wrap wrap--narrow talk__col">
              <h1 className="sr-only">Saath, your parenting coach</h1>
              {(hadCrisis || showHelp) && (
                <div className="pinned">
                  {showHelp ? (
                    <HelpBox lang={ui} region={region} onClose={() => setShowHelp(false)} />
                  ) : (
                    <button type="button" className="btn btn--secondary" onClick={() => setShowHelp(true)}>
                      {t("getHelpNow", ui)}
                    </button>
                  )}
                </div>
              )}
              <div className="thread">
                {items.map((it) =>
                  it.kind === "parent" ? (
                    <p key={it.id} className="mine" dir="auto">
                      {it.label ?? it.text}
                    </p>
                  ) : it.response.kind === "plan" ? (
                    <PlanCard
                      key={it.id}
                      plan={it.response.plan}
                      lang={it.response.lang}
                      support={it.response.support}
                      reminded={reminded === it.id}
                      done={it.done ?? []}
                      swapping={swap?.id === it.id ? swap.index : null}
                      swapFailed={swapFailed === it.id}
                      onToggleDone={(i) => toggleDone(it.id, i)}
                      onSwap={(i, reason) => swapStep(it.id, i, reason)}
                      onRemind={() => it.response.kind === "plan" && remind(it.id, it.response.plan, it.response.lang)}
                      onCalendar={downloadCalendar}
                      onAnswerNow={() => it.response.kind === "plan" && answerNow(it.response.plan, it.response.lang)}
                      onShare={async () =>
                        it.response.kind === "plan" ? sharePlan(it.response.plan, it.response.lang) : "failed"
                      }
                      onHelp={() => setShowHelp(true)}
                    />
                  ) : it.response.kind === "ask" ? (
                    <AskCard
                      key={it.id}
                      ask={it.response.ask}
                      lang={it.response.lang}
                      answered={Boolean(it.answered) || pending}
                      onAnswer={(a, label) => answerAsk(it.id, a, label)}
                    />
                  ) : it.response.kind === "crisis" ? (
                    <CrisisPanel key={it.id} category={it.response.category} lang={it.response.lang} region={region} />
                  ) : it.response.kind === "step" ? null : (
                    <NoteCard key={it.id} kind={it.response.kind} lang={it.response.lang} />
                  ),
                )}
                {due && !pending && <CheckInCard c={due} onAnswer={(a, label) => answerCheckIn(due, a, label)} />}
                {pending && <Skeleton label={t("thinking", ui)} />}
                <div ref={end} />
              </div>
              {composer}
            </div>
          </section>
        ) : (
          <section className="hero" data-enter>
            <div className="wrap">
              <div className="hero-text hero__grid">
              <div className="hero__text">
                <h1 dir={dirOf(ui)} lang={langAttr(ui)}>
                  {t("welcome", ui)}
                </h1>
                <p className="lead" dir={dirOf(ui)} lang={langAttr(ui)}>
                  {t("lead", ui)}
                </p>
                {composer}
                <div className="starters">
                  {STARTERS.map((s) => (
                    <button
                      key={s.lang}
                      type="button"
                      className="chip"
                      dir={dirOf(s.lang)}
                      lang={langAttr(s.lang)}
                      onClick={() => send(s.text)}
                    >
                      {s.text}
                    </button>
                  ))}
                </div>
              </div>
              <ExampleCard />
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
