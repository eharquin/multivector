# Technology Decisions

**Status:** Draft for review
**Date:** 2026-07-28

## Purpose

This document records replaceable implementation choices. It is not a product
requirement: changing a choice here does not change document semantics,
scientific conventions, or public guarantees as long as the applicable
requirements remain satisfied.

## Initial application stack

The initial application uses:

- strict TypeScript for production code;
- React for presentation and interaction composition;
- Vite for development and production builds;
- SVG for the initial one-dimensional visualizer and deterministic figure
  export.

These choices implement TECH-001 through TECH-004. Domain code remains testable
without React or a browser DOM, and React types do not enter the domain model.

## Automation platform

GitHub Actions is the initial implementation choice for pull-request
verification and GitHub Pages deployment. Workflows shall invoke the same
project-owned verification and build commands used locally. This platform may
be replaced without changing TEST-007 through TEST-011.

## Review triggers

A technology decision should be reconsidered only when measurements or a
required capability show that the current choice is inadequate. A replacement
shall preserve the document format, owned mathematical values, deterministic
behavior, accessibility, deployment profile, and active milestone guarantees.
