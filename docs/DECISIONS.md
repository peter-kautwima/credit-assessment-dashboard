# Decisions

What I decided, why, and what I turned down.

## Data: list-then-detail

The docket loads `/businesses` and `/assessments`. Opening a file fetches that assessment's credit
report, bank statement and score items through the `?assessmentId=` endpoints, on demand, cached.

This uses the relational shape the API already exposes, which makes lazy loading a property of the
architecture rather than a claim in a README. The cost: more request orchestration, and
four independent failure surfaces per file instead of one — which is why each detail panel owns
its own loading, error and empty state.

**Rejected: fetch all five collections upfront and join them client-side.** Simpler to write, and
it would satisfy the brief. It also loads every record's detail before the analyst has opened
anything, and discards the shape the API deliberately models.

**Rejected: TanStack Query.** The right answer for an app with writes. This one has none — two
read shapes, zero mutations. Dedupe, staleness-gated prefetch and stale-while-revalidate come to
roughly fifty lines here, against ~859 KB unpacked. The trigger to adopt it is nameable: the first
`POST`.

## Search: filter immediately, debounce the announcement

Filtering runs on every keystroke, with `useDeferredValue` keeping the input responsive while the
list re-renders at lower priority. The screen-reader count is debounced to ~500 ms so it announces
once on settle.

Matching two thousand in-memory objects is sub-millisecond, so the cost is render priority, not
computation. The live region is the one part that should wait — announcing on every
keystroke floods a screen reader.

**Rejected: a ~150 ms debounce on the filter.** Debounce protects a network call or an expensive
computation, and neither applies at this data size. It would buy perceived input lag for nothing.

## Search shortcut: `/`, not Cmd+K

`/` focuses the field, with a visible hint in the field itself. No modifier, and it is the
established convention for an inline filter.

**Rejected: Cmd/Ctrl+K.** That is the command-palette convention, and this is a list filter, not a
palette. Left unbound deliberately so the keymap stays coherent if a palette is ever added.

## Queue controls: expose finite state, contain growing sets

Search leads because locating a known business is the fastest repeated action. All, Complete and
Pending are exposed as one-click status choices with counts: the set is small, stable and important
enough that hiding it in a select adds work. Industry and sort remain native selects because their
option sets are secondary and industry can grow with the docket.

Search covers every useful field already present in the docket response: business name,
registration number, industry, workflow status, assessment date and assessment id as the file
reference. Ordering names its direction explicitly and includes file reference; a bare “assessment
date” option hides whether newest or oldest comes first.

Risk and score controls are explicitly scoped to **reviewed** files. They operate on reports already
loaded into the session cache, put unreviewed files last when sorting, and never claim to represent
the whole docket. This gives analysts useful session-level triage without issuing one detail request
per business.

**Rejected: three equal dropdowns.** It gives every control the same visual weight and hides the
Pending workload that an analyst should be able to read without opening anything.

## Virtualization: measure, then choose

The thresholds are fixed before any measurement is taken: 60fps sustained, no task over 50 ms, and
typing-to-repaint under 100 ms. Passing all three selects `content-visibility: auto` with
`contain-intrinsic-size` from a measured row height. Failing any selects TanStack Virtual with
fixed row heights, recording which number failed. Measurement is mechanical — `PerformanceObserver`
on `longtask` entries and `performance.measure` around keypress-to-paint — and it runs again after
the fix, so the figures exist before and after.

Setting the bar in advance stops a marginal result being rationalised afterwards. Measuring
mechanically stops it being judged by eye by the person who wants it to pass.

`content-visibility` removes layout and paint cost but not DOM
construction — fine at two thousand rows, wrong at fifty thousand. And if it wins, rows must be
`React.memo`'d, because it does nothing about React reconciliation and `useDeferredValue` alone
would buy nothing.

**Rejected: hand-rolling a virtualizer.** Forty lines whose edge cases you own is not cheaper than
a dependency that has already found them.

## The fixture

The fixture is never edited to make a design work. It may be extended to exercise what the API
already models — more records, and more assessments per business — with the shipped rows preserved
byte-for-byte. That distinction is the difference between testing the build and rigging it.

The app must run unchanged against the shipped `data.json`, and that swap-back is a check that can
fail: original fixture back in, API restarted, app confirmed running.

**Pending means rows present with null values, not rows absent.** The shipped `Pending` assessment
carries `creditReport` and `bankStatement` rows in which every field is `null`. Code reaching for
`report.score ?? 0` renders a score of zero for a file that has none, which in a credit tool is a
wrong answer rather than a display bug.

**Resolve to the newest.** The schema is `business ──< assessment` and
`GET /assessments?businessId=:id` returns a collection, so the docket picks the most recent
assessment per business rather than assuming one exists. A business whose latest assessment is
Pending shows Pending and must not fall back to an older scored one — a stale score presented as
current is the same class of wrong answer. Where two assessments share a date the tiebreak is the
highest id, so the test is deterministic rather than incidentally passing.

**Rejected: fabricating time-series or external benchmarks to make the dashboard look richer.** A
credit tool that shows invented numbers is worse than one that shows fewer.

## Aggregates: a floor, or a refusal

Any aggregate computed across the loaded set requires **n >= 5** and displays its n alongside the
figure. Below the floor it does not render a weaker version — it says why, in words: "only three
files in view — too few to compare".

The n has to be on screen because a reader cannot otherwise distinguish a median drawn from two
hundred records from one drawn from two. Putting the denominator in the sentence also makes the
figure honest when it moves: a comparison against "the files in view" explains its own change when
a filter narrows the set, where a bare percentile silently implies a fixed population.

**Rejected: an aggregate that degrades quietly.** A comparison that weakens as the set shrinks,
without saying so, is worse than one that refuses.

**Rejected: median-by-industry.** The shipped fixture puts all five businesses in five distinct
industries, so every industry group is n=1 and the comparison could never render against the data
actually given. Docket-wide position replaces it — the file's score against the median of the
currently loaded set — which clears the floor on the shipped fixture and scales unchanged.

## Toolchain: one Vite, not two

Vite moved from the template's 4.5.14 to 8.2.1, and `@vitejs/plugin-react` from 4.7.0 to 6.0.5.

Vitest 4 installs its own Vite 8. Leaving the template's Vite 4 in place meant two Vite majors in
one dependency tree sharing a single config file, and they did not agree: the plugin handed Vite 8
the Vite 4 dialect — `esbuild`, `optimizeDeps.esbuildOptions` — and Vite 8 discarded those
options, `jsx: 'automatic'` among them. The tests passed anyway. A green gate sitting on silently
dropped configuration is worse than a red one, because nothing prompts you to look. The upgrade
also took `npm audit` from two vulnerabilities, one high, to zero; those were Vite 4 transitives.
CI moved to Node 22 to satisfy Vite 8's engine range.

**Rejected: pinning Vitest back to a version matching Vite 4.** It would have left the template's
dependency untouched. But it means adopting an end-of-life test runner to preserve an end-of-life
bundler — buying the appearance of having changed nothing at the cost of a current toolchain.

## Workspace: persistent docket, continuous case file

Desktop keeps a searchable docket beside one continuous assessment file. Status and industry
controls narrow the docket; overview remains full width while the shorter financial and score-item
evidence share a two-column reading band when space permits. Mobile turns the same structure into
docket-then-detail navigation and restores the query, filters, selection and scroll position on
return.

This is the repeated analyst motion: triage a queue, inspect evidence, return without reconstructing
the queue. A continuous file also keeps relationships visible that independent tabs would hide.

**Rejected: a risk-board primary navigation.** Lanes communicate workload at five records but become
long, uneven lists at two hundred. Complete and Pending survive as compact filters instead.

**Rejected: a tab-only dossier.** It reduces first-view density by hiding evidence categories from
one another and makes comparison a memory task.

**Rejected: sticky in-file section links.** Three links consumed a full toolbar while every section
was already visible in a short continuous file. At this viewport the repeated headings supply the
wayfinding; the toolbar keeps only file-level actions.

**Rejected: global risk and thin-file filters.** Those fields live behind detail endpoints. Fetching
every credit report to power a docket control would reverse list-then-detail; filtering only cached
files would present an incomplete population as complete.

### Progressive risk cues

The docket shows workflow status immediately. After an analyst opens a file, its cached report adds
the reported risk band and score to that row for the rest of the session. This makes `Complete` and
`High risk` visibly distinct concepts without loading every report upfront. Unopened rows never
pretend that risk is unavailable; they simply show the list data the API has supplied so far.

**Rejected: replacing Complete with High risk.** Completion is workflow state while risk is report
evidence; Bright Construction is truthfully both. Collapsing them would discard useful information.

## Visual reset: an analyst's case ledger

The first implementation used a conventional navy application shell with generous white panels.
It was credible but generic, and at the supplied viewport it spent too much space on chrome and
section gaps while weakening the score, risk and cash hierarchy. The revised world is a compact
case ledger: warm paper, dark teal form furniture, black reported values, square status stamps and
rules that hold evidence in fixed reading bands. It retains neutral ownership rather than borrowing
the hiring company's brand.

The prior V1 screenshots are the quality bar for density and operational specificity. The current
architecture, async states, focus management and on-demand data boundary remain product truth; only
the visual world and composition are replaced.

**Rejected: polishing the navy dashboard.** Its weakness was the composition and visual metaphor,
not a handful of spacing values. Further refinement would preserve the generic shell that caused
the problem.

## Attention: high risk or pending, stated explicitly

Only a reported High risk band or a Pending assessment earns an attention cue. Thin-file status and
weak cash position remain visible evidence but are not silently promoted into a decision rule the
fixture never states.

**Rejected: deriving urgency from score or cash thresholds.** The fixture supplies no scoring
methodology or decision thresholds, so the interface cannot invent them.

## Visualisation: CSS and SVG, no chart dependency

The dashboard needs a score position and four category bars. Semantic HTML with CSS, plus a small
SVG only where an axis needs explicit geometry, keeps the scale inspectable and accessible without
adding a chart runtime.

Any maximum not present in the fixture is disclosed on the artifact. Empty and Pending sections
state absence in words instead of drawing zeroed furniture.

**Rejected: a chart library.** It would add dependency and abstraction cost for five simple marks,
without solving a capability this data requires.
