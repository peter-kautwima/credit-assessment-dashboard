# Design system: the analyst's ledger

## Direction

The dashboard is a working case ledger: dense enough for queue triage, calm enough for financial
evidence, and explicit whenever information is pending or inferred. It borrows the useful rhythm of
paper files—rules, stamps, annotations and a continuous sheet—without imitating a historical form.
The system is owned by this project; it does not reproduce Lula branding.

## Information hierarchy

- The docket answers “what should I open?” with persistent search, status counts and composed
  filters before it shows individual files.
- Workflow status and credit risk are separate facts. `Complete` describes processing; `High risk`
  describes reported evidence. They may appear together and must never replace one another.
- The evidence sheet answers “why?” in a fixed sequence: identity, score and risk, bank-statement
  picture, score-category breakdown, then analyst notes.
- Reported values use dark evidence ink. Calculations and interface furniture use ledger teal.
  Attention red is reserved for High risk and Pending; no meaning depends on colour alone.

## Tokens

All reusable values live in `src/styles/tokens.css`.

- Surfaces: ledger paper `#e8ebe5` and evidence sheet `#f8f7f1`.
- Structure: ledger teal `#285c50`, raised teal `#1f4b41`, and quiet/strong rules.
- Evidence: near-black `#181b19`; annotations use `#5f6964`.
- State: attention red, pending amber and their pale surface partners.
- Type: Montserrat with Avenir Next and system fallbacks; tabular numerals for references and
  financial values.
- Spacing follows a 4/8/12/16/24/32/48px rhythm. Controls are at least 36px high.
- Corners remain nearly square. Depth comes from rules and surface changes, not generic shadows.

## Components and interaction

Primitives under `src/components/ui/` own buttons, status badges and async state frames. Feature
components consume tokens rather than introducing private colours or spacing values.

- Search reads as a field at rest, names its searchable evidence and exposes the `/` shortcut in
  words. Escape clears it and restores list focus.
- Transformations compose as filter, then sort, then window. A query or filter change resets the
  scroll origin.
- Lists of 50 files or fewer remain ordinary DOM lists. Larger sets are windowed, keyed by business
  id and expose logical position and set size to assistive technology.
- Focus is deliberately visible. Arrow, Home and End navigation belong to docket rows; arrow keys
  remain caret controls while focus is in the search field.
- Loading holds the document shape, errors name the recovery action, and absence is stated in words.
  Pending values never become zero or empty chart furniture.

## Responsive and print behavior

Desktop preserves the docket beside the file because comparison and evidence are one workflow.
Narrow layouts show the docket first and open a focused file view with a clear return action. Print
removes application navigation and prints the selected evidence sheet rather than the surrounding
workspace.

## Reversal costs

- The reported-versus-computed ink distinction is load-bearing; changing it requires a provenance
  audit across every value.
- CSS/SVG visualisation is deliberate because the fixture needs a score scale and four category
  bars, not a general charting runtime.
- Motion is optional and must respect reduced-motion settings. The product does not depend on it.

## Avoid

- Card grids that fragment one assessment into unrelated widgets.
- A global risk filter that silently fetches every credit report; reviewed-risk controls describe
  only evidence already opened in the current session.
- Unsupported benchmarks, forecasts or scoring thresholds.
- Blank axes for missing data, colour-only status, decorative shadows, or invented brand marks.
