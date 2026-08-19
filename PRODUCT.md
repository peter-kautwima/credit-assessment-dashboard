# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a credit analyst on a credit operations team reviewing business credit
assessments. They need to understand which businesses have been assessed, examine the current
assessment and its supporting financial information, and identify files that need attention.

## Product Purpose

The dashboard gives analysts a docket of assessed businesses and a focused view of each file's
credit score, risk profile, bank-statement picture, and score-category breakdown. Success means an
analyst can move from triage to the evidence behind an assessment without the interface inventing
or misrepresenting missing information.

## Operating Context

The product is a read-only React dashboard backed by a local json-server API. The docket loads
businesses and assessments first; opening a file loads that assessment's credit report, bank
statement, and score items on demand. Amounts are South African rand, registration numbers use the
CIPC `YYYY/NNNNNN/07` form, and product language follows the fixture's terms.

## Capabilities and Constraints

- Show assessed businesses and their current assessment status.
- Show the selected assessment's credit score and risk profile when those values exist.
- Summarise the financial picture from bank-statement credits, debits, and months analysed.
- Show score items by category and help analysts spot files needing attention.
- Preserve the list-then-detail data architecture and its cached, on-demand detail loading.
- Treat pending values as unavailable, never as zero. Pending assessments retain child rows whose
  values are null.
- Make only claims supported by fixture fields or clearly labelled calculations. Across-set
  aggregates require at least five loaded records and must display their sample size.
- Work unchanged with the shipped five-business fixture; generated fixture extensions must never
  become a runtime requirement.
- Design loading, error, empty, and success states for every asynchronous surface. Error messages
  explain the recovery action, and empty or pending states are stated in words.
- Do not edit the fixture to make a design work or fabricate benchmarks, forecasts, scoring
  methodology, or other absent evidence.

## Evidence on Hand

- The assessment brief and required workflows are preserved verbatim in `README-ORIGINAL.md`.
- The shipped API fixture and its supported fields are in `data.json`.
- Confirmed product and engineering tradeoffs are in `docs/DECISIONS.md`.
- Supporting technical research, including explicit verified-versus-judgement labels, is in
  `docs/research.md`.
- No external benchmarks, forecasts, testimonials, scoring methodology, or other market proof are
  provided; future work must not fabricate them.

## Product Principles

1. Present missing credit information as missing, never as a plausible numeric value.
2. Let analysts move from a scannable docket to supporting detail without loading every file
   upfront.
3. Make comparisons explicit about their calculation and sample size, or refuse to compare.
4. Give each asynchronous panel a useful state and a concrete recovery path.
5. Prefer evidence from the supplied data and observed behaviour over unsupported claims.

## Accessibility & Inclusion

Keyboard and screen-reader use are first-class requirements. Search feedback must be announced
without flooding assistive technology, focus states must be deliberately designed, and no state
may rely on colour alone.
