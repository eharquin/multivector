# VGA 2D Foundation Milestone

**Status:** Draft for review
**Kind:** Product milestone
**Depends on:** VGA Core
**Applies:** VIZ2D-001 through VIZ2D-008; VIEW2D-001 through VIEW2D-003;
VGA-INT-001 through VGA-INT-004
**Date:** 2026-07-30

## Objective

Deliver the first public MultiVector workflow as a narrow vertical slice through
VGA(2). The implementation should validate and refine the design rather than
attempt to complete every planned abstraction before producing a usable result.

Language, document, and VGA foundations are technical dependencies of this
workflow. They need only reach the breadth required by the slice and their own
acceptance evidence; they are not separate user-facing products.

## Required workflow

A user, without developer tools, shall be able to:

- create and edit a small documented set of scalar and VGA(2) vector
  expressions;
- evaluate those expressions and understand source-localized diagnostics;
- visualize individual and listed positioned vectors in a 2D mathematical
  viewport;
- inspect values, positions, and derived heads in text;
- change basic visibility, label visibility, and common list appearance;
- save and reload a local document;
- import and export canonical JSON;
- complete one documented example in the deployed GitHub Pages application
  using a keyboard.

Direct manipulation, scalar controls, animation, URL sharing, advanced history,
figure export, and comprehensive entity coverage are excluded. They enter later
only after the foundation slice supplies implementation evidence.

## Completion criteria

- **F2D-001 — Vertical slice:** One production path connects source parsing,
  dependency analysis, VGA(2) evaluation, owned values, standard
  interpretation, renderer-independent entities, SVG primitives, and visible
  output without leaking backend values across boundaries.
- **F2D-002 — Authoring and recovery:** A keyboard-only user can complete the
  documented example, and fixtures cover its syntax, evaluation, dependency,
  capability, and resource-limit failures with recovery after correction.
- **F2D-003 — Geometry:** Fixtures and the deployed workflow cover individual,
  listed, and positioned nonzero VGA(2) vectors and canonical scalar-zero
  interpretation, including textual non-spatial, unsupported, and truncation
  states.
- **F2D-004 — Persistence:** Local save and reload preserve the example.
  Canonical JSON export and import round-trip without losing source or
  identities, and a failed write retains the last valid revision.
- **F2D-005 — Accessibility:** Automated checks and a recorded manual pass cover
  the complete example by keyboard, focus behavior, accessible names and
  diagnostics, non-color state, 200% zoom, and target size.
- **F2D-006 — Release:** The canonical verification command passes, the
  application deploys to GitHub Pages without a backend, and a post-deployment
  smoke test completes and reloads the documented example.
- **F2D-007 — Design feedback:** The acceptance record identifies which draft
  requirements were confirmed, revised, removed, or deferred based on
  implementation evidence.

Completion claims a usable VGA(2) foundation, not a complete 2D geometry system
or a commitment to a 1D visualizer.
