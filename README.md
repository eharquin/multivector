# GAMUT

**Geometric Algebra Multivector Unveiling Tool**

GAMUT (**Geometric Algebra Multivector Unveiling Tool**) is a browser-based
environment for writing multivector expressions and turning them into
interactive geometric constructions. It is developed as part of PhD research
and is intended for geometric-algebra research, exploration, and learning.

> **Project status:** Release `0.1.0` shipped under the former product name
> **MultiVector** and established the VGA(2) workflow and canonical document
> contract. Current development introduces the GAMUT name and the first PGA(2)
> workflow while preserving existing documents and browser sessions.

[Open the public application](https://eharquin.github.io/multivector/)

## About the name

The word *gamut* comes from Medieval Latin *gamma ut*, the name of the lowest
note in the medieval musical system. It later came to mean the full range of
something. GAMUT aims to reveal the full range of geometric objects encoded by
multivectors and make their abstract language visible and learnable.

Source: [Oxford Learner's Dictionaries — gamut](https://www.oxfordlearnersdictionaries.com/definition/english/the-gamut).

## Current capabilities

- Write named scalar and multivector expressions with dependencies, geometric
  products, outer and inner products, duality, grade operations, rotors, lists,
  ranges, indexing, and broadcasting.
- Visualize and style VGA(2) vectors and bivectors, and PGA(2) points, ideal
  points, and lines, in a navigable viewport.
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

Chrome and Firefox on Linux and Safari on macOS were validated for `0.1.0`;
Edge, touch input, and mobile browsers were not claimed. The exact support
matrix and evidence are recorded in the
[0.1 acceptance record](docs/acceptance/vga-2d-visual-workflow.md).

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
- [GAMUT GitHub Project](https://github.com/users/eharquin/projects/3)

## Contributing and citation

GAMUT is open-source software under the [MIT License](LICENSE). Read the
[contribution guide](CONTRIBUTING.md) before proposing substantial work. If you
use GAMUT in research, citation metadata is available in
[`CITATION.cff`](CITATION.cff). Its `0.1.0` entry intentionally retains the
historical MultiVector name; the title, version, date, and repository metadata
will change together for the first release shipped as GAMUT.
