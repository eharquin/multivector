# PGA(2) Motor Logarithm and Square Root Decisions

**Status:** Proposed 2026-09-14
**Issue:** #162
**Date:** 2026-09-14
**Decision owner:** Algebra-definition and interpretation architecture
**Extends:** [PGA(2) convention decisions](pga-2d-convention-decisions.md) (D1–D11)

## 1. Purpose

The PGA(2) convention deferred the logarithm of a motor and fractional powers
because they need a principal-branch decision
([convention §8](../specifications/pga-conventions.md#8-exponential),
[decision record §10](pga-2d-convention-decisions.md#10-versors-rotations-translations-reflections-d9)).
This record fixes that branch, the square root, the interpolation form, the
degenerate cases, and the numerical bounds before implementation. It is
non-normative: the accepted decisions become an amendment of the PGA convention
specification and new PGA requirements. Every formula is accompanied by a
worked example computed by hand and cross-checked against the current engine's
`exp` and products; those examples seed the reference fixtures.

## 2. The even subalgebra of `Cl(2,0,1)` (D12)

Every even element is

```text
M = s + B,   B = w e12 + u e01 + v e02,   B * B = -w*w
```

because `e12 * e12 = -1`, `e01` and `e02` square to zero, and the cross
products cancel (`e12 e01 + e01 e12 = -e02 + e02 = 0`, likewise for `e02`).
Hence `M * ~M = s*s + w*w`, and a _unit motor_ is an even element with

```text
s*s + w*w = 1
```

within the numeric comparison bound of D16. The exponential of convention §8
maps bivectors onto unit motors:

```text
exp(B) = cos(w) + (sin(w)/w) B    (w != 0)
exp(B) = 1 + B                    (w = 0)
```

`log` and `sqrt` are defined on unit motors only. A non-unit even element
(`s*s + w*w != 1`), an odd element, or a mixed multivector receives a
capability diagnostic (D16); the user normalizes with `M / M.norm`, whose
norm is `sqrt(s*s + w*w)` under convention §7. This mirrors `exp`, which
also refuses `scalar + bivector` arguments instead of splitting them.

## 3. Principal logarithm (D13)

For a unit motor `M = s + B`, with

```text
theta = atan2(w, s)   in (-pi, pi]
```

the principal logarithm is the bivector

```text
log(M) = (theta / w) * B        when w != 0
log(M) = B                      when w = 0 and s = 1     (translator, exact)
log(M)   undefined              when w = 0 and s = -1    (branch cut, D16)
```

Derivation: `exp(lambda B) = cos(lambda w) + (sin(lambda w)/w) B`, so
`exp(lambda B) = M` requires `cos(lambda w) = s` and `sin(lambda w) = w`,
that is `lambda w = theta`. The translator case is the `w -> 0` limit
(`theta / w -> 1`) and is exact because the series terminates.

Consequences, each a fixture:

- `log(exp(-(alpha/2) e12)) = -(alpha/2) e12` for `alpha` in `(-2 pi, 2 pi)`:
  the logarithm of a rotor is its half-angle generator, in the sign convention
  of D9. Worked example: `log(exp(-(pi/4) e12)) = -(pi/4) e12`.
- For a rotation about a unit Euclidean point `P`, `log(exp(-(alpha/2) P)) =
-(alpha/2) P`: **the logarithm of a rotation motor is its centre, weighted
  by the half-angle**. Worked example: `R = exp(-(pi/2) point(2, 1)) =
-point(2, 1) = -e01 + 2 e02 - e12`; `s = 0`, `w = -1`, `theta = -pi/2`,
  `log(R) = (pi/2) B = -(pi/2) point(2, 1)`, reported as
  `Point at (2, 1), weight -1.5708`.
- For a translator `T(dx, dy) = 1 - (dx/2) e01 - (dy/2) e02`,
  `log(T) = -(dx/2) e01 - (dy/2) e02 = ipoint(dy/2, -dx/2)`: an ideal point
  perpendicular to the translation, as convention §8 already states for the
  exponential. Worked example: `log(1 - 1.5 e01) = -1.5 e01 = ipoint(0, -1.5)`.
- For a general motor the logarithm identifies the motion: `M = T(1, 2) *
exp(-(pi/4) e12) = 0.70711 - 1.06066 e01 - 0.35355 e02 - 0.70711 e12` (the
  D9 worked example) has `theta = -pi/4` and `log(M) = -(pi/4) (e12 + 1.5 e01
  - 0.5 e02) = -(pi/4) point(-0.5, 1.5)`: `M`is the rotation by`pi/2`about`(-0.5, 1.5)`, which the direct computation confirms (`c - rot(c) = (1, 2)`for`c = (-0.5, 1.5)`).
- The branch is the principal one of the group, not of the rotation angle:
  `-R` and `R` are distinct motors with distinct logarithms. `exp(1.5 pi e12)
= -e12` has `theta = -pi/2` and `log = -(pi/2) e12`, not `1.5 pi e12`;
  `exp(2 pi e12) = 1` has `log = 0`.
- `log(exp(X)) = X` exactly when `abs(w) < pi`, including every translator.

The scalar branch of `log` keeps the language §10 semantics: a pure scalar
`k > 0` gives `log(k)`; `k <= 0` is the §10 domain diagnostic. The two
branches agree at `M = 1` (`log = 0`) and at `M = -1` (both refuse).

## 4. Square root (D14)

For a unit motor `M = s + B` with `s != -1`:

```text
sqrt(M) = (1 + M) / sqrt(2 (1 + s))
```

Proof: `(1 + M)^2 = 1 + 2M + M^2 = 1 + 2M + (s*s - w*w) + 2 s B = 2 (1 + s) M`
using `1 - w*w = s*s`. The result is the unit motor `exp(log(M) / 2)` of the
principal branch (its scalar part `(1 + s) / sqrt(2 (1 + s)) > 0` selects
`theta / 2` in `(-pi/2, pi/2)`), computed without the logarithm's transcendental
round trip. Worked examples:

- `sqrt(exp(-(pi/4) e12)) = (1.70711 - 0.70711 e12) / 1.84776 = 0.92388 -
0.38268 e12 = exp(-(pi/8) e12)`;
- `sqrt(1 - 1.5 e01) = 1 - 0.75 e01`, half the translation;
- `sqrt(-point(2, 1)) = (1 - point(2, 1)) / sqrt(2) = exp(-(pi/4) point(2, 1))`,
  the rotation by `pi/2` about `(2, 1)`;
- `sqrt(M)` for the D9 motor above is `0.92388 - 0.57403 e01 - 0.19134 e02 -
0.38268 e12 = exp(-(pi/8) point(-0.5, 1.5))`, the rotation by `pi/4` about
  the same centre.

`sqrt(M) * sqrt(M) = M` is a fixture identity. The scalar branch keeps §10
(`sqrt(4) = 2`, `sqrt(-1)` is a domain diagnostic); at `M = -1` the motor and
scalar branches both refuse. The square root of an odd versor (a reflection)
is not an element of the algebra (an even or odd square is even) and receives
the capability diagnostic.

## 5. Interpolation and powers (D15)

The interpolation form is the existing `exp(t * log(M))`; no new operation is
required. For `t` in `[0, 1]` it moves continuously from the identity to `M`
along the principal geodesic: a rotation sweeps its angle about the fixed
centre, a translation its vector. Fixtures: `exp(0.5 * log(M)) = sqrt(M)`,
`exp(1 * log(M)) = M`, `exp(2 * log(M)) = M * M`.

Non-integer `M ** t` stays outside this record; language §8 reserves it and
`exp(t * log(M))` is the explicit, teachable form. A later language decision
may define `M ** t = exp(t * log(M))` for unit motors without changing this
convention.

## 6. Diagnostics and numerical bounds (D16)

The engine decides with the convention-version numeric comparison bound
already used by the tangent pole rule and by ALG-031:

```text
bound = 64 * Number.EPSILON * max(1, scale)
scale = max(abs(coefficient)) over the argument
```

- **Unit test:** `abs(s*s + w*w - 1) <= bound` and every odd coefficient
  (`e0, e1, e2, e012`) exactly zero; otherwise `ALG_UNSUPPORTED_DOMAIN`
  "`log` requires a unit motor (an even element with `M * ~M = 1`); divide by
  `M.norm`" (same for `sqrt`). Exact zero for the odd grades follows the
  engine rule that grade membership is exact (PGA-INT-005); products of
  motors never leak odd coefficients.
- **Branch cut:** `1 + s <= bound` is the cut (`M = -1`, `M = -T`, or a
  rotation by `2 pi` composed with anything): `ALG_UNSUPPORTED_DOMAIN`
  "`log` has no principal value at the branch cut `M = -1`". The same bound
  guards the division in `sqrt`.
- **Translator limit:** `abs(w) <= bound` selects the `w = 0` branch, so a
  motor whose `e12` coefficient is floating-point noise is treated as the
  translator it is; the two branches are continuous there (`theta / w -> 1`).
- The bound governs the choice of branch only; coefficients of the result are
  owned values computed from the argument, never rounded to it, and the
  interpretation's classification tolerance (PGA-INT-005) is not involved.

The scalar-only §10 branches are selected first when every non-scalar
coefficient is exactly zero.

## 7. Versioning (D17)

`log` and `sqrt` of a motor are added to **PGA convention version 1** as an
amendment, not as a convention version 2:

- no released document carries a PGA convention: PGA(2) is entirely in the
  unreleased section of the changelog, so no stored result changes meaning;
- the addition changes the interpretation of no previously valid source: every
  source it gives a value to was an unsupported-function diagnostic before;
- ALG-025 reserves a convention version bump for changes to scientific choices
  that alter results, and a second version would force every PGA document to
  opt in through a switch the application does not offer.

The convention specification records the amendment in its version history and
§8 replaces "not part of convention version 1" by the definitions above. The
first change to a _released_ PGA convention will bump the version.

## 8. Reference fixtures (D18)

Computed by hand in this record and cross-checked with the engine's `exp` and
products (`(1 - 0.5 e01 - e02) * exp(-(pi/4) e12)` reproduces the D9 motor
coefficient by coefficient):

| Family                 | Cases                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rotor about the origin | `log(exp(-(pi/4) e12)) = -(pi/4) e12`; `sqrt` equals `exp(-(pi/8) e12)`; `exp(-(3 pi/4) e12)` (negative scalar part, `theta = -3 pi/4`)               |
| Rotation about a point | `R = exp(-(pi/2) point(2, 1))`: `log(R) = -(pi/2) point(2, 1)`, `sqrt(R) = exp(-(pi/4) point(2, 1))`                                                  |
| Translator             | `log(1 - 1.5 e01) = -1.5 e01`, `sqrt(1 - 1.5 e01) = 1 - 0.75 e01`, `exp(log(T)) = T` exactly                                                          |
| General motor          | the D9 motor: `log(M) = -(pi/4) point(-0.5, 1.5)`, `sqrt(M) = exp(-(pi/8) point(-0.5, 1.5))`                                                          |
| Identities             | `exp(log(M)) = M`, `sqrt(M) * sqrt(M) = M`, `exp(0.5 log(M)) = sqrt(M)`, `exp(2 log(M)) = M * M`, `log(exp(X)) = X` for `abs(w) < pi`                 |
| Principal branch       | `log(exp(1.5 pi e12)) = -(pi/2) e12`, `log(exp(2 pi e12)) = 0`, `log(-R) != -log(R)`                                                                  |
| Scalar branches        | `log(exp(2)) = 2`, `sqrt(4) = 2`, `log(0)`, `log(-1)`, `sqrt(-1)` refused                                                                             |
| Diagnostics            | `log(-1)`, `sqrt(-1)`, `log(-(1 - 1.5 e01))`, `log(2 * exp(-(pi/4) e12))`, `log(e1)`, `sqrt(line(1, 0, -1))`, `log(1 + e1)`, `log(e01)` (`s = w = 0`) |
| Bounds                 | a motor built by `T * R` products passes the unit test; `1 + s` just above the bound succeeds and just below refuses                                  |

Every fixture is also to be cross-checked against ganja.js `Algebra(2, 0, 1)`
`Log` and `Exp`; a discrepancy is resolved by this record (D11 rule).

## 9. Relation to MultiVector Studio

Studio evaluates `log` through ganja's `Log` and `sqrt` through
`exp(log(M) / 2)` after flipping the sign of a motor with a negative scalar
part. Neither the branch nor the sign flip is documented there. This record
does not flip signs: `-R` is a legitimate motor whose logarithm lives on the
other half of the group, and hiding that would make `exp(log(M)) = M` false.
The closed-form `sqrt` avoids the `log`/`exp` round trip Studio uses.

## 10. Consequences for the implementation

- `pgaEngine.functions` registers `log` and `sqrt` with arity 1; the language
  §10 scalar functions of the same names dispatch to the engine when the
  argument is not scalar (the lowering keeps `scalar-function` for scalar
  arguments and the engine owns the motor branches). Capability identifiers
  `org.multivector.capability.motor-logarithm` and
  `org.multivector.capability.motor-square-root`, absent from VGA so that
  `log(e12)` under VGA keeps the scalar-only diagnostic of §10.
- No interpretation or visualizer change: the logarithm is a grade-2 value,
  drawn as a Euclidean or ideal point by PGA-VIZ-001/002, and its description
  shows the weight (the half-angle) by PGA-INT-004.
- New requirements PGA-013 (logarithm), PGA-014 (square root), and the
  amended convention §8; the PGA example gains an interpolation walkthrough
  and the showcase two rows (`H = sqrt(M)`, `S = exp(t * log(M)) >>> P`).

## 11. Review checklist

- [ ] D12 domain: unit motors only, `M / M.norm` for the rest
- [ ] D13 principal logarithm `theta = atan2(w, s)`, centre weighted by the half-angle
- [ ] D14 closed-form square root `(1 + M) / sqrt(2 (1 + s))`
- [ ] D15 interpolation `exp(t * log(M))`, no fractional power
- [ ] D16 bound, branch cut, translator limit, diagnostics
- [ ] D17 amendment of convention version 1 rather than a version 2
- [ ] D18 fixture plan
