# MultiVector

**Interactive geometric algebra constructions for research, exploration, and
learning.**

MultiVector is a research-driven visual tool for building geometric
constructions directly with multivector expressions.

It is developed as part of PhD research and is intended to grow into a public,
open-source tool for the geometric algebra community, with an interface that is
also approachable for learners.

MultiVector is under active research development.

## Project status

MultiVector is under active research development. The current implementation is
an initial VGA(2) vertical slice: users can create, edit, and delete an ordered
list of scalar, compact-blade (`e1`, `e2`, `e12`, `e21`), `vector(x, y)`, or
concise tuple-vector `(x, y)`
expressions. Rows may declare names and refer to declarations in other rows:

```text
V1 = (1, 1)
V2 = (2, 1)
B = V1 * V2
```

The current geometric-operation subset includes outer product `^`, inner
product `|`, regressive product `&`, reverse `~`, dual `!`, grade involution,
the pseudoscalar `ps`, grade projections, and blade-coefficient extraction.
Reverse, dual, and grade involution also have the canonical postfix forms
`.reverse`, `.dual`, and `.involution`. For example:

```text
area = V1 ^ V2
dot = V1 | V2
vectorPart = (1 + V1 + 3e12).g1
involuted = (1 + V1 + 3e12).involution
```

VGA(2) rotor support includes scalar trigonometric and hyperbolic functions,
closed-form multivector exponentials, integer powers, inverse and division,
the primary norm, explicit normalization, and the sandwich action. For example,
`exp(-(pi/4) * e12) >>> e1` rotates `e1` to `e2`.

Lists are ordered, flat collections with stable element identities. The
language supports list literals, arithmetic integer ranges, zero-based
indexing, and value/list or compatible list/list broadcasting. For example,
`V = [1...3] * e1` creates three vectors and `V[1]` selects the second. Vector
and bivector list elements retain separately evaluated positions and render in
prefix order up to the documented visual limit.

The document evaluator resolves forward references, evaluates acyclic
dependencies in dependency order, and reports source-localized missing-name,
duplicate-name, cycle, and invalid-dependency diagnostics while independent
branches continue evaluating. Values pass through the isolated algebra-engine
adapter and value-based standard interpretation. The expression panel identifies
scalars, vectors, bivectors, rotors, and mixed multivectors before showing their
canonical values. Supported vectors and bivectors, including list elements,
render together in list order. Expression rows provide separate visibility and
appearance controls, Studio-compatible semantic color styles, configurable
labels, and natural VGA normalization for individual vectors and bivectors.
Appearance applies to a whole list and never changes its element values. Hidden
objects retain their evaluated text. The application supports persistent
system, light, and dark theme selection. Additional viewport display settings
remain part of future view-state controls. Each single-vector or single-bivector
row also owns an optional position expression; lists instead preserve the
inherited positions of their elements. Positioned vectors render from that
position to their derived head. Positioned bivectors render as signed
oriented-area loops; a direct `V ^ W` uses an oriented parallelogram when its
construction is safely available. `V.position` and `V.head`, and `B.position`,
may be referenced by other expressions. Position metadata remains separate from
multivector coefficients. Scalars, rotors, and mixed-grade values retain
textual states when the viewport has no spatial visualization for them. The
header's VGA badge opens an algebra-information sheet, and the bottom of the
expression panel provides a reference limited to the expression syntax
currently implemented. A neighboring clear control requires a one-second
pointer or keyboard hold, removes all expressions and their appearance records,
and returns focus to the add-expression control.

Documents are saved locally after valid edits. The header provides explicit
canonical JSON import and export; imports are validated before replacing the
open document, and failed writes retain the last saved revision.

The two-dimensional viewport supports cursor-centered wheel zoom, pointer pan,
keyboard pan and zoom, and reset to the origin. Controls in the canvas corner
zoom, reset the view, and widen the expression panel until the canvas is square.
The header's display settings menu gives the adaptive grid, axes and labels,
graduations, object size, and application theme independent persistent controls;
view-only changes remain outside mathematical undo history.

`Enter` adds an expression below the active expression or position field;
`Shift+Enter` adds one above. Evaluated lists can be expanded to inspect each
element's index, semantic type, canonical value, and inherited position.

Scalar controls, direct manipulation, animation, and additional algebras remain
planned work.

The current public application delivers the accepted VGA 2D Foundation
workflow. Broader geometry and interaction capabilities remain incremental.

The keyboard-only [VGA 2D Foundation example](docs/examples/vga-2d-foundation.md)
and its [acceptance record](docs/acceptance/vga-2d-foundation.md) track the
accepted release workflow and its evidence.
The example is loaded as the default graph only when no local document exists.

## Documentation

- [Design requirements](docs/design-requirements.md)
- [Requirement identifier convention](docs/requirements/identifier-convention.md)
- [Requirement prefix registry](docs/requirements/requirement-prefix-registry.md)
- [Application architecture](docs/architecture/application-architecture.md)
- [Technology decisions](docs/architecture/technology-decisions.md)
- [Expression language](docs/specifications/language.md)
- [Document format](docs/specifications/document-format.md)
- [Limits and interaction constants](docs/specifications/limits-and-constants.md)
- [VGA convention version 1](docs/specifications/vga-conventions.md)
- [Algebra definition requirements](docs/requirements/algebras/algebra-definition.md)
- [VGA requirements](docs/requirements/algebras/vga.md)
- [2D visualization requirements](docs/requirements/visualization/2d.md)
- Milestones:
  [language foundation](docs/requirements/milestones/language-foundation.md),
  [VGA core](docs/requirements/milestones/vga-core.md),
  [VGA 2D foundation](docs/requirements/milestones/vga-2d-foundation.md), and
  [VGA 2D visual workflow](docs/requirements/milestones/vga-2d-visual-workflow.md)
- [Project workflow](docs/project-workflow.md)
- [MultiVector GitHub Project](https://github.com/users/eharquin/projects/3)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing substantial changes.
