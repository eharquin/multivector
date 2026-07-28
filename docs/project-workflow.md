# Project Workflow

MultiVector uses GitHub issues, the
[MultiVector GitHub Project](https://github.com/users/eharquin/projects/3),
short-lived branches, pull requests, and review to keep design and
implementation history understandable. The project is the authoritative view of
planned and active work; repository milestones track larger delivery outcomes.

## 1. Plan the change

Open or select a GitHub issue before substantial work. Record the problem,
scope, relevant requirement identifiers, scientific conventions, and completion
evidence. Resolve design questions before implementation when a change affects
the document format, language, algebra semantics, geometry interpretation, or
public workflow.

Small corrections that do not change behavior may go directly to a pull request.

Add planned issues to the project and classify them with its fields:

- `Status`: `Backlog`, `Ready`, `In progress`, `In review`, or `Done`;
- `Priority`: `P0` through `P3`;
- `Size`: `XS`, `S`, `M`, `L`, or `XL`;
- `Type`: `Feature`, `Engineering`, `Documentation`, `Research`, or `Bug`;
- `Area`: `Language`, `Document`, `Algebra`, `VGA`, `Geometry`,
  `Visualization`, `UI`, or `Infrastructure`;
- `Estimate` and `Iteration` when the work has been scheduled.

Use parent issues and sub-issues for work that must be decomposed. An issue moves
from `Backlog` to `Ready` only when its scope and acceptance evidence are clear
enough to begin without another design decision.

## 2. Create a focused branch

Start from an up-to-date `main` and create a short-lived branch named for its
purpose:

```text
docs/document-format
feat/vga-engine
fix/range-cardinality
```

Keep one concern per branch. Do not mix unrelated formatting or refactoring with
the intended change. Move the project item to `In progress` when work begins.

## 3. Develop with evidence

Make small, reviewable commits with imperative summaries. Keep normative
requirements, implementation, tests, fixtures, and user documentation aligned.
Mathematical behavior requires independent reference cases; fixed bugs require a
permanent regression fixture.

Before pushing, run the canonical verification command once it exists. During
the design-only phase, check Markdown links, requirement identifiers, formatting,
and the rendered GitHub preview, including Mermaid diagrams.

## 4. Open and review the pull request

The pull request shall link its issue, explain the outcome and design choices,
identify changed requirements, and list verification evidence. Draft pull
requests are appropriate for early design discussion.

Link the pull request to its issue and move the project item to `In review` when
it is ready for review. A draft that still needs implementation remains
`In progress`.

Review checks correctness, scope, reproducibility, accessibility, security,
documentation ownership, and migration or compatibility effects. Required
automated checks and review conversations shall be resolved before merge.

## 5. Merge and follow up

Merge only when the pull request is focused, reviewed, documented, and green.
The repository's selected merge strategy shall leave a meaningful history and
place the issue reference in the resulting commit or pull request record.
Delete the merged topic branch and confirm that the project item is `Done`.
Record intentionally deferred work as a separate issue in `Backlog` rather than
an undocumented comment or placeholder requirement.

Milestone completion additionally requires the acceptance evidence named by its
milestone document. Changing a document status to **Implemented** requires that
evidence; merging a requirements document alone does not imply implementation.
