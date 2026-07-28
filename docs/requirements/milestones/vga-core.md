# VGA Core Milestone

**Status:** Draft for review
**Kind:** Engineering milestone
**Depends on:** Language and Document Foundation
**Date:** 2026-07-28

## Objective

Deliver one dimension-parameterized VGA implementation, independent of geometric
interpretation and rendering.

## Capability profile

The milestone shall satisfy the common design requirements, the algebra
definition contract, the VGA requirements, and the initial language
specification.

It shall provide:

- VGA dimensions 1 through 3 through one dimension-parameterized definition;
- canonical multivector inspection;
- vector construction with preserved inactive components;
- supported products, reverse, duality, norms, grade and coefficient access;
- lists, ranges, indexing, and broadcasting over VGA values;
- deterministic document reevaluation across dimension changes;
- conformance fixtures for dimensions 1, 2, and 3, including cases that detect
  dimension-specific implementation assumptions;
- explicit diagnostics for unsupported capabilities and exceeded limits.

The common parser shall obtain the normative `vector(...)` constructor through
the VGA definition's advertised constructor capability. Configurable constructor
names, custom geometry interpretations, and interpretation editors are not
deliverables of this milestone.

The planned VGA-008 through VGA-010 guarantees for dimensions 4 through 9 are
not completion criteria for this milestone.

## Completion criteria

The milestone is complete when independent mathematical references, engine
conformance, language integration, document round trips, and dimension-change
fixtures pass without a visualizer. It shall not be presented as a completed
visual product.
