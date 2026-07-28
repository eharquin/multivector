# MultiVector Design Requirements

**Status:** Draft for review
**Date:** 2026-07-28
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

MultiVector is planned to progress through the following engineering and product
milestones:

1. **Language and Document Foundation — Engineering:** Deliver the selected
   language frontend, dependency analysis, deterministic evaluation,
   diagnostics, canonical document format, validation, migrations, and resource
   limits without requiring a visualizer.

2. **VGA Core — Engineering:** Deliver one dimension-parameterized VGA
   definition with complete textual and computational support for dimensions 1
   through 3, independently of geometric interpretation and rendering.

3. **VGA 1D Foundation — Product:** Deliver the first public, text-driven
   workflow with renderer-independent geometry entities, the VGA 1D visualizer,
   local persistence, canonical JSON import and export, accessibility, and
   GitHub Pages deployment.

4. **VGA 1D Interactive Workflow — Product:** Add direct manipulation, inverse
   source editing, scalar controls, animation, URL sharing, advanced history
   behavior, and deterministic figure export to the VGA 1D foundation.

5. **VGA 2D Visual Workflow — Product:** Extend the standard VGA interpretation,
   renderer-independent geometry model, interaction model, and visualization
   pipeline to two-dimensional geometry.

6. **VGA 3D Visual Workflow — Product:** Extend the same architecture to
   three-dimensional VGA geometry, including the required camera and
   interaction design.

7. **Higher-Dimensional VGA Evaluation — Engineering:** Activate and verify
   textual and computational VGA support for dimensions 4 through 9 without
   requiring corresponding geometric visualizers.

8. **PGA Visual Workflows — Product:** Introduce versioned PGA definitions and
   interpretations, followed by independently scoped 1D, 2D, and 3D visual
   workflows.

9. **CGA Visual Workflows — Product:** Introduce versioned CGA definitions,
   source basis conventions, interpretations, and independently scoped 1D, 2D,
   and 3D visual workflows.

10. **Parametric Constructions — Product:** Add sampled parametric expressions,
    animation beyond scalar controls, and the associated evaluation, history,
    rendering, and resource-limit behavior.

11. **Specialized Research Algebras — Research and Product:** Admit fixed
    definitions such as 2D CCGA or ACGA without assuming that every algebra is a
    dimension-parameterized member of the VGA, PGA, or CGA families.

Milestones 1 through 4 define the currently approved initial progression.
Milestones 5 through 11 are planned directions whose detailed scope,
requirements, ordering, and delivery boundaries require separate review before
implementation. The numbering expresses the present progression model, not a
permanent release number or a commitment to implement every later milestone in
strict sequence.

The initial scope excludes slides, visual LaTeX input, embedding-space
visualization, and a required Rust implementation.

## 4. Technology baseline

- **TECH-001:** The primary production application and domain code shall use
  TypeScript with strict type checking. The initial user interface shall use
  React, and the application shall be developed and built with Vite. A selected
  language runtime and specialized computation backends may use other languages
  behind the frontend and engine boundaries defined by LANG-008, TECH-005, and
  TECH-006; their public contracts remain MultiVector-owned TypeScript data.
- **TECH-002:** React shall be limited to presentation and interaction
  composition.
- **TECH-003:** Domain code shall be testable without React or a browser DOM.
- **TECH-004:** The initial rendering technology shall support accessible,
  deterministic web rendering and the figure-export guarantees activated by a
  milestone. The selected rendering implementation is an architecture decision.
- **TECH-005:** Third-party algebra values shall be isolated behind engine
  adapters.
- **TECH-006:** Engine boundaries shall allow specialized sparse and future
  Rust/Wasm backends without changing documents or geometric entities.
- **TECH-007:** Runtime validation shall complement TypeScript's static type
  checking at external data boundaries.
- **TECH-008:** Before the language and document format are frozen, the initial
  language/runtime stack shall be selected through the candidate comparison in
  [technology-decisions.md](architecture/technology-decisions.md). A candidate
  shall satisfy the common conformance, security, deployment, reproducibility,
  accessibility, and interaction requirements. The initial product shall not
  be required to ship multiple language/runtime stacks.

The restricted-Python candidate uses CPython syntax and AST locations, a
MultiVector-owned accepted subset and evaluator, immutable Python-backed list
records, and Kingdon through an adapter in a bundled Pyodide worker. It reduces
project-owned grammar work and offers a path to pure functions and
comprehensions, but adds a Python runtime, cross-language protocol, packaging
cost, source-location conversion, and Python-specific security review.

The owned-language candidate retains the project tokenizer, AST, recovery,
GA-specific syntax, list rules, and direct-edit spans, then invokes ganja.js
through explicit TypeScript adapter operations. It avoids a Python runtime and
keeps complete syntax and diagnostic control, but makes MultiVector responsible
for every grammar, function, comprehension, and evaluator extension.

Both candidates require MultiVector-owned values, lists, dependency behavior,
diagnostics, limits, and conventions. Neither raw Python lists, JavaScript
arrays, Kingdon broadcasting, nor ganja.js inline translation may define those
public guarantees. TECH-008 shall be resolved from common evidence rather than
from third-party feature demonstrations.

## 5. Architecture

```text
source -> LanguageFrontend -> dependency plan -> controlled evaluator
       -> AlgebraEngine -> owned values
       -> optional GeometryInterpretation -> geometric entities
       -> render primitives -> optional visualizer
```

- **ARCH-001:** Backend-native values and APIs shall not cross the engine
  boundary; only MultiVector-owned values, diagnostics, and capability
  descriptors may cross it.
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
- **ARCH-009:** Language-frontend parse structures, backend-native values,
  generated code, runtime exceptions, and third-party serialization shall not
  become authoritative document data or public domain contracts.

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
- **DIM-007:** The abstract metric, its signature, the canonical computational
  basis, registered source basis frames, and the basis used for display are
  distinct concepts. A change of basis shall not be modeled as a change of
  algebraic value or metric.

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
- **DOC-011:** Unknown fields shall be rejected within closed normative objects
  of the current format version. A format version may define explicit extension
  containers, but extension data shall be size-limited, non-executable, and
  unable to alter language or evaluation semantics.
- **DOC-012:** A document whose algebra is unavailable shall open in a
  read-only recovery state that permits inspection and lossless export of its
  stored content, but not evaluation, source mutation, or resaving over the
  original local record.

## 8. Language and evaluation

The common guarantees below apply to either candidate language/runtime stack.
The owned-language candidate is specified in
[language.md](specifications/language.md), and the restricted-Python candidate
is specified in
[python-expression-profile.md](specifications/python-expression-profile.md).
Neither candidate specification is normative until TECH-008 is resolved.

- **LANG-001:** Source analysis, dependency analysis, and evaluation shall be
  separate boundaries. The selected frontend may use an implementation-runtime
  parser, but evaluation shall accept only its validated source plan.
- **LANG-002:** Names shall form an explicit dependency graph.
- **LANG-003:** Every numeric result, including a scalar, shall be a multivector.
- **LANG-004:** Missing names, duplicates, cycles, syntax, domain, capability,
  upstream, and internal failures shall have distinct diagnostics.
- **LANG-005:** Failed expressions shall produce no stale visible value while
  independent graph branches continue evaluating.
- **LANG-006:** Lists, individual values, and scalar extraction boundaries shall
  have uniform documented semantics.
- **LANG-007:** The selected language shall define its accepted source forms,
  precedence, name binding, source locations, list behavior, capability access,
  and future-extension boundary independently of backend accidents.
- **LANG-008:** A language frontend shall return MultiVector-owned declarations,
  dependency references, source locations, limit charges, and diagnostics.
  Frontend-native tokens or AST nodes shall remain derived internal data.
- **LANG-009:** The initial document format shall select one language profile.
  Supporting documents in multiple source languages requires a separately
  approved language-identity and migration design.

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

The direct-manipulation requirements below have **Milestone** commitment and
apply only to milestones that explicitly include interactive source editing.

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

The scalar-control and animation requirements below have **Milestone**
commitment and apply only to milestones that explicitly include controls or
animation.

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

Local persistence and canonical JSON import/export are **Core**. URL sharing
requirements STORE-003 and STORE-009 through STORE-011, and figure export
requirement STORE-012, have **Milestone** commitment.

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
- **SEC-008:** Document source shall never be passed to a general-purpose
  dynamic evaluator or interpolated into generated host-language code. Trusted
  backend-internal code generation is permitted only inside an isolated worker
  when it consumes validated owned structures rather than source text or user
  identifiers, is covered by security review and conformance tests, and remains
  compatible with the deployable content-security policy. External links shall
  be treated as untrusted, downloads shall use inert data, and the policy shall
  prohibit inline script execution.
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
- **TEST-006:** When multiple backends are declared conforming for an equivalent
  supported configuration, they shall satisfy deterministic serialization and
  versioned numerical conventions. No milestone is required to deliver a second
  backend unless its capability profile explicitly says so.
- **TEST-007:** The canonical verification command shall run automatically on
  every pull request targeting the primary branch and on every push to that
  branch.
- **TEST-008:** A change shall not be eligible for merge when its required
  automated verification fails or has not completed.
- **TEST-009:** Local and continuous-integration verification shall invoke the
  same project-owned commands and shall not rely on tests available only in the
  continuous-integration environment.

The following deployment requirements have **Milestone** commitment and apply
only to milestones that deliver a public application:

- **TEST-010:** A successful revision selected for public release shall deploy
  its production artifact to the configured GitHub Pages environment through an
  automated, reproducible workflow.
- **TEST-011:** A failed build or pre-deployment validation shall not replace
  the last successfully deployed production artifact. A failed deployment or
  post-deployment smoke test shall report failure and retain the revision and
  evidence required to restore the last successful deployment.

## 15. Initial milestones

- [Language and Document Foundation](requirements/milestones/language-foundation.md)
  is an engineering milestone.
- [VGA Core](requirements/milestones/vga-core.md) is an engineering milestone
  covering VGA dimensions 1 through 3 without requiring visualizers.
- [VGA 1D Foundation](requirements/milestones/vga-1d-foundation.md) is the first
  product milestone, delivers the initial text-driven public workflow, and
  introduces the first renderer-independent geometry entities and
  render-primitive adapters.
- [VGA 1D Visual Workflow](requirements/milestones/vga-1d-visual-workflow.md) is
  the subsequent interactive product milestone and applies the shared
  [1D visualization requirements](requirements/visualization/1d.md).

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
Requirement and acceptance-criterion identifiers follow the
[requirement identifier convention](requirements/identifier-convention.md).
The current prefixes, their scope, and their normative owner are listed in the
[requirement prefix registry](requirements/requirement-prefix-registry.md).

- This document owns behavior and quality shared across algebras and
  visualizers.
- `specifications/language.md` specifies the owned-language candidate.
- `specifications/python-expression-profile.md` specifies the restricted-Python
  candidate.
- `architecture/technology-decisions.md` owns the candidate comparison,
  evidence requirements, and eventual selection record.
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
follow the identifier lifecycle rules and preserve identifiers whenever their
meaning and registered scope remain compatible.

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
