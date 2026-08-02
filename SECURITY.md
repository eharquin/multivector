# Security Policy

## Supported versions

MultiVector is under active research development and has not reached a stable
release. Security fixes are applied to the latest revision of `main`; older
commits, branches, and locally modified builds are not supported.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in a public issue, discussion,
or pull request.

Use GitHub's private vulnerability reporting from the repository's
[Security advisories](https://github.com/eharquin/multivector/security/advisories)
page. If private reporting is unavailable, contact the maintainer privately
using the contact information on the
[maintainer's GitHub profile](https://github.com/eharquin).

Include, when possible:

- the affected revision, deployment, or URL;
- the vulnerability type and potential impact;
- the steps and minimal data needed to reproduce it;
- any known preconditions or mitigations; and
- whether the vulnerability has been disclosed elsewhere.

Do not include real credentials, personal data, or destructive proof-of-concept
payloads. Use synthetic data and the smallest safe demonstration possible.

The maintainer will acknowledge the report as soon as practical, investigate
its impact, and coordinate remediation and disclosure with the reporter.
Timelines depend on severity and the project's research-development status.

## Scope

Reports concerning source parsing, canonical document import, local storage,
dependency handling, generated output, the deployed web application, or the
build and deployment pipeline are in scope. Reports that require a modified
build or unsupported browser may still be useful, but should clearly state
those conditions.
