# Technology Decisions

**Status:** Draft for review
**Date:** 2026-07-28

## Purpose

This document records implementation choices within the applicable technology
requirements. Choices identified as replaceable may change without affecting
document semantics, scientific conventions, or public guarantees.

The current code ownership, dependency direction, and boundary rules are
described in [Application Architecture](application-architecture.md).

## Initial application stack

The initial application uses:

- strict TypeScript for the primary production application and domain code, as
  required by TECH-001;
- React for presentation and interaction composition, as required by TECH-001
  and TECH-002;
- Vite for development and production builds, as required by TECH-001;
- SVG for the initial two-dimensional visualizer and deterministic figure
  export.

SVG is a replaceable implementation choice under TECH-004. Domain code remains
testable without React or a browser DOM, and React types do not enter the domain
model. A specialized computation backend may use another language only behind
the boundary defined by TECH-005 and TECH-006.

## Automation platform

GitHub Actions is the initial implementation choice for pull-request
verification and GitHub Pages deployment. Workflows shall invoke the same
project-owned verification and build commands used locally. This platform may
be replaced without changing TEST-007 through TEST-011.

## Initial language and algebra runtime

**Decision status:** Accepted

The initial source language is the
[MultiVector expression language](../specifications/language.md). MultiVector
owns its tokenizer, parser, AST, dependency analysis, evaluator semantics,
diagnostics, limits, source locations, and versioning. Python syntax and a
bundled Python runtime are not part of the initial production design.

[Ganja.js](https://enkimute.github.io/ganja.js/) is the initial implementation
choice for the built-in VGA engine. It is integrated exclusively through the
algebra-engine adapter governed by TECH-005, TECH-006, TECH-008, ARCH-001, and
the algebra-definition contract.

MultiVector owns the public value and list representations, capability
descriptors, diagnostics, serialization, numerical conventions, dependency
behavior, resource accounting, and conformance tests. Ganja.js classes, typed
arrays, methods, generated functions, serialization, exceptions, and graphing
APIs shall not cross the engine boundary. Document source is evaluated by the
MultiVector evaluator and shall never be passed to ganja.js `inline`.

MultiVector Studio demonstrates broad behavioral coverage with ganja.js, but it
allows ganja.js values and coefficient layout to enter evaluation,
classification, and presentation code. The new application treats that
coupling as predecessor evidence rather than an architecture to preserve.

### Security and deployment condition

Ganja.js generates algebra operations at runtime, including through
`Function` construction. Its exact pinned release shall therefore be reviewed
and tested with the production GitHub Pages deployment and deployable
content-security policy before the VGA Core milestone is complete. The test
shall cover algebra construction, explicit adapter operations, production asset
loading, and isolation from document source.

If ganja.js cannot satisfy SEC-008 without an unacceptable policy relaxation,
TECH-005 and TECH-006 permit replacement by an owned TypeScript, sparse, or
Rust/Wasm engine. Such replacement shall not change documents, source-language
semantics, owned values, geometric entities, or presentation code.

### Independent verification

Fundamental operations shall have project-owned reference fixtures under
TEST-003; ganja.js shall not be its own sole oracle. Kingdon may be used as an
additional development-time differential oracle for selected algebra cases,
but it is neither a production dependency nor a normative authority. A
disagreement between libraries shall be resolved against the versioned
MultiVector convention and independent mathematical reference, not by backend
preference.

## Review triggers

A selected technology should be reconsidered only when measurements or a
required capability show that it is inadequate. A replacement shall preserve
the document format, owned mathematical values, deterministic behavior,
accessibility, deployment profile, and active milestone guarantees.

The proposed multi-algebra computational precision and classification policy is
tracked separately in [Numerical Policy Options](numerical-policy-options.md).
It is non-normative until its required experiments and convention consequences
are reviewed.
