# Requirement Prefix Registry

**Status:** Draft for review
**Date:** 2026-07-28
**License:** MIT

## 1. Purpose

This document is the authoritative inventory of requirement and
acceptance-criterion prefixes currently in use. Syntax, allocation, ownership,
and lifecycle rules are defined by the
[requirement identifier convention](identifier-convention.md).

Adding, renaming, or retiring a prefix requires updating this registry in the
same change. A registered prefix shall have one scope and one normative owner.
Removing every active requirement under a prefix does not make that prefix
available for reuse.

## 2. Active prefixes

| Prefix | Scope | Normative owner |
| --- | --- | --- |
| `PROD` | Product principles shared by the whole application | `docs/design-requirements.md` |
| `TECH` | Project-wide technology baseline | `docs/design-requirements.md` |
| `ARCH` | Project-wide architectural boundaries | `docs/design-requirements.md` |
| `DIM` | Common algebra, geometry, and visualization dimension rules | `docs/design-requirements.md` |
| `DOC` | Common document lifecycle and format guarantees | `docs/design-requirements.md` |
| `LANG` | Common language and evaluation guarantees | `docs/design-requirements.md` |
| `APP` | Appearance and visual-placement guarantees | `docs/design-requirements.md` |
| `EDIT` | Source-preserving direct-edit guarantees | `docs/design-requirements.md` |
| `CMD` | Commands, history, and coalescing | `docs/design-requirements.md` |
| `CTRL` | Scalar controls and their configuration | `docs/design-requirements.md` |
| `ANIM` | Animation lifecycle and persistence | `docs/design-requirements.md` |
| `STORE` | Persistence, import, export, and sharing | `docs/design-requirements.md` |
| `ERR` | Diagnostics, recovery, and failure containment | `docs/design-requirements.md` |
| `SEC` | Security and resource-limit guarantees | `docs/design-requirements.md` |
| `A11Y` | Accessibility guarantees and evidence | `docs/design-requirements.md` |
| `TEST` | Project-wide verification, continuous integration, conformance, and milestone deployment guarantees | `docs/design-requirements.md` |
| `ALG` | Algebra-definition and engine contract | `docs/requirements/algebras/algebra-definition.md` |
| `INT` | Common geometry-interpretation contract | `docs/requirements/algebras/algebra-definition.md` |
| `VGA` | VGA-family definition and mathematical behavior | `docs/requirements/algebras/vga.md` |
| `VEC` | VGA vector construction and dimension changes | `docs/requirements/algebras/vga.md` |
| `VGA-INT` | Standard VGA geometry interpretation | `docs/requirements/algebras/vga.md` |
| `VGA-POS` | Position semantics for interpreted VGA entities | `docs/requirements/algebras/vga.md` |
| `VIZ1D` | Rendering shared by one-dimensional visualizers | `docs/requirements/visualization/1d.md` |
| `VIEW1D` | One-dimensional viewport behavior | `docs/requirements/visualization/1d.md` |
| `INTERACT1D` | One-dimensional selection and manipulation | `docs/requirements/visualization/1d.md` |
| `LFND` | Acceptance criteria for the Language and Document Foundation milestone | `docs/requirements/milestones/language-foundation.md` |
| `VGAC` | Acceptance criteria for the VGA Core milestone | `docs/requirements/milestones/vga-core.md` |
| `F1D` | Acceptance criteria for the VGA 1D foundation milestone | `docs/requirements/milestones/vga-1d-foundation.md` |
| `M1D` | Acceptance criteria for the VGA 1D visual workflow milestone | `docs/requirements/milestones/vga-1d-visual-workflow.md` |
