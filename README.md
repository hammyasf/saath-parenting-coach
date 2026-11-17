# Saath

A small parenting coach. A parent types a concern in English, Urdu, or Roman Urdu and gets a short plan they can act on today, plus a check-in that comes back.

**Live:** _link added after deploy_

## Run it

Needs Node 22 or newer and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then add TYPESAFE_API_KEY and GEMINI_API_KEY
pnpm dev
```

Open http://localhost:3000. Add `?demo=1` to show a "skip to check-in time" control.

```bash
pnpm test    # unit tests, no network
pnpm eval    # the safety test sheet, uses both APIs
```

## How a reply is made

```
parent message
   │
1. GATE      Jev returns probabilities: danger, abuse, self-harm, medical ask,
   │         legal ask, off-topic, plus language and script
   │
   ├─ crisis ──────────► help panel with local numbers. The coach is not called.
   │
2. COACH     Gemini writes the plan as fixed-shape JSON (1–3 steps, check-in)
   │
3. CHECK     Jev reads the plan: did it diagnose, or give a medical or legal
   │         instruction? One retry, then a safe fallback card.
   │
4. PLAN CARD
```

Why two models with separate jobs:

- The model that writes the reply never decides whether replying is safe.
- The gate returns numbers, so the thresholds live in code (`lib/decide.ts`), can be read in one screen, and are tested without a network.
- An uncertain crisis signal counts as a crisis. If the gate or the check is down, no coach reply goes out.
- The coach sits behind one function (`lib/coach.ts`), so the model can be swapped.

Two product decisions worth knowing:

- **A parent's own regretted harsh moment is not treated as a crisis.** "I slapped him and feel awful" gets coaching aimed at calming down and repairing, plus a quiet link to help. Injury, repeated hitting, or a child in danger is always a crisis.
- **After a crisis panel, the next message is judged fresh**, so a parent can go on to ask an ordinary question. A "Get help now" link stays pinned.

## What the parent gets

- A plan card readable in about 15 seconds, in the language and script they wrote in. Urdu script is laid out right to left.
- A check-in. "Remind me" saves it in the browser; when the time comes the page opens on that check-in, and the answer goes back to the coach with the earlier plan as context.
- Conversation history on the page, kept only in the browser. No login, no database.
- Keyboard and screen-reader support, light and dark themes, phone-first layout.

## Test sheet

`evals/cases.json` holds 23 parent messages with the expected outcome for each: everyday concerns, medical and legal asks, emergencies, abuse, self-harm by parent and by child, a crisis that builds over several turns, an ordinary question after a crisis, and off-topic messages, across English, Urdu script and Roman Urdu. `pnpm eval` runs them and fails if any expected crisis is missed.

_Results table added after the first full run._

## Known limits

- Urdu-script copy and test cases were written by a model and checked by back-translation, not reviewed by a native reader.
- The request cap is in memory, per server instance.
- Helpline numbers were checked against official pages on 17 Nov 2026; sources are next to each number in `lib/helplines.ts`. No mental-health line could be confirmed on an official page for either region, so self-harm shows the emergency number and "go to the nearest hospital".
- This is a demo, not a medical or emergency service.

## Privacy

- The server stores nothing and does not log message text. Keys stay on the server.
- Messages are sent to TypeSafe (Jev) and Google (Gemini) to produce a reply. TypeSafe states that Jev is not trained on customer requests. This demo uses Gemini's free tier, where Google may use data to improve its products; a real deployment would use the paid tier.
