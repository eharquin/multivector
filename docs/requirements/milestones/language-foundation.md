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

The milestone is complete when its applicable language and design requirements
pass unit, property, round-trip, failure, and determinism tests from a clean
checkout. It is not a user-facing product release.
