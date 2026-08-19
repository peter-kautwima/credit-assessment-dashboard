# If there were more time

The next work should deepen operational reliability rather than add decorative dashboard widgets.
Priority order matters.

1. **Browser workflow coverage.** Add Playwright tests for search/filter composition, virtualized
   keyboard traversal, Pending and High-risk files, API recovery, narrow-screen docket/detail
   navigation and print output.
2. **A production queue contract.** Replace the mock list join with a server-owned queue-summary
   endpoint supporting search, sort, filters and cursor pagination. Include risk summary fields so
   global risk filtering is complete without fetching every report.
3. **A domain layer backed by actual policy.** Once underwriting rules are supplied, isolate and
   test attention reasons, completeness, financial derivations and decision explanations outside
   React. Do not formalize invented score thresholds or approval rules.
4. **Reporting and audit history.** Add persisted analyst notes, decision history, evidence
   provenance, timestamps and PDF/CSV export. These require authentication and backend storage.
5. **Measured browser performance.** Capture input latency, long tasks, scroll smoothness and API
   timings with the scale fixture; tune window overscan and row estimates from those measurements.
6. **Accessibility verification.** Test VoiceOver/NVDA, 200% zoom, high contrast and keyboard-only
   workflows in real browsers.
7. **Queue continuity.** Persist useful filter presets and queue position across authenticated
   sessions after product research confirms analysts reuse them.

## What is deliberately not next

- More charts without more evidence.
- Client-side fetching of every credit report to simulate a global risk index.
- A scoring or approval engine inferred from five fixture rows.
- Pagination layered on top of an already windowed local list; cursor pagination belongs behind a
  production API contract.
