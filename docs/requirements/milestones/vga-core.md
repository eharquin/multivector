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
names, the standard VGA geometry interpretation, custom geometry
interpretations, and interpretation editors are not deliverables of this
milestone.

The initial VGA implementation uses the built-in ganja.js adapter under
TECH-008. Milestone completion depends on MultiVector's engine and VGA
conformance suites, not on ganja.js tests or demonstrations alone.

The planned VGA-008 through VGA-010 guarantees for dimensions 4 through 9 are
not completion criteria for this milestone.

## Completion criteria

Completion requires a versioned acceptance fixture and recorded evidence for
every criterion below.

- **VGAC-001 — Parameterized definition:** One definition and engine-adapter
  path constructs VGA dimensions 1, 2, and 3 from validated parameters; fixtures
  reject unsupported configurations and detect dimension-specific
  implementation assumptions.
- **VGAC-002 — Basis and conventions:** Exact fixtures cover signature,
  generator squares, anti-commutation, canonical blade order, pseudoscalar,
  permuted-blade signs, and every basis-blade reverse and dual required by VGA
  convention version 1.
- **VGAC-003 — Operations:** Independent fixtures cover addition, subtraction,
  scalar multiplication, geometric, outer, inner, regressive, and contraction
  products, sandwich action, powers, inverse, division, norms, and supported
  scalar and multivector functions, including defined refusal cases.
- **VGAC-004 — Vectors:** Constructor and tuple fixtures cover dimensions 1
  through 3, scalar component enforcement, zero-filled missing components, and
  preserved inactive excess components.
- **VGAC-005 — Language integration:** End-to-end fixtures prove that registered
  VGA symbols, blades, constructors, constants, capabilities, properties, lists,
  ranges, indexing, and broadcasting use the common frontend and evaluator.
- **VGAC-006 — Dimension changes:** Round-trip fixtures move documents through
  dimensions 1, 2, 3, and back while preserving source and identities,
  rebuilding derived data, and deterministically updating
  dimension-dependent results and diagnostics.
- **VGAC-007 — Backend isolation:** Contract tests prove that ganja.js values,
  APIs, generated code, exceptions, coefficient layout, and serialization do
  not cross the engine boundary or enter documents and that document source is
  never passed to ganja.js translation.
- **VGAC-008 — Independent references:** Every minimum reference category in
  VGA convention version 1 has a project-owned oracle or analytically derived
  fixture; ganja.js is not the sole expected-result source.
- **VGAC-009 — Determinism and limits:** Repeated evaluation and canonical
  inspection produce equivalent owned values and stable diagnostics while
  configuration, coefficient-growth, operation-cost, and work limits fail
  before partial or excessive expansion.
- **VGAC-010 — Non-visual completion:** All VGA Core evidence runs without a
  geometry interpretation, visualizer, React, or browser DOM and exposes results
  through canonical textual inspection.

The acceptance record shall link each criterion to its mathematical reference,
engine-conformance test, language-integration test, document fixture, or
architecture evidence. This milestone shall not be presented as a completed
visual product.
