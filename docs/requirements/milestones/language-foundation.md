# Language and Document Foundation Milestone

**Status:** Draft for review
**Kind:** Engineering milestone
**Date:** 2026-07-27

## Objective

Deliver an independently testable language and document foundation without
requiring React, a browser DOM, or a geometric visualizer.

## Required outcomes

- the selected language frontend analyzes source into a validated dependency
  and evaluation plan, then evaluates it deterministically;
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

The milestone cannot begin until TECH-008 selects one candidate stack. It does
not require implementing or shipping the rejected candidate.

## Completion criteria

The milestone is complete when its applicable language and design requirements
pass unit, property, round-trip, failure, and determinism tests from a clean
checkout. It is not a user-facing product release.
