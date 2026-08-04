# Changelog

MultiVector records user-visible and scientific changes here from the start of
its release process. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and planned releases
use [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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

### Interface and accessibility

- Added persistent display, theme, object-size, viewport-lock, appearance,
  label, bivector-shape, border, and orientation controls.
- Added keyboard workflows, textual announcements, reduced-motion behavior,
  bounded clear interaction, and recorded VGA foundation accessibility checks.

## Maintenance rules

- Pull requests add an Unreleased entry when they change a scientific
  capability, public document or convention, canonical format, compatibility,
  or material user workflow.
- Pure test refactors and internal maintenance need no entry unless they change
  verification guarantees.
- A release moves relevant Unreleased entries under a dated version heading,
  links the Git tag and acceptance record, and leaves a new empty Unreleased
  section.

