# Credit assessment dashboard

A read-only React workspace for a credit analyst moving from a business queue to the evidence behind
an assessment. The original task is preserved verbatim in
[`README-ORIGINAL.md`](./README-ORIGINAL.md).

## Run it

```bash
npm install
npm run api
```

In a second terminal:

```bash
npm run dev
```

The API runs on `http://localhost:3001`; Vite prints the application URL. If the API is unavailable,
the interface names the command needed to restore it.

## What is implemented

- A searchable assessment docket with live counts, status and industry filters, and explicit name,
  date, reference, industry, reviewed-risk and reviewed-score sorting.
- List-then-detail fetching: businesses and assessments load for the queue; credit report, bank
  statement and score items load and cache only when a file is opened.
- A continuous evidence sheet with reported score/risk, computed bank-statement surplus, category
  breakdown, attention reasons and a designed Pending state.
- Keyboard queue traversal, `/` search focus, Escape-to-clear, visible focus, announced result
  counts and text labels for every state.
- Loading, error, empty and success treatments at both docket and evidence-panel boundaries.
- A print view that isolates the selected file.
- Automatic row windowing above 50 composed results.

Workflow status and credit risk remain deliberately separate: a file can be `Complete` and still
need attention because its report carries a `High` risk band. Risk controls are labelled
**Reviewed risk** because the architecture does not fetch every credit report upfront; they operate
on reports opened and cached during the current session.

## Verification

```bash
npm run verify
```

This runs Biome, 32 Vitest tests and the production build. Tests cover the API cache and
list-then-detail shape, all async states, Pending nulls, partial evidence, composed search/filter
behavior, keyboard shortcuts and the 2,000-file window.

The shipped `data.json` remains the runtime default and is unchanged. `data-2000.json` is a
deterministic scale fixture that preserves every shipped row and extends the same schema:

```bash
npm run fixture:scale
```

The scale test proves that a 2,000-file logical set renders fewer than 30 rows in a 720px viewport.
The generator writes only `data-2000.json`; it never replaces the shipped API fixture.

## Decisions and design

- [Product constraints](./PRODUCT.md)
- [Design system](./DESIGN.md)
- [Architecture and tradeoffs](./docs/DECISIONS.md)
- [Implementation plan](./docs/plans/2026-08-19-dashboard.md)
- [Technical research](./docs/research.md)
- [Review findings](./docs/reviews/2026-08-19-core.md)
