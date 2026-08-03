# VGA Requirements

**Status:** Draft for review
**Date:** 2026-07-28
**Initial supported dimensions:** 1–3
**Planned dimensions:** 4–9
**License:** MIT

## 1. Definition

VGA shall be implemented as the parameterized Euclidean family VGA(n), rather
than as separate 1D, 2D, and 3D engines.

- **VGA-001:** The initial definition shall accept geometric dimensions 1
  through 3 and use signature `(n, 0, 0)`. Its architecture and serialized
  configuration shall remain dimension-parameterized rather than encode three
  separate algebra definitions.
- **VGA-002:** It shall expose Euclidean generators `e1` through `en` in the
  canonical order defined by its convention version.
- **VGA-003:** Evaluation support for a dimension shall be independent of the
  availability of a geometry interpretation or visualizer.
- **VGA-004:** The initial conformance suite shall contain independent cases for
  dimensions 1, 2, and 3 and dimension-parameterization cases that detect
  assumptions tied to one particular dimension.
- **VGA-011:** VGA shall register `ps` as its pseudoscalar named constant in
  every supported dimension. It evaluates to the canonical ordered product
  `e1 * e2 * ... * en` under the active basis and convention version. The name
  implies neither normalization nor invertibility.

The following requirements are **Planned** and do not block the initial VGA
Core or VGA 2D Foundation milestones:

- **VGA-008:** Dimensions 4 through 9 shall become fully supported textual and
  computational configurations, not best-effort previews: every mandatory
  engine capability and every VGA capability advertised for dimensions 1
  through 3 shall operate over all grades and blades in dimensions 4 through 9,
  subject only to documented common resource limits.
- **VGA-009:** No geometric-classification or visualization guarantee is made
  above geometric dimension 3. Once VGA-008 is activated by a milestone, lack
  of such a visualizer shall not reduce its evaluation guarantee.
- **VGA-010:** Conformance for every activated dimension 4 through 9 shall
  include basis cardinality and ordering, signature, generator squares,
  anti-commutation, representative mixed-grade products, grade projection,
  coefficient access, reverse, duality, norms, serialization, and
  dimension-change round trips. Dimensions 8 and 9 shall additionally exercise
  sparse values without requiring dense allocation.

## 2. Vectors and dimensions

- **VEC-001:** `vector(...)` and tuple syntax shall create one N-dimensional
  vector abstraction.
- **VEC-002:** Missing components shall be zero-filled in higher dimensions.
- **VEC-003:** Excess source components shall remain stored but inactive in
  lower dimensions.
- **VEC-004:** Components shall evaluate to pure grade-zero values.
- **VEC-005:** Dimension changes shall preserve sources, item identities, and
  inactive components, then deterministically reevaluate the document.

## 3. Operations and conventions

- **VGA-005:** In every supported dimension, the definition shall provide
  vector construction, addition, subtraction, scalar multiplication, geometric
  and outer products, reverse, grade projection, coefficient access, integer
  powers, inverse and division where mathematically defined, the specified
  inner and regressive products and contractions, sandwich action, duality, and
  the primary norm. Scalar elementary functions use the common scalar boundary;
  a multivector extension is advertised only when separately defined and
  tested.
- **VGA-006:** Basis order, duality, inner product, norm, and numerical tolerance
  conventions shall follow the version selected by `conventionVersion`. The
  initial behavior is defined by the
  [VGA convention version 1 specification](../../specifications/vga-conventions.md)
  and shall be tested under ALG-013 and ALG-031.
- **VGA-007:** A source invalid only because of the active dimension shall remain
  stored and become valid automatically in a compatible dimension.

## 4. Standard geometry interpretation

The requirements in this section have **Milestone** commitment and apply only
to milestones that explicitly include the standard VGA geometry
interpretation.

- **VGA-INT-001:** MultiVector shall provide one versioned standard VGA
  interpretation independently of the VGA algebra definition.
- **VGA-INT-002:** In the standard interpretation, pure grade-one values shall
  represent vectors; supported higher grades may represent oriented area and
  volume entities according to geometric dimension.
- **VGA-INT-003:** The standard interpretation shall use stable semantic entity
  identifiers independently of user-facing names and appearance.
- **VGA-INT-004:** Alternative interpretations, including projective readings of
  VGA values, are not part of the initial VGA milestones and require their own
  approved requirements.

## 5. Natural normalization

- **VGA-NORM-001:** Every evaluated non-scalar multivector shall expose the
  natural-normalization control independently of position or visualization
  support. Pure scalars and annotations shall not expose it.
- **VGA-NORM-002:** Natural normalization shall use the versioned VGA norm and
  shall run before dependent expressions resolve without rewriting source.
- **VGA-NORM-003:** A finite, strictly positive norm shall produce a unit-norm
  value. A zero-norm value shall remain unchanged and expose a textual
  normalization-unavailable state; it shall not be divided by an epsilon.
- **VGA-NORM-004:** The normalization request shall remain document-owned,
  persistent, and independently undoable through `Item.normalization`.

## 6. Positioned vectors

This section owns VGA-specific position meaning. The common storage,
enablement, dependency, and propagation rules are owned by APP-005, APP-007, and
the [document format specification](../../specifications/document-format.md).

- **VGA-POS-001:** A visualized VGA vector shall have a position independent of
  its algebraic value.
- **VGA-POS-002:** `V.position` shall return its position vector in the active
  geometric dimension.
- **VGA-POS-003:** `V.head` shall be read-only and equal `V.position + V`.
- **VGA-POS-004:** Position shall never enter the vector coefficients.
- **VGA-POS-005:** Position sources shall use the common language and dependency
  graph while remaining separate from mathematical source.
- **VGA-POS-006:** Missing or invalid positions shall render at the origin; an
  invalid position shall additionally produce a diagnostic without altering the
  vector value.
- **VGA-POS-007:** The standard VGA interpretation shall advertise position
  support for every visualizable entity kind that has no intrinsic point
  location. Position translates its rendered placement without entering the
  entity's multivector coefficients or changing its algebraic interpretation.
- **VGA-POS-008:** The standard VGA interpretation shall register `position` and
  `head` through the language's capability-property contract. Both properties
  distribute over lists of positioned entities while preserving evaluated
  element identity, order, source association, and position metadata.

There is no VGA `value` property. The serialized source, enablement, dependency,
cycle, and record-propagation rules remain owned by the
[document format specification](../../specifications/document-format.md).
