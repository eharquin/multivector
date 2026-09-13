# PGA 2D Foundation Milestone

**Status:** Draft for review
**Kind:** Product milestone
**Depends on:** VGA 2D Visual Workflow (accepted, release 0.1.0); the
registered-algebra engineering work identified by the #98 architecture delta
**Applies:** PGA-001 through PGA-008; PGA-010 through PGA-012; PGA-INT-001
through PGA-INT-008; PGA-VIZ-001 through PGA-VIZ-003; ALG-001 through ALG-031
as exercised by a second definition
**Date:** 2026-09-13

## Objective

Deliver the first projective workflow, PGA(2), as the proof that MultiVector is
a multi-algebra environment rather than a VGA application. The milestone is
judged as much on what it removes from VGA-only composition as on what it adds:
the same language, document, evaluation, interpretation boundary, and viewport
must serve both algebras, selected only by `document.algebra` and the
interpretation and visualizer identifiers.

## Required workflow

A user, without developer tools, shall be able to:

- start a new PGA(2) document, or switch an empty document to PGA(2), and see
  the algebra identified in the header and the algebra information dialog;
- write points with `point(x, y)` and `point(x, y, w)`, ideal points with
  `ipoint(x, y)`, and lines with `line(a, b, c)`;
- meet two lines with `^`, join two points with `&`, test incidence with
  `L ^ P`, and take duals with `!`;
- build rotors, translators, and motors with `exp`, and reflections and glide
  reflections from lines, and apply any of them with `>>>`;
- read each value's classification, position or equation, weight or scale,
  Euclidean and ideal norms, and see ideal and infinite entities reported
  textually;
- see Euclidean points and lines and ideal-point direction markers in the
  viewport, with the existing navigation, appearance, label, and display
  settings;
- drag a literal `point(x, y)` and undo the gesture as one history entry;
- save, reload, export, and import the document, and reopen a VGA document
  unchanged.

Line dragging, anchoring, interactive motors, motor logarithms and
interpolation, distance and angle read-outs, touch input, and PGA(3) are
excluded and tracked as issues.

## Completion criteria

- **P2D-001 — Registered boundary:** The PGA engine, interpretation, and
  visualizer are resolved from the document through the common registry, the
  VGA path is resolved the same way, and no production component imports a
  VGA or PGA module directly or branches on an algebra identifier. Loading a
  document whose algebra is unavailable yields the ALG-005 diagnostic and
  preserves its source.
- **P2D-002 — Convention conformance:** The PGA(2) engine passes every
  reference fixture of the convention specification, plus the
  parameterization cases of PGA-004, without the fixtures referencing backend
  output.
- **P2D-003 — Language and diagnostics:** Constructors, `inorm`, blade names
  including permuted forms, `ps`, and every operator of the required workflow
  evaluate under PGA(2) with source-localized diagnostics; the same sources
  under VGA(2) produce the common capability diagnostic, and VGA(2) fixtures
  are unchanged.
- **P2D-004 — Interpretation:** Fixtures cover every entity identifier of
  PGA-INT-003, projective equivalence descriptions, tolerance-boundary
  classification, sign-preserving normalization, and versor parity, including
  the reflected weight.
- **P2D-005 — Visualization and manipulation:** Fixtures and the deployed
  workflow cover point markers, clipped unbounded lines, ideal-point edge
  markers, textual reporting of undrawn entities, and literal point dragging
  as one recoverable history entry.
- **P2D-006 — Document compatibility:** Canonical export and import round-trip
  a PGA(2) document and a VGA(2) document without schema changes beyond the
  identifiers already defined; a 0.1.0 document reloads unchanged.
- **P2D-007 — Accessibility and release:** The manual accessibility checklist
  of the VGA 2D visual workflow is repeated for the PGA workflow on the
  supported browsers, the canonical verification command passes, and a
  documented PGA(2) example is completed on the deployed application.
- **P2D-008 — Design feedback:** The acceptance record identifies which
  algebra-definition, interpretation, and visualization requirements were
  confirmed, revised, or removed by the second-algebra evidence.

Completion claims a usable plane-based PGA(2) foundation and a demonstrated
registered-algebra boundary, not a complete projective geometry system.
