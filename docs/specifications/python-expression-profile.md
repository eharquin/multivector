# Restricted Python Expression Profile Candidate

**Status:** Candidate; not normative
**Date:** 2026-07-28
**Initial scope:** VGA core
**License:** MIT

## 1. Purpose and authority

This document specifies the restricted-Python candidate compared with the
project-owned language in
[technology-decisions.md](../architecture/technology-decisions.md). Neither
candidate defines the initial normative language until TECH-008 is resolved.

If selected, this profile uses CPython syntax and source locations while
retaining MultiVector-owned values, dependencies, evaluation, diagnostics,
limits, and algebra conventions. It is an expression language, not a general
Python notebook or sandbox.

A document stores source text and `languageVersion`. CPython tokens and ASTs,
validated evaluation plans, Python objects, Kingdon values, compiled functions,
and runtime caches are derived data and are never serialized.

## 2. Runtime and security boundary

The production runtime uses a bundled, version-locked Pyodide/CPython module
worker and a version-locked Kingdon package. Runtime package installation,
network imports, and access from document source to Python modules, JavaScript
objects, browser APIs, files, or environment state are prohibited.

Source is parsed with CPython and validated before evaluation. Document source
shall never be passed to `eval`, `exec`, or `compile`. A controlled evaluator
visits only accepted AST nodes and invokes registered MultiVector capabilities.
Kingdon receives validated finite scalar or owned multivector operands through
an adapter; source strings, user identifiers, lists with application metadata,
and Python exceptions do not cross that boundary.

The worker protocol accepts source, language version, algebra configuration,
capability descriptors, dependency values, and a deterministic work budget. It
returns MultiVector-owned declarations, dependencies, source locations, values
or lists, work charges, and diagnostics. CPython AST nodes and Kingdon objects
never cross the protocol.

## 3. Initial accepted source

An expression item contains exactly one of:

- a simple assignment to one identifier; or
- one expression whose result is visualized but cannot be referenced by name.

Annotations remain non-executable document items. Assignment unpacking,
augmented assignment, annotated assignment, chained assignment, deletion, and
multiple statements are rejected.

The initial accepted expression nodes are:

- finite decimal integer and floating-point literals;
- registered names;
- parenthesized expressions;
- registered unary and binary operators;
- calls to directly named, registered functions;
- registered read-only capability properties;
- immutable list literals;
- integer indexing and slicing; and
- starred list elements used only within a list literal.

Imports, strings, bytes, booleans, complex values, dictionaries, sets, arbitrary
tuples, conditional expressions, comparisons, boolean operators, lambdas,
comprehensions, generators, `await`, yield, reflection, arbitrary attributes,
indirect calls, and every statement not listed above are rejected with stable
profile diagnostics. Names or attributes beginning with `_` are never
registered.

Python spelling and precedence are authoritative. Examples include:

```python
a = 2 * pi
V = vector(a, 0)
B = 5 * e12
turned = R >> V
joined = [*left, *right]
```

There is no implicit multiplication, custom `!` dual operator, `>>>` operator,
or tuple-as-vector shorthand. Parentheses shall be used where Python precedence
does not express the intended GA grouping.

## 4. Values and capabilities

Every numeric language result, including a scalar and zero, becomes an owned
multivector. Python integers are permitted internally only at structural
boundaries such as indices, slices, range bounds, lengths, and repetition
counts. Those boundaries require a finite pure grade-zero multivector with the
documented integrality and range checks.

Basis names, constants, constructors, functions, operators, and read-only
properties are supplied through stable MultiVector capability descriptors. The
profile exposes only registered capabilities and does not expose Kingdon's
module, algebra object, multivector methods, symbolic strings, arrays, or
serialization.

The initial GA operator facade includes the selected convention's supported
forms of addition, subtraction, geometric product, division, outer product,
regressive product, inner product, sandwich action, projection, unary sign, and
reverse using Python operators where an unambiguous operator exists. Dual,
inverse, grades, coefficients, norms, contractions, constructors, and scalar
functions use registered direct functions or read-only properties. Unsupported
capabilities produce common capability diagnostics.

## 5. Immutable lists

A list literal evaluates to an immutable `MVList`, implemented internally using
ordinary Python sequence storage. `MVList` supports Python-style zero-based and
negative indexing, slicing including negative steps, iteration, `len`,
deterministic equality, and starred unpacking into another list. Mutation
methods, item assignment, deletion, and in-place sorting are not available.

Mathematical operators use one MultiVector-owned dispatcher:

1. a list and a value broadcast the value;
2. equal-length lists combine elementwise;
3. a singleton list broadcasts to a longer list;
4. unequal non-singleton lengths fail;
5. an empty list with a value returns an empty list; and
6. an empty list with a non-empty list fails.

`+` remains elementwise mathematical addition rather than Python list
concatenation. Concatenation uses starred unpacking or `concat(...)`. `*`
remains geometric-product broadcasting rather than list repetition; bounded
repetition uses `repeat(...)`.

Lists retain MultiVector-owned element identities, source associations,
positions, deterministic ordering, limit charges, and element-local diagnostic
context. An element failure fails the complete expression without a partial
value. Nested lists are rejected initially. Kingdon's own sequence
broadcasting is not normative and is not used for application list records.

`range(start, stop[, step])` follows Python's end-exclusive integer bounds but
materializes an `MVList` of owned scalars. Cardinality and work are checked
before allocation.

## 6. Names, dependencies, and failures

Assignment names use Python identifiers accepted by the profile, are
case-sensitive, and are unique within a document. Registered language and
algebra names cannot be redefined. Load-context names become explicit
dependencies except registered constants and capabilities.

Missing names, duplicates, cycles, syntax failures, rejected-profile forms,
domain failures, unsupported capabilities, upstream failures, exceeded limits,
and internal failures have distinct stable diagnostics. CPython messages and
exceptions are normalized; user-facing output never exposes stacks or
untrusted markup.

CPython source locations use UTF-8 byte offsets. The frontend converts them to
the application's string-offset convention before returning source spans.
Direct editing initially recognizes finite numeric literals, unary-signed
literals, `vector(...)` arguments, and direct references to free scalar
declarations.

## 7. Limits and containment

Source length is checked before parsing. Token count, AST depth, AST-node count,
direct dependencies, generated values, coefficient count, and deterministic
work use the common limits. Every accepted AST evaluation, dependency edge,
list operation, generated element, and engine operation is charged through a
documented deterministic formula.

Worker termination is last-resort failure containment, not a substitute for the
deterministic budget. Terminating a worker invalidates its runtime caches; the
application reconstructs derived state from authoritative source without
changing the document.

## 8. Future pure functions and comprehensions

Function definitions and comprehensions are recognized but rejected with stable
unsupported-feature diagnostics in the initial profile. A later
`languageVersion` may accept one pure function definition per function item:

```python
def rotate(value, rotor):
    return rotor >> value
```

The initial future function form has positional parameters, exactly one return
expression, and no decorators, annotations, defaults, variadic parameters,
local mutation, imports, side effects, or arbitrary closures. Parameters shadow
document names. Free names form function-node dependencies, and callers depend
on the function and its transitive dependencies. Direct and mutual recursion
are rejected; call depth, argument count, call count, and cumulative work are
bounded.

The same later version may accept eager list comprehensions with one generator
and optional filters, together with the comparison and boolean subset required
for pure filter predicates. Nested and asynchronous comprehensions, unbounded
iterables, and generator expressions remain rejected. Every visited and
produced element is charged before it enters the result.

Validated function bodies remain interpreted by the controlled evaluator.
Optional lowering to trusted backend optimization is a cache-only
implementation choice; interpreted semantics remain normative and compiled
artifacts are never serialized.

## 9. Versioning

The selected CPython grammar and this accepted subset are fixed by
`languageVersion`, not by whichever Pyodide version happens to be installed.
Adding a newly accepted AST form or changing Python-profile semantics requires
the compatibility analysis and migration behavior required by LANG-007 and
DOC-005.
