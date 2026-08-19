# List-then-detail at 2000 rows: current practice and what I'd actually build

Scope: React 18 + Vite credit-operations dashboard, no TypeScript, json-server on :3001 (`/businesses`, `/assessments`, and `/creditReports`, `/bankStatements`, `/scoreItems` by `?assessmentId=`). ZAR / en-ZA. Seeded at 5 records, scaled to 2000 to force virtualization. Single-session scope.

**[V]** = verified against the linked source. **[J]** = my judgement, not from a source. Package versions checked against the npm registry on 2026-08-18.

---

## 1. List-then-detail data fetching

**Recommendation: hand-roll the cache. Do not add TanStack Query for this app.**

What TanStack Query actually gives you, from its own docs: `staleTime` defaults to `0` and `gcTime` to 5 minutes; a second mount with cached data returns the cache immediately and refetches in the background — stale-while-revalidate by default ([caching guide](https://tanstack.com/query/latest/docs/framework/react/guides/caching)) [V]. For prefetch-on-hover it documents `queryClient.prefetchQuery` from `onMouseEnter`/`onFocus`, and warns that "prefetch only fires when data is older than the `staleTime`, so in a case like this you definitely want to set one" ([prefetching guide](https://tanstack.com/query/latest/docs/framework/react/guides/prefetching)) [V].

That last line is the whole argument in miniature. The value is not the fetch — it is the *staleness model* that stops hover firing a request per row traversed. This app has two read shapes (a list, and a detail fan-out of four endpoints) and **zero mutations**. A `Map` keyed by URL, an in-flight promise map for deduping, and a `fetchedAt` compared against a stale window is genuinely ~50 lines and covers all three behaviours. `@tanstack/react-query@5.101.4` unpacks to ~859 KB [V, npm registry] to solve a problem this app does not yet have.

Where it earns its place [J]: the first mutation. `POST /assessments` plus optimistic update plus invalidating four dependent detail queries is where hand-rolled caches turn into bug farms — that is not 50 lines. Also above roughly a dozen call-sites, or with pagination.

| Pattern | Implementation | Why |
|---|---|---|
| Stale-while-revalidate | Render cached detail instantly, refetch behind it, swap on arrival | Back-to-list-then-into-another-record is the dominant motion in credit ops; a spinner on every return is the main thing that makes an internal tool feel slow |
| Prefetch on hover | `onMouseEnter` **and** `onFocus`, gated by a ~100 ms intent delay and by staleness | `onFocus` matters — keyboard users never fire `mouseenter`; the delay stops a 2000-row list firing dozens of requests as the pointer crosses it |
| Detail fan-out | `Promise.all` the four `?assessmentId=` calls, render each panel as it resolves | json-server has no join; sequential awaits stack 4× latency visibly |
| Keep-previous-data | Hold the last list while a filtered refetch is in flight | Stops the list collapsing to empty mid-typing |

**Why this holds:** TanStack Query is the right answer for an app with writes. This app has none. I implemented the three behaviours it would have given me — dedupe, staleness-gated prefetch, stale-while-revalidate — in about fifty lines, and I can name the exact commit where I'd swap it in: the first mutation.

---

## 2. List virtualization

**A stale claim to correct first.** Several 2026 comparison posts still call react-window unmaintained and fixed-size-only — e.g. [PkgPulse](https://www.pkgpulse.com/guides/tanstack-virtual-vs-react-window-vs-react-virtuoso-2026) says "no active development". The repository contradicts this: react-window is at **2.3.0 with zero runtime dependencies** [V, npm registry]; the v2 rewrite removed the need for `AutoSizer` and added native TypeScript and automatic memoisation, and 2.2.0 added `useDynamicRowHeight` backed by `ResizeObserver` ([CHANGELOG](https://github.com/bvaughn/react-window/blob/main/CHANGELOG.md)) [V]. Its README still cautions: "Dynamic row heights are not as efficient as predetermined sizes. It's recommended to provide your own height values if they can be determined ahead of time" ([repo](https://github.com/bvaughn/react-window)) [V]. **Sources disagree; the repo wins.**

| | `@tanstack/react-virtual@3.14.10` | `react-window@2.3.0` |
|---|---|---|
| Shape | Headless — "does not ship with or render any markup or styles for you" ([docs](https://tanstack.com/virtual/latest/docs/introduction)) [V] | Renders a `List`/`Grid` for you |
| Deps | 1 (`virtual-core`), ~57 KB unpacked [V] | 0, ~216 KB unpacked [V] |
| Best when | You control the markup — a real `<table>`, sticky columns, grid | Plain fixed-height rows, least ceremony |

**Recommendation [J]: fix the row height, then use `@tanstack/react-virtual`** — specifically because a credit list wants real table semantics (§3), and only the headless one lets me keep `<table><tbody>` markup and put ARIA where it belongs. With plain `<div>` rows, react-window 2.x is the lower-ceremony pick and I would not argue.

**The honest alternative.** With a *uniform* row height the mechanism is `scrollTop / rowHeight → startIndex`, slice, two spacer divs — about 40 lines. What the dependency buys over that is overscan, `scrollToIndex`, a container `ResizeObserver`, and scroll anchoring on resize. At 2000 rows and this scope, hand-rolling is defensible [J].

**Also consider not virtualizing.** `content-visibility: auto` is [Baseline since September 2024](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility), skips layout and paint for off-screen content, and keeps content "available as normal to user-agent features such as find-in-page, tab order navigation" and in the accessibility tree [V] — exactly what virtualization breaks. It needs `contain-intrinsic-size` to stop scrollbar jump [V]. The catch [J]: it removes layout and paint cost, not *DOM creation* cost — 2000 rows × 8 cells is still 16 000 nodes to parse and hold. A real answer for 2000; not one for 50 000.

### Pitfalls

- **Measured vs estimated.** Before measurement, size is `estimateSize`; after, it is `measureElement`'s `getBoundingClientRect()` ([Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer)) [V]. A bad estimate resizes the scrollbar under the user's thumb. TanStack applies scroll correction only when not scrolling backward by default, tunable via `shouldAdjustScrollPositionOnItemSizeChange` [V]. `display: none` plus `measureElement` breaks the virtualizer and can make `getVirtualItems()` return the whole list ([issue #697](https://github.com/TanStack/virtual/issues/697)) [V].
- **Definite-height container.** Rows are absolutely positioned inside a spacer, so the scroll parent needs a resolved height. `height: 100%` through a chain of `auto` parents resolves to zero and the list renders one row or none [J]. Use `flex: 1; min-height: 0` or an explicit `dvh`.
- **Key by id, never index.** With index keys React reuses the DOM node by *position*, so on scroll or filter a row's local state, focus ring and transition follow the slot rather than the record. In a credit tool that is a selection highlight landing silently on the wrong business [J].

**Why this holds:** I fixed row height so measurement never happens — that removes the entire scroll-jump class of bug for free. I keyed by business id because index keys make focus follow the viewport slot instead of the record, and at 2000 rows that is a correctness bug in a tool where the selected row decides who gets credit.

---

## 3. Accessibility for data tables and virtualized lists

Virtualization deletes rows from the DOM, so the browser's own counting is wrong. MDN is explicit: "if the rows aren't all present in the DOM at any time, this attribute is needed" ([aria-rowcount](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-rowcount)) [V]. Use `-1` when the total is unknown [V].

| Concern | Do this | Source |
|---|---|---|
| Total set size | `aria-rowcount` on the table, `aria-rowindex` on each rendered `role="row"` | [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-rowcount) [V] |
| List (not table) equivalent | `aria-setsize` + `aria-posinset` per item, read as "item 6 of 16"; MDN lists `row` among supported roles | [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-setsize) [V] |
| Filtered count | Live region present in the initial HTML, `aria-live="polite"` + `aria-atomic="true"`, updated once typing settles | [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions) [V] |
| Keyboard traversal | `table` keeps every focusable in the tab sequence; `grid` is a composite widget with **one** tab stop plus roving tabindex, arrows, Home/End, Ctrl+Home/End, PageUp/Down | [APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) [V] |

The tension, stated plainly [J]: APG says use `table` for static data and `grid` when rows are interactive. Our rows *are* interactive — each drills into a detail view. With `table` semantics and a link per row, 2000 records is 2000 tab stops, and virtualization makes it worse, because tabbing past the rendered window lands on nothing. That is the real argument for `grid` plus roving tabindex.

**Out of scope here:** a full APG grid with cell-level arrow navigation and PageUp/Down mapped to virtual scroll. **The version that fits [J]:** one focusable control per row (the row itself, `tabIndex={-1}` with a single roving `0`), Up/Down/Home/End handled on the tbody, and `scrollToIndex` *before* focusing so the target row exists in the DOM at focus time. That last step is the bug people miss, and it only appears once virtualization is on.

On drill-in, move focus to the detail heading (`tabIndex={-1}`) and restore it to the originating row on return. Without restore, keyboard users land at document top on every back-navigation, which at 2000 rows is unusable [J].

**Why this holds:** Virtualization is an accessibility regression unless you pay for it. `aria-rowcount` restores the count the browser can no longer compute, and I scroll the target row into the DOM before focusing it, because you cannot focus a node virtualization has removed.

---

## 4. Search UX in dense tools

**Sources disagree on debounce timing.** [Algolia](https://www.algolia.com/doc/ui-libraries/autocomplete/guides/debouncing-sources) puts the preference near 200 ms with degradation past 300 ms; general guidance ranges 150–300 ms ([freeCodeCamp](https://www.freecodecamp.org/news/optimize-search-in-javascript-with-debouncing/)) and 300–500 ms for anything hitting an external resource ([Koder](https://koder.ai/blog/instant-in-app-search-ux)) [V]. The anchor underneath all of them is Nielsen's 0.1 s threshold for "reacting instantaneously" ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)) [V].

**My position [J]: for 2000 client-side records, debouncing the filter is the wrong instrument.** Filtering 2000 objects in memory is well under a millisecond; the cost is the *render*, not the match. So filter on every keystroke and use React 18's `useDeferredValue` to keep the input at 0.1 s while the list catches up at lower priority. Zero dependencies, and it degrades better than a timer — a fast typist never sees a stalled list. Debounce only when search moves server-side to json-server's `?q=`, and then 250–300 ms.

| Element | Recommendation | Note |
|---|---|---|
| Highlighting | `<mark>` inside the ~30 rendered rows | Cheap because virtualization already bounded the work |
| Highlighting (newer) | [CSS Custom Highlight API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API) — Baseline June 2025, highlights "without affecting the DOM structure" [V] | MDN's own caveat: custom highlights carry no inherent semantics for AT, and it recommends `<mark>` where that matters [V] — so `<mark>` wins here |
| Shortcut | `Cmd/Ctrl+K` to focus search, `Esc` to clear then blur | Now the dominant convention across Linear, Slack, Notion, VS Code ([Superhuman](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/)) [V] |
| Discoverability | A visible `⌘K` chip inside the search field | "Discoverability is a feature, not an afterthought" ([Mobbin](https://mobbin.com/glossary/command-palette)) [V] |

Do not swallow the shortcut when focus is already in a text field [J]. **Out of scope here:** an actual command palette. The chip plus the shortcut is 15 lines and reads as the same intent.

**Why this holds:** I didn't debounce the filter. Debounce protects a network or an expensive computation, and neither applies to 2000 objects in memory — matching is sub-millisecond. The real cost is render, so I deferred the render with `useDeferredValue` and kept the input inside Nielsen's 100 ms. Debounce comes back the moment search moves to the server.

---

## 5. Loading, error and empty states

**Skeletons: the evidence is genuinely contested, and I would say so rather than cite the popular
half.** [Viget](https://www.viget.com/articles/a-bone-to-pick-with-skeleton-screens/) tested 136
participants across three conditions (39 skeleton, 39 spinner, 58 blank) and found the skeleton
*worst by all metrics*: average perceived wait 2.82 s against 2.41 s for a spinner and 2.29 s for
a blank screen, and 59% agreeing "the meals loaded quickly for me" against 74% for the spinner and
66% for the blank screen [V, figures re-checked against the article]. [ECCE'18](https://dl.acm.org/doi/10.1145/3232078.3232086)
— Mejtoft, Långström and Söderström, 36th European Conference on Cognitive Ergonomics — found the
opposite direction: skeleton screens scored higher on average on both perceived speed and ease of
navigation [V, from the published abstract; the full text returns 403, so no task-timing figure is
claimed here].

**Reading [J]:** the effect is small and direction-unstable, so shimmer does not earn the effort. What is robust across both is that flicker costs more than it buys. Therefore:

- **Hold the layout.** Reserve the table's height from first paint so arriving data shifts nothing. The win is zero CLS, which is measurable, rather than a perception effect that reverses between studies.
- **Nothing under ~300 ms, skeleton rows beyond it.** Under Nielsen's 1 s flow threshold [V] a local json-server fetch usually completes before a skeleton would be worth showing.
- **Row-level, not page-level.** Refetching detail must not blank the row being read.

**Error copy that names the fix.** NN/g: describe the issue concisely rather than "An error occurred", "merely stating the problem is also not enough; offer some potential remedies", do not blame the user, avoid "invalid"/"illegal", and place the message near its source ([NN/g](https://www.nngroup.com/articles/error-message-guidelines/)) [V].

Concretely: not "Failed to fetch" but *"Couldn't load bank statements. The API at localhost:3001 isn't responding — check json-server is running, then Retry."* The retry button sits in the panel that failed, not in a page-level banner.

**The fintech rule [J], and the one I would lead with: never let a missing value render as a number.** A failed `/scoreItems` call must read "Score unavailable", never "0". An analyst who sees R 0,00 where the API returned nothing will decline a viable applicant. Each of the four detail panels therefore owns its loading/error/empty state independently, so one failed fan-out call degrades one panel, not the record.

**Empty states must distinguish two cases [J, applying NN/g's constructive rule]:** "No businesses match 'Kubu'" gets a **Clear filters** action; "No assessments yet" gets different copy and no clear action, because there is nothing to clear. Collapsing both into "No data" is the clearest tell of a rushed internal tool.

Formatting: `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })` and `Intl.DateTimeFormat('en-ZA')` — platform, no dependency. en-ZA uses a comma decimal separator and a non-breaking space after R, so right-align amounts with `font-variant-numeric: tabular-nums` to make columns of rands compare vertically [J].

**Why this holds:** I deliberately didn't build shimmer skeletons — the two studies I found disagree on whether they help, and Viget measured them as worse than a plain spinner. What both agree on is that layout shift and flicker hurt, so I reserved the layout and showed nothing under 300 ms. The state I spent real care on is error, because in credit ops a missing score rendering as zero is a wrong decision, not a cosmetic bug.

---

## What I'd leave out, and why

In order of what adds least here: command palette (chip and shortcut only), APG-complete grid navigation (Up/Down/Home/End only), server-side search, TanStack Query, dynamic row measurement. Everything in §3's table and §5's error rule stays — those are where cutting corners produces a *wrong* dashboard rather than a plainer one.
