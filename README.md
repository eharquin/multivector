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
list of independent scalar, compact-blade (`e1`, `e2`, `e12`, `e21`), or
`vector(x, y)` expressions. Each expression is tokenized, parsed, lowered to
core algebra operations, evaluated through an isolated algebra-engine adapter,
inspected as an owned multivector value, and given a value-based standard
interpretation. Supported vectors render together in list order; scalars,
bivectors, and mixed-grade values retain textual states when the viewport has
no spatial interpretation for them.

Declarations, dependency graphs, persistence, positioning, direct manipulation,
animation, and additional algebras remain planned work.
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
