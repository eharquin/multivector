# MultiVector

**Interactive geometric algebra constructions for research, exploration, and
learning.**

MultiVector is a browser-based tool for writing multivector expressions and
turning them into interactive geometric constructions. It is developed as part
of PhD research and is intended for both geometric-algebra research and
learning.

> **Project status:** MultiVector is preparing its first `0.1.0` release. The
> current implemented scope is a two-dimensional vector geometric algebra
> workflow, VGA(2). Other algebras are future work, and compatibility is not yet
> guaranteed.

[Open the public application](https://eharquin.github.io/multivector/)

## Current capabilities

- Write named scalar and multivector expressions with dependencies, geometric
  products, outer and inner products, duality, grade operations, rotors, lists,
  ranges, indexing, and broadcasting.
- Visualize and style VGA(2) vectors and bivectors in a navigable viewport.
- Position and directly manipulate eligible objects with pointer or keyboard
  controls, with undo and redo.
- Drive constructions with scalar sliders and deterministic playback.
- Save the active document locally and import or export canonical JSON.

For example:

```text
V1 = (1, 1)
V2 = (2, 1)
area = V1 ^ V2
rotated = exp(-(pi / 4) * e12) >>> V1
```

The [expression language specification](docs/specifications/language.md)
defines the supported syntax and operations.

## Getting started

### Prerequisites

- Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0`;
- npm, included with Node.js;
- a modern desktop browser.

Chrome, Firefox, Edge, and Safari are the browser targets for `0.1.0`. Exact
support claims will be recorded in the
[0.1 acceptance record](docs/acceptance/vga-2d-visual-workflow.md) after the
cross-browser validation is complete.

### Run locally

```sh
git clone https://github.com/eharquin/multivector.git
cd multivector
npm ci
npm run dev
```

The development server prints the local application URL when it starts.

### Verify and preview a production build

```sh
npm run verify
npm run preview
```

`npm run verify` runs type checking, linting, the complete test suite, and the
production build. `npm run preview` serves the resulting `dist` directory
locally. Pull requests and pushes to `main` run the same verification. A
published stable release deploys the public site automatically; a maintainer
may also deploy a chosen ref by hand, for browser testing before a release.

## Release status

Release `0.1.0` is the first stable VGA(2) release. The
[VGA 2D Foundation](docs/acceptance/vga-2d-foundation.md) is accepted and the
[VGA 2D Visual Workflow acceptance record](docs/acceptance/vga-2d-visual-workflow.md)
holds the browser matrix and release evidence. The
[0.1.0 release notes](docs/releases/0.1.0.md) summarize the scope, supported
browsers, and known limitations.

The keyboard-only
[VGA 2D Foundation example](docs/examples/vga-2d-foundation.md) is loaded for a
new browser session when no local document exists. The
[PGA 2D Foundation example](docs/examples/pga-2d-foundation.md) walks through
the plane-based projective workflow, which is in progress toward its own
[acceptance record](docs/acceptance/pga-2d-foundation.md).

See the [roadmap](ROADMAP.md) for the planned multi-algebra and research-release
work, and the [changelog](CHANGELOG.md) for user-visible changes.

## Documentation

- [Design requirements](docs/design-requirements.md)
- [Application architecture](docs/architecture/application-architecture.md)
- [Technology decisions](docs/architecture/technology-decisions.md)
- [Expression language](docs/specifications/language.md)
- [Canonical document format](docs/specifications/document-format.md)
- [VGA convention version 1](docs/specifications/vga-conventions.md)
- [PGA convention version 1](docs/specifications/pga-conventions.md)
- [Limits and interaction constants](docs/specifications/limits-and-constants.md)
- [Project workflow](docs/project-workflow.md)
- [JOSS readiness](docs/publication/joss-readiness.md)
- [MultiVector GitHub Project](https://github.com/users/eharquin/projects/3)

## Contributing and citation

MultiVector is open-source software under the [MIT License](LICENSE). Read the
[contribution guide](CONTRIBUTING.md) before proposing substantial work. If you
use MultiVector in research, citation metadata is available in
[`CITATION.cff`](CITATION.cff).
