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

The document evaluator resolves forward references, evaluates acyclic
dependencies in dependency order, and reports source-localized missing-name,
duplicate-name, cycle, and invalid-dependency diagnostics while independent
branches continue evaluating. Values pass through the isolated algebra-engine
adapter and value-based standard interpretation. Supported vectors render
together in list order. Each row also owns an optional position expression;
positioned vectors render from that position to their derived head, while
`V.position` and `V.head` may be referenced by other expressions. Position
metadata remains separate from the vector's multivector coefficients. Scalars,
bivectors, and mixed-grade values retain textual states when the viewport has
no spatial interpretation for them.

Persistence, lists, appearance controls, direct manipulation, animation, and
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
