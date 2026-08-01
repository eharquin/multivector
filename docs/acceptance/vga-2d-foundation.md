# VGA 2D Foundation Acceptance Record

**Issue:** #16  
**Milestone:** [VGA 2D Foundation](../requirements/milestones/vga-2d-foundation.md)  
**Example:** [VGA 2D Foundation Example](../examples/vga-2d-foundation.md)  
**Status:** In progress

This record separates automated evidence from manual and deployed observations.
A pending observation is not acceptance evidence and shall not be marked as
passed until it has actually been performed against the release candidate.

## Acceptance matrix

| Criterion | Evidence | Status |
| --- | --- | --- |
| F2D-001 — Vertical slice | Parser, lowering, document evaluation, VGA engine, interpretation, primitive, viewport, and application tests under `src` | Automated |
| F2D-002 — Authoring and recovery | Keyboard example fixture in `src/App.test.tsx`; language, dependency, limit, and diagnostic recovery fixtures | Automated |
| F2D-003 — Geometry | Interpretation and primitive fixtures plus application coverage for individual, listed, positioned, scalar-zero, non-spatial, invalid, and rendering-limit states | Automated |
| F2D-004 — Persistence | Canonical byte-stability, strict import, local restoration, and failed-write retention fixtures in `src/document` | Automated |
| F2D-005 — Accessibility | Semantic component assertions plus the manual checklist below | Manual pass pending |
| F2D-006 — Release | `npm run verify`, GitHub Pages workflow with a post-deployment HTTP check, and deployed smoke checklist below | Deployment pending |
| F2D-007 — Design feedback | Requirement disposition table below | In progress |

## Manual accessibility checklist

Record browser, operating system, viewport, assistive technology, release
revision, tester, and date with the results.

- [ ] Complete the documented example without a pointer.
- [ ] Confirm a logical focus order and visible focus for every interactive
  element.
- [ ] Open and close each dialog and popover with the keyboard; confirm focus
  restoration and absence of traps.
- [ ] Confirm controls and SVG entities have useful accessible names.
- [ ] Confirm invalid source and persistence failures are announced once and
  remain available as text.
- [ ] Confirm visibility, invalidity, selection, and evaluation state remain
  understandable without color.
- [ ] At 200% browser zoom, confirm essential text remains readable, panel
  content is reachable, and the page does not require two-dimensional scrolling.
- [ ] Confirm interactive hit areas meet the 24 by 24 CSS-pixel minimum.
- [ ] Check light, dark, and system themes for text, focus, control, diagnostic,
  and non-text contrast.
- [ ] With reduced motion enabled, confirm no required interaction depends on
  motion.

## Deployment smoke checklist

- [x] `npm run verify` passes locally on the release candidate (197 tests).
- [ ] The push workflow deploys the verified artifact to GitHub Pages.
- [ ] The application loads directly at its configured base path without a
  backend.
- [ ] The documented example evaluates and renders in the deployed application.
- [ ] Reload restores the local document.
- [ ] Canonical export followed by import restores the same document.
- [ ] A fresh session has no dependency on data from another device or server.
- [ ] Record the workflow run, deployed URL, revision, tester, and date.

## Draft requirement disposition

| Area | Disposition | Foundation evidence |
| --- | --- | --- |
| Product and architecture boundaries | Confirmed | The vertical slice retains owned values and renderer-independent interpretation and primitive boundaries. |
| Language and VGA conventions | Confirmed for the documented subset | Unsupported syntax and broader algebra coverage remain outside the product slice. |
| Document format and local persistence | Confirmed for format version 1 | Canonical JSON and one active local browser document are implemented; sharing remains deferred. |
| Appearance and themes | Confirmed for item-level appearance | Per-list-element appearance remains deferred by format version 1. |
| Position metadata | Confirmed | Value and position sources remain independent; lists preserve element positions. |
| Commands and advanced history | Deferred | Only current deterministic document transitions are claimed; #22 owns history. |
| Direct manipulation | Deferred | #24 and #25 own viewport creation and positioned-vector manipulation. |
| Scalar controls and animation | Deferred | #23 and #26 own these increments. |
| URL sharing and figure export | Deferred | They are not part of the foundation workflow. |
| Accessibility | Pending recorded manual evidence | Automated semantic fixtures do not replace keyboard, screen-reader, contrast, zoom, and target-size checks. |
| Deployment | Pending release-candidate evidence | The workflow exists; acceptance requires a successful deployment and smoke record. |
