# Changelog

MultiVector records user-visible and scientific changes here from the start of
its release process. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and planned releases
use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Scientific capabilities

- Added the plane-based PGA(2) algebra `org.multivector.pga` under
  [PGA convention version 1](docs/specifications/pga-conventions.md): points,
  ideal points, and lines with `point`, `ipoint`, and `line`; meet, join
  through the explicit Hodge dual, incidence, Euclidean and ideal norms, and
  rotors, translators, motors, reflections, and glide reflections through the
  common operators; classification, projective descriptions with weight and
  scale, point markers, clipped lines, and edge direction markers.

### Interface and accessibility

- Added algebra selection for an empty document from the algebra dialog; the
  header badge and dialog now describe the document's algebra.
- Compact blade names accept every generator of the active algebra, so an
  unavailable blade such as `e0` under VGA(2) reports an unknown-blade
  diagnostic at its span instead of an undefined name.

## 0.1.0 - 2026-09-13

First stable release. Tag
[`v0.1.0`](https://github.com/eharquin/multivector/releases/tag/v0.1.0);
acceptance evidence in the
[VGA 2D Visual Workflow acceptance record](docs/acceptance/vga-2d-visual-workflow.md);
scope and limitations in the [release notes](docs/releases/0.1.0.md).

### Scientific capabilities

- Added the accepted VGA(2) foundation: owned multivector evaluation,
  versioned conventions, standard scalar/vector/bivector/rotor interpretation,
  geometric operations, rotors, lists, and positioned 2D visualization.
- Added natural normalization, scalar controls and deterministic playback,
  direct positioned-object manipulation, and dynamic base/head anchoring.
- Added a tolerance-aware VGA(2) classification policy so harmless
  floating-point leakage no longer changes an object's semantic kind, with
  an explicit "approximated" indicator when it is suppressed.

### Document and convention changes

- Established a closed canonical document format with local persistence,
  import/export validation, stable item identities, and independent value,
  position, appearance, control, and view state.
- Added persistent numerical display precision without changing mathematical
  values or classification.

### Corrections

- Preserved full binary64 round-trip precision when scalar controls rewrite
  authoritative source and made playback reach evaluated endpoints exactly.
- Kept vector-base manipulation available when bivector fills overlap it.
- Stopped browser default actions from leaking through viewport gestures:
  native text selection during manipulation and pans, page zoom on
  Ctrl+wheel and pinch, and selection or hit-testing of the panels while a
  gesture is held.
- Dropped a dragged expression row exactly where its indicator was shown.
- Removed the "Two-dimensional VGA viewport" tooltip shown over the canvas.

### Interface and accessibility

- Added persistent display, theme, object-size, viewport-lock, appearance,
  label, bivector-shape, border, and orientation controls.
- Added keyboard workflows, textual announcements, reduced-motion behavior,
  bounded clear interaction, and recorded VGA foundation accessibility checks.
- Added Alt+Arrow row movement from an expression field and on the reorder
  handle.
- Drew keyboard focus on viewport handles as an SVG ring shown for keyboard
  focus only, returned focus to the canvas after a pointer gesture, and kept
  the gesture cursor over the panels.
- Replaced font-dependent glyphs (settings gear, play and pause) with inline
  icons that render identically on every platform.

### Distribution

- Changed the public GitHub Pages deployment to publish only verified stable
  release artifacts while pull requests and `main` pushes retain production
  build validation; a maintainer may also deploy a chosen ref by hand for
  browser testing.
- Recorded the supported-browser matrix: current Chrome and Firefox on Linux
  desktops, Safari 17.6 on macOS 12.7; Edge, touch input, and mobile browsers
  are not claimed.

## Maintenance rules

- Pull requests add an Unreleased entry when they change a scientific
  capability, public document or convention, canonical format, compatibility,
  or material user workflow.
- Pure test refactors and internal maintenance need no entry unless they change
  verification guarantees.
- A release moves relevant Unreleased entries under a dated version heading,
  links the Git tag and acceptance record, and leaves a new empty Unreleased
  section.
