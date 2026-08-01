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
render together in list
order. Each single-vector or single-bivector row also owns an optional position
expression; lists instead preserve the inherited positions of their elements.
positioned vectors render from that position to their derived head. Positioned bivectors render as
signed oriented-area loops; a direct `V ^ W` uses an oriented parallelogram when
its construction is safely available. `V.position` and `V.head`, and
`B.position`, may be referenced by other expressions. Position metadata remains
separate from multivector coefficients. Scalars, rotors, and
mixed-grade values retain textual states when the viewport has no spatial
visualization for them. The header's VGA badge opens an algebra-information
sheet, and the bottom of the expression panel provides a reference limited to
the expression syntax currently implemented.

Persistence, appearance controls, direct manipulation, animation, and
additional algebras remain planned work.
The current slice is implementation evidence toward the VGA 2D Foundation, not
a completed public release.

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
