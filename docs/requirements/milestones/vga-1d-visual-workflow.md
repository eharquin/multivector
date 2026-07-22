# VGA 1D Visual Workflow Milestone

**Status:** Draft for review
**Kind:** Product milestone
**Depends on:** VGA Core and 1D Visualization
**Date:** 2026-07-22

## Objective

Deliver the first complete public workflow by combining the shared core with a
one-dimensional configuration of MultiVector's standard VGA interpretation and
the shared 1D visualizer.

## Required workflow

A user, without developer tools, shall be able to:

- create scalars, vectors, lists, and ranges;
- evaluate expressions and understand diagnostics;
- visualize positioned vectors and their derived heads;
- configure appearance and scalar controls;
- drag supported literals and direct free-scalar references;
- animate scalars with deterministic history behavior;
- undo and redo document mutations;
- save and restore local documents;
- import and export canonical JSON;
- open and save URL-shared documents;
- change VGA dimension without losing stored components;
- follow a documented example;
- use the deployed GitHub Pages application.

## Initial limitations

This milestone requires scalar animation only, common list appearance, direct
scalar-reference inverse editing only, and no list-element dragging. Sampled
parametric functions, alternative or user-authored geometry interpretations,
configurable constructor names, and more complex inverse editing require later
designs.

## Completion criteria

Completion requires a versioned acceptance fixture and recorded evidence for
every criterion below. A demonstration alone is not completion.

- **M1D-001 — Authoring:** From an empty document, a keyboard-only user can
  create named and unnamed scalars, vectors, lists, ascending and descending
  ranges, indexed expressions, and annotations; results and source-localized
  diagnostics update without reloading.
- **M1D-002 — Evaluation and recovery:** Fixtures cover syntax, missing-name,
  duplicate, cycle, domain, capability, upstream, internal, and resource-limit
  failures. Independent branches remain visible, stale failed values disappear,
  and correcting each primary cause restores its dependants.
- **M1D-003 — Geometry and appearance:** A user can visualize an individual and
  a list of VGA(1) positioned vectors, inspect their positions and derived
  heads, and change visibility, label visibility, and common list style. Zero
  vectors, unsupported entities, and render truncation have textual states.
- **M1D-004 — Manipulation:** Pointer and keyboard operations can translate a
  supported position and edit a supported vector head. Literal, signed literal,
  tuple/constructor component, and direct free-scalar-reference fixtures prove
  minimal source rewriting; ambiguous and compound cases prove refusal without
  mutation.
- **M1D-005 — Controls and animation:** Numeric-field and slider modes validate
  scalar bounds and steps. `once`, `loop`, and `ping-pong` modes pass
  injectable-clock tests, pause/cancel semantics, reduced-motion behavior, and
  one-entry history coalescence.
- **M1D-006 — History:** Source, appearance, position, controls, and algebra
  configuration round-trip through undo and redo. Gesture and text
  coalescence, redo invalidation, and exclusion of view/playback previews have
  automated tests.
- **M1D-007 — Persistence:** Local save and restore survive reload; a simulated
  failed write retains the last valid revision. Canonical JSON export/import is
  a byte-stable round trip, and identity collisions require explicit handling.
- **M1D-008 — Sharing and recovery:** A within-limit document round-trips
  through a versioned fragment URL without network or automatic local writes.
  Oversized, malformed, integrity-failing, and unavailable-algebra documents
  follow the specified export and read-only recovery paths without data loss.
- **M1D-009 — Dimension preservation:** Moving a fixture through VGA dimensions
  1, 2, 3, and back to 1 preserves item identity, all component sources, and
  inactive components while reevaluating dimension-dependent diagnostics.
- **M1D-010 — Accessibility:** Automated checks report no accepted violations,
  and a recorded manual pass covers complete keyboard operation, focus order,
  accessible names and diagnostics, non-color state, 200% zoom, target size,
  reduced motion, and one supported screen-reader/browser combination.
- **M1D-011 — Documentation:** Public documentation contains one end-to-end VGA
  1D tutorial, the language and convention references it uses, persistence and
  sharing limitations, keyboard instructions, and recovery guidance. Every
  example is exercised by an automated fixture.
- **M1D-012 — Release:** From a clean checkout, the canonical verification
  command passes and the production artifact deploys to GitHub Pages. A smoke
  test loads the deployed URL, completes the documented example, reloads a
  local document, and opens a shared fragment without a backend.

The acceptance record shall link each criterion to its automated tests, manual
check, documentation page, or deployment evidence and record browser and
assistive-technology versions for manual checks. Product completion does not
claim that later 2D, 3D, PGA, CGA, CCGA, or ACGA workflows are implemented.
