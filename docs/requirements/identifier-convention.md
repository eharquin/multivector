# Requirement Identifier Convention

**Status:** Draft for review
**Date:** 2026-07-28
**License:** MIT

## 1. Purpose

This document defines the normative syntax, ownership, allocation, and lifecycle
of requirement and acceptance-criterion identifiers. The separate
[requirement prefix registry](requirement-prefix-registry.md) is the
authoritative inventory of prefixes currently in use.

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
  requirement prefix registry. Other documents may cite an identifier but shall
  not redefine its normative meaning.
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
- A new prefix requires an entry in the requirement prefix registry before its
  first use. Prefixes should describe a stable responsibility rather than a
  temporary implementation component.
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

## 5. Review and validation

Design review shall verify identifier syntax, uniqueness, registered ownership,
scope, and references. Automated documentation checks should enforce these
properties before normative documents reach **Accepted** status.
