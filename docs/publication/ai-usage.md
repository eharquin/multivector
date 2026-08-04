# Generative AI Usage Record

JOSS requires transparent disclosure of generative AI used in software,
documentation, or paper creation. This living record supports an accurate final
disclosure; it does not transfer authorship, responsibility, or scientific
judgment to an AI system.

## Responsibilities

- Human authors own problem framing, requirements, mathematical conventions,
  architecture, acceptance decisions, authorship, and publication claims.
- AI-assisted output is reviewed and edited by a human before merge.
- Code changes must pass the same type checking, linting, automated tests,
  independent mathematical fixtures, review, and deployed acceptance process as
  human-drafted changes.
- AI output is not evidence of correctness, originality, research impact, or
  scholarly significance.

## Usage register

### 2026-07 to present — Development and documentation assistance

- Tool: OpenAI Codex, using GPT-5-family agentic models provided by the service;
  exact backend build identifiers were not recorded for early sessions.
- Areas: repository inspection, issue and pull-request drafting, implementation
  suggestions, code generation and refactoring, test scaffolding, documentation
  drafting, and verification orchestration.
- Scope: assistance has been used across early MultiVector development. The Git
  history and pull requests identify the resulting changes, but do not currently
  attribute assistance at individual-line granularity.
- Human review: the maintainer selects scope and design, reviews changes and
  diffs, runs or requires `npm run verify`, controls merges, and remains
  responsible for mathematical conventions and release claims.
- Known limitation: model/build metadata and exact per-change contribution were
  not captured consistently from project inception. Future material changes
  should add dated entries below with the information exposed by the tool.

## Entry template

```markdown
### YYYY-MM-DD — Task or release

- Tool, model, and version/build if exposed:
- Files or work areas:
- Nature and scope of assistance:
- Human-authored core decisions:
- Human review and edits:
- Automated and scientific verification:
- Related issue, PR, commit, or release:
```

## Paper disclosure preparation

Before submission, synthesize this register into the required paper section.
Re-check the current JOSS policy, identify all tools and known versions, explain
where and how they were used, describe human review and validation, and disclose
any record limitations plainly. Do not use generative AI for author/editor or
author/reviewer conversations except where the policy explicitly permits it.

## Update policy

- Add an entry for materially new tools, models, workflows, or release-scale
  assistance.
- Record model/version information at the time of use when available.
- Link release-level entries to issues or PRs instead of attempting unreliable
  line-by-line reconstruction.
- Review this record at every tagged release and before drafting the paper.

