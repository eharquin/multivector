# Algebra Definition Requirements

**Status:** Draft for review
**Date:** 2026-07-22
**License:** MIT

## 1. Purpose

This document defines the contract that every algebra definition shall satisfy.
Definitions may be parameterized families such as VGA(n), or fixed research
models such as a two-dimensional CCGA or ACGA.

## 2. Identity and configuration

- **ALG-001:** Every definition shall have a stable identifier and a positive
  `definitionVersion`.
- **ALG-002:** Algebra conventions shall have an independently evolving
  `conventionVersion`.
- **ALG-003:** A definition shall declare whether it is fixed or parameterized
  and shall validate all parameters before constructing an engine.
- **ALG-004:** Documents shall identify the definition, its parameters, and the
  applicable definition and convention versions.
- **ALG-005:** Loading a document whose definition or version is unavailable
  shall preserve its source and produce a structured diagnostic; it shall not
  silently substitute another algebra.
- **ALG-023:** `algebraId` shall be a lowercase reverse-DNS identifier such as
  `org.multivector.vga`; it identifies a semantic definition, not a package,
  backend, display name, or configured instance. It shall never be reused for
  incompatible semantics.
- **ALG-024:** A definition shall publish a JSON-compatible parameter schema,
  defaults, canonicalization rules, and supported configurations. Fixed
  definitions use an empty parameter object. Unknown parameters are invalid.
- **ALG-025:** `definitionVersion` versions the parameter schema and operation
  semantics; `conventionVersion` versions scientific choices and numerical
  conventions. Backends and interpretations are versioned independently and
  are not part of `algebraId`.

An algebra's scientific family is descriptive metadata, not a closed dispatch
enum. The application shall not assume that every definition belongs to VGA,
PGA, or CGA.

## 3. Dimensions, signature, and basis

- **ALG-006:** A definition shall distinguish geometric dimension, generator
  count, and visualization capability.
- **ALG-007:** It shall declare its metric signature, canonical basis order,
  source-level blade names, display aliases, and named constants.
- **ALG-008:** Algebraic support for a configuration shall not require a
  visualizer for its geometric dimension.
- **ALG-009:** Derived embedding dimensions shall remain internal unless an
  explicitly scoped feature exposes them.
- **ALG-026:** `geometricDimension` is the dimension of the modeled geometry;
  `generatorCount` is the number of generating vectors; `signature` is the
  ordered triple `(positive, negative, null)` whose sum equals generator count.
  None may be inferred from another except through a definition's validated
  parameter mapping.
- **ALG-027:** A definition may model a low-dimensional geometry with many
  generators. Common UI shall query declared capabilities and geometric
  dimension and shall not derive controls from signature or coefficient count.

CCGA and ACGA motivate this separation: both model 2D geometry while using much
larger algebraic spaces than VGA(2).

## 4. Values and operations

- **ALG-010:** Backend values shall be converted to MultiVector-owned values
  before crossing the engine boundary.
- **ALG-011:** A definition shall advertise supported operations and semantic
  extensions explicitly.
- **ALG-012:** Unsupported operations shall produce capability diagnostics.
- **ALG-013:** Definition-specific norms, dualities, exponentials, embeddings,
  and tolerances shall be documented and independently tested.
- **ALG-014:** Dense allocation of all coefficients shall not be required for
  scalar or sparse values.

The definition contract separates mandatory core capabilities from optional
ones. Every constructed engine shall provide owned finite scalar and
multivector values, zero and one, canonical basis metadata, equality under the
active convention, addition, subtraction, scalar multiplication, geometric
product, unary sign, canonical inspection/serialization, and grade and
coefficient access. Parsing, lists, dependency analysis, and rendering are
application capabilities and are not implemented by an engine.

- **ALG-028:** Optional capabilities—including inverse and division, outer and
  regressive products, contractions, duality, reverse, norms, transcendental
  functions, constructors, named constants, embeddings, and geometric
  interpretation—shall each have a stable capability identifier and declared
  configuration support.
- **ALG-029:** Language registration shall expose syntax only when its required
  capability is present, or produce the same structured capability diagnostic
  at evaluation time; common UI shall render capability descriptors rather than
  branch on `algebraId`.
- **ALG-030:** Capability results and failures shall use owned values and common
  diagnostic categories. Backend-specific exceptions and sentinel values shall
  not cross the engine boundary.

Different definitions may use different conforming backends. A specialized
sparse engine or future Rust/Wasm backend shall not change document semantics.

## 5. Geometric interpretation

- **ALG-015:** Algebra definitions shall not own geometric classification,
  presentation names, appearance, or rendering; mathematical constructors and
  embeddings remain explicit definition capabilities under ALG-011 and
  ALG-018.
- **ALG-016:** An optional, separately versioned `GeometryInterpretation` may
  classify owned values and convert them to renderer-independent geometric
  entities.
- **ALG-017:** An algebra configuration shall remain evaluable and textually
  inspectable without a geometry interpretation or visualizer.
- **ALG-018:** Definition-specific constructors and named constants shall be
  registered as explicit capabilities, not hard-coded in the common parser.

Interpretation profiles form a separate internal contract:

- **INT-001:** Every interpretation shall declare a stable identifier, a
  positive `interpretationVersion`, and the algebra definitions and
  configurations with which it is compatible.
- **INT-002:** Multiple interpretations may target the same algebra definition;
  a document shall activate at most one interpretation at a time.
- **INT-003:** Classification identifiers and semantic entity types shall be
  stable and distinct from user-facing singular and plural names.
- **INT-004:** Changing a user-facing name shall not change evaluation,
  classification identifiers, semantic entity types, or rendering behavior.
- **INT-005:** Interpretation shall not emit SVG, DOM, React, camera, viewport,
  or appearance objects.
- **INT-006:** Entity kinds shall be extensible without branching on algebra or
  interpretation identifiers in shared UI or visualizer code.
- **INT-007:** An unsupported or non-visualized classification shall remain
  available for textual inspection and shall not become an algebraic failure.
- **INT-008:** Interpretation selection shall not silently rewrite source or
  substitute unavailable constructors or semantic types.
- **INT-009:** The interpretation boundary ends at semantic,
  renderer-independent entities and editable geometric degrees of freedom.
  Render-primitive adapters map entity kinds to primitives; visualizers lay out
  and draw primitives. Neither layer may infer algebraic meaning from
  coefficients or `algebraId`.
- **INT-010:** An entity kind shall declare the primitive-adapter capabilities
  it requires. Absence of an adapter is a visualization diagnostic, not an
  evaluation or interpretation failure.

The initial product may provide built-in interpretations as trusted TypeScript
modules behind this contract. User-authored declarative rules, custom
constructor nomenclature, imported interpretations, and interpretation editors
require a separate approved design.

## 6. Limits and conformance

- **ALG-019:** A definition shall declare resource limits relevant to generator
  count, coefficient growth, evaluation cost, and expensive operations.
- **ALG-020:** Every backend shall pass the common conformance tests for the
  capabilities it advertises.
- **ALG-021:** Fundamental operations shall use independent reference cases; a
  backend shall not be its own sole oracle.
- **ALG-022:** Equivalent supported backends shall produce results within the
  versioned conventions and tolerances of the definition.

This contract is an internal extension boundary. It does not require a public
plugin system in the initial product scope.
