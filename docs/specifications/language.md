# MultiVector Expression Language

**Status:** Draft for review
**Date:** 2026-07-27
**Initial scope:** VGA core
**License:** MIT

## 1. Purpose and authority

This document specifies the normative source language required by the initial
VGA core. Examples from MultiVector Studio are behavioral references only;
where Studio differs from this document, this document takes precedence.

A document stores source text and `languageVersion`. Tokens and abstract syntax
trees are derived data, are rebuilt on load and dimension changes, and are not
serialized as authoritative document content.

## 2. Semantic values

Every numeric language value is a multivector, including scalars and zero. This
semantic rule does not require dense storage: implementations may use optimized
zero, scalar, sparse, or dense representations behind one owned multivector
abstraction.

Lists are first-class ordered collections of multivectors. Nested lists are not
supported in the initial language scope.

Operations such as list indexing, range generation, slider configuration, and
animation that require a real or integer number accept only a pure grade-zero
multivector and extract its scalar coefficient at that boundary.

A value is a scalar exactly when every non-scalar coefficient is zero according
to exact owned-value semantics. Display tolerances do not make a multivector
scalar. A scalar boundary additionally validates finiteness and, where required,
integrality before the operation begins; it never rounds or truncates.

## 3. Items, names, and annotations

Each item contains at most one declaration, expression, or annotation.

```text
a = 1
V = vector(a)
V + e1
# A visible annotation
```

Names match `[A-Za-z_][A-Za-z0-9_]*`, are case-sensitive, and shall be unique
within a document. Reserved language names, constants, and basis blades cannot
be redefined. An unnamed expression is evaluated and may be visualized but
cannot be referenced by another expression.

Item identity is independent of its visible name. Renaming an item does not
rename its references in the initial scope.

An item whose first non-whitespace character is `#` is an annotation. It has no
value and no dependencies. Inline trailing comments are not supported.

## 4. Numeric literals and implicit multiplication

The language accepts decimal literals and scientific notation with an explicit
exponent sign:

```text
0        42       3.14       .5       5.
1e-3     2.5E+4
```

The unary signs `+` and `-` are operators, not parts of a literal. `NaN`,
infinities, hexadecimal and binary literals, and numeric `_` separators are not
supported. A literal shall evaluate to a finite IEEE 754 number. Negative zero
is normalized to zero when source is rewritten or a document is serialized.

An unsigned `e` suffix is not scientific notation because it denotes implicit
multiplication by a basis blade:

```text
5e1   == 5 * e1
5e12  == 5 * e12
5e+1  == 50
5e-1  == 0.5
```

Implicit multiplication is allowed between a number and a following blade,
constant, identifier, or parenthesized expression, including `2pi` and
`3(a+b)`. It is not allowed between two numbers or between two identifiers.

`pi` and `tau` are predefined grade-zero constants.

## 5. Basis blades and grades

`e` names the scalar blade. Generator indices are definition- and
dimension-dependent. The initial compact syntax supports source-level indices
`0` through `9`. A blade using a generator unavailable in the active algebra
definition is an error.

Compact blade names concatenate single-digit generator indices:

```text
e12  == e1 * e2
e139 == e1 * e3 * e9
```

Multi-digit generator indices are not supported by language version 1. The
character sequence `e{` is lexically reserved through the matching `}` for a
future explicit blade syntax. In version 1 it always produces the dedicated
`LANG_RESERVED_BLADE_SYNTAX` diagnostic and shall not be tokenized as an
identifier followed by another construct. Reserving it does not commit a later
version to accepting it.

Permuted blade names are valid and carry the sign of their permutation:

```text
e21 == -e12
```

Repeated generator indices such as `e11` are errors rather than implicit zero.
Source preserves the spelling entered by the user, while display and canonical
multivector serialization use canonical increasing index order.

Coefficient extraction returns a grade-zero multivector. A valid but absent
coefficient returns zero:

```text
A = 4 + 7e1
A.e  == 4
A.e1 == 7
```

Grade projection returns a multivector and is defined for every non-negative
integer grade. A grade absent from the active algebra returns zero:

```text
G = 1 + e1 + 7e2 + 8e12
G.g0 == 1
G.g1 == e1 + 7e2
G.g2 == 8e12
```

Thus `A.g2` in VGA 1D is zero, while `A.e12` is an error because `e12` is not an
available blade in that configuration. Coefficient extraction and grade
projection distribute over lists.

## 6. Vectors and tuples

Constructor and tuple forms are equivalent vector syntax:

```text
vector(1)       == (1,)
vector(1, 2)    == (1, 2)
vector(1, 2, 3) == (1, 2, 3)
```

`(1)` is a parenthesized scalar; the trailing comma makes `(1,)` a vector.
`vector()` and an empty tuple are invalid. Components are scalar expressions.
Missing components are zero-filled in higher dimensions. Excess components and
their sources remain stored but inactive in lower dimensions.

Tuple versus constructor spelling and all component source spans remain
available to language-aware editing services; source rewriting behavior is
defined by the common design requirements.

## 7. Operators

The initial language provides:

| Syntax | Operation |
| --- | --- |
| `A + B`, `A - B` | addition and subtraction |
| `A * B` | geometric product |
| `A / B` | `A * inverse(B)` when the inverse exists |
| `A ^ B` | outer product |
| `A & B` | regressive product when defined |
| `A \| B` | inner product defined by the active convention |
| `A << B` | left contraction |
| `R >>> A` | sandwich action |
| `-A`, `+A` | unary sign |
| `~A` | reverse |
| `!A` | dual when defined |
| `A**n` | geometric integer power |
| `A.inverse` | inverse when it exists |
| `A.e1` | blade coefficient |
| `A.g1` | grade projection |
| `L[i]` | list indexing |

`A**0` is scalar one and `A**-1` is the inverse. A multivector exponent shall be
a finite integer scalar. The Studio-only `A^-1` spelling and the `§` commutator
operator are not part of the initial language.

Unsupported or undefined operations produce structured diagnostics and never a
silent `null` or approximate substitute.

## 8. Precedence and associativity

From strongest to weakest, precedence is:

1. primaries, function calls, indexing, and property postfixes;
2. power `**`;
3. unary `!`, `~`, `-`, and `+`;
4. `^`, `&`, `|`, and `<<`;
5. `*` and `/`;
6. `>>>`;
7. `+` and `-`.

Power is right-associative. Other binary operators are left-associative within
their level. Consequently:

```text
A * B ^ C   == A * (B ^ C)
R >>> A + B == (R >>> A) + B
```

Parentheses may always make grouping explicit.

## 9. Built-in functions and norms

The initial VGA core provides `abs`, `sqrt`, `exp`, `log`, `sin`, `cos`, `tan`,
`asin`,
`acos`, and `atan`. Scalar-only functions require a pure grade-zero argument
unless an algebra capability explicitly defines their multivector extension.
In particular, an algebra may expose a multivector exponential through `exp`.
Factorial is not part of the initial language.

`A.norm` denotes the primary norm defined by the active algebra's versioned
conventions. `A.inorm` is available only for an algebra that explicitly defines
an ideal norm. Norm-bar syntax is not part of language version 1, avoiding
ambiguity with the infix `|` inner product. The evaluator shall not select a
different norm using a visual or geometric-classification heuristic. An
undefined norm produces a diagnostic.

Numerical tolerances are owned and tested by MultiVector, recorded through
`conventionVersion`, and used only where numerical decisions require them. They
do not redefine the mathematical operation. Precision and tolerance formulas,
including magnitude-relative terms where noise scales with magnitude, are
governed by ALG-031 in the
[algebra definition requirements](../requirements/algebras/algebra-definition.md).

## 10. Lists, broadcasting, and indexing

`[]` is a valid empty list. A list literal is `[expression, ...]`; a trailing
comma is allowed, but elisions such as `[a,,b]` are not. Lists may contain
expressions but not lists. Elements evaluate left to right for deterministic
diagnostic ordering, without observable side effects. Supported unary
operations, scalar functions, and postfix extractors distribute over lists and
preserve length and order. A function or operator not advertised as
distributive rejects a list argument.

Binary operations follow these rules:

1. one list and one value: broadcast the value;
2. equal-length lists: combine elementwise;
3. a singleton and a longer list: broadcast the singleton;
4. unequal non-singleton lengths: error;
5. a value and `[]`, or `[]` and `[]`: return `[]`;
6. `[]` and a non-empty list: incompatible-length error.

Broadcasting applies once per operator node; it does not recursively reshape
values and never pads or truncates. For two singleton lists, the result has one
element. A list literal gives each element a stable derived identity based on
the owning item and element source span; a range gives each element a stable
derived identity based on the range expression and integer ordinal. Elementwise
operations derive result identities from the operator node and participating
element identities. Reevaluation that preserves those inputs preserves result
identity.

An element failure fails the complete expression, produces no partial list, and
identifies the zero-based element index and failing operand. Distributed results
retain each source element's identity and order. Evaluated-item records preserve
associated positions across list operations under the
[document format specification](document-format.md); position is not part of a
multivector or list value. Any operation that would create a nested list fails
in the initial scope.

`L[i]` requires a list and a finite, non-negative integer scalar index. Negative,
fractional, and out-of-range indices are errors. Indexing is zero-based and
returns the selected multivector, not a singleton list. Its evaluated-item record
retains the element identity and associated position without adding either to
the multivector. Indexing a non-list is a type error. Slices and
negative-from-end indexing are not supported in the initial scope.

## 11. Ranges

`[start...end]` and `[start, next...end]` create arithmetic integer sequences.
The two-term form has step `+1` when `start <= end` and `-1` otherwise. The
three-term form has step `next-start`. All terms are evaluated once and shall be
finite integer scalars. The start is always included. The end is included only
when an integer number of steps reaches it; for example `[1,3...6]` is
`[1,3,5]`.

In the three-term form, a zero step or a step directed away from the end is an
error. Equal start and end produce a singleton regardless of the supplied
non-zero next term. Cardinality is calculated and checked before allocation. A
range that would generate more than 10,000 elements fails without producing a
truncated result.

## 12. Position and head

This section owns the source-language meaning of `position` and `head`. The
serialized fields, enablement, dependency nodes, cycle behavior, and
record-level propagation are owned by the
[document format specification](document-format.md).

An item's position source is stored separately from its mathematical source and
is edited in the appearance panel. It uses this language and the shared
dependency graph and shall evaluate to a VGA vector in the active dimension.
Top-level property assignments are not language syntax.

For a visualized VGA vector, `V.position` returns its position vector in the
active dimension and `V.head` follows the formula owned by VGA-POS-003 in the
[VGA requirements](../requirements/algebras/vga.md).

There is no `V.value` property. A missing position defaults to the origin
without a diagnostic. An invalid position produces a diagnostic and also
defaults to the origin without altering `V`.

For a list of positioned vectors, `L.position` and `L.head` distribute over the
evaluated element records. Source associations and positions survive distributed
operations without becoming fields of the mathematical list or multivectors.

## 13. Dependencies and failures

Names form an explicit dependency graph. Missing names, duplicate names, cycles,
syntax failures, domain failures, unsupported capabilities, upstream failures,
and internal failures are distinct diagnostics.

An invalid expression produces no value. Independent branches continue to
evaluate. All duplicate definitions are invalid and their users report an
ambiguous reference. Every member of a cycle reports the cycle; downstream
items report an upstream failure. No last-known-good result remains visible
silently. Correcting the cause automatically reevaluates dependants.

## 14. Versioning and future syntax

`languageVersion` is a positive integer. An incompatible syntax or semantic
change increments it. A strictly compatible addition may retain the version only
when it changes the interpretation of no previously valid source. Loading and
migration are explicit and deterministic.

Unknown function calls produce diagnostics. Syntax for user-defined and
parametric functions is not reserved by the initial language and requires a
later approved design. Dynamic appearance other than position, factorial,
slices, nested lists, comprehensions, and higher-order operations are also
outside this scope.
