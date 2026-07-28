# Requirement Identifier Convention

**Status:** Draft for review
**Date:** 2026-07-28
**License:** MIT

## 1. Purpose

This document defines the normative syntax, ownership, allocation, and lifecycle
of requirement and acceptance-criterion identifiers. Its registry is the
authoritative list of prefixes currently in use.

## 2. Syntax

An identifier has the form:

```text
PREFIX-NNN
```

`PREFIX` consists of one or more uppercase ASCII segments separated by hyphens.
A segment may contain uppercase ASCII letters followed by uppercase letters or
digits. `NNN` is a zero-padded decimal sequence number from `001` through `999`.
Examples include `DOC-010`, `VIZ1D-004`, and `VGA-POS-002`.

The final numeric segment is the sequence number. All preceding segments form
the prefix. Requirement identifiers are case-sensitive and shall not contain
spaces, underscores, or punctuation other than prefix-separating hyphens.

## 3. Allocation and lifecycle

- Every normative requirement and milestone acceptance criterion shall have
  exactly one identifier registered to one prefix.
- An identifier shall be unique across the repository, not merely within its
  owning document.
- Each prefix shall have one owning document and one scope recorded in the
  registry below. Other documents may cite an identifier but shall not redefine
  its normative meaning.
- New identifiers shall use the next unallocated sequence number for their
  prefix. Gaps are permitted and shall not be filled merely to make a sequence
  contiguous.
- Publication order and document order need not follow numerical order.
- Before its owning document reaches **Accepted**, an identifier and its
  requirement may change through review. Once accepted, its normative meaning
  shall not be silently changed. Compatible clarification is permitted; a
  materially different guarantee requires a new identifier.
- Moving a requirement between sections or documents shall preserve its
  identifier only when its owner, scope, and normative meaning remain
  compatible with the registered prefix.
- Removed or replaced requirements shall not have their identifiers reused.
  They shall remain traceable in version history or be explicitly marked
  **Superseded** with a reference to their replacements.
- A new prefix requires an entry in this registry before its first use.
  Prefixes should describe a stable responsibility rather than a temporary
  implementation component.
- Milestone prefixes identify acceptance evidence for a delivery profile. They
  shall not be used to restate the underlying product or engineering
  guarantees.

Existing identifiers predate this convention. They remain valid even where a
new identifier might now be named differently.

## 4. Commitment levels

Every normative requirement has one of these commitment levels:

- **Core:** an invariant required by every applicable implementation from the
  first milestone onward;
- **Milestone:** a guarantee that becomes mandatory only for milestones that
  explicitly include it;
- **Planned:** an approved design direction that is not completion-blocking for
  current milestones.

An unannotated requirement is **Core**. A section or document may declare a
different default for all requirements it contains. A milestone makes
**Milestone** requirements applicable by listing their document, section, or
identifiers in its capability profile. **Planned** requirements shall not be
claimed as implemented and shall become **Core** or **Milestone** through design
review before they become delivery criteria.

Commitment changes are normative changes. Before **Accepted**, they may occur
through ordinary design review. After **Accepted**, tightening or relaxing a
commitment requires an explicit recorded decision and compatibility review.

## 5. Prefix registry

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
| `F1D` | Acceptance criteria for the VGA 1D foundation milestone | `docs/requirements/milestones/vga-1d-foundation.md` |
| `M1D` | Acceptance criteria for the VGA 1D visual workflow milestone | `docs/requirements/milestones/vga-1d-visual-workflow.md` |

## 6. Review and validation

Design review shall verify identifier syntax, uniqueness, registered ownership,
scope, and references. Automated documentation checks should enforce these
properties before normative documents reach **Accepted** status.
