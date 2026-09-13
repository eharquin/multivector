# PGA(2) Convention Decisions

**Status:** Accepted 2026-09-13
**Issue:** #98
**Date:** 2026-09-13
**Decision owner:** Algebra-definition and interpretation architecture

## 1. Purpose

This record fixes the scientific conventions of the first projective geometric
algebra profile before implementation begins. It is non-normative: the accepted
decisions become the normative PGA convention specification, the PGA
requirements, and the PGA(2) milestone. Every sign-sensitive formula below is
accompanied by a worked example computed independently of any backend; those
examples seed the reference fixtures.

The VGA convention (`docs/specifications/vga-conventions.md`) is the model. Where
a choice could differ from VGA, it is aligned with VGA unless a reason is
recorded.

## 2. Identity and configuration (D1)

- Definition `org.multivector.pga`, `definitionVersion: 1`, parameterized as a
  PGA(n) family with parameters `{ "dimension": 2 }`; only dimension 2 is
  supported by this version, other values are invalid, not "unsupported yet".
- `conventionVersion: 1` for the choices in this record.
- Interpretation `org.multivector.pga-2d`, version 1, declaring
  `model: "plane-based"`. Visualizer `org.multivector.pga-2d`, version 1.

The algebra is `Cl(2,0,1)` and is neutral about geometry. The same algebra
admits a point-based reading in which grade 1 represents points; that reading
would be a distinct interpretation identifier, never a parameter of the
definition and never another algebra. The plane-based model (called "dual" or
"upside-down" in part of the literature) is chosen because the meet of lines is
the native outer product, motors act uniformly on every entity, and the
reference implementations used for cross-checking (ganja.js, MultiVector
Studio) share it.

## 3. Generators, metric, and canonical basis (D2)

Generators `e0, e1, e2` with

```text
e0 * e0 = 0
e1 * e1 = e2 * e2 = 1
ei * ej = -(ej * ei), when i != j
```

Canonical blades are ordered by grade, then lexicographically by increasing
index, exactly as VGA: `1, e0, e1, e2, e01, e02, e12, e012`. The pseudoscalar is
`I = e012`; it is null (`I * I = 0`) and is never used as an invertible duality
operator (D5).

Source accepts any permutation of indices with the induced sign, so `e20` parses
as `-e02` and `e102` as `-e012`. Display always uses canonical names (`e02`, not
`e20`), consistent with VGA and with Studio; the pedagogical `e20` form appears
only in documentation prose.

## 4. Plane-based interpretation and constructors (D3)

| Entity | Grade | Storage | Constructor |
| --- | --- | --- | --- |
| Line `a x + b y + c = 0` | 1 | `a e1 + b e2 + c e0` | `line(a, b, c)` |
| Point with raw homogeneous coordinates, positioned at `(x/w, y/w)` | 2 | `w e12 - x e02 + y e01` | `point(x, y, w)`; `point(x, y) = point(x, y, 1)` |
| Ideal point (direction `(x, y)`) | 2 | `-x e02 + y e01` | `ipoint(x, y) = point(x, y, 0)` |
| Line at infinity | 1 | `c e0` | `line(0, 0, c)` |

Worked example: `point(1, 2)` is stored as `[0, 0, 0, 0, 2, -1, 1, 0]`
(`e01 = 2`, `e02 = -1`, `e12 = 1`). In pedagogical notation this is
`e12 + 1 e20 + 2 e01`.

Coordinates are read back as `x = -[e02] / [e12]`, `y = [e01] / [e12]`, only
when the point is classified Euclidean (D8).

## 5. Incidence and meet (D4)

For a line `L` and a point `P`,

```text
L ^ P = (a x + b y + c w) e012
```

and `P` lies on `L` exactly when this vanishes. The meet of two lines is their
outer product:

```text
L1 ^ L2 = (a1 b2 - a2 b1) e12 + (b2 c1 - b1 c2) e02 + (c1 a2 - c2 a1) e01
```

Worked examples:

- `line(1, -1, 0) ^ point(2, 2) = 0`; `line(1, -1, 0) ^ point(1, 0) = e012`.
- `line(1, 0, -1) ^ line(0, 1, -2) = 2 e01 - e02 + e12 = point(1, 2)`: the
  lines `x = 1` and `y = 2` meet at `(1, 2)`.
- `line(1, 0, -1) ^ line(1, 0, -2) = e01 = ipoint(0, 1)`: parallel vertical
  lines meet at the ideal point in the direction of the y axis.

## 6. Duality (D5)

The dual is the explicit Hodge complement `J`, defined on canonical blades by
`eA ^ J(eA) = e012`:

```text
J(1)   = e012     J(e012) = 1
J(e0)  = e12      J(e12)  = e0
J(e1)  = -e02     J(e02)  = -e1
J(e2)  = e01      J(e01)  = e2
```

With three generators `J` is an involution: `J(J(X)) = X`. This is the right
complement used by ganja.js `Dual` and by Studio, so cross-checks apply
directly. The language operators `!A` and `A.dual` map to `J` in this
interpretation.

Multiplication by `I` is not a duality here: `X * I` discards every component
containing `e0` and cannot be inverted.

## 7. Join (D6)

The regressive product is defined through the explicit dual:

```text
A & B = J(J(A) ^ J(B))
```

For two points this gives the line through them:

```text
point(x1, y1) & point(x2, y2)
  = (y1 - y2) e1 + (x2 - x1) e2 + (x1 y2 - x2 y1) e0
```

Worked examples:

- `point(0, 0) & point(1, 1) = -e1 + e2`, the line `-x + y = 0`.
- `point(1, 0) & point(1, 1) = e0 - e1`, the line `x = 1`.
- `point(1, 1) & point(1, 0) = -e0 + e1`: swapping the arguments negates the
  line. The sign carries the orientation from the first point to the second.

## 8. Equality and projective equivalence (D7)

`==` is coefficient equality under the convention tolerance, as in VGA. Two
values that represent the same geometric entity up to a non-zero scalar factor
are *projectively equivalent*; that relation belongs to the interpretation and
is reported through classification (D8) and descriptions, never through `==`.

Worked example: `2 * point(1, 2) = point(2, 4, 2)` has raw coordinates
`w = 2, x = 2, y = 4`, is positioned at `(1, 2)`, and is described as
"point (1, 2), weight 2"; it is not `==` to `point(1, 2)`. Likewise
`-point(-1, 0) = point(1, 0, -1)` is the point `(-1, 0)` with weight `-1`.

## 9. Norms, classification, and normalization (D8)

Two norms are defined for every entity, both non-negative scalars:

| Entity | Euclidean norm | Ideal norm |
| --- | --- | --- |
| Line `a e1 + b e2 + c e0` | `sqrt(a^2 + b^2)` | `abs(c)` |
| Point `w e12 - x e02 + y e01` | `abs(w)` | `sqrt(x^2 + y^2)` |

Classification uses a magnitude-relative tolerance in the sense of ALG-031, with
the same absolute floor and relative term as the VGA convention unless the PGA
specification records a different value:

- A point is *Euclidean* when its Euclidean norm exceeds the tolerance,
  otherwise *ideal* when its ideal norm exceeds the tolerance, otherwise zero.
- A line is *Euclidean* when its Euclidean norm exceeds the tolerance, otherwise
  the *line at infinity* when its ideal norm exceeds the tolerance, otherwise
  zero.

Normalization divides by the Euclidean norm of a Euclidean entity (so that
`abs(w) = 1` or `a^2 + b^2 = 1`) and by the ideal norm of an ideal entity.
The norm is positive, so normalization preserves the sign of the weight and
with it the orientation produced by odd versors (D9). It never
divides by a quantity that the classification has placed below the tolerance,
so no normalization can amplify floating-point leakage into a coordinate.

`norm(X)` in the language is the Euclidean norm and `inorm(X)` the ideal
norm; both are exposed by the PGA definition as scalar-valued capabilities.

## 10. Versors: rotations, translations, reflections (D9)

The sandwich action is the VGA one and applies to every versor, even or odd,
without an implicit grade involution:

```text
V >>> X = V * X * ~V
```

### Even versors

- Rotation by angle `theta` about the origin: `exp(-(theta/2) e12)`, aligned
  with the VGA rule `exp(-(alpha/2) B)`. Worked examples:
  `exp(-(pi/4) e12) >>> e1 = e2` (the VGA reference case holds unchanged) and
  `exp(-(pi/4) e12) >>> point(1, 0) = point(0, 1)`.
- Rotation by `theta` about a Euclidean point `P` normalized to `w = 1`:
  `exp(-(theta/2) P)`. Because `P * P = -1` and the null components cancel,
  the VGA exponential formulas apply verbatim. Worked example:
  `exp(-(pi/2) point(2, 1)) >>> point(3, 1) = point(1, 1)`.
- Translation by `(dx, dy)`:

  ```text
  T(dx, dy) = 1 - (1/2) e0 (dx e1 + dy e2) = 1 - (dx/2) e01 - (dy/2) e02
  ```

  which equals `exp(-(1/2) e0 (dx e1 + dy e2))`. Worked examples:
  `T(3, 0) = 1 - 1.5 e01`, `T(3, 0) >>> point(0, 0) = point(3, 0)`,
  `T(1, 2) >>> point(1, 1) = point(2, 3)`.
- An ideal point used directly as an exponent translates *perpendicular* to
  its direction: `(1 + ipoint(1, 0)) >>> point(0, 0) = point(0, 2)`. This is a
  known PGA property and must be stated in user documentation; the `T`
  constructor exists so that users need not derive it.
- A motor is a product of the above, `M = T * R`, applied as `M >>> X`. Worked
  example: `(T(1, 2) * exp(-(pi/4) e12)) >>> point(1, 0) = point(1, 3)` (rotate
  first, then translate).

### Odd versors

- Reflection in a Euclidean line `L` normalized to `a^2 + b^2 = 1` is
  `L >>> X = L * X * L` (for grade 1, `~L = L`). Worked examples:
  `e1 >>> point(1, 0) = -point(-1, 0)` and
  `line(0, 1, 0) >>> point(0, 1) = -point(0, -1)`.
  The reflected point carries **weight -1**: an odd versor reverses the
  orientation encoded in the weight sign. Under D7 the result is the reflected
  point; descriptions show the weight so the sign is never silently dropped.
  Reflecting a line: `e1 >>> line(1, 1, 0) = e1 - e2`, the line `x - y = 0`.
- Glide reflection: `G = T(d) * L` with `d` parallel to `L`. Worked example:
  `G = T(1, 0) * e2 = e2 - (1/2) e012`, `G * ~G = 1`, and
  `G >>> point(0, 1) = -point(1, -1)`.
- Parity: the even subalgebra `{1, e01, e02, e12}` holds rotations,
  translations, and motors; grades 1 and 3 hold reflections and glide
  reflections. The interpretation classifies a versor by parity and by
  `V * ~V` being `+1` or `-1` under the tolerance; a general even element with
  `V * ~V` not a unit scalar is a multivector, not a motor.

The logarithm of a motor and fractional powers `exp(t * log(M))`, present in
Studio, are deferred to a later milestone; they need the principal-branch
decision recorded separately.

## 11. First milestone scope (D10)

Included:

- evaluation of every operation above, with capability diagnostics for the
  undefined ones (for example `inverse` of a null element);
- visualization of Euclidean points and lines; ideal points drawn as a
  direction marker at the viewport edge; the line at infinity and zero
  entities announced textually only;
- direct manipulation limited to dragging a literal `point(x, y)` (rewriting
  its source exactly as `vector(x, y)` is rewritten in VGA);
- lists of points and lines with the VGA list rules.

Deferred, tracked as issues when the milestone is written: dragging a line,
anchoring, interactive motors, motor logarithm and interpolation, distance and
angle read-outs, and any touch or 3D concern.

## 12. Reference fixtures (D11)

The worked examples of this record are the first fixture set, computed by hand
and by an independent eight-coefficient `Cl(2,0,1)` product implemented for
this review; each is also to be cross-checked against ganja.js
`Algebra(2, 0, 1)` and, when #19 lands, Kingdon. A discrepancy with a
reference library is resolved by a recorded decision, not by silently adopting
the library's sign. The specification, not any backend, is the authority.

Fixture families: incidence (on, off), meet (finite, parallel, coincident),
join (distinct, coincident, swapped), duality (every blade, involution), norms
and classification at and around the tolerance, normalization refusing
epsilon-classified division, rotations about the origin and about a point,
translations, motors, reflections and glide reflections with their weight
signs, projective equivalence versus equality.

## 13. Relation to MultiVector Studio

Studio's `pga201` module uses the same storage order, the same point and line
constructors (`point2D(x, y, w) = w e12 - x e02 + y e01`), and ganja's right
complement as dual. Its documentation table for points (`e12 + x e01 + y e02`)
does not match its code and is not followed. Studio's rotor sign convention is
not adopted; the VGA-aligned `exp(-(theta/2) B)` is.

ganja.js `Vee` returns the negation of the D6 join in `Cl(2,0,1)`; the
reference fixtures compute the join through the explicit dual and record the
difference. This is the first instance of the D11 rule that a library
discrepancy is resolved by the specification.

## 14. Consequences for the architecture

Recorded here so the architecture delta of #98 can be written against them:

- the engine contract must become basis-driven (blade names, grades, and
  coefficient access from declared metadata) instead of the VGA-specific
  signature;
- an algebra registry must resolve `document.algebra` and the interpretation
  and visualizer identifiers to engine, interpretation, and renderer, or fail
  with the ALG-005 diagnostic;
- interpretation must be a boundary with its own entity, description, and
  position contract rather than a direct import of `vga2Interpretation`;
- viewport rendering and manipulation must be organized by primitive
  (oriented segment, oriented area, point marker, unbounded line) outside the
  application shell.

## 15. Review checklist

- [x] D1 identity and plane-based declaration
- [x] D2 basis order and `e02` display
- [x] D3 constructors `point(x, y, w)`, `ipoint`, `line`
- [x] D4–D6 incidence, meet, dual, join
- [x] D7 equality versus projective equivalence
- [x] D8 norms, classification, normalization, `norm` and `inorm`
- [x] D9 versor action, even and odd, weight sign of reflections
- [x] D10 milestone scope
- [x] D11 fixture plan
