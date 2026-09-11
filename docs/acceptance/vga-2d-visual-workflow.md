# VGA 2D Visual Workflow Acceptance Record

- **Issue:** [#94](https://github.com/eharquin/multivector/issues/94)
- **Release:** 0.1.0
- **Milestone:** [VGA 2D Visual Workflow](../requirements/milestones/vga-2d-visual-workflow.md)
- **Status:** In progress

This record tracks the evidence required to accept the first stable VGA(2)
workflow. Automated coverage may be recorded before the release candidate is
frozen, but a criterion remains pending until its release-candidate, manual,
and deployed evidence is complete where applicable.

Release 0.1.0 also incorporates the already accepted
[VGA 2D Foundation](vga-2d-foundation.md). This record covers the subsequent
visual workflow and the combined release process rather than repeating the
foundation evidence.

## Acceptance matrix

| Criterion | Current evidence | Remaining evidence | Status |
| --- | --- | --- | --- |
| M2D-001 — Commands and history | Command, bounded-history, cancellation, focus-recovery, and application fixtures in [`src/document`](../../src/document) and [`App.test.tsx`](../../src/App.test.tsx) | Run the complete suite against the release commit | Automated evidence ready |
| M2D-002 — Scalar controls | Scalar-control evaluation, direct scalar rewriting, canonical persistence, undo, and application fixtures in [`src/application`](../../src/application), [`src/language`](../../src/language), and [`src/document`](../../src/document) | Complete the manual scalar workflow in every supported browser | Automated evidence ready |
| M2D-003 — Viewport creation | Coordinate conversion and collision-free creation fixtures in [`viewportCreation.test.ts`](../../src/visualization/viewportCreation.test.ts) and [`App.test.tsx`](../../src/App.test.tsx) | Confirm pointer and keyboard behavior in the supported-browser matrix | Automated evidence ready |
| M2D-004 — Positioned-vector manipulation | Direct vector rewriting, gesture history, anchoring, cancellation, keyboard movement, and application fixtures in [`directVectorEdit.test.ts`](../../src/language/directVectorEdit.test.ts) and [`App.test.tsx`](../../src/App.test.tsx) | Resolve or explicitly disposition Chrome dragging issue [#90](https://github.com/eharquin/multivector/issues/90), then complete the manual matrix | Pending manual validation |
| M2D-005 — Scalar playback | Deterministic once, loop, ping-pong, pause, cancellation, endpoint, and numerical fixtures in [`scalarPlayback.test.ts`](../../src/application/scalarPlayback.test.ts) and [`App.test.tsx`](../../src/App.test.tsx) | Confirm visible behavior and reduced-motion handling in every supported browser | Automated evidence ready |
| M2D-006 — Persistence and accessibility | Canonical document, failed-write retention, storage, semantic control, focus, keyboard, and reduced-motion fixtures in [`src/document`](../../src/document) and [`App.test.tsx`](../../src/App.test.tsx) | Complete and record the manual accessibility and compatibility checklist below | Pending manual validation |
| M2D-007 — Release and feedback | Canonical `npm run verify`, release-only Pages workflow, roadmap, and this acceptance record | Complete release preparation, deploy the stable release artifact, smoke-test it, and record the evidence below | Pending release |

## Supported-browser and environment record

Record exact versions. A browser that cannot be tested is listed as untested
and is not claimed as supported merely because it is expected to work.

| Browser | Version | Operating system | Pointer or input setup | Result |
| --- | --- | --- | --- | --- |
| Google Chrome | Pending | Pending | Pending | Pending; investigate #90 |
| Mozilla Firefox | Pending | Pending | Pending | Pending |
| Microsoft Edge | Pending | Pending | Pending | Pending |
| Safari | Pending | Pending | Pending | Pending |

- Tester: Pending
- Test date: Pending
- Release-candidate revision: Pending

## Manual workflow checklist

- [ ] Load the application without console errors and complete the documented
  VGA(2) foundation example.
- [ ] Create, edit, reorder, delete, undo, and redo expression rows using both
  visible controls and documented keyboard commands.
- [ ] Create a vector from the viewport, move an eligible head, move and anchor
  an eligible base, cancel a gesture, and confirm that each completed gesture
  creates one recoverable history entry.
- [ ] Confirm that dragging follows the pointer smoothly, with special attention
  to Chrome issue #90.
- [ ] Configure a direct scalar as a number and as a slider; exercise valid,
  invalid, and out-of-range bounds without unintended source replacement.
- [ ] Exercise once, loop, and ping-pong playback, including pause, resume,
  completion, and Escape cancellation.
- [ ] Pan, zoom, reset, lock, and resize the viewport without changing evaluated
  mathematical values.
- [ ] Reload the page, then export and re-import the canonical document without
  losing source, position, appearance, control, or view state.
- [ ] Complete the manipulation and scalar workflows by keyboard; confirm focus
  restoration, accessible names, textual diagnostics, and non-color state.
- [ ] Check the workflow at 200% browser zoom and with reduced motion enabled.
- [ ] Record browser-specific failures as dedicated issues and define the
  supported-browser statement from the observed results.

## Release checklist

### Preparation

- [ ] Resolve or explicitly disposition every open issue that affects the
  claimed VGA(2) workflow.
- [ ] Record the supported-browser boundary and complete issue
  [#89](https://github.com/eharquin/multivector/issues/89).
- [x] Add explicit installation, local verification, and browser-target
  documentation.
- [ ] Set the package and lockfile version to `0.1.0`.
- [ ] Move the release changes from `Unreleased` to a dated `0.1.0` changelog
  section and leave a new empty `Unreleased` section.
- [ ] Update citation metadata with the release version and date.
- [ ] Run `npm ci` and `npm run verify` against the exact release commit.
- [ ] Change this record and the milestone status to `Accepted` only after all
  required evidence is present.

### Publication and deployment

- [ ] Confirm that the release commit is merged to `main` and its verification
  workflow passed.
- [ ] Create tag `v0.1.0` and publish a non-prerelease GitHub release linked to
  this record and the changelog.
- [ ] Confirm that the release workflow deploys the artifact produced from the
  release tag and that its automatic HTTP smoke test passes.
- [ ] Complete the documented workflow, reload, export, and import checks on the
  deployed application.
- [ ] Record the workflow run, deployed URL, revision, tester, and date below.

- Workflow: Pending
- Deployed URL: <https://eharquin.github.io/multivector/>
- Revision: Pending
- Tester and date: Pending

## Explicitly deferred design questions

Issues [#85](https://github.com/eharquin/multivector/issues/85),
[#87](https://github.com/eharquin/multivector/issues/87), and
[#88](https://github.com/eharquin/multivector/issues/88) remain outside the
0.1 acceptance claim. They concern provenance and positioning rules for
derived or list-contained bivector constructions. Their mathematical values
remain evaluable and their fallback visualization remains available; broader
construction-preserving behavior requires an explicit product decision before
it can become accepted behavior.
