# MultiVector Expression Language

**Status:** Draft for review
**Date:** 2026-07-30
**Initial scope:** VGA core
**Refines:** LANG-001 through LANG-009
**License:** MIT

## 1. Purpose and authority

This document specifies the normative source language required by the initial
VGA core. Examples from MultiVector Studio are behavioral references only;
where Studio differs from this document, this document takes precedence.

A document stores source text and `languageVersion`. Tokens and abstract syntax
trees are derived data, are rebuilt on load and dimension changes, and are not
serialized as authoritative document content.

### Current implementation subset

The application currently implements one declaration or anonymous expression
per row, case-sensitive identifier references, forward-reference resolution,
and document-level diagnostics for missing names, duplicate declarations,
cycles, and invalid dependencies. It supports these features for the current
VGA(2) scalar, vector-constructor, compact-blade, unary-sign, addition,
subtraction, and geometric-product subset.

Lists, annotations, properties, the remaining operators and functions,
serialization, and the generalized algebra-symbol registry in this
specification remain planned. This section records implementation evidence; it
does not narrow the normative language.

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
within a document. Reserved language names and symbols registered by the active
algebra definition—including named constants, basis vectors, and blade
aliases—cannot be redefined. An unnamed expression is evaluated and may be
visualized but cannot be referenced by another expression.

Item identity is independent of its visible name. Renaming an item does not
rename its references in the initial scope.

An item whose first non-whitespace character is `#` is an annotation. It has no
value and no dependencies. Everything after that first `#` is annotation text,
not expression syntax, and may contain any valid Unicode text, including further
`#` characters, accented characters, symbols, and emoji, subject only to the
common source-length and document-validity limits. For example, `# était sympa`
is a valid annotation. Inline trailing comments are not supported.

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
evaluates as scalar zero, while stored source preserves the spelling entered by
the user. When an explicit source-rewrite command emits a numeric literal, it
emits `0` rather than `-0`.

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

## 5. Constants

`pi` and `tau` are predefined finite grade-zero language constants. The common
language defines their names and values independently of the active algebra.

All algebraic constants and basis symbols are provided by the active algebra
definition. Examples include `e1` in VGA, `e0` in PGA and CGA, and `einf` in CGA.
The common parser resolves these registered symbols without assigning them
algebra-independent values.

`ps` is the reserved source name requested from the active algebra's registered
pseudoscalar capability. The language defines only the name and capability
lookup; the active algebra definition owns its value, basis orientation,
configuration support, and convention version. If the active algebra does not
advertise a pseudoscalar, using `ps` produces a capability diagnostic. `ps` does
not imply that the pseudoscalar is normalized or invertible.

Language constants and registered algebra symbols cannot be redefined by
document declarations. Algebra-specific constants, basis symbols, and aliases
are not hard-coded in the common parser.

## 6. Basis blades and grades

`e` names the scalar blade. All non-scalar basis symbols and their values are
registered by the active algebra definition. A registered symbol such as `e0`,
`e1`, or `einf` is resolved as one token before ordinary identifier lookup.

The initial compact blade syntax supports definition-registered, single-digit
generator indices `0` through `9`. A compact blade may use only generators for
which the active definition advertises compact source syntax. A syntactically
valid blade using an unavailable generator is an error.

Compact blade names concatenate single-digit generator indices:

```text
e12  == e1 * e2
e139 == e1 * e3 * e9
```

Non-numeric generator aliases such as `einf` are complete registered symbols;
they are not segments in compact concatenated blades and shall be combined
explicitly with an operator. Multi-digit generator indices are not supported by
language version 1. The
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

## 7. Vectors and tuples

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

## 8. Operators

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

## 9. Precedence and associativity

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

## 10. Built-in functions and norms

The initial VGA core provides `abs`, `sqrt`, `exp`, `log`, `sin`, `cos`, `tan`,
`asin`, `acos`, `atan`, `min`, and `max`. Scalar-only functions require pure
grade-zero arguments unless an algebra capability explicitly defines their
multivector extension. In particular, an algebra may expose a multivector
exponential through `exp`.

`min(a, b)` and `max(a, b)` require exactly two finite scalar arguments and
return a grade-zero multivector. In language version 1 they accept neither list
arguments nor non-scalar multivectors and do not broadcast or reduce. Variadic,
elementwise-list, and list-reduction forms require a later language design.
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

## 11. Lists, broadcasting, and indexing

`[]` is a valid empty list. A list literal is `[expression, ...]`; a trailing
comma is allowed, but elisions such as `[a,,b]` are not. Lists may contain
expressions but not lists. Elements evaluate left to right for deterministic
diagnostic ordering, without observable side effects. Supported unary
operations, scalar functions, and postfix extractors distribute over lists and
preserve length and order. A function or operator not advertised as
distributive rejects a list argument. `min` and `max` are explicitly
non-distributive in language version 1.

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
retain each source element's identity and order. Propagation of non-language
metadata on evaluated-item records is governed by the
[document format specification](document-format.md) and never changes the
multivector or list value. Any operation that would create a nested list fails in
the initial scope.

`L[i]` requires a list and a finite, non-negative integer scalar index. Negative,
fractional, and out-of-range indices are errors. Indexing is zero-based and
returns the selected multivector, not a singleton list. Its evaluated-item record
retains the element identity and associated non-language metadata without adding
either to the multivector. Indexing a non-list is a type error. Slices and
negative-from-end indexing are not supported in the initial scope.

## 12. Ranges

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

## 13. Capability properties

Postfix property access has the form `object.property`, where `property` matches
the identifier grammar. The common language defines the syntax but does not
hard-code algebra- or interpretation-specific property names or meanings.
Properties are registered through stable capability descriptors supplied by the
active algebra definition or geometry interpretation.

Each descriptor declares the receiver kinds it accepts, its result kind, whether
it distributes over lists, and the capability required for evaluation. An
unknown property, an invalid receiver, or an unavailable capability produces the
corresponding structured diagnostic. A distributive property preserves list
order and evaluated element identity; a non-distributive property rejects a list
receiver.

Property access is read-only expression syntax. Top-level or nested property
assignment is not part of language version 1. Specific property semantics belong
to the requirement document that owns the registering algebra definition or
geometry interpretation.

## 14. Dependencies and failures

Names form an explicit dependency graph. Missing names, duplicate names, cycles,
syntax failures, domain failures, unsupported capabilities, upstream failures,
and internal failures are distinct diagnostics.

An invalid expression produces no value. Independent branches continue to
evaluate. All duplicate definitions are invalid and their users report an
ambiguous reference. Every member of a cycle reports the cycle; downstream
items report an upstream failure. No last-known-good result remains visible
silently. Correcting the cause automatically reevaluates dependants.

## 15. Versioning and future syntax

`languageVersion` is a positive integer. An incompatible syntax or semantic
change increments it. A strictly compatible addition may retain the version only
when it changes the interpretation of no previously valid source. Loading and
migration are explicit and deterministic.

Unknown function calls produce diagnostics. Syntax for user-defined and
parametric functions is not reserved by the initial language and requires a
later approved design. Dynamic appearance, factorial, slices, nested lists,
comprehensions, and higher-order operations are also outside this scope.
