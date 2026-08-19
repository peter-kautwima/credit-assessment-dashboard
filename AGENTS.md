# AGENTS.md

Working rules for coding agents in this repository. `CLAUDE.md` points here; Cursor, Codex and
Claude Code all read this same file.

## What this is

A frontend assessment (brief preserved verbatim in `README-ORIGINAL.md` — **never edit that
file**): a React dashboard for a credit operations team reviewing business credit assessments.
There are no wireframes; layout and design are judgment calls, and the commit history is read as
part of the submission — commit in small, meaningful increments.

## Commands

```bash
npm install        # once
npm run dev        # Vite dev server (the app)
npm run api        # json-server on :3001 (the data) — separate terminal
npm run build      # production build
npm run test       # vitest
npm run check      # biome check (format + lint)
npm run verify     # check + test + build — the gate
```

**Never start, stop or restart the dev or api server.** Both run in the user's own terminals;
assume they are up. The one exception is when a prompt explicitly authorizes an api restart after
`data.json` changes (json-server does not watch the file).

`npm ci` deletes `node_modules` and will pull it out from under the running dev server. To verify
the CI chain, copy the repo (excluding `node_modules`, `dist`, `.git`) to a scratch directory and
run it there. The same goes for anything else that rewrites `node_modules` wholesale.

## Data model & API

json-server serves `data.json` at `http://localhost:3001`:

```
business (id) ──< assessment (businessId) ──< creditReport   (assessmentId, one)
                                            ├─< bankStatement (assessmentId, one)
                                            └─< scoreItem     (assessmentId, many)
GET /businesses            GET /businesses/:id
GET /assessments           GET /assessments?businessId=:id
GET /creditReports?assessmentId=:id
GET /bankStatements?assessmentId=:id
GET /scoreItems?assessmentId=:id
```

**The data layer is list-then-detail.** The docket loads from `/businesses` + `/assessments`;
opening a file fetches that assessment's report, statement and score items via the query-parameter
endpoints, on demand, with cached results. Do not fetch all five collections upfront and join —
using the API's own relational shape is a deliberate architectural decision recorded in
`docs/DECISIONS.md`.

Money is South African rand (`en-ZA` formatting). Registration numbers are CIPC
`YYYY/NNNNNN/07`. Use the data's own terms and spellings: risk band, thin file, score item,
credit utilisation, months analysed.

### Only claim what the data supports

Two things are legitimate: arithmetic on fields the fixture carries (a surplus, a ratio, a
per-month figure), and aggregates computed across the set actually loaded (a median score for an
industry present in the docket). Both must read as computed rather than reported. What must never
appear is data that does not exist — external industry benchmarks, forecasts, or scoring
methodology beyond what the fixture states. Where the UI must assume something the data does not
provide, such as an axis maximum or a band threshold, disclose the assumption on the artifact
rather than asserting it silently.

Any across-set aggregate requires **n >= 5** and displays its n alongside the figure. Below the
floor it does not render a degraded version — it states why, in words: "only three files in
view — too few to compare". A comparison that quietly weakens as the set shrinks is worse
than one that refuses.

### The fixture

**The fixture is never edited to make a design work.** It may be extended to exercise what the
API already models — more records, and more assessments per business — with the shipped rows
preserved byte-for-byte. That distinction is the difference between testing your build and
rigging it.

**The app must work unchanged against the shipped `data.json`.** The generated fixture extends
what the API models; it must never become a requirement. A business with exactly one assessment
renders correctly, with no delta and no empty slot where a delta would go. This is a verification
step that can fail: swap the original five-record fixture back in, restart the API (the
documented exception to the server rule above), and confirm the app runs. If it does not, we
changed the problem rather than exercising it.

**Pending means rows present, values null — not rows absent.** Assessment 105 in the shipped
fixture is `Pending`, and its `creditReport` and `bankStatement` rows exist with every field
`null` (`score`, `riskBand`, `isThinFile`, `totalCredits`, `totalDebits`, `monthsAnalysed`). It
is the sharpest trap in the brief: `report.score ?? 0` renders a score of zero for a file that
has none. Any generated fixture must reproduce that shape rather than modelling pending as
missing children.

## Commits

- Author is Peter Kautwima **only**. No `Co-Authored-By`, no session links, no "generated with"
  lines — not in commits, comments, or docs.
- Conventional style: `type: imperative summary`, lowercase, ≤65 chars.
  Types: `feat` `fix` `docs` `chore` `refactor` `test`.
- One logical change per commit. If the message needs "and", split it.
- Explain **why** in the body when it isn't obvious; never narrate what the diff shows.
- This repo keeps a **linear main** (the history is the submission): work on short-lived
  branches, fast-forward into main. No merge bubbles, no squashing.
- Never commit secrets.

## How to work

- **Plan before code.** Anything where more than one approach was seriously considered gets an
  entry in `docs/DECISIONS.md` — the decision, the reason, **what was rejected and why** — written
  *before* the code, kept current after.
- **Small, reviewable steps.** One logical unit, then stop for review. Don't batch phases.
- **Back choices with evidence.** A tradeoff gets a number or an observed result, not an
  adjective. If running the thing would settle it, run it.
- **Verify by driving it, not asserting it.** "It compiles" is not done; done is `npm run verify`
  passing **plus** evidence the behaviour changed — output, a screenshot, a watched interaction.
  Treat "no exception thrown" as suspicious.
- **The fixture is code too.** When a test leans on a mock or fixture, verify the fixture matches
  the reality it stands in for.
- **A test that cannot fail is worse than no test.** Name the bug it would catch or delete it.
- Every escaped bug gets a regression test before its fix lands.
- **Distinguish verified from assumed**, always. Flag anything unverified; never tick a box you
  didn't check.
- **An unverifiable figure is deleted, not softened.** If a cited number cannot be checked against
  its source, cut it rather than hedge it. A vague wrong figure is still a wrong figure, and it
  invites exactly the follow-up question you cannot answer. The reasoning survives losing the
  benchmark; the credibility does not survive keeping a bad one.
- **One checkout, one writing session.** Reviews run in a separate fresh session (a reviewer with
  no memory of writing the code judges it as written, not as intended). Parallel work uses
  `git worktree`, never a second session in this checkout.

## Interaction quality — a first-class requirement

Every async surface designs all four states before it ships: **loading** (skeleton or held
layout, no spinner-only screens), **error** (plain words, what to do next — e.g. the API-down
notice names the command that starts it), **empty** (stated in words, never a blank chart or
zeroed axes — a pending assessment is a designed state, not missing data), and **success**.
Feedback is immediate: filters and search reflect in the header count, focus states are designed
rather than browser defaults, and no state is carried by hue alone.

## Design system

Visual decisions live in `src/styles/tokens.css` (colour, type, spacing, rules) and in the
primitives under `src/components/ui/`. Components consume tokens; nothing hardcodes a hex or a
px that a token owns. The direction itself is set by the design process (see `DESIGN.md` once it
exists) — this section governs *where decisions live*, not what they are.

## Ending a session

Nothing important may exist only in the conversation when a session ends — whether it
ends at a context limit, on completion, or because you were told to stop. Before
signing off, route each thing by who needs it:

- **Product and engineering** — the approach, what was rejected and why, open
  questions, measurements → `docs/DECISIONS.md`, **in the repo**. This is part of
  the work.
- **Process and session state** — verified vs assumed, what's next, which servers are
  running, why a tool was changed → a handoff note. Process notes are not product —
  keep them outside the repo.
- **Rules earned from friction** — any correction you'd otherwise have to repeat →
  append to this file.

Then say plainly what was recorded where, and what remains unanswered and waiting on
the user. "Safe to close" is a claim; back it by naming the files.
