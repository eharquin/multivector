# MultiVector Design Requirements

**Status:** Draft for review
**Date:** 2026-07-27
**License:** MIT

## 1. Purpose

MultiVector is a research-driven web application for creating, evaluating,
visualizing, saving, and sharing reproducible geometric algebra constructions.
Scientific reproducibility, mathematical correctness, explicit conventions, and
deterministic documents take priority while the interface remains approachable
to learners.

The project is a from-scratch successor to the private MultiVector Studio
prototype. Studio is a behavioral and scientific reference, not the
architectural starting point.

## 2. Product principles

- **PROD-001:** A document shall contain everything required to reproduce its
  mathematical state and visual presentation.
- **PROD-002:** Mathematical values, geometric interpretation, appearance, and
  UI state shall remain separate concepts.
- **PROD-003:** The public application shall run on GitHub Pages without a
  required application backend.
- **PROD-004:** Implemented features and roadmap targets shall be clearly
  distinguished.
- **PROD-005:** Scientific conventions shall be documented, versioned, and
  independently tested.
- **PROD-006:** MultiVector shall be designed as an algebra- and
  dimension-independent system.

Milestones define incremental delivery profiles and shall not become the
architectural owners of shared capabilities. Engineering milestones establish
independently testable foundations. Product milestones additionally deliver a
complete documented user workflow.

## 3. Scope and progression

Initial engineering proceeds through the language and document foundation and
the dimension-parameterized VGA core. The first product workflow adds the
renderer-independent geometry model and VGA 1D visualizer. Later product
workflows add VGA 2D and 3D, followed by PGA visual workflows in one, two, and
three dimensions and CGA visual workflows in one, two, and three dimensions.
Parametric animation and specialized algebras follow.

The architecture shall also admit fixed research definitions such as 2D CCGA or
ACGA without assuming that every algebra is a VGA/PGA/CGA family parameterized
only by dimension. These definitions are future scope, not initial deliverables.

The first scope excludes slides, visual LaTeX input, embedding-space
visualization, and a required Rust implementation.

## 4. Technology baseline

- **TECH-001:** The application shall use strict TypeScript, React, and Vite.
- **TECH-002:** React shall be limited to presentation and interaction
  composition.
- **TECH-003:** Domain code shall be testable without React or a browser DOM.
- **TECH-004:** SVG shall be the initial 1D and 2D rendering technology.
- **TECH-005:** Third-party algebra values shall be isolated behind engine
  adapters.
- **TECH-006:** Engine boundaries shall allow specialized sparse and future
  Rust/Wasm backends without changing documents or geometric entities.
- **TECH-007:** Runtime validation shall complement TypeScript at external data
  boundaries.

## 5. Architecture

```text
source -> parser and AST -> dependency analysis -> evaluator
       -> AlgebraEngine -> owned values
       -> optional GeometryInterpretation -> geometric entities
       -> render primitives -> optional visualizer
```

- **ARCH-001:** Backend values shall not cross the engine boundary.
- **ARCH-002:** React types shall not appear in the domain model.
- **ARCH-003:** Visualizers shall not parse expressions, calculate algebra, or
  branch on algebra identifiers.
- **ARCH-004:** Engines and geometry interpretations shall not produce DOM,
  SVG, React, camera, or viewport objects.
- **ARCH-005:** All document mutations shall pass through explicit application
  commands.
- **ARCH-006:** Lists and individual values shall share one primitive-rendering
  pipeline.
- **ARCH-007:** Algebra definitions shall negotiate capabilities explicitly.
- **ARCH-008:** Algebra definition, geometric interpretation, entity rendering,
  and appearance shall be independently replaceable boundaries.

ARCH-005 means that UI components do not modify document objects directly. An
edit requests a command such as “replace this source span,” “change this
appearance property,” or “set this algebra configuration.” The application
validates and applies that command as one deterministic transition. This gives
autosave, undo, redo, diagnostics, keyboard interaction, and pointer interaction
one mutation path; it does not require user-visible command syntax.

ARCH-004 does not prohibit expression-driven cameras. Camera expressions are
ordinary mathematical sources evaluated to owned values, then interpreted by a
separate camera adapter. Engines and geometry interpretations remain unaware of
camera and viewport objects.

## 6. Algebra definitions and dimensions

An algebra definition may be fixed or parameterized. Its stable identity,
parameters, versions, signature, basis, operations, and limits are governed by
the
[algebra definition requirements](requirements/algebras/algebra-definition.md).
An optional, separately versioned geometry interpretation classifies owned
values and may convert them to renderer-independent entities.

- **DIM-001:** Geometric dimension, generator count, metric signature, and
  visualization support shall be distinct concepts.
- **DIM-002:** A supported algebra configuration shall remain usable through
  textual inspection when no geometry interpretation or visualizer exists for
  its geometric dimension.
- **DIM-003:** Documents shall store an algebra definition identifier and its
  validated parameters rather than a closed family enum.
- **DIM-004:** Configuration changes shall preserve source and item identities,
  then deterministically rebuild derived language and evaluation data.
- **DIM-005:** An unavailable definition, version, or configuration shall
  preserve document content and produce a diagnostic, never a silent fallback.
- **DIM-006:** Multiple geometry interpretations may target the same algebra
  definition, but a document shall select at most one active interpretation.

The initial VGA definition is specified in
[VGA requirements](requirements/algebras/vga.md).

## 7. Document model

A versioned document shall contain an opaque immutable document identity,
`formatVersion`, `languageVersion`, an algebra reference with its independent
definition and convention versions, an optional interpretation reference,
metadata, expression items, appearance, and view state. Every item shall also
have an opaque immutable identity.

The normative version-one structure, canonicalization rules, and dependency
nodes are specified in the
[document format specification](specifications/document-format.md).

- **DOC-001:** Local, imported, exported, shared, and public documents shall use
  the same format.
- **DOC-002:** Serialization shall be canonical and deterministic.
- **DOC-003:** Loading shall validate and migrate before entering state.
- **DOC-004:** Invalid or unsupported data shall produce diagnostics and never
  execute code.
- **DOC-005:** Format, language, definition, and convention versions shall evolve
  independently.
- **DOC-006:** Source is authoritative; tokens and ASTs shall be reconstructed.
- **DOC-007:** Duplicating creates new identities; opening and importing preserve
  existing identities.
- **DOC-008:** Non-finite numbers shall be rejected and negative zero normalized.
- **DOC-009:** When geometric interpretation affects a document, the document
  shall identify its active interpretation and version independently of the
  algebra definition; no interpretation is also a valid state.
- **DOC-010:** The algebra reference shall have the canonical shape
  `{ algebraId, definitionVersion, conventionVersion, parameters }`, where
  `algebraId` is a stable reverse-DNS identifier, versions are positive
  integers, and `parameters` is a definition-owned JSON object with sorted keys.
- **DOC-011:** Unknown fields shall be rejected within the current format
  version; migrations alone may translate fields from older versions.
- **DOC-012:** A document whose algebra is unavailable shall open in a
  read-only recovery state that permits inspection and lossless export of its
  stored content, but not evaluation, source mutation, or resaving over the
  original local record.

## 8. Language and evaluation

The normative language is specified in
[language.md](specifications/language.md).

- **LANG-001:** Parsing, dependency analysis, and evaluation shall be separate.
- **LANG-002:** Names shall form an explicit dependency graph.
- **LANG-003:** Every numeric result, including a scalar, shall be a multivector.
- **LANG-004:** Missing names, duplicates, cycles, syntax, domain, capability,
  upstream, and internal failures shall have distinct diagnostics.
- **LANG-005:** Failed expressions shall produce no stale visible value while
  independent graph branches continue evaluating.
- **LANG-006:** Lists, individual values, and scalar extraction boundaries shall
  have uniform documented semantics.

## 9. Appearance and direct manipulation

- **APP-001:** Algebraic values shall not contain visual placement or style.
- **APP-002:** Appearance sources shall use the common language and dependency
  graph where supported.
- **APP-003:** Every visual item shall store visibility, label visibility, and a
  palette-independent style reference; renderers shall apply explicit defaults
  when a property is absent.
- **APP-004:** Appearance applies to a whole list in the initial workflow;
  per-element appearance is outside that workflow.
- **APP-005:** Position is a separate expression source owned by the item.
  `head` is derived, read-only, and shall never be serialized as appearance.
- **APP-006:** Document display settings shall cover numeric display precision,
  axis labels and graduation visibility, grid visibility, object-size scaling,
  and light, dark, or system theme. They are presentation-only and shall not change
  mathematical values or evaluation semantics. Persistent display settings are
  stored in view state and restored under CMD-004.
- **APP-007:** Position support shall be an explicitly enabled interpretation
  capability. It is disabled when no visualizer is active and for entity kinds
  that do not support position. Disabling it shall preserve stored position
  sources without evaluating them or attaching position diagnostics.
- **EDIT-001:** Direct manipulation shall resolve a geometric edit into a
  language-aware source edit; visualizers shall never rewrite text directly.
- **EDIT-002:** A supported edit shall replace the smallest source span whose
  scalar value controls the manipulated degree of freedom, preserving all
  unrelated whitespace, comments, syntax choice, and component sources.
- **EDIT-003:** The initial inverse-editing set is limited to numeric literals,
  unary-signed numeric literals, tuple or constructor components, and a direct
  reference to one free scalar declaration. Ambiguous, shared, cyclic, or
  compound inverse edits shall be refused without changing the document.
- **EDIT-004:** A refused manipulation shall retain selection and provide a
  textual reason; it shall not fall back to replacing the whole expression.

## 10. Commands, undo, and animation

- **CMD-001:** Commands shall produce deterministic state transitions.
- **CMD-002:** Undo and redo shall operate on documents, not UI component state.
- **CMD-003:** Gestures and playback shall use explicit coalescing policies.
- **CMD-004:** View commands shall not enter mathematical history but persistent
  view state shall be restored.
- **CMD-005:** A completed pointer or keyboard gesture shall create one undo
  entry. Repeated keyboard changes may coalesce only while they target the same
  property, remain uninterrupted, and occur within the window specified by the
  [limits and interaction constants](specifications/limits-and-constants.md).
- **CMD-006:** Text edits may coalesce while focus, item, and edit kind remain
  unchanged. Selection changes, blur, explicit commands, import, save-as, and
  algebra changes terminate coalescence.
- **CMD-007:** Undo followed by a new document mutation shall clear redo.
  Failed, cancelled, playback-only, and view-only actions shall create no
  history entry.
- **CMD-008:** Undo and redo shall restore source, appearance, controls, algebra
  configuration, and deterministic derived results atomically.
- **CTRL-001:** A scalar declaration may expose either a numeric field or a
  slider without changing its mathematical meaning; the stored source remains
  authoritative.
- **CTRL-002:** Control minimum, maximum, and step are finite scalar expressions
  shared by slider and animation behavior. They shall satisfy
  `minimum < maximum` and `step > 0`; invalid configuration disables the slider
  and animation, leaves numeric-field editing available, and reports a
  diagnostic without changing the scalar.
- **CTRL-003:** A control change uses the direct-edit rules and shall not clamp
  a stored value silently. The UI may show an out-of-range state.
- **CTRL-004:** Animation modes are `once`, `loop`, and `ping-pong`, with an
  explicit direction and positive finite duration. They interpolate from the
  configured minimum to maximum using elapsed time, independent of frame rate.
  Animation is available in both numeric-field and slider presentation modes;
  changing the control mode does not change its animation configuration.
- **ANIM-001:** Animation shall use an injectable clock and elapsed time.
- **ANIM-002:** Active playback state shall not be persisted.
- **ANIM-003:** Saving and sharing shall reproduce the visible mathematical
  value.
- **ANIM-004:** Starting playback shall snapshot the scalar source. Pausing
  commits the currently visible value as one undoable command; cancelling
  restores the snapshot without a history entry.
- **ANIM-005:** Reduced-motion mode shall never auto-start animation and shall
  provide equivalent manual scalar controls.

## 11. Persistence, import, export, and sharing

- **STORE-001:** Persistence shall use an internal storage interface; IndexedDB
  is the preferred initial implementation.
- **STORE-002:** Imports, exports, local documents, examples, and shared fragments
  shall pass through common validation.
- **STORE-003:** URL sharing shall encode a complete size-limited document after
  `#` without a server identifier.
- **STORE-004:** Public examples shall be immutable; editing creates a local copy.
- **STORE-005:** JSON export shall support archival and oversized documents.
- **STORE-006:** Local persistence shall be transactional and retain the last
  valid saved revision if quota, validation, migration, or write operations
  fail. Autosave status and failures shall be visible.
- **STORE-007:** Import shall create a new local record while preserving the
  document and item identities contained in the file; an identity collision
  shall require explicit replace or duplicate-as-new behavior.
- **STORE-008:** Export shall emit UTF-8 canonical JSON with a media type and
  filename suitable for archival. Importing that export shall reproduce the
  same canonical document.
- **STORE-009:** A shared URL shall contain an explicit share-envelope version,
  compression/encoding identifier, integrity check, and complete canonical
  document. Decoding shall occur only after encoded-size checks and before
  document validation.
- **STORE-010:** Opening a shared URL shall not write local storage. Saving it
  creates a local copy; subsequent edits shall not mutate the URL implicitly.
- **STORE-011:** If a document exceeds the URL limit, sharing shall offer JSON
  export and shall not create a partial URL.
- **STORE-012:** The application shall export the visible visualization as a
  deterministic, self-contained figure. SVG is the initial required format;
  PNG raster export may also be provided, while PDF is future scope. Exported
  figures shall inline their styles, contain no external references, reproduce
  the visible scene, and exclude interaction-only chrome. Figure export is not a
  document mutation and shall not change mathematical or viewport coordinates.

## 12. Diagnostics, limits, and security

Diagnostics shall contain a stable code, severity, affected item or property,
safe message, and optional development detail.

Initial numeric bounds, diagnostic codes, keyboard increments, target size, and
accessible-name policy are specified in
[limits and interaction constants](specifications/limits-and-constants.md).

- **ERR-001:** Unexpected exceptions shall never become unexplained empty output.
- **ERR-002:** Correcting a cause shall automatically recover dependants.
- **ERR-003:** Diagnostics shall have stable identity across unchanged
  reevaluations and deterministic ordering by document position, property, and
  code; user-facing messages shall not expose stacks or untrusted markup.
- **ERR-004:** A primary failure shall be attached to its cause. Dependants
  shall receive an upstream diagnostic that references the causing item without
  duplicating the primary message as an independent mathematical error.
- **ERR-005:** Syntax recovery may produce multiple diagnostics and editor
  structure, but no recovered AST fragment may be evaluated as the failed
  item's value.
- **ERR-006:** Unexpected failures shall be contained at item or service
  boundaries where possible. Independent items, lossless export, and recovery
  actions shall remain available.
- **SEC-001:** Imported and shared content shall be untrusted and size-limited.
- **SEC-002:** User content shall never become unsafe HTML or JavaScript.
- **SEC-003:** Local documents shall remain on-device unless explicitly exported
  or shared.
- **SEC-004:** Limits shall cover encoded and decoded document size, item count,
  source length, AST depth, dependencies, generated values, generator count,
  coefficient growth, and evaluation budget.
- **SEC-005:** Exceeding a limit shall fail without a partial or silently
  truncated mathematical result.
- **SEC-006:** Limit checks shall occur before allocation or expansion whenever
  the resulting size can be predicted, and evaluation shall support a
  deterministic work budget rather than relying on wall-clock interruption.
- **SEC-007:** URL decompression, JSON parsing, migration, dependency analysis,
  range expansion, products, and formatting shall each be bounded. Limits and
  their diagnostic codes shall be documented and tested at the boundary.
- **SEC-008:** The application shall use no dynamic code evaluation. External
  links shall be treated as untrusted, downloads shall use inert data, and a
  deployable content-security policy shall prohibit inline script execution.
- **SEC-009:** Storage and computation failures shall not corrupt the current
  in-memory source. Recovery shall include copying source and exporting any
  structurally valid document.

## 13. Accessibility

- **A11Y-001:** Document and editor actions shall be keyboard-operable.
- **A11Y-002:** Color shall not be the sole carrier of identity or state.
- **A11Y-003:** Controls shall have accessible names and errors shall be text.
- **A11Y-004:** Animation shall respect reduced motion and offer immediate pause.
- **A11Y-005:** The editor, item list, panels, dialogs, and visualizer shall have
  a logical focus order, visible focus, and no keyboard trap. Focus shall return
  predictably when transient UI closes.
- **A11Y-006:** Selection, evaluation state, diagnostics, scalar values, and
  manipulation results shall be available in text and exposed with appropriate
  names, roles, states, and relationships.
- **A11Y-007:** Pointer gestures shall have keyboard equivalents with documented
  increments; zoom shall not be required to read essential text, and targets
  shall meet the project minimums in the limits and interaction constants.
- **A11Y-008:** Status announcements shall avoid interrupting typing and
  animation frames. Critical import, save, and evaluation failures shall be
  announced once when their state changes.
- **A11Y-009:** Automated accessibility checks and manual keyboard,
  screen-reader, contrast, zoom, and reduced-motion checks shall be completion
  evidence for product milestones.

## 14. Verification

- **TEST-001:** One canonical command shall type-check, lint, test, and build.
- **TEST-002:** It shall pass without hidden expected failures.
- **TEST-003:** Fundamental operations shall have independent reference cases;
  a backend shall not be its own sole reference.
- **TEST-004:** Capability conformance suites shall apply to every backend that
  advertises the capability.
- **TEST-005:** Fixed bugs shall gain permanent regression fixtures.
- **TEST-006:** Equivalent backends shall satisfy deterministic serialization
  and versioned numerical conventions.

## 15. Initial milestones

- [Language and Document Foundation](requirements/milestones/language-foundation.md)
  is an engineering milestone.
- [VGA Core](requirements/milestones/vga-core.md) is an engineering milestone
  covering VGA dimensions 1 through 9 without requiring visualizers.
- [VGA 1D Visual Workflow](requirements/milestones/vga-1d-visual-workflow.md) is
  the first product milestone and applies the shared
  [1D visualization requirements](requirements/visualization/1d.md). It also
  delivers the first renderer-independent geometry entities and
  render-primitive adapters; no separate initial geometry-model milestone is
  required.

Later product milestones add VGA 2D and 3D, PGA 1D, 2D, and 3D, and CGA 1D, 2D,
and 3D visual workflows. Parametric animation and specialized algebras receive
separate approved milestone requirements when they enter active design.

## 16. Lessons from MultiVector Studio

Studio validated algebra-bound evaluation factories, adapter registries,
positioned vectors, list broadcasting, scalar controls, direct manipulation,
scientific graph fixtures, shared 2D/3D rendering, and specialized CCGA/ACGA
engines and geometric interpretations.

The new architecture shall avoid backend values leaking into UI code, informal
mixed value models, algebra-identifier branches in shared panels, duplicated
list rendering, repeated presentation-layer parsing, and documents coupled to a
server or backend implementation.

## 17. Documentation structure and evolution

Requirements state what MultiVector guarantees. Specifications define precise
normative behavior. Architecture documents explain implementation boundaries.
Milestones compose requirements instead of duplicating them.

- This document owns behavior and quality shared across algebras and
  visualizers.
- `specifications/language.md` owns normative source syntax and evaluation
  semantics.
- `specifications/document-format.md` owns the serialized schema,
  canonicalization, migration boundary, and dependency-node model.
- `specifications/limits-and-constants.md` owns shared resource bounds and
  interaction constants.
- `requirements/algebras/algebra-definition.md` owns the contract implemented
  by algebra definitions and interpretations.
- `requirements/algebras/vga.md` owns mathematical behavior and conventions
  specific to VGA(n).
- `requirements/visualization/1d.md` owns rendering and interaction common to
  one-dimensional visualizers.
- `requirements/milestones/*.md` own the composed capability profiles and
  evidence actually required for delivery.

If two documents appear to own the same rule, the rule shall be stated
normatively only in the document selected by this list; other documents shall
link to it or state milestone applicability.

Normative documents declare one of: **Planned**, **Draft for review**,
**Accepted**, **Implemented**, or **Superseded**. Moving requirements should
preserve identifiers whenever possible.

Future documents include 2D/3D visualization requirements, PGA/CGA and
specialized-algebra requirements, geometry and render specifications,
architecture, development and deployment guides, and tutorials.
They shall be created when their subject enters active design, not as empty
stubs.

## 18. Future design topics

Visual LaTeX editing, sampled parametric functions, nested and filtered lists,
complex inverse editing, dynamic or per-element appearance, expression-driven
cameras, higher-dimensional visualization, explicit multi-digit blade syntax,
Rust/Wasm, user-authored algebra definitions and geometry interpretations,
configurable constructor names, and hosted short links each require a separate
approved design before implementation.

Expression-driven camera design shall cover these initial dimensional profiles:

- a 1D camera uses `camera_position`, interpreted as a 1D VGA vector or a 1D
  point for point-based interpretations, and a positive scalar `camera_zoom`;
- a 2D camera uses the corresponding 2D vector or point `camera_position` and a
  positive scalar `camera_zoom`;
- a 3D camera uses a 3D vector or point `camera_position` for the eye and a
  non-zero 3D vector `camera_direction` for its world-space viewing direction.

Camera sources shall use the common language, dependency graph, animation, and
language-aware inverse-editing rules. Literal camera sources may be rewritten by
camera gestures; computed sources own the corresponding camera degree of freedom
and may drive reproducible world-space camera animation. A camera adapter, not
the algebra engine or geometry interpretation, converts evaluated values into
viewport state. The detailed design shall define enablement, invalid values,
defaults, gesture ownership, history, and serialization before implementation.
