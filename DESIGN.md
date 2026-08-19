---
name: Credit Assessment Dashboard
description: A precise, evidence-led workspace for reviewing business credit assessments.
colors:
  primary: "#0f253b"
  primary-light: "#1a3a54"
  surface: "#f5f7f9"
  surface-white: "#ffffff"
  text: "#1a1a1a"
  text-muted: "rgba(0, 0, 0, 0.5)"
  border: "rgba(0, 0, 0, 0.1)"
typography:
  body:
    fontFamily: "Proxima Nova, Montserrat, system-ui, sans-serif"
---

# Design System: Credit Assessment Dashboard

## Overview

**Creative North Star: "The Analyst's Ledger"**

The system is precise, sober, and dependable: a working surface for analysts who need evidence to
remain legible and missing information to remain unmistakably missing. Its authority comes from
order and restraint rather than decoration.

The implemented foundation is intentionally compact. A deep navy pair supplies institutional
weight, while pale grey and white surfaces keep dense operational content readable. This document
records that foundation without pretending the placeholder interface has already established a
full component library.

**Key Characteristics:**

- Evidence-led hierarchy
- Restrained navy and neutral palette
- Flat, structured surfaces
- Direct, operational typography

## Colors

The palette uses a narrow navy voice over cool paper-like neutrals, reserving contrast for
structure and readable evidence.

### Primary

- **Ledger Navy** (`{colors.primary}`): The strongest brand and hierarchy color.
- **Review Navy** (`{colors.primary-light}`): A lighter companion for secondary navy emphasis.

### Neutral

- **Docket Paper** (`{colors.surface}`): The default application canvas.
- **Working White** (`{colors.surface-white}`): A clean surface for content that must separate from
  the canvas.
- **Evidence Ink** (`{colors.text}`): Default readable text.
- **Muted Annotation** (`{colors.text-muted}`): Supporting text that remains subordinate without
  disappearing.
- **Quiet Rule** (`{colors.border}`): Low-contrast structural separation.

### Named Rules

**The Evidence First Rule.** Navy establishes hierarchy; it does not decorate empty space.

**The Quiet Rule Rule.** Prefer the border token and tonal separation for structure before adding
new color or depth effects.

## Typography

**Display Font:** Proxima Nova, with Montserrat and system UI fallbacks
**Body Font:** Proxima Nova, with Montserrat and system UI fallbacks

**Character:** The single sans-serif stack is direct and operational. Proxima Nova is the intended
face; Montserrat is the available web-font substitute when Proxima Nova is unavailable.

The implementation does not yet establish a type scale, line-height system, or recurring weight
hierarchy. Future roles should be documented only after they appear in reusable UI.

### Named Rules

**The One Working Voice Rule.** Use the shared sans-serif stack throughout until the product
establishes a deliberate second typographic voice.

## Layout

The implemented layout establishes only a full-page canvas with border-box sizing and zeroed
default margins. Grid, container width, spacing rhythm, breakpoints, and responsive composition
remain unimplemented and are therefore not system rules yet.

## Elevation & Depth

The system is flat and structured. The current implementation defines no shadows or elevation
tokens; hierarchy comes from tonal surfaces, borders, spacing, and typography.

### Named Rules

**The Flat Ledger Rule.** Use borders and tonal layering before introducing shadows. Any future
shadow must communicate a real overlay or interaction state rather than generic card decoration.

## Do's and Don'ts

### Do:

- **Do** use Ledger Navy for meaningful hierarchy and action emphasis.
- **Do** separate working regions with Docket Paper, Working White, and Quiet Rule.
- **Do** keep supporting text visibly subordinate while preserving readable contrast.
- **Do** extend the token vocabulary only when reusable implementation evidence exists.

### Don't:

- **Don't** invent accent colors, gradients, shadows, radii, or spacing scales and present them as
  incumbent rules.
- **Don't** use navy as broad decoration when it does not clarify hierarchy.
- **Don't** mistake the current placeholder screen for an established component system.
