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
| M2D-004 — Positioned-vector manipulation | Direct vector rewriting, gesture history, anchoring, cancellation, keyboard movement, and application fixtures in [`directVectorEdit.test.ts`](../../src/language/directVectorEdit.test.ts) and [`App.test.tsx`](../../src/App.test.tsx); manual matrix below; [#90](https://github.com/eharquin/multivector/issues/90) closed as not reproducible | Repeat on the stable release artifact | Manual evidence recorded |
| M2D-005 — Scalar playback | Deterministic once, loop, ping-pong, pause, cancellation, endpoint, and numerical fixtures in [`scalarPlayback.test.ts`](../../src/application/scalarPlayback.test.ts) and [`App.test.tsx`](../../src/App.test.tsx) | Confirm visible behavior and reduced-motion handling in every supported browser | Automated evidence ready |
| M2D-006 — Persistence and accessibility | Canonical document, failed-write retention, storage, semantic control, focus, keyboard, and reduced-motion fixtures in [`src/document`](../../src/document) and [`App.test.tsx`](../../src/App.test.tsx); manual checklist below | Repeat on the stable release artifact | Manual evidence recorded |
| M2D-007 — Release and feedback | Canonical `npm run verify`, release-only Pages workflow, roadmap, and this acceptance record | Complete release preparation, deploy the stable release artifact, smoke-test it, and record the evidence below | Pending release |

## Supported-browser and environment record

Record exact versions. A browser that cannot be tested is listed as untested
and is not claimed as supported merely because it is expected to work.

| Browser | Version | Operating system | Pointer or input setup | Result |
| --- | --- | --- | --- | --- |
| Google Chrome | 153.0.8010.36 (Flathub Flatpak) | Fedora 44, GNOME 50, desktop, DPR 1, hardware-accelerated rasterization and compositing | Mouse | Pass; #90 not reproducible (closed) |
| Mozilla Firefox | 155.0 (dnf) | Fedora 44, GNOME 50, desktop, DPR 1 | Mouse | Pass |
| Mozilla Firefox | 155.0 (dnf) | Fedora 44, GNOME 50, Dell Precision 5480, DPR 2 | Trackpad; touchscreen for #120 only | Pass; touchscreen pinch not supported (#120) |
| Microsoft Edge | — | — | — | Untested; not claimed |
| Safari | 17.6 (17618.3.11.11.7) | macOS 12.7.6, MacBook Air 13" | Trackpad | Pass |

- Tester: Enzo Harquin, with an independent Safari tester for the initial
  reports.
- Test date: 2026-09-13
- Revision tested: `b75f412` deployed by hand to
  <https://eharquin.github.io/multivector/> (#105). The stable release
  artifact must repeat the deployed-application checks below.

Environment notes:

- Reduced motion: neither Chrome (Flatpak) nor Firefox picked up the GNOME 50
  "reduce animation" setting; the preference was forced with the DevTools
  media emulation (Chrome) and `ui.prefersReducedMotion` (Firefox). Safari
  honors the macOS setting directly.
- Cosmetic differences documented and not treated as failures: the focus
  indicator that Chrome and Safari show on a handle after Escape (#119, now
  addressed by #127) and the keyboard-only reachability of controls on macOS,
  which depends on the system keyboard-navigation setting.

Defects found by this matrix and fixed before the release candidate: #99,
#101, #104, #106, #109, #111, #113, #122, #124, #126, #130. Deferred with a
documented limitation: #100, #120. Follow-up improvements: #115, #116, #117,
#118, #121.

## Manual workflow checklist

Completed on every browser in the table above, on revision `b75f412`.

- [x] Load the application without console errors and complete the documented
  VGA(2) foundation example.
- [x] Create, edit, reorder, delete, undo, and redo expression rows using both
  visible controls and documented keyboard commands.
- [x] Create a vector from the viewport, move an eligible head, move and anchor
  an eligible base, cancel a gesture, and confirm that each completed gesture
  creates one recoverable history entry.
- [x] Confirm that dragging follows the pointer smoothly, with special attention
  to Chrome issue #90.
- [x] Configure a direct scalar as a number and as a slider; exercise valid,
  invalid, and out-of-range bounds without unintended source replacement.
- [x] Exercise once, loop, and ping-pong playback, including pause, resume,
  completion, and Escape cancellation.
- [x] Pan, zoom, reset, lock, and resize the viewport without changing evaluated
  mathematical values.
- [x] Reload the page, then export and re-import the canonical document without
  losing source, position, appearance, control, or view state.
- [x] Complete the manipulation and scalar workflows by keyboard; confirm focus
  restoration, accessible names, textual diagnostics, and non-color state.
- [x] Check the workflow at 200% browser zoom and with reduced motion enabled.
- [x] Record browser-specific failures as dedicated issues and define the
  supported-browser statement from the observed results.

Supported-browser statement for 0.1.0: current Google Chrome and Mozilla
Firefox on Linux desktops with mouse or trackpad input, and Safari 17.6 on
macOS 12.7 with trackpad input, at standard and HiDPI density. Microsoft Edge,
touch input, and mobile browsers are not claimed.

## Release checklist

### Preparation

- [x] Resolve or explicitly disposition every open issue that affects the
  claimed VGA(2) workflow: #99, #101, #104, #106, #109, #111, #113, #122,
  #124, #126, and #130 fixed; #90 closed as not reproducible; #100, #115,
  #118, and #120 documented as limitations below and in the release notes.
- [x] Record the supported-browser boundary and complete issue
  [#89](https://github.com/eharquin/multivector/issues/89).
- [x] Add explicit installation, local verification, and browser-target
  documentation.
- [x] Set the package and lockfile version to `0.1.0`.
- [x] Draft the `0.1.0` release notes with the intended scope and known
  limitations.
- [x] Move the release changes from `Unreleased` to a dated `0.1.0` changelog
  section and leave a new empty `Unreleased` section.
- [x] Add the release version to citation metadata.
- [x] Add the final release date to citation metadata.
- [x] Run `npm ci` and `npm run verify` against the exact release commit
  (25 files, 326 tests, production build; repeated by the release workflow).
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

Issues [#115](https://github.com/eharquin/multivector/issues/115) (focus
target after undoing a viewport gesture), [#118](https://github.com/eharquin/multivector/issues/118)
(keyboard handle steps not scaled with the zoom), and
[#120](https://github.com/eharquin/multivector/issues/120) (touchscreen pinch)
are documented limitations with pointer or Shift-stepped workarounds; they do
not affect the claimed pointer and keyboard workflows on the supported browsers.

Issue [#100](https://github.com/eharquin/multivector/issues/100) also remains
outside the 0.1 acceptance claim. When several objects share a base point, the
topmost handle receives the press and the anchor snap zone re-attaches objects
released within 22 px. Disambiguation and snap rules require an explicit
product decision; until then the behavior is a documented limitation, not a
browser defect.
