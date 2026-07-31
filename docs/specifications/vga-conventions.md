# VGA Convention Version 1

**Status:** Draft for review
**Date:** 2026-07-28
**Convention version:** 1
**Applies to:** VGA dimensions 1 through 3
**Refines:** VGA-005, VGA-006, ALG-013, and ALG-031
**License:** MIT

## 1. Purpose and authority

This document defines the mathematical and numerical conventions selected by
`conventionVersion: 1` of the built-in VGA definition. It is normative for every
conforming VGA backend. Backend behavior, including ganja.js behavior, is not
itself normative.

MultiVector Studio supplied behavioral evidence for these conventions. The
formulas below are the authority when Studio code, Studio documentation, a
backend, or another library differs.

## 2. Algebra, metric, and canonical basis

VGA(n) is the real Clifford algebra `Cl(n, 0, 0)` for the activated dimensions
`n = 1, 2, 3`. Its ordered generators are `e1, ..., en` and satisfy

```text
ei * ei = 1
ei * ej = -(ej * ei), when i != j
```

The scalar blade is `e`. A canonical non-scalar blade is written `eJ`, where
`J = (j1, ..., jk)` is a strictly increasing sequence of generator indices.
The empty sequence denotes the scalar blade. The grade of `eJ` is `k`.

Canonical blades are ordered first by grade and then lexicographically by their
index sequences:

```text
VGA(1): e, e1
VGA(2): e, e1, e2, e12
VGA(3): e, e1, e2, e3, e12, e13, e23, e123
```

For canonical blades `eJ` and `eK`, the geometric product is obtained by
concatenating `J` and `K`, swapping generator indices until they are increasing,
applying one minus sign per swap, and deleting each adjacent repeated pair
`ei * ei`. This rule, extended bilinearly, defines the geometric product for all
multivectors.

The canonical pseudoscalar is

```text
I = ps = e1 * e2 * ... * en
```

and fixes the positive orientation. In convention version 1,
`I * I = (-1)^(n(n-1)/2)`.

## 3. Grade operations and involutions

`<A>k` denotes grade-`k` projection. Projection onto a grade absent from the
active dimension is zero.

The reverse is defined on a grade-`k` blade by

```text
~eJ = (-1)^(k(k-1)/2) eJ
```

and extended linearly. The grade involution and Clifford conjugate, used in the
norm definition below, are

```text
gradeInvolution(eJ) = (-1)^k eJ
cliffordConjugate(eJ) = (-1)^(k(k+1)/2) eJ
```

They are owned algebra operations. The initial source language exposes reverse
through `~A` and `A.reverse`, and grade involution through `A.involution`;
Clifford conjugation remains internal to algebra capabilities that require it.

## 4. Outer, inner, and contraction products

For homogeneous `Ar = <A>r` and `Bs = <B>s`, the outer product and left
contraction are

```text
Ar ^ Bs  = <Ar * Bs>(r+s)
Ar << Bs = <Ar * Bs>(s-r), when r <= s
Ar << Bs = 0,              when r > s
```

Both operations extend bilinearly over mixed-grade multivectors.

The convention-version-one inner product `A | B` is the symmetric
grade-difference product. For homogeneous operands,

```text
Ar | Bs = <Ar * Bs>|r-s|
```

and it extends bilinearly. Consequently, for vectors,

```text
u | v = sum(ui * vi)
```

This definition intentionally distinguishes `|` from the left contraction
`<<`. It matches the `Dot` and `LDot` distinction exercised by MultiVector
Studio.

## 5. Duality and regressive product

Convention-version-one duality is right multiplication by the canonical
pseudoscalar:

```text
!A = A * I
```

This is the duality used by MultiVector Studio and is deliberately stated
directly rather than delegated to a backend's operation named `Dual`.

Examples include:

```text
VGA(1): !e = e1, !e1 = e

VGA(2): !e = e12, !e1 = e2, !e2 = -e1, !e12 = -e

VGA(3): !e = e123, !e1 = e23, !e2 = -e13, !e3 = e12
        !e12 = -e3, !e13 = e2, !e23 = -e1, !e123 = -e
```

The regressive product uses this same duality:

```text
A & B = !((!A) ^ (!B))
```

It is bilinear and defined in every activated VGA dimension. For example,
`e1 & e2 = -e` in VGA(2), and `e12 & e23 = -e2` in VGA(3).

## 6. Inverse, division, powers, and sandwich action

A multivector `B` is invertible exactly when there exists a unique multivector
`B^-1` satisfying

```text
B * B^-1 = B^-1 * B = 1
```

The source operation `A / B` is `A * B^-1`. A non-invertible divisor produces a
domain diagnostic and no value. It shall not produce infinities, `NaN`, a
pseudoinverse, or a tolerance-selected substitute.

Integer powers use the geometric product:

```text
A**0  = 1
A**n  = A * ... * A, n times, when n > 0
A**-n = (A^-1)**n, when n > 0 and A is invertible
```

The sandwich action is

```text
R >>> A = R * A * ~R
```

It does not implicitly normalize `R` or replace `~R` with `R^-1`. For a unit
bivector `B` describing an oriented Euclidean plane,

```text
R = exp(-(alpha/2) * B)
```

rotates vectors by positive angle `alpha` in that oriented plane under
`R >>> A`. In particular, `exp(-(pi/4)e12) >>> e1 = e2`.

## 7. Norm, absolute value, and normalization

The primary VGA norm reproduces the non-degenerate VGA behavior validated in
MultiVector Studio:

```text
A.norm = sqrt(abs(<A * cliffordConjugate(A)>0))
```

It returns a finite, non-negative grade-zero multivector when its intermediate
operations remain finite. This Clifford norm need not be positive definite over
arbitrary mixed-grade multivectors: a non-zero multivector may have norm zero.
No `inorm` capability is advertised for VGA.

`abs(a)` is the ordinary absolute value when `a` is a scalar. Convention version
1 does not define `abs(A)` as an alias for `A.norm` when `A` is non-scalar.

When a normalization service is requested, it returns `A / A.norm` only when
`A.norm` is finite and strictly positive. A zero-norm value is left unchanged
and receives an explicit normalization-unavailable state; it is not divided by
an epsilon.

## 8. Exponential

Scalar `exp` uses the common scalar function. Mathematically, the VGA
multivector exponential is the power-series exponential under the geometric
product:

```text
exp(A) = sum(A**k / k!), k = 0 through infinity
```

An implementation may advertise a bounded exponential capability rather than
the general series, provided unsupported inputs receive a capability or domain
diagnostic. The initial VGA(2) profile supports finite `X` when `X` is scalar or
when `X**2 = s` is exactly scalar. It uses the following closed forms:

```text
exp(X) = cos(q)  + (sin(q)/q)  * X, when s < 0 and q = sqrt(-s)
exp(X) = 1 + X,                         when s = 0
exp(X) = cosh(q) + (sinh(q)/q) * X, when s > 0 and q = sqrt(s)
```

Consequently, for finite scalar `a` and an `M` satisfying one of the stated
unit or nilpotent square conditions, these specialize to
`cos(a) + sin(a)M` when `M**2 = -1`, `cosh(a) + sinh(a)M` when
`M**2 = 1`, and `1 + aM` when `M**2 = 0`. Whether `X**2` is scalar is an exact
algebraic decision; numerical tolerances apply only when comparing analytical
fixtures involving transcendental results.

## 9. Owned values and canonical inspection

An owned VGA value associates one finite IEEE 754 binary64 coefficient with each
stored canonical blade. Absent coefficients are exactly zero. Backend storage
order is not observable and need not be dense.

Canonical textual inspection:

- orders non-zero terms by the canonical blade order from section 2;
- omits coefficients that are exactly zero;
- emits the scalar term without a blade suffix;
- emits canonical increasing blade names;
- uses the common shortest round-tripping binary64 number format;
- emits zero as `0`;
- never exposes backend array indices, classes, or serialization.

Display precision may produce a shorter presentation, but it is not canonical
inspection and does not alter the owned value.

## 10. Numerical policy

Algebraically exact decisions use owned coefficients, not display tolerances.
In particular, grade membership, scalar boundaries, zero coefficients, and
canonical term omission use exact binary64 zero.

Reference fixtures that involve only basis values, integers, signs, grade
operations, and products shall compare exactly. Fixtures involving
transcendental functions or accumulated floating-point operations compare
coefficients using

```text
abs(actual - expected)
  <= absoluteFloor + relativeTerm * max(abs(actual), abs(expected))

absoluteFloor = 64 * Number.EPSILON
relativeTerm  = 64 * Number.EPSILON
```

For binary64, `Number.EPSILON` is `2^-52`. This comparison tolerance is a test
and diagnostic convention only. It shall not erase coefficients, alter grades,
make a value scalar, make a divisor invertible, or change serialization.

An operation whose conditioning requires a wider bound shall define that bound
in its conformance fixture together with a mathematical error analysis. A
backend-specific storage tolerance, such as MultiVector Studio's Float32
classification threshold, is not part of convention version 1.

## 11. Minimum independent reference fixtures

Each activated dimension shall include independent fixtures for:

- generator squares and pairwise anti-commutation;
- canonical blade order and permuted-blade signs;
- pseudoscalar value and square;
- geometric, outer, inner, left-contraction, and regressive products;
- reverse and every basis-blade dual;
- grade projection and coefficient access;
- positive, negative, and zero integer powers;
- invertible and non-invertible division cases;
- primary norm, including a non-zero mixed value with zero norm when available;
- the positive rotor direction fixed in section 6;
- canonical inspection and dimension-change round trips.

The ganja.js adapter shall pass these fixtures, but ganja.js output shall not be
their sole reference.
