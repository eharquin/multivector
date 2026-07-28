# Technology Decisions

**Status:** Draft for review
**Date:** 2026-07-28

## Purpose

This document records implementation choices within the applicable technology
requirements. Choices identified as replaceable may change without affecting
document semantics, scientific conventions, or public guarantees.

## Initial application stack

The initial application uses:

- strict TypeScript for the primary production application and domain code, as
  required by TECH-001;
- React for presentation and interaction composition, as required by TECH-001
  and TECH-002;
- Vite for development and production builds, as required by TECH-001;
- SVG for the initial one-dimensional visualizer and deterministic figure
  export.

SVG is a replaceable implementation choice under TECH-004. Domain code remains
testable without React or a browser DOM, and React types do not enter the domain
model. A selected language runtime or specialized computation backend may use
another language only behind the boundaries defined by LANG-008, TECH-005, and
TECH-006.

## Automation platform

GitHub Actions is the initial implementation choice for pull-request
verification and GitHub Pages deployment. Workflows shall invoke the same
project-owned verification and build commands used locally. This platform may
be replaced without changing TEST-007 through TEST-011.

## Initial language and algebra runtime

**Decision status:** Open

TECH-008 requires a selection before the language and document format are
frozen. The initial product will select one complete stack; it is not required
to ship both. The candidates are:

1. the
   [restricted Python expression profile](../specifications/python-expression-profile.md)
   with Kingdon running in a bundled Pyodide worker; and
2. the
   [owned expression language](../specifications/language.md)
   with ganja.js running behind a TypeScript algebra-engine adapter.

MultiVector owns the public value and list representations, capability
descriptors, diagnostics, serialization, numerical conventions, dependency
behavior, resource accounting, and conformance tests under either candidate.
Neither Kingdon nor ganja.js behavior is normative unless a versioned
MultiVector convention explicitly adopts and independently tests it.

### Candidate comparison

| Criterion | Restricted Python with Kingdon | Owned language with ganja.js |
| --- | --- | --- |
| Source syntax | Strict, restricted Python syntax and Python precedence | Project-owned GA syntax and precedence |
| Parser ownership | CPython tokenization and AST, followed by MultiVector validation | MultiVector tokenizer, parser, recovery, and AST |
| Browser runtime | Bundled Pyodide/CPython module worker | Existing JavaScript/TypeScript worker environment |
| Algebra implementation | Kingdon Python API through an engine adapter | ganja.js generated algebra through an engine adapter |
| Application integration | Asynchronous JS/Python worker protocol and owned-value conversion | Direct TypeScript adapter calls and owned-value conversion |
| Startup and packaging | Includes the Python runtime and locked Python wheels | Does not add a Python runtime or cross-language package bridge |
| Language evolution | Can reuse accepted Python syntax while specifying a safe subset | Every new syntax form requires project grammar and evaluator work |
| Custom functions | Future validated pure `def` form with one return expression | Future project-owned function grammar and evaluator nodes |
| Lists | Python sequence syntax reused through an owned immutable `MVList` | Project-owned list and range syntax over internal JavaScript arrays |
| List guarantees | Broadcasting, identities, positions, limits, and diagnostics remain MultiVector-owned | The same guarantees remain MultiVector-owned |
| Direct manipulation | CPython UTF-8 byte locations require conversion to editor offsets | Owned AST can expose editor-oriented source spans directly |
| Diagnostics | CPython failures require stable project diagnostic mapping | Complete message and recovery control at greater implementation cost |
| Resource containment | Deterministic AST and engine charges plus disposable worker containment | Deterministic owned-AST and engine charges in a disposable worker |
| Security and CSP | User source is inspected, never passed to `eval`, `exec`, or `compile`; Python runtime and Kingdon code generation require review | Document source never enters ganja.js `inline`; ganja.js algebra generation requires review |
| Backend portability | Public contracts remain replaceable, but the source frontend is coupled to a Python runtime | Owned language can target TypeScript, ganja.js, or Rust/Wasm engines |
| Visualization | Uses owned interpretations, primitives, and SVG; notebook graphing is outside the engine contract | Uses the same owned visualization pipeline; ganja graphing is outside the engine contract |

[Kingdon](https://github.com/tbuli/kingdon) provides a Pythonic multivector API,
symbolic optimization, sparse computation, operator overloads, and array
broadcasting. [Ganja.js](https://enkimute.github.io/ganja.js/) is a JavaScript
Clifford-algebra generator whose inline notation uses reflection, a tokenizer,
and an AST translator to rewrite JavaScript functions. These third-party source
facilities are implementation evidence, not permission to execute document
source directly.

### Common mandatory evidence

Each candidate investigation shall use the same MultiVector-owned fixtures and
record the exact dependency versions, production build configuration, and test
environment. A candidate shall demonstrate:

- independent VGA reference cases for dimensions 1 through 3 and the common
  engine capability suite;
- canonical owned-value conversion, versioned conventions, finite
  coefficients, and backend-exception mapping;
- declarations, dependencies, duplicate and cycle handling, independent-branch
  recovery, and stable diagnostics;
- list broadcasting, element identity, position metadata, atomic failure, and
  resource-limit behavior;
- direct-edit source spans, including Unicode before the edited span;
- canonical document round trips and deterministic dimension changes;
- hostile-source containment and the deployable content-security policy;
- a production GitHub Pages build; and
- recorded cold-start, first-evaluation, repeated-evaluation, memory, and
  production-asset-size measurements on the same reference devices.

Failure of correctness, deterministic limits, security, accessibility, or
GitHub Pages deployment eliminates a candidate. Performance, package size,
implementation complexity, maintainability, and future-function ergonomics
distinguish candidates only after mandatory requirements pass. Measurements
shall be reported rather than replaced by unverified qualitative claims.

### Selection record

The eventual decision shall identify the selected stack, rejected stack, exact
evidence revision, dependency versions, known limitations, and reasons against
the comparison criteria. It shall also:

- make the selected candidate specification normative as language version 1;
- update the language and VGA milestones without requiring the rejected stack;
- confirm that documents contain no backend identity or backend-native value;
  and
- retain the engine boundary so a specialized TypeScript, Python, sparse, or
  Rust/Wasm backend may later replace the selected algebra implementation
  without silently changing document semantics.

## Review triggers

After TECH-008 is resolved, a selected technology should be reconsidered only
when measurements or a required capability show that it is inadequate. A
replacement shall preserve the document format, owned mathematical values,
deterministic behavior, accessibility, deployment profile, and active milestone
guarantees.
