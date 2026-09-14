# PGA Requirements

**Status:** Draft for review
**Date:** 2026-09-13
**Initial supported dimension:** 2
**Planned dimensions:** 3
**Decision record:** [PGA(2) Convention Decisions](../../architecture/pga-2d-convention-decisions.md)
**License:** MIT

## 1. Definition

PGA shall be implemented as the parameterized projective family PGA(n), whose
first activated member is PGA(2).

- **PGA-001:** The initial definition shall accept geometric dimension 2 and
  use signature `(2, 0, 1)`. Its architecture and serialized configuration
  shall remain dimension-parameterized; a dimension other than 2 is an
  invalid parameter of `definitionVersion: 1`, not an unsupported preview.
- **PGA-002:** It shall expose generators `e0, e1, e2`, with `e0` the null
  generator, in the canonical order defined by its convention version, and
  shall accept permuted blade names in source with the induced sign.
- **PGA-003:** Evaluation support shall be independent of the availability of a
  geometry interpretation or visualizer.
- **PGA-004:** The conformance suite shall replay the reference fixtures of the
  convention specification and shall include parameterization cases that
  detect assumptions tied to dimension 2.
- **PGA-005:** The definition shall provide the constructors `line`, `point`
  (two- and three-argument forms), and `ipoint`; addition, subtraction, scalar
  multiplication, geometric, outer, inner, left-contraction, and regressive
  products; reverse, grade involution, and the Hodge dual; grade projection
  and coefficient access; integer powers; inverse and division where
  mathematically defined; the sandwich action; the exponential of bivectors;
  and the Euclidean norm `norm` and ideal norm `inorm` as separately
  identified capabilities.
- **PGA-006:** Basis order, duality, regressive product, inner product, norms,
  exponential, and numerical tolerance conventions shall follow the version
  selected by `conventionVersion`. The initial behavior is defined by the
  [PGA convention version 1 specification](../../specifications/pga-conventions.md)
  and shall be tested under ALG-013 and ALG-031.
- **PGA-007:** Duality shall be the explicit Hodge complement of the convention.
  Multiplication by the null pseudoscalar shall never be presented as a
  duality, and a request to invert a non-invertible value shall produce a
  domain diagnostic rather than a value computed from the ideal norm.
- **PGA-008:** `ps` shall be registered as the pseudoscalar named constant and
  evaluate to `e012`; the name implies neither normalization nor
  invertibility.

The following requirement is **Planned** and does not block the first PGA
milestone:

- **PGA-009:** PGA(3) shall become a fully supported configuration with its own
  convention section, interpretation, and reference fixtures before any 3D
  projective visualizer is claimed.

## 2. Registration and language exposure

- **PGA-010:** The PGA definition shall be resolved through the common algebra
  registry from `document.algebra` (ALG-004); no application component shall
  construct a PGA engine directly or branch on `algebraId`.
- **PGA-011:** Constructors and `inorm` shall be exposed to the language only
  through their capability identifiers (ALG-029): a document evaluated under
  an algebra without those capabilities shall receive the common capability
  diagnostic, and VGA documents shall be unaffected by PGA registration.
- **PGA-012:** A canonical document shall identify the PGA definition,
  parameters, definition and convention versions, and the interpretation and
  visualizer identifiers using the existing document format; no PGA-specific
  schema fork is permitted.

## 3. Plane-based geometry interpretation

The requirements in this section have **Milestone** commitment and apply only
to milestones that explicitly include the standard PGA interpretation.

- **PGA-INT-001:** MultiVector shall provide one versioned standard PGA(2)
  interpretation, `org.multivector.pga-2d`, independently of the PGA algebra
  definition, declaring `model: "plane-based"` in its descriptor.
- **PGA-INT-002:** In the standard interpretation, grade-1 values shall
  represent lines and grade-2 values shall represent points; the outer product
  of lines is their meet and the regressive product of points is their join.
  A point-based reading of the same algebra is a distinct interpretation and
  requires its own approved requirements.
- **PGA-INT-003:** The interpretation shall use stable semantic entity
  identifiers for scalars (including the all-zero value, as in VGA), Euclidean
  points, ideal points, Euclidean lines, the line at infinity, rotors,
  translators, motors, reflections, and mixed multivectors, independently of
  user-facing names and appearance.
- **PGA-INT-004:** The interpretation shall report projective equivalence by
  describing a point through its Euclidean position and its weight, and a line
  through its scale (its coefficients are inspected as the value itself); it shall never make `==` mean projective
  equivalence.
- **PGA-INT-005:** Classification shall use a declared tolerance policy of the
  form `epsilon = absoluteFloor + relativeTerm * scale`, where `scale` is the
  maximum absolute value across the value's own coefficients, applied to the
  Euclidean norm first and the ideal norm second as fixed by the convention.
  The tolerance governs classification only: it shall not alter owned
  coefficients, dependent evaluation, or the exact zero used for
  algebra-level grade membership.
- **PGA-INT-006:** Normalization shall divide only by the norm that
  classification selected and only when it is strictly positive; it shall
  preserve the sign of the weight, so the orientation produced by odd versors
  survives normalization and is visible in the description.
- **PGA-INT-007:** The interpretation shall classify even and odd versors by
  parity and by `V * ~V` being a unit scalar under the tolerance, and shall
  describe the reflected weight of odd-versor results rather than hide it.
- **PGA-INT-008:** Euclidean points and lines have intrinsic locations; the
  interpretation shall not advertise position support for them. An ideal
  point has no location and shall accept a rendering position, which is a
  Euclidean point written with the `point` constructor; its `head` is the
  Euclidean point `position + value`, the end of its arrow. The line at
  infinity accepts no position.

## 4. Visualization

- **PGA-VIZ-001:** A 2D PGA visualizer shall render Euclidean points as point
  markers and Euclidean lines as unbounded lines clipped to the viewport,
  reusing the common 2D viewport, appearance, label, and display-settings
  requirements without PGA-specific viewport behavior.
- **PGA-VIZ-002:** The line at infinity shall be drawn as the ellipse
  inscribed in the viewport (a circle for a square viewport). An ideal point
  shall be drawn, per an item-level appearance setting, as a positioned arrow
  of its direction and magnitude (the default), as a marker on that ellipse in
  its direction, or both; the arrow carries the head and base handles of a
  positioned object. Versors and mixed multivectors shall be reported
  textually and shall not be drawn.
- **PGA-VIZ-003:** Direct manipulation in the first milestone shall be limited
  to moving a point whose source is a literal `point(x, y)`, to the head and
  base of an ideal point whose source is a literal `ipoint(x, y)`, and to a
  line whose source is a literal `line(a, b, c)` as specified by PGA-VIZ-004,
  rewriting those literals with the deterministic precision rules of EDIT and
  INTERACT2D; anchoring to Euclidean points and interactive motors are
  excluded until separately specified.
- **PGA-VIZ-004:** A Euclidean line shall show a translucent halo while
  hovered or selected, and may show discreet orientation ticks on its
  positive side, toggled by the item's `orientationVisible` appearance.
  Dragging a movable line shall translate it, keeping `(a, b)` and rewriting
  `c`. Pressing (or `Enter` on the focused line) shall select it and draw its
  unit normal anchored at the point of the line nearest the press; dragging
  or nudging the normal's head shall rotate the line about that anchor,
  preserving the scale `√(a² + b²)`. `Escape`, a viewport pan, or a press
  elsewhere shall clear the selection.
