"use client";

import { useEffect, useRef, useState } from "react";
import { CheckInCard, CrisisPanel, HelpBox, NoteCard, PlanCard, Skeleton } from "./cards";
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

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || busy.current) return;
    if (message.length > MAX_TEXT) return setNote(t("tooLong", ui));
    busy.current = true;
    setPending(true);
    setNote("");

    const mine: Item = { id: newId(), kind: "parent", text: message };
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
    setItems((v) => [...v, { id: newId(), kind: "reply", response }]);
    setSpoken(announce(response));
    // Do not pull focus (and a phone keyboard) over a crisis panel's phone numbers.
    if (response.kind !== "crisis") box.current?.focus();
  }

  function remind(id: string, plan: Plan, lang: Lang) {
    saveCheckIn(store(), {
      question: plan.checkIn.question,
      whenLabel: plan.checkIn.whenLabel,
      trying: plan.steps[0].title,
      lang,
      // eslint-disable-next-line react-hooks/purity -- runs on click, never during render
      dueAt: Date.now() + plan.checkIn.afterHours * 3_600_000,
    });
    setReminded(id);
  }

  function answerCheckIn(c: { question: string }, answer: string) {
    clearCheckIn(store());
    setDue(null);
    setReminded(null);
    send(`About "${c.question}": ${answer}`);
  }

  function answerNow(plan: Plan) {
    setText(`About "${plan.checkIn.question}": `);
    box.current?.focus();
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
    box.current?.focus();
  }

  function pickRegion(r: Region) {
    setRegion(r);
    store().setItem("saath.region", r);
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>Saath</h1>
          <p dir={dirOf(ui)} lang={langAttr(ui)}>
            {t("tagline", ui)}
          </p>
        </div>
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
          <button type="button" className="link" onClick={reset} disabled={pending}>
            {t("reset", ui)}
          </button>
        </div>
      </header>

      {(hadCrisis || showHelp) && (
        <div className="pinned">
          {showHelp ? (
            <HelpBox lang={ui} region={region} onClose={() => setShowHelp(false)} />
          ) : (
            <button type="button" className="help" onClick={() => setShowHelp(true)}>
              {t("getHelpNow", ui)}
            </button>
          )}
        </div>
      )}

      <main className="thread">
        {loaded && items.length === 0 && !due && (
          <section className="empty">
            <h2 dir={dirOf(ui)} lang={langAttr(ui)}>
              {t("welcome", ui)}
            </h2>
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
          </section>
        )}

        {items.map((it) =>
          it.kind === "parent" ? (
            <p key={it.id} className="mine" dir="auto">
              {it.text}
            </p>
          ) : it.response.kind === "plan" ? (
            <PlanCard
              key={it.id}
              plan={it.response.plan}
              lang={it.response.lang}
              support={it.response.support}
              reminded={reminded === it.id}
              onRemind={() => it.response.kind === "plan" && remind(it.id, it.response.plan, it.response.lang)}
              onAnswerNow={() => it.response.kind === "plan" && answerNow(it.response.plan)}
              onHelp={() => setShowHelp(true)}
            />
          ) : it.response.kind === "crisis" ? (
            <CrisisPanel key={it.id} category={it.response.category} lang={it.response.lang} region={region} />
          ) : (
            <NoteCard key={it.id} kind={it.response.kind} lang={it.response.lang} />
          ),
        )}

        {due && !pending && <CheckInCard c={due} onAnswer={(a) => answerCheckIn(due, a)} />}
        {pending && <Skeleton />}
        <div ref={end} />
      </main>

      <p className="sr-only" role="status">
        {pending ? t("thinking", ui) : spoken}
      </p>

      <footer className="composer">
        {demo && (
          <button type="button" className="demo" onClick={skipToCheckIn} disabled={!reminded}>
            {t("skipDemo", "en")}
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label className="sr-only" htmlFor="concern">
            {t("placeholder", ui)}
          </label>
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
          <button type="submit" className="btn send" disabled={pending || !text.trim()}>
            {t("send", ui)}
          </button>
        </form>
        {note && (
          <p id="note" className="inline-note" role="alert">
            {note}
          </p>
        )}
        <p className="privacy" dir={dirOf(ui)} lang={langAttr(ui)}>
          {t("privacy", ui)}
        </p>
      </footer>
    </div>
  );
}
