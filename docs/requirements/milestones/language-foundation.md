# Language and Document Foundation Milestone

**Status:** Draft for review
**Kind:** Engineering milestone
**Date:** 2026-07-27

## Objective

Deliver an independently testable language and document foundation without
requiring React, a browser DOM, or a geometric visualizer.

## Required outcomes

- source text is tokenized, parsed into an owned AST, dependency-analyzed, and
  deterministically evaluated;
- scalars and zero have uniform multivector semantics;
- declarations, lists, ranges, indexing, broadcasting, and structured
  diagnostics satisfy the language specification;
- document validation, canonical serialization, migrations, dependency nodes,
  and dimension changes satisfy the document format specification and are
  testable through application services;
- evaluated values, grades, coefficients, and diagnostics can be inspected in a
  textual development surface;
- resource limits cover source size, AST depth, dependencies, list generation,
  and evaluation work.

## Completion criteria

Completion requires a versioned acceptance fixture and recorded evidence for
every criterion below.

- **LFND-001 — Frontend:** Tokenizer and parser fixtures cover every accepted
  and reserved language form, precedence, associativity, source location, and
  syntax-recovery boundary without evaluating recovered fragments.
- **LFND-002 — Dependencies:** Fixtures cover forward references, missing and
  duplicate names, independent branches, cycles across every enabled source
  property, deterministic planning, and stable reevaluation order.
- **LFND-003 — Evaluation:** Unit and property tests cover uniform scalar and
  multivector values, lists, ranges, indexing, broadcasting, grade and
  coefficient access, and capability dispatch without requiring geometry or
  rendering.
- **LFND-004 — Diagnostics and recovery:** Fixtures distinguish syntax,
  missing-name, duplicate, cycle, domain, capability, upstream, internal, and
  resource-limit failures; failed values disappear, independent branches
  continue, and correction restores dependants.
- **LFND-005 — Document lifecycle:** Validation and migration fixtures cover
  closed objects, unavailable versions, invalid external data, identity
  preservation, deterministic one-version migrations, and read-only recovery
  without evaluating source during migration.
- **LFND-006 — Canonical documents:** Property and fixture tests prove
  canonicalization idempotence, stable key and number encoding, duplicate-key
  rejection, and byte-stable export/import round trips.
- **LFND-007 — Limits:** Boundary fixtures cover every initial source, parser,
  dependency, generated-value, coefficient, formatting, and deterministic-work
  limit without partial mathematical results.
- **LFND-008 — Architectural independence:** The complete foundation test suite
  runs without React, a browser DOM, a geometry interpretation, or a visualizer,
  and exposes evaluated values and diagnostics through a textual development
  surface.
- **LFND-009 — Verification:** From a clean checkout, the canonical project
  command type-checks, lints, tests, and builds the foundation with no hidden
  expected failures.

The acceptance record shall link each criterion to its unit, property,
round-trip, failure, determinism, or architecture evidence. This milestone is
not a user-facing product release.
