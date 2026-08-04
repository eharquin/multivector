# JOSS Readiness

**Last reviewed:** 2026-08-04  
**Repository public since:** 2026-07-20  
**Status:** Preparation; not eligible for submission

This matrix tracks evidence against the current
[JOSS submission requirements](https://joss.readthedocs.io/en/latest/submitting.html),
[review criteria](https://joss.readthedocs.io/en/latest/review_criteria.html),
and [paper format](https://joss.readthedocs.io/en/latest/paper.html). JOSS policy
may change; re-check the official documentation before every release-readiness
review and before submission.

## Mandatory pre-review gates

| Criterion | State | Evidence | Next action |
| --- | --- | --- | --- |
| Public development for more than six months | In progress | Public repository created 2026-07-20; public issues, PRs, and commits follow | Maintain distributed public development and releases; do not mark complete before the applicable policy window |
| Demonstrated research impact | Not yet evidenced | The [README](../../README.md) identifies PhD research intent; no public use record yet | Record concrete internal research use and seek external validation in [research impact](research-impact.md) |
| Good open-source practice | Partially met | [MIT license](../../LICENSE), [contribution guide](../../CONTRIBUTING.md), [code of conduct](../../CODE_OF_CONDUCT.md), CI, issues, and PRs | Add support/governance expectations and tagged releases |
| Iterative development over time | In progress | Public history begins 2026-07-20 with focused issues and reviewed increments | Continue releases and evidence refinement through real use rather than one concentrated feature burst |
| Feature-complete stated scope | Not yet | Accepted [VGA(2) foundation](../acceptance/vga-2d-foundation.md) | Deliver stable VGA(2) and PGA(2) release workflows and explicitly bound the paper's claims |

## Software review criteria

| Criterion | State | Evidence | Gap |
| --- | --- | --- | --- |
| OSI-approved license file | Met | [LICENSE](../../LICENSE) | None |
| Browsable, cloneable public source and issue tracker | Met | GitHub repository and project workflow | Reconfirm repository access before submission |
| Clear research application and statement of need | Partial | [Design requirements](../design-requirements.md) and README | Write a non-aspirational statement tied to demonstrated research workflows |
| Architecture suitable for a testable web research tool | Strong | [Application architecture](../architecture/application-architecture.md), owned-value boundary, isolated algebra adapter | Demonstrate the boundary with PGA(2), not VGA(2) alone |
| Installation and functionality documentation | Partial | `package.json`, README, deployed example | Add explicit prerequisites, local installation, development, verification, and browser-support instructions |
| Examples | Partial | [VGA foundation example](../examples/vga-2d-foundation.md) | Add research case studies and PGA workflows with downloadable canonical documents |
| Automated tests and CI | Strong | `npm run verify`, GitHub Actions, acceptance record | Publish release-specific results and maintain independent mathematical fixtures |
| Community pathways | Partial | CONTRIBUTING, issue templates, code of conduct | State where to seek support and add a research-use issue path |
| Releases and changelog | Started | [CHANGELOG](../../CHANGELOG.md) | Publish tagged releases with acceptance evidence |
| Community engagement | Not yet evidenced | One public contributor at last review | Record external issues, trials, research feedback, and contributions without inflating claims |
| Citation metadata | Started | [CITATION.cff](../../CITATION.cff) | Add release version/date and archival DOI when available |

## Project-specific publication requirements

These are MultiVector release decisions, not universal JOSS rules:

- VGA(2) and PGA(2) must both be available and accepted.
- The common architecture must demonstrate algebra registration, convention,
  interpretation, visualization, and numerical-policy boundaries without
  scattering algebra-specific behavior through the application shell.
- At least one reproducible research case study per submitted algebra must be
  available.
- The release must compare MultiVector with MultiVector Studio and other
  relevant geometric algebra libraries and visual tools.
- The deployed application and local reviewer workflow must exercise the same
  release revision.

## Paper and acceptance-time actions

Before submission:

- create `paper.md`, bibliography, and any figures in the repository;
- include Summary, Statement of need, State of the field, Software design,
  Research impact statement, AI usage disclosure, Acknowledgements, and
  References according to the policy then in force;
- confirm authors, affiliations, ORCIDs, funding, and conflicts of interest;
- verify every impact claim and related-work citation.

During or after successful review, follow the editor's instructions to create a
tagged release, archive the reviewed source with Zenodo or another accepted
service, obtain its DOI, and update citation metadata.

## Update policy

- Review this file at every tagged release and at least once per quarter.
- A criterion becomes Met only when its Evidence cell links to a durable record.
- Policy changes update the Last reviewed date and the cited official sources.
- Missing evidence remains explicit; roadmap intent is never impact evidence.

