# Dashboard implementation plan

Started at 02:09:25 SAST on 2026-08-19. Work lands on `build/dashboard` and fast-forwards to `main`
after the final gate.

## Outcome

Build a responsive credit-operations workspace that lets an analyst scan the current business
docket, narrow and sort it, open one assessment, and understand its score, risk, financial picture
and category breakdown. Missing information must remain missing; every asynchronous surface must
design loading, error, empty and success.

## Architecture

- Docket: fetch `/businesses` and `/assessments`, resolve the newest assessment per business.
- File: fetch the selected assessment's credit report, bank statement and score items on demand.
- Cache detail requests by assessment id; evict failures so Retry can make a new request.
- Compose docket transformations in this order: status/industry/search filter, sort, render.
- Keep the shipped fixture sufficient. Scale data is an optional test input, never a requirement.

**Rejected:** fetching all five collections upfront and joining client-side. It is shorter code but
loads every detail before it is requested and ignores the relational API shape.

## Waves

| Wave | Acceptance evidence | Status |
|---|---|---|
| Context and toolchain | Original brief hash preserved; `npm run verify` passes | Complete |
| Tokens and primitives | Reusable tokens and small rendered primitives | Complete |
| Data layer | Newest assessment, lazy details, cache/retry tests | Complete |
| Docket | Five rows, status/industry controls, sorting, keyboard selection | Complete |
| File sheet | Score/risk, financials, categories, attention and Pending | Complete |
| Review | Fresh reviewer findings written before fixes | Complete |
| Search | Discoverable field, `/`, Escape, highlighting, composed results | Complete |
| Scale | 2,000 logical files, fewer than 30 rendered rows at 720px | Complete |
| Ship | README, leak grep, full verify, linear main | Complete |
| Browser workflows | Desktop risk triage and mobile focus restoration | Complete |

## Interaction contract

- Desktop: persistent docket left, continuous ruled case file right.
- Mobile: docket then detail; returning restores the docket state.
- Complete and Pending are global status filters. Industry is filterable and sortable.
- Risk and thin-file facts appear only after detail loads; they never masquerade as global filters.
- Selection, loading, errors and focus changes receive immediate visible feedback.
- Search count is visible immediately and announced politely after input settles.
- No status relies on colour alone.

## Time cuts

Cut export first, then scale/virtualisation, then nonessential motion. Do not cut the five brief
capabilities, Pending correctness, designed async states, keyboard access or the verification gate.
