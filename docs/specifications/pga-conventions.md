# PGA Convention Version 1

**Status:** Draft for review
**Date:** 2026-09-13
**Convention version:** 1
**Applies to:** PGA geometric dimension 2
**Refines:** PGA-005, PGA-006, ALG-013, and ALG-031
**Decision record:** [PGA(2) Convention Decisions](../architecture/pga-2d-convention-decisions.md)
**License:** MIT

## 1. Purpose and authority

This document defines the mathematical and numerical conventions selected by
`conventionVersion: 1` of the built-in PGA definition. It is normative for every
conforming PGA backend. Backend behavior, including ganja.js behavior, is not
itself normative; the reference fixtures in
`src/algebra/pga2ReferenceFixtures.ts` are derived from this document and the
decision record, not from a backend.

The [VGA convention](vga-conventions.md) is the model for this document. Every
choice that could differ from VGA is aligned with VGA unless a reason is stated.

## 2. Algebra, metric, and canonical basis

PGA(2) is the real Clifford algebra `Cl(2, 0, 1)`, signature `(2, 0, 1)`, with
ordered generators `e0, e1, e2` satisfying

```text
e0 * e0 = 0
e1 * e1 = e2 * e2 = 1
ei * ej = -(ej * ei), when i != j
```

The scalar blade is `e`. Canonical blades are ordered by grade, then
lexicographically by strictly increasing generator index:

```text
e, e0, e1, e2, e01, e02, e12, e012
```

The pseudoscalar named constant `ps` evaluates to `e012`. It is null:
`e012 * e012 = 0`. It is never used as an invertible duality operator.

Source accepts any permutation of a blade's generator indices with the sign of
the permutation, so `e20` denotes `-e02` and `e102` denotes `-e012`. Canonical
inspection and display emit only canonical names.

## 3. Grade operations and involutions

Grade projection `<A>k`, reverse `~A`, grade involution, and Clifford
conjugation are defined exactly as in [VGA convention section 3](vga-conventions.md#3-grade-operations-and-involutions).
In `Cl(2, 0, 1)`:

```text
~eJ = eJ         for grades 0 and 1
~eJ = -eJ        for grades 2 and 3
```

The even subalgebra is spanned by `e, e01, e02, e12`.

## 4. Outer, inner, and contraction products

The outer product, left contraction, and the symmetric grade-difference inner
product `A | B` are defined by the same grade formulas as
[VGA convention section 4](vga-conventions.md#4-outer-inner-and-contraction-products),
applied with the degenerate metric of section 2. Consequently every product
term in which `e0` would be contracted with itself vanishes; in particular

```text
e0 | e0 = 0
(a e1 + b e2 + c e0) | (a e1 + b e2 + c e0) = a*a + b*b
```

The outer product is the *meet* of the plane-based interpretation (section 10).

## 5. Duality and regressive product

Convention-version-one duality is the explicit Hodge complement `J`, defined on
canonical blades by the requirement

```text
eJ ^ J(eJ) = e012
```

which gives

```text
J(e)   = e012     J(e012) = e
J(e0)  = e12      J(e12)  = e0
J(e1)  = -e02     J(e02)  = -e1
J(e2)  = e01      J(e01)  = e2
```

and extends linearly. With three generators `J` is an involution:
`J(J(A)) = A`. The source operations `!A` and `A.dual` evaluate `J(A)`.

`J` is stated directly rather than delegated to a backend operation named
`Dual`. It coincides with the right complement of ganja.js and of MultiVector
Studio for this algebra, but the table above is the authority.

The regressive product uses this duality:

```text
A & B = J((J(A)) ^ (J(B)))
```

It is bilinear. ganja.js `Vee` returns `-(A & B)` in `Cl(2, 0, 1)` and shall
not be used to implement `&`.

## 6. Inverse, division, powers, and sandwich action

Invertibility, division, integer powers, and the sandwich action follow
[VGA convention section 6](vga-conventions.md#6-inverse-division-powers-and-sandwich-action)
verbatim:

```text
A / B   = A * B^-1, only when B is invertible
R >>> A = R * A * ~R
```

Because the metric is degenerate, many non-zero values are not invertible:
every value whose coefficients all lie on blades containing `e0` (for example
`e0`, `e01`, `e012`, and every ideal point) has no inverse. Such a divisor
produces a domain diagnostic and no value; the ideal norm of section 7 is not
used to fabricate one.

The sandwich action applies to every versor, even or odd, with no implicit
grade involution. For a Euclidean line `L` normalized to `L.norm = 1`, `~L = L`
and `L >>> A` is the reflection of `A` in `L`; the weight of a reflected point
is negated. The positive rotation direction follows VGA: for the unit bivector
`e12`,

```text
R = exp(-(alpha/2) * e12)
```

rotates by positive angle `alpha` about the origin under `R >>> A`, and
`exp(-(pi/4) e12) >>> e1 = e2` holds unchanged.

## 7. Norms and normalization

Two norms are defined. Both return a finite, non-negative grade-zero
multivector.

The Euclidean norm `A.norm` is the VGA Clifford norm evaluated in `Cl(2, 0, 1)`:

```text
A.norm = sqrt(abs(<A * cliffordConjugate(A)>0))
```

Because `e0` is null, this norm ignores every coefficient on a blade containing
`e0`. For the entities of section 10 it evaluates to:

```text
(a e1 + b e2 + c e0).norm          = sqrt(a*a + b*b)
(w e12 - x e02 + y e01).norm       = abs(w)
```

The ideal norm `A.inorm` is the Euclidean norm of the complement:

```text
A.inorm = (J(A)).norm
```

so that

```text
(a e1 + b e2 + c e0).inorm         = abs(c)
(w e12 - x e02 + y e01).inorm      = sqrt(x*x + y*y)
```

`inorm` is a PGA capability with its own identifier; it is not advertised by
VGA.

When a normalization service is requested it uses the classification of
section 10: it returns `A / A.norm` for a value classified Euclidean and
`A / A.inorm` for a value classified ideal, in both cases only when that norm
is finite and strictly positive. The divisor is positive, so normalization
preserves the sign of every coefficient, including the weight sign produced by
odd versors. A value classified zero, or whose selected norm is not strictly
positive, is left unchanged and receives an explicit normalization-unavailable
state; it is never divided by a quantity that classification placed below its
tolerance.

## 8. Exponential

The exponential is defined by the series and the closed forms of
[VGA convention section 8](vga-conventions.md#8-exponential). In `Cl(2, 0, 1)`
every bivector `X` has a scalar square `X * X = -w*w`, where `w` is its `e12`
coefficient, so the closed forms apply to every bivector:

```text
exp(X) = cos(q) + (sin(q)/q) * X, when w != 0 and q = abs(w)
exp(X) = 1 + X,                   when w = 0
```

Consequences, each fixed by a reference fixture:

- `exp(-(theta/2) e12)` is the rotation by `theta` about the origin;
- `exp(-(theta/2) P)` for a Euclidean point `P` with `P.norm = 1` is the
  rotation by `theta` about `P`;
- `exp(-(1/2) e0 (dx e1 + dy e2)) = 1 - (dx/2) e01 - (dy/2) e02` is the
  translation by `(dx, dy)`;
- `exp` of an ideal point translates perpendicular to its direction.

The logarithm of a motor and non-integer powers are not part of convention
version 1.

## 9. Constructors

The following constructors are PGA capabilities. Their arguments use the common
scalar boundary and their results are owned values on the canonical basis:

```text
line(a, b, c)   = a e1 + b e2 + c e0
point(x, y, w)  = w e12 - x e02 + y e01
point(x, y)     = point(x, y, 1)
ipoint(x, y)    = point(x, y, 0)
```

`point` takes raw homogeneous coordinates: its Euclidean position, when it has
one, is `(x / w, y / w)`. `ipoint` is exactly `point` with weight zero and
denotes the ideal point in direction `(x, y)`. The geometric meaning of these
values belongs to the plane-based interpretation (section 10); the constructors
themselves are algebraic and available without a visualizer.

## 10. Plane-based interpretation conventions

The standard PGA(2) interpretation (`org.multivector.pga-2d`, version 1,
`model: "plane-based"`) reads grade 1 as lines and grade 2 as points:

| Entity | Storage | Meaning |
| --- | --- | --- |
| Line | `a e1 + b e2 + c e0` | the line `a x + b y + c = 0` when `(a, b) != 0`; the line at infinity when `a = b = 0` and `c != 0` |
| Point | `w e12 - x e02 + y e01` | the point `(x / w, y / w)` when `w != 0`; the ideal point in direction `(x, y)` when `w = 0` |

Incidence, meet, and join follow from sections 4 and 5:

```text
L ^ P   = (a x + b y + c w) e012       P lies on L exactly when this is zero
L1 ^ L2 = the point common to L1 and L2, ideal when the lines are parallel
P1 & P2 = the line through P1 and P2, oriented from P1 to P2
```

Classification uses the tolerance policy of PGA-INT-005 with the Euclidean and
ideal norms of section 7:

- a grade-2 value is a *Euclidean point* when `norm > epsilon`, otherwise an
  *ideal point* when `inorm > epsilon`, otherwise *zero*;
- a grade-1 value is a *Euclidean line* when `norm > epsilon`, otherwise the
  *line at infinity* when `inorm > epsilon`, otherwise *zero*;
- an even value `V` with `V * ~V` equal to `1` or `-1` under the tolerance is
  a *motor* (a *rotor* when its `e01` and `e02` coefficients are within the
  tolerance of zero, a *translator* when its `e12` coefficient is); an odd
  value with the same property is a *reflection*; any other value is a
  *multivector*.

Two values that differ by a non-zero scalar factor denote the same geometric
entity. This projective equivalence is reported by the interpretation, which
describes a point by its position and its weight; it is never the meaning of
`==`, which remains coefficient equality under the numerical policy.

## 11. Owned values and canonical inspection

Identical to [VGA convention section 9](vga-conventions.md#9-owned-values-and-canonical-inspection),
over the eight canonical blades of section 2.

## 12. Numerical policy

Identical to [VGA convention section 10](vga-conventions.md#10-numerical-policy):
algebraically exact decisions use owned coefficients; fixture comparison uses
`absoluteFloor = relativeTerm = 64 * Number.EPSILON`. The classification
tolerance of section 10 is an interpretation policy and never alters owned
coefficients.

## 13. Minimum independent reference fixtures

`src/algebra/pga2ReferenceFixtures.ts` holds the convention-version-one
fixtures. They cover:

- generator squares, anti-commutation, and the null pseudoscalar;
- every basis-blade dual, the involution `J(J(A)) = A`, and `eJ ^ J(eJ) = e012`;
- incidence on and off a line, including a weighted point;
- meets of intersecting, parallel, and coincident lines;
- joins of distinct, coincident, and swapped points, and of a point with an
  ideal point;
- the reference rotation `exp(-(pi/4) e12) >>> e1 = e2`, rotation of a point,
  rotation about a point, translators, a motor product and its action, and the
  perpendicular translation of an ideal exponent;
- reflections of a point and of a line, a glide reflection and its unit norm,
  with the negated weight of reflected points;
- Euclidean and ideal norms, classification, sign-preserving normalization,
  and position read-back, including a negative weight.

Every PGA backend shall pass them. A backend's own output, including ganja.js
output, is never their reference.
