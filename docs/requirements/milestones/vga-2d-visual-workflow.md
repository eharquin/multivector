# VGA 2D Visual Workflow Milestone

**Status:** Draft for review
**Kind:** Product milestone
**Depends on:** VGA 2D Foundation
**Applies:** CMD-001 through CMD-008; EDIT-001 through EDIT-004; CTRL-001
through CTRL-004; ANIM-001 through ANIM-005; INTERACT2D-001 through
INTERACT2D-008
**Date:** 2026-08-02

## Objective

Extend the accepted VGA 2D Foundation with source-authoritative commands,
recoverable history, scalar controls, and focused viewport interaction. The
workflow shall preserve the Foundation distinction between mathematical value,
position metadata, appearance, and derived visualization.

## Foundation feedback and selected scope

The Foundation acceptance established that:

- a vector's value and separately owned position are the initial directly
  manipulable degrees of freedom;
- inverse editing must start with direct numeric and unary-signed literal spans
  and explicitly refuse ambiguous or computed forms;
- scalar controls must rewrite authoritative source and use the existing
  canonical `Item.control` record;
- pointer gestures need equivalent keyboard commands and one recoverable
  document-history boundary;
- playback belongs after scalar controls and shares their interval metadata;
- selection, control, and manipulation state must remain understandable without
  color.

The selected implementation sequence is:

1. semantic commands and bounded document history (#22);
2. accessible scalar number and slider controls (#23);
3. viewport selection and vector creation (#24);
4. positioned-vector manipulation (#25);
5. deterministic scalar playback (#26).

Issues #23 and #24 may proceed independently after #22. Issue #25 depends on
#24, and #26 depends on #23.

## Required workflow

A user shall be able to:

- undo and redo source, position, appearance, and control changes through
  deterministic document commands;
- configure a direct scalar declaration as a number field or slider without
  changing its mathematical meaning;
- select visual entities and create a vector at explicit mathematical
  coordinates using pointer or keyboard interaction;
- move an eligible vector tip independently of its position and translate its
  position without changing its multivector value;
- play, pause, cancel, and commit deterministic scalar animation while
  dependants update;
- understand every refused edit, invalid control, selection, gesture, and
  playback state through text and accessible state.

## Completion criteria

- **M2D-001 — Commands and history:** Semantic commands operate on stable item
  identities, never on evaluated values or primitives. Undo and redo restore
  document-owned state atomically; bounded coalescing and cancellation produce
  deterministic gesture histories.
- **M2D-002 — Scalar controls:** Directly rewritable scalar declarations support
  accessible number and slider modes. Slider mode keeps its minimum, maximum,
  and step fields visible independently of expression focus; Number mode hides
  them. Bounds are independent finite scalar dependency nodes; invalid and
  out-of-range states never silently clamp or replace source.
- **M2D-003 — Viewport creation:** Double-clicking empty viewport space creates
  collision-free vector declarations at mathematical coordinates independent
  of viewport layout. Rendered objects are not directly selectable by click.
- **M2D-004 — Positioned-vector manipulation:** Eligible tip edits change vector
  value with position fixed; eligible tail edits change position with value
  fixed. Unsupported forms retain source and expose an actionable reason.
- **M2D-005 — Scalar playback:** An injectable elapsed-time clock drives
  once, loop, and ping-pong modes independently of frame rate. Pause, cancel,
  reduced motion, persistence, and history follow CTRL and ANIM requirements.
- **M2D-006 — Persistence and accessibility:** Canonical import, export, and
  local restoration preserve all new document fields while transient
  interaction and playback state remain derived. Automated and recorded manual
  evidence covers keyboard equivalence, focus, names, textual state, target
  size, themes, zoom, and reduced motion.
- **M2D-007 — Release and feedback:** `npm run verify` passes, the production
  artifact deploys and completes its smoke workflow, and an acceptance record
  links every criterion to implementation, test, manual, and deployed evidence.

## Deferred

- URL sharing;
- deterministic SVG or raster figure export;
- general viewport display-setting controls;
- multivector-component and per-list-element controls;
- direct bivector reshaping, group transforms, lasso selection, and arbitrary
  expression inversion;
- timelines, keyframes, easing editors, and synchronized multi-scalar tracks;
- a VGA 1D visualizer.
