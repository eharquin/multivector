# VGA 1D Foundation Milestone

**Status:** Draft for review
**Kind:** Product milestone
**Depends on:** VGA Core
**Applies:** Core 1D Visualization Requirements
**Date:** 2026-07-28

## Objective

Deliver the first public, text-driven VGA(1) workflow. This milestone validates
the language, document, algebra, interpretation, rendering, persistence, and
deployment foundations before direct manipulation, animation, URL sharing, or
figure export become delivery requirements.

## Required workflow

A user, without developer tools, shall be able to:

- create and edit scalar, vector, list, and range expressions;
- evaluate expressions and understand structured diagnostics;
- visualize individual and listed VGA(1) vectors whose positions are entered as
  source;
- inspect values, positions, derived heads, and failures in text;
- configure visibility, label visibility, and common list style;
- undo and redo source and appearance changes;
- save and restore a local document;
- import and export canonical JSON;
- change among VGA dimensions 1, 2, and 3 without losing stored components;
- complete a documented example in the deployed GitHub Pages application using
  a keyboard.

Direct manipulation, inverse source editing, scalar controls, animation, URL
sharing, figure export, and their advanced history behavior are excluded. They
remain governed by their existing requirements and enter the subsequent VGA 1D
Visual Workflow milestone.

## Completion criteria

Completion requires a versioned acceptance fixture and recorded evidence for
every criterion below.

- **F1D-001 — Authoring and evaluation:** From an empty document, a
  keyboard-only user can create named and unnamed scalars, vectors, lists,
  ranges, indexed expressions, and annotations. Results and source-localized
  diagnostics update without reloading.
- **F1D-002 — Recovery:** Fixtures cover syntax, missing-name, duplicate, cycle,
  domain, capability, upstream, internal, and resource-limit failures.
  Independent branches remain visible and correcting each primary cause
  restores its dependants.
- **F1D-003 — Geometry and appearance:** A user can visualize individual and
  listed VGA(1) positioned vectors, inspect positions and derived heads, and
  change visibility, label visibility, and common list style. Zero vectors,
  unsupported entities, and render truncation have textual states.
- **F1D-004 — Basic history:** Source and appearance changes, including algebra
  configuration, round-trip through undo and redo. Undo followed by a mutation
  clears redo, and view-only actions create no history entry.
- **F1D-005 — Persistence:** Local save and restore survive reload; a simulated
  failed write retains the last valid revision. Canonical JSON export and import
  form a byte-stable round trip, and identity collisions require explicit
  handling.
- **F1D-006 — Dimension preservation:** Moving a fixture through VGA dimensions
  1, 2, 3, and back to 1 preserves item identity, component sources, and
  inactive components while reevaluating dimension-dependent diagnostics.
- **F1D-007 — Accessibility:** Automated checks report no accepted violations,
  and a recorded manual pass covers the complete foundation workflow by
  keyboard, logical focus, visible focus, accessible names and diagnostics,
  non-color state, 200% zoom, and target size.
- **F1D-008 — Documentation and release:** Public documentation contains one
  end-to-end VGA 1D foundation tutorial, language and convention references,
  persistence limitations, keyboard instructions, and recovery guidance. From
  a clean checkout, the canonical verification command passes; the production
  artifact deploys to GitHub Pages; and a smoke test completes the tutorial and
  reloads a local document without a backend.

The acceptance record shall link each criterion to its automated tests, manual
check, documentation page, or deployment evidence. Completion does not claim
direct manipulation, animation, URL sharing, figure export, later visual
dimensions, or later algebra families.
