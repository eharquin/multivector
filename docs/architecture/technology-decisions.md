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
model. A specialized computation backend may use another language only behind
the boundary defined by TECH-005 and TECH-006.

## Automation platform

GitHub Actions is the initial implementation choice for pull-request
verification and GitHub Pages deployment. Workflows shall invoke the same
project-owned verification and build commands used locally. This platform may
be replaced without changing TEST-007 through TEST-011.

## Initial algebra backend

Ganja.js is the initial implementation choice for the built-in VGA engine. It is
integrated exclusively through the algebra-engine adapter governed by TECH-005,
TECH-006, TECH-008, ARCH-001, and the algebra-definition contract.

MultiVector owns the public value representation, capability descriptors,
diagnostics, serialization, numerical conventions, and conformance tests.
Ganja.js behavior is not normative unless it is explicitly adopted by a
versioned MultiVector convention and independently tested.

A specialized TypeScript, sparse, or Rust/Wasm backend may replace or complement
ganja.js without changing documents, source-language semantics, geometric
entities, or presentation code.

## Review triggers

A technology decision should be reconsidered only when measurements or a
required capability show that the current choice is inadequate. A replacement
shall preserve the document format, owned mathematical values, deterministic
behavior, accessibility, deployment profile, and active milestone guarantees.
