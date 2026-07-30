# Contributing to MultiVector

Thank you for your interest in MultiVector.

MultiVector is currently in its initial design and development phase. Its
architecture, expression language, document format, and public APIs are not yet
stable.

## Before contributing

Please open an issue before starting substantial work. This allows the scope,
scientific conventions, and proposed design to be discussed before
implementation begins.

Small corrections to documentation may be submitted directly as pull requests.
The complete issue, branch, commit, review, and merge process is documented in
the [project workflow](docs/project-workflow.md).

## Reporting issues

When reporting a mathematical or visualization problem, please include:

- the active algebra and geometric dimension;
- the complete expressions needed to reproduce the problem;
- the expected mathematical result;
- the observed result;
- browser and operating-system information when relevant.

Please do not use public issues to report security vulnerabilities or private
conduct concerns.

## Pull requests

Once implementation begins, pull requests that change behavior will be required
to pass the documented project verification suite. Pull requests should:

- address a documented issue or an agreed change;
- remain focused on one concern;
- include tests for new behavior;
- update the relevant documentation;
- pass the complete project verification suite.

## Scientific conventions

Changes involving basis order, metric signature, duality, products, geometric
interpretation, or numerical tolerances must document the convention and
provide reference cases.

## Code documentation

MultiVector uses TSDoc-compatible comments for exported APIs that express a
domain boundary, mathematical convention, non-obvious invariant, ownership
rule, or failure contract. Comments should explain intent and constraints that
the TypeScript signature cannot express; they should not repeat names, types,
or implementation steps.

Keep architectural relationships in the
[application architecture](docs/architecture/application-architecture.md) and
normative behavior in the owning requirement or specification. Link to those
documents from code only when the connection would otherwise be unclear.
Generated API documentation is not currently published or required by CI, but
using TSDoc syntax keeps that option open for a future TypeDoc integration.

## Code of conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).
